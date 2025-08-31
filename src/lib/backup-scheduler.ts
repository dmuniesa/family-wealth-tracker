import cron from 'node-cron'
import { BackupService } from './backup-service'
import { promises as fs } from 'fs'
import path from 'path'

export type BackupFrequency = 'off' | 'daily' | 'weekly' | 'monthly'

export interface BackupScheduleConfig {
  frequency: BackupFrequency
  time: string // HH:MM format
  enabled: boolean
  maxBackups: number
  lastRun?: string
  nextRun?: string
}

export class BackupScheduler {
  private static instance: BackupScheduler | null = null
  private currentTask: cron.ScheduledTask | null = null
  private configPath = path.join(process.cwd(), 'data', 'backup-schedule.json')

  static getInstance(): BackupScheduler {
    if (!this.instance) {
      this.instance = new BackupScheduler()
    }
    return this.instance
  }

  async initialize(): Promise<void> {
    const config = await this.loadConfig()
    if (config.enabled) {
      this.scheduleBackup(config)
    }
  }

  async updateSchedule(frequency: BackupFrequency, time: string = '02:00'): Promise<void> {
    const config: BackupScheduleConfig = {
      frequency,
      time,
      enabled: frequency !== 'off',
      maxBackups: 10,
      lastRun: (await this.loadConfig()).lastRun,
      nextRun: this.calculateNextRun(frequency, time)
    }

    await this.saveConfig(config)
    
    if (this.currentTask) {
      this.currentTask.stop()
      this.currentTask = null
    }

    if (config.enabled) {
      this.scheduleBackup(config)
    }
  }

  async getScheduleConfig(): Promise<BackupScheduleConfig> {
    return await this.loadConfig()
  }

  private scheduleBackup(config: BackupScheduleConfig): void {
    const cronExpression = this.getCronExpression(config.frequency, config.time)
    
    if (!cronExpression) return

    this.currentTask = cron.schedule(cronExpression, async () => {
      try {
        console.log(`Running scheduled backup at ${new Date().toISOString()}`)
        
        await BackupService.createBackup()
        await BackupService.cleanupOldBackups(config.maxBackups)
        
        const updatedConfig = { 
          ...config, 
          lastRun: new Date().toISOString(),
          nextRun: this.calculateNextRun(config.frequency, config.time)
        }
        await this.saveConfig(updatedConfig)
        
        console.log('Scheduled backup completed successfully')
      } catch (error) {
        console.error('Scheduled backup failed:', error)
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    })
  }

  private getCronExpression(frequency: BackupFrequency, time: string): string | null {
    const [hour, minute] = time.split(':').map(Number)
    
    switch (frequency) {
      case 'daily':
        return `${minute} ${hour} * * *`
      case 'weekly':
        return `${minute} ${hour} * * 0` // Sunday
      case 'monthly':
        return `${minute} ${hour} 1 * *` // 1st of month
      default:
        return null
    }
  }

  private calculateNextRun(frequency: BackupFrequency, time: string): string | null {
    if (frequency === 'off') return null
    
    const [hour, minute] = time.split(':').map(Number)
    const now = new Date()
    let nextRun = new Date()
    
    nextRun.setHours(hour, minute, 0, 0)
    
    switch (frequency) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1)
        }
        break
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay()))
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7)
        }
        break
      case 'monthly':
        nextRun.setDate(1)
        nextRun.setMonth(nextRun.getMonth() + 1)
        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1)
        }
        break
    }
    
    return nextRun.toISOString()
  }

  private async loadConfig(): Promise<BackupScheduleConfig> {
    const defaultConfig: BackupScheduleConfig = {
      frequency: 'off',
      time: '02:00',
      enabled: false,
      maxBackups: 10
    }

    try {
      const configContent = await fs.readFile(this.configPath, 'utf-8')
      const config = JSON.parse(configContent)
      return { ...defaultConfig, ...config }
    } catch {
      return defaultConfig
    }
  }

  private async saveConfig(config: BackupScheduleConfig): Promise<void> {
    try {
      const dataDir = path.dirname(this.configPath)
      await fs.mkdir(dataDir, { recursive: true })
      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2))
    } catch (error) {
      console.error('Error saving backup config:', error)
      throw error
    }
  }
}