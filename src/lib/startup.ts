import { BackupScheduler } from './backup-scheduler'
import { NotificationScheduler } from './notification-scheduler'

export async function initializeApp() {
  try {
    const backupScheduler = BackupScheduler.getInstance()
    await backupScheduler.initialize()

    const notificationScheduler = NotificationScheduler.getInstance()
    await notificationScheduler.initialize()
  } catch (error) {
    console.error('Failed to initialize schedulers:', error)
  }
}