import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { SettingsService } from '@/lib/settings-service';
import { getEmailService } from '@/lib/email-service';
import { NotificationScheduler } from '@/lib/notification-scheduler';

const emailConfigSchema = z.object({
  host: z.string().min(1),
  port: z.number().min(1).max(65535),
  secure: z.boolean(),
  auth: z.object({
    user: z.string().email(),
    pass: z.string().min(1)
  }),
  from: z.string().min(1)
});

const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  day: z.enum(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  timezone: z.string(),
  includeCharts: z.boolean(),
  customMessage: z.string().optional()
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session.user || session.user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Administrator access required' },
        { status: 403 }
      );
    }

    const emailService = getEmailService();
    const emailConfig = await emailService.getConfig();
    const notificationSettings = await SettingsService.getNotificationSettings();

    // Don't send the password back to client
    const safeEmailConfig = emailConfig ? {
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.auth.user,
        pass: '***' // Masked
      },
      from: emailConfig.from
    } : null;

    return NextResponse.json({
      emailConfig: safeEmailConfig,
      notificationSettings,
      isConfigured: emailService.isConfigured()
    });
  } catch (error) {
    console.error('Get notification config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session.user || session.user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Administrator access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { emailConfig, notificationSettings } = body;

    // Validate that at least one config is provided
    if (!emailConfig && !notificationSettings) {
      return NextResponse.json(
        { error: 'No configuration provided' },
        { status: 400 }
      );
    }

    // Update email configuration if provided
    if (emailConfig) {
      try {
        const validatedEmailConfig = emailConfigSchema.parse(emailConfig);

        const emailService = getEmailService();
        await emailService.updateConfig(validatedEmailConfig);

        // Test the connection
        const testResult = await emailService.testConnection();
        if (!testResult.success) {
          return NextResponse.json(
            { error: `Email configuration test failed: ${testResult.error}` },
            { status: 400 }
          );
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: 'Invalid email configuration', details: error.issues },
            { status: 400 }
          );
        }
        throw error;
      }
    }

    // Update notification settings if provided
    if (notificationSettings) {
      try {
        const validatedNotificationSettings = notificationSettingsSchema.parse(notificationSettings);
        await SettingsService.updateNotificationSettings(validatedNotificationSettings);

        // Update the scheduler
        const scheduler = NotificationScheduler.getInstance();
        if (validatedNotificationSettings.enabled) {
          await scheduler.scheduleWeeklyNotifications(
            validatedNotificationSettings.day,
            validatedNotificationSettings.time,
            validatedNotificationSettings.timezone
          );
        } else {
          await scheduler.stopSchedule();
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: 'Invalid notification settings', details: error.issues },
            { status: 400 }
          );
        }
        throw error;
      }
    }

    return NextResponse.json({
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid configuration data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Update notification config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}