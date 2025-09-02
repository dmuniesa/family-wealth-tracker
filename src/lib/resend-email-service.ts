import { Resend } from 'resend';
import { promises as fs } from 'fs';
import path from 'path';

export interface ResendConfig {
  apiKey: string;
  from: string; // Must be from your verified domain, e.g., 'onboarding@yourdomain.com'
}

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export class ResendEmailService {
  private static instance: ResendEmailService | null = null;
  private resend: Resend | null = null;
  private config: ResendConfig | null = null;
  private configPath = path.join(process.cwd(), 'data', 'resend-config.json');

  static getInstance(): ResendEmailService {
    if (!this.instance) {
      this.instance = new ResendEmailService();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    this.config = await this.loadConfig();
    if (this.config) {
      this.createResendInstance();
    }
  }

  async updateConfig(config: ResendConfig): Promise<void> {
    this.config = config;
    await this.saveConfig(config);
    this.createResendInstance();
  }

  async getConfig(): Promise<ResendConfig | null> {
    if (!this.config) {
      this.config = await this.loadConfig();
    }
    return this.config;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.resend || !this.config) {
        throw new Error('Resend service not configured');
      }

      // Send a test email to validate the configuration
      const result = await this.resend.emails.send({
        from: this.config.from,
        to: 'test@example.com', // This will fail but validates the API key
        subject: 'Test Connection',
        html: '<p>Test</p>'
      });

      // If we get here without error, the API key is valid
      return { success: true };
    } catch (error: any) {
      // Check if it's just the email validation error (which is expected)
      if (error?.message?.includes('Invalid email')) {
        return { success: true }; // API key is valid, just the test email is invalid
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.resend || !this.config) {
        throw new Error('Resend service not configured');
      }

      // Convert attachments to Resend format if provided
      const attachments = options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        content_type: att.contentType
      }));

      const result = await this.resend.emails.send({
        from: this.config.from,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments
      });

      return {
        success: true,
        messageId: result.data?.id || 'unknown'
      };
    } catch (error: any) {
      console.error('Resend email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
    const testEmail = {
      to,
      subject: 'Family Wealth Tracker - Test Email (Resend)',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Test Email from Family Wealth Tracker</h2>
          <p>This is a test email sent via <strong>Resend</strong> to verify your email configuration is working correctly.</p>
          <p>If you received this email, your Resend integration is properly configured.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; color: #374151; font-size: 14px;">
              <strong>Email Service:</strong> Resend<br>
              <strong>Sent at:</strong> ${new Date().toLocaleString()}<br>
              <strong>From:</strong> Family Wealth Tracker
            </p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">
            This email was sent using Resend's email delivery service.
          </p>
        </div>
      `,
      text: `
        Test Email from Family Wealth Tracker (Resend)
        
        This is a test email sent via Resend to verify your email configuration is working correctly.
        If you received this email, your Resend integration is properly configured.
        
        Email Service: Resend
        Sent at: ${new Date().toLocaleString()}
        From: Family Wealth Tracker
        
        This email was sent using Resend's email delivery service.
      `
    };

    return await this.sendEmail(testEmail);
  }

  isConfigured(): boolean {
    return this.config !== null && this.resend !== null;
  }

  private createResendInstance(): void {
    if (!this.config) return;
    this.resend = new Resend(this.config.apiKey);
  }

  private async loadConfig(): Promise<ResendConfig | null> {
    try {
      // First try environment variables
      if (process.env.RESEND_API_KEY) {
        return {
          apiKey: process.env.RESEND_API_KEY,
          from: process.env.RESEND_FROM || 'onboarding@resend.dev'
        };
      }

      // Then try config file
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch {
      return null;
    }
  }

  private async saveConfig(config: ResendConfig): Promise<void> {
    try {
      const dataDir = path.dirname(this.configPath);
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error saving Resend config:', error);
      throw error;
    }
  }
}

// Utility function to get Resend email service instance
export const getResendEmailService = () => ResendEmailService.getInstance();