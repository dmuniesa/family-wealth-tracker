import { BackupScheduler } from './backup-scheduler'

export async function initializeApp() {
  try {
    const scheduler = BackupScheduler.getInstance()
    await scheduler.initialize()
  } catch (error) {
    console.error('Failed to initialize backup scheduler:', error)
  }
}