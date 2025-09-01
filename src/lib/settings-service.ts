import { promises as fs } from 'fs'
import path from 'path'

export interface NotificationSettings {
  enabled: boolean;
  day: 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';
  time: string; // HH:MM format
  timezone: string;
  includeCharts: boolean;
  customMessage?: string;
}

export interface AppSettings {
  registrationEnabled: boolean;
  notifications: NotificationSettings;
}

export class SettingsService {
  private static settingsPath = path.join(process.cwd(), 'data', 'app-settings.json')

  static async getSettings(): Promise<AppSettings> {
    const defaultSettings: AppSettings = {
      registrationEnabled: true,
      notifications: {
        enabled: false,
        day: 'sunday',
        time: '09:00',
        timezone: 'UTC',
        includeCharts: true,
        customMessage: undefined
      }
    }

    try {
      const settingsContent = await fs.readFile(this.settingsPath, 'utf-8')
      const settings = JSON.parse(settingsContent)
      return { ...defaultSettings, ...settings }
    } catch {
      return defaultSettings
    }
  }

  static async updateSettings(settings: Partial<AppSettings>): Promise<void> {
    try {
      const currentSettings = await this.getSettings()
      const newSettings = { ...currentSettings, ...settings }
      
      const dataDir = path.dirname(this.settingsPath)
      await fs.mkdir(dataDir, { recursive: true })
      await fs.writeFile(this.settingsPath, JSON.stringify(newSettings, null, 2))
    } catch (error) {
      console.error('Error saving app settings:', error)
      throw error
    }
  }

  static async isRegistrationEnabled(): Promise<boolean> {
    const settings = await this.getSettings()
    return settings.registrationEnabled
  }

  static async getNotificationSettings(): Promise<NotificationSettings> {
    const settings = await this.getSettings()
    return settings.notifications
  }

  static async updateNotificationSettings(notifications: Partial<NotificationSettings>): Promise<void> {
    const currentSettings = await this.getSettings()
    const newNotificationSettings = { ...currentSettings.notifications, ...notifications }
    await this.updateSettings({ notifications: newNotificationSettings })
  }

  static async isNotificationsEnabled(): Promise<boolean> {
    const notificationSettings = await this.getNotificationSettings()
    return notificationSettings.enabled
  }
}