import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { promises as fs } from 'fs';
import path from 'path';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
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

export class EmailService {
  private static instance: EmailService | null = null;
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;
  private configPath = path.join(process.cwd(), 'data', 'email-config.json');

  static getInstance(): EmailService {
    if (!this.instance) {
      this.instance = new EmailService();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    this.config = await this.loadConfig();
    if (this.config) {
      this.createTransporter();
    }
  }

  async updateConfig(config: EmailConfig): Promise<void> {
    this.config = config;
    await this.saveConfig(config);
    this.createTransporter();
  }

  async getConfig(): Promise<EmailConfig | null> {
    if (!this.config) {
      this.config = await this.loadConfig();
    }
    return this.config;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.transporter) {
        throw new Error('Email service not configured');
      }

      await this.transporter.verify();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.transporter || !this.config) {
        throw new Error('Email service not configured');
      }

      const info = await this.transporter.sendMail({
        from: this.config.from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      console.error('Email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
    const testEmail = {
      to,
      subject: 'Family Wealth Tracker - Test Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Test Email from Family Wealth Tracker</h2>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          <p>If you received this email, your SMTP settings are properly configured.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            Sent at: ${new Date().toLocaleString()}<br>
            From: Family Wealth Tracker
          </p>
        </div>
      `,
      text: `
        Test Email from Family Wealth Tracker
        
        This is a test email to verify your email configuration is working correctly.
        If you received this email, your SMTP settings are properly configured.
        
        Sent at: ${new Date().toLocaleString()}
        From: Family Wealth Tracker
      `
    };

    return await this.sendEmail(testEmail);
  }

  isConfigured(): boolean {
    return this.config !== null && this.transporter !== null;
  }

  private createTransporter(): void {
    if (!this.config) return;

    this.transporter = nodemailer.createTransporter({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth,
      pool: true, // Use connection pool for better performance
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 14 // Max 14 messages per second
    });
  }

  private async loadConfig(): Promise<EmailConfig | null> {
    try {
      // First try environment variables
      if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
        return {
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
          },
          from: process.env.EMAIL_FROM || `Family Wealth Tracker <${process.env.SMTP_USER}>`
        };
      }

      // Then try config file
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch {
      return null;
    }
  }

  private async saveConfig(config: EmailConfig): Promise<void> {
    try {
      const dataDir = path.dirname(this.configPath);
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error saving email config:', error);
      throw error;
    }
  }
}

// Utility function to get email service instance
export const getEmailService = () => EmailService.getInstance();