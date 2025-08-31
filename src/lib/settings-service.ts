import { promises as fs } from 'fs'
import path from 'path'

export interface AppSettings {
  registrationEnabled: boolean
}

export class SettingsService {
  private static settingsPath = path.join(process.cwd(), 'data', 'app-settings.json')

  static async getSettings(): Promise<AppSettings> {
    const defaultSettings: AppSettings = {
      registrationEnabled: true
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
}