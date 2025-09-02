import cron from 'node-cron';
import { WeeklyReportService, type WeeklyReportData } from './weekly-report-service';
import { WeeklyReportTemplate, type EmailTemplateOptions } from './email-templates/weekly-report-template';
import { getUnifiedEmailService } from './unified-email-service';
import { SettingsService } from './settings-service';
import { amortizationService } from './amortization-service';
import { getDatabase } from './database';
import { promises as fs } from 'fs';
import path from 'path';

export interface NotificationHistory {
  id: string;
  familyId: number;
  sentAt: string;
  success: boolean;
  error?: string;
  recipients: string[];
  reportPeriod: {
    start: string;
    end: string;
  };
}

export class NotificationScheduler {
  private static instance: NotificationScheduler | null = null;
  private currentTask: cron.ScheduledTask | null = null;
  private monthlyDebtTask: cron.ScheduledTask | null = null;
  private historyPath = path.join(process.cwd(), 'data', 'notification-history.json');

  static getInstance(): NotificationScheduler {
    if (!this.instance) {
      this.instance = new NotificationScheduler();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    const settings = await SettingsService.getNotificationSettings();
    if (settings.enabled) {
      await this.scheduleWeeklyNotifications(settings.day, settings.time, settings.timezone);
    }
    
    // Start monthly debt updates (runs on the 1st of each month at 2 AM)
    await this.scheduleMonthlyDebtUpdates();
  }

  async scheduleWeeklyNotifications(
    day: string, 
    time: string, 
    timezone: string = 'UTC'
  ): Promise<void> {
    // Stop existing schedule
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask = null;
    }

    const cronExpression = this.getCronExpression(day, time);
    if (!cronExpression) {
      throw new Error(`Invalid day or time: ${day} ${time}`);
    }

    console.log(`Scheduling weekly notifications: ${cronExpression} (${timezone})`);

    this.currentTask = cron.schedule(cronExpression, async () => {
      console.log(`Running weekly notification task at ${new Date().toISOString()}`);
      await this.sendWeeklyReportsToAllFamilies();
    }, {
      scheduled: true,
      timezone: timezone
    });
  }

  async sendWeeklyReportsToAllFamilies(): Promise<void> {
    try {
      const emailService = getUnifiedEmailService();
      
      // Check if email service is configured
      if (!emailService.isConfigured()) {
        console.error('Email service not configured. Skipping weekly reports.');
        return;
      }

      // Get all families
      const familyIds = await WeeklyReportService.getAllFamiliesForReporting();
      console.log(`Sending weekly reports to ${familyIds.length} families`);

      const settings = await SettingsService.getNotificationSettings();
      
      for (const familyId of familyIds) {
        try {
          await this.sendWeeklyReportToFamily(familyId, {
            locale: 'en', // TODO: Get from family preferences
            includeCharts: settings.includeCharts,
            customMessage: settings.customMessage
          });
        } catch (error) {
          console.error(`Failed to send weekly report to family ${familyId}:`, error);
        }
      }

      console.log('Weekly notification task completed');
    } catch (error) {
      console.error('Weekly notification task failed:', error);
    }
  }

  async sendWeeklyReportToFamily(
    familyId: number, 
    options: EmailTemplateOptions
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate report data
      const reportData = await WeeklyReportService.generateWeeklyReport(familyId);
      
      // Filter recipients who want notifications
      const recipients = reportData.recipients
        .filter(r => r.notificationsEnabled)
        .map(r => r.email);

      if (recipients.length === 0) {
        console.log(`No recipients for family ${familyId} - skipping`);
        return { success: true };
      }

      // Generate email template
      const { subject, html, text } = WeeklyReportTemplate.generate(reportData, options);

      // Send email
      const emailService = getUnifiedEmailService();
      const result = await emailService.sendEmail({
        to: recipients,
        subject,
        html,
        text
      });

      // Log history
      await this.logNotificationHistory({
        id: `${familyId}_${Date.now()}`,
        familyId,
        sentAt: new Date().toISOString(),
        success: result.success,
        error: result.error,
        recipients,
        reportPeriod: {
          start: reportData.period.start,
          end: reportData.period.end
        }
      });

      if (result.success) {
        console.log(`Weekly report sent successfully to family ${familyId} (${recipients.length} recipients)`);
      } else {
        console.error(`Failed to send weekly report to family ${familyId}:`, result.error);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      await this.logNotificationHistory({
        id: `${familyId}_${Date.now()}`,
        familyId,
        sentAt: new Date().toISOString(),
        success: false,
        error: errorMessage,
        recipients: [],
        reportPeriod: {
          start: '',
          end: ''
        }
      });

      console.error(`Error sending weekly report to family ${familyId}:`, error);
      return { success: false, error: errorMessage };
    }
  }

  async sendTestReport(
    familyId: number, 
    testEmail: string,
    options: EmailTemplateOptions
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate report data
      const reportData = await WeeklyReportService.generateWeeklyReport(familyId);
      
      // Override recipients for test
      reportData.recipients = [
        {
          email: testEmail,
          name: 'Test User',
          notificationsEnabled: true
        }
      ];

      // Generate email template with test subject
      const { subject, html, text } = WeeklyReportTemplate.generate(reportData, options);
      const testSubject = `[TEST] ${subject}`;

      // Send email
      const emailService = getUnifiedEmailService();
      return await emailService.sendEmail({
        to: testEmail,
        subject: testSubject,
        html,
        text
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error sending test report:`, error);
      return { success: false, error: errorMessage };
    }
  }

  async scheduleMonthlyDebtUpdates(): Promise<void> {
    // Stop existing monthly task
    if (this.monthlyDebtTask) {
      this.monthlyDebtTask.stop();
      this.monthlyDebtTask = null;
    }

    // Schedule to run on the 1st day of every month at 2:00 AM
    this.monthlyDebtTask = cron.schedule('0 2 1 * *', async () => {
      console.log('Running monthly debt updates...');
      await this.runMonthlyDebtUpdates();
    }, {
      scheduled: false,
      timezone: 'UTC'
    });

    this.monthlyDebtTask.start();
    console.log('Monthly debt updates scheduled for 1st day of each month at 2:00 AM UTC');
  }

  async runMonthlyDebtUpdates(): Promise<{ totalUpdated: number; errors: string[] }> {
    try {
      console.log('Starting monthly debt updates for all families...');
      const db = await getDatabase();
      
      // Get all family IDs that have debt accounts with auto-update enabled
      const familyIds = await db.all(`
        SELECT DISTINCT family_id 
        FROM accounts 
        WHERE category = 'Debt' 
          AND auto_update_enabled = 1 
          AND apr_rate IS NOT NULL
          AND remaining_months > 0
      `) as { family_id: number }[];

      let totalUpdated = 0;
      const allErrors: string[] = [];

      for (const { family_id } of familyIds) {
        const result = await amortizationService.runMonthlyUpdatesForFamily(family_id);
        totalUpdated += result.updated;
        allErrors.push(...result.errors);
        
        if (result.updated > 0) {
          console.log(`Updated ${result.updated} debt accounts for family ${family_id}`);
        }
      }

      console.log(`Monthly debt updates completed: ${totalUpdated} accounts updated across ${familyIds.length} families`);
      return { totalUpdated, errors: allErrors };
    } catch (error) {
      console.error('Error during monthly debt updates:', error);
      return { totalUpdated: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
    }
  }

  async stopSchedule(): Promise<void> {
    if (this.currentTask) {
      this.currentTask.stop();
      this.currentTask = null;
      console.log('Weekly notification schedule stopped');
    }
    
    if (this.monthlyDebtTask) {
      this.monthlyDebtTask.stop();
      this.monthlyDebtTask = null;
      console.log('Monthly debt update schedule stopped');
    }
  }

  async getNotificationHistory(limit: number = 50): Promise<NotificationHistory[]> {
    try {
      const historyContent = await fs.readFile(this.historyPath, 'utf-8');
      const history: NotificationHistory[] = JSON.parse(historyContent);
      return history
        .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
        .slice(0, limit);
    } catch {
      return [];
    }
  }

  async clearHistory(): Promise<void> {
    try {
      await fs.unlink(this.historyPath);
    } catch {
      // File doesn't exist, that's fine
    }
  }

  private async logNotificationHistory(entry: NotificationHistory): Promise<void> {
    try {
      let history: NotificationHistory[] = [];
      
      try {
        const historyContent = await fs.readFile(this.historyPath, 'utf-8');
        history = JSON.parse(historyContent);
      } catch {
        // File doesn't exist or is invalid, start with empty array
      }

      history.push(entry);
      
      // Keep only last 100 entries to prevent file from growing too large
      if (history.length > 100) {
        history = history.slice(-100);
      }

      const dataDir = path.dirname(this.historyPath);
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(this.historyPath, JSON.stringify(history, null, 2));
    } catch (error) {
      console.error('Error logging notification history:', error);
    }
  }

  private getCronExpression(day: string, time: string): string | null {
    const dayMap: Record<string, number> = {
      'sunday': 0,
      'monday': 1,
      'tuesday': 2,
      'wednesday': 3,
      'thursday': 4,
      'friday': 5,
      'saturday': 6
    };

    const dayNumber = dayMap[day.toLowerCase()];
    if (dayNumber === undefined) {
      return null;
    }

    const timeParts = time.split(':');
    if (timeParts.length !== 2) {
      return null;
    }

    const hour = parseInt(timeParts[0]);
    const minute = parseInt(timeParts[1]);

    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }

    // Cron format: minute hour * * day-of-week
    return `${minute} ${hour} * * ${dayNumber}`;
  }
}