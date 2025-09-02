import { EmailService } from './email-service';
import { ResendEmailService } from './resend-email-service';
import { promises as fs } from 'fs';
import path from 'path';

export type EmailProvider = 'smtp' | 'resend';

export interface EmailProviderConfig {
  provider: EmailProvider;
  enabled: boolean;
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

export class UnifiedEmailService {
  private static instance: UnifiedEmailService | null = null;
  private smtpService: EmailService;
  private resendService: ResendEmailService;
  private configPath = path.join(process.cwd(), 'data', 'email-provider-config.json');
  private providerConfig: EmailProviderConfig | null = null;

  constructor() {
    this.smtpService = EmailService.getInstance();
    this.resendService = ResendEmailService.getInstance();
  }

  static getInstance(): UnifiedEmailService {
    if (!this.instance) {
      this.instance = new UnifiedEmailService();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    // Load provider configuration
    this.providerConfig = await this.loadProviderConfig();
    
    // Initialize both services
    await this.smtpService.initialize();
    await this.resendService.initialize();
  }

  async setProvider(provider: EmailProvider): Promise<void> {
    this.providerConfig = {
      provider,
      enabled: true
    };
    await this.saveProviderConfig(this.providerConfig);
  }

  async getActiveProvider(): Promise<EmailProvider | null> {
    if (!this.providerConfig) {
      this.providerConfig = await this.loadProviderConfig();
    }
    return this.providerConfig?.enabled ? this.providerConfig.provider : null;
  }

  async getAvailableProviders(): Promise<Array<{ provider: EmailProvider; configured: boolean; active: boolean }>> {
    const activeProvider = await this.getActiveProvider();
    
    return [
      {
        provider: 'smtp',
        configured: this.smtpService.isConfigured(),
        active: activeProvider === 'smtp'
      },
      {
        provider: 'resend',
        configured: this.resendService.isConfigured(),
        active: activeProvider === 'resend'
      }
    ];
  }

  async testConnection(): Promise<{ success: boolean; error?: string; provider?: EmailProvider }> {
    const activeProvider = await this.getActiveProvider();
    
    if (!activeProvider) {
      return { success: false, error: 'No email provider configured' };
    }

    const service = this.getService(activeProvider);
    if (!service) {
      return { success: false, error: `${activeProvider} service not available` };
    }

    const result = await service.testConnection();
    return { ...result, provider: activeProvider };
  }

  async sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string; provider?: EmailProvider }> {
    const activeProvider = await this.getActiveProvider();
    
    if (!activeProvider) {
      return { success: false, error: 'No email provider configured' };
    }

    const service = this.getService(activeProvider);
    if (!service) {
      return { success: false, error: `${activeProvider} service not available` };
    }

    const result = await service.sendEmail(options);
    return { ...result, provider: activeProvider };
  }

  async sendTestEmail(to: string): Promise<{ success: boolean; error?: string; provider?: EmailProvider }> {
    const activeProvider = await this.getActiveProvider();
    
    if (!activeProvider) {
      return { success: false, error: 'No email provider configured' };
    }

    const service = this.getService(activeProvider);
    if (!service) {
      return { success: false, error: `${activeProvider} service not available` };
    }

    const result = await service.sendTestEmail(to);
    return { ...result, provider: activeProvider };
  }

  isConfigured(): boolean {
    return this.smtpService.isConfigured() || this.resendService.isConfigured();
  }

  // Get individual services for direct configuration
  getSMTPService(): EmailService {
    return this.smtpService;
  }

  getResendService(): ResendEmailService {
    return this.resendService;
  }

  private getService(provider: EmailProvider) {
    switch (provider) {
      case 'smtp':
        return this.smtpService;
      case 'resend':
        return this.resendService;
      default:
        return null;
    }
  }

  private async loadProviderConfig(): Promise<EmailProviderConfig | null> {
    try {
      const configContent = await fs.readFile(this.configPath, 'utf-8');
      return JSON.parse(configContent);
    } catch {
      // Default to SMTP if no config exists
      return { provider: 'smtp', enabled: false };
    }
  }

  private async saveProviderConfig(config: EmailProviderConfig): Promise<void> {
    try {
      const dataDir = path.dirname(this.configPath);
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('Error saving email provider config:', error);
      throw error;
    }
  }
}

// Utility function to get unified email service instance
export const getUnifiedEmailService = () => UnifiedEmailService.getInstance();