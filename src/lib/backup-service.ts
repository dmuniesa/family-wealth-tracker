import { promises as fs } from 'fs'
import path from 'path'
import { getDatabase } from './database'

export interface BackupInfo {
  id: string
  name: string
  size: number
  created_at: string
  location: 'local' | 'dropbox' | 'google-drive'
  filePath: string
}

export class BackupService {
  private static backupDir = path.join(process.cwd(), 'data', 'backups')

  static async initializeBackupDirectory(): Promise<void> {
    try {
      await fs.access(this.backupDir)
    } catch {
      await fs.mkdir(this.backupDir, { recursive: true })
    }
  }

  static async createBackup(): Promise<BackupInfo> {
    await this.initializeBackupDirectory()
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupId = `backup-${timestamp}`
    const backupName = `wealth-tracker-${timestamp}.db`
    const backupPath = path.join(this.backupDir, backupName)
    
    const originalDbPath = path.join(process.cwd(), 'data', 'wealth_tracker.db')
    
    try {
      await fs.copyFile(originalDbPath, backupPath)
      
      const stats = await fs.stat(backupPath)
      
      const backupInfo: BackupInfo = {
        id: backupId,
        name: backupName,
        size: stats.size,
        created_at: new Date().toISOString(),
        location: 'local',
        filePath: backupPath
      }

      await this.saveBackupMetadata(backupInfo)
      return backupInfo
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`)
    }
  }

  static async saveUploadedBackup(buffer: Buffer, backupId: string, fileName: string): Promise<BackupInfo> {
    await this.initializeBackupDirectory()
    
    const backupPath = path.join(this.backupDir, fileName)
    
    try {
      // Save the uploaded file
      await fs.writeFile(backupPath, buffer)
      
      // Validate the uploaded backup
      const isValid = await this.validateBackup(backupPath)
      if (!isValid) {
        await fs.unlink(backupPath) // Clean up invalid file
        throw new Error('Invalid backup file. The uploaded file does not appear to be a valid database.')
      }
      
      const stats = await fs.stat(backupPath)
      
      const backupInfo: BackupInfo = {
        id: backupId,
        name: fileName,
        size: stats.size,
        created_at: new Date().toISOString(),
        location: 'local',
        filePath: backupPath
      }

      await this.saveBackupMetadata(backupInfo)
      return backupInfo
    } catch (error) {
      // Clean up file if something went wrong
      try {
        await fs.unlink(backupPath)
      } catch {}
      
      throw new Error(`Failed to save uploaded backup: ${error}`)
    }
  }

  static async listBackups(): Promise<BackupInfo[]> {
    await this.initializeBackupDirectory()
    
    try {
      const metadataPath = path.join(this.backupDir, 'backups-metadata.json')
      
      try {
        const metadataContent = await fs.readFile(metadataPath, 'utf-8')
        const metadata = JSON.parse(metadataContent)
        return metadata.backups || []
      } catch {
        return []
      }
    } catch (error) {
      console.error('Error listing backups:', error)
      return []
    }
  }

  static async getBackupById(backupId: string): Promise<BackupInfo | null> {
    const backups = await this.listBackups()
    return backups.find(backup => backup.id === backupId) || null
  }

  static async deleteBackup(backupId: string): Promise<void> {
    const backup = await this.getBackupById(backupId)
    if (!backup) {
      throw new Error('Backup not found')
    }

    try {
      await fs.unlink(backup.filePath)
      await this.removeBackupMetadata(backupId)
    } catch (error) {
      throw new Error(`Failed to delete backup: ${error}`)
    }
  }

  static async restoreBackup(backupId: string): Promise<void> {
    const backup = await this.getBackupById(backupId)
    if (!backup) {
      throw new Error('Backup not found')
    }

    const originalDbPath = path.join(process.cwd(), 'data', 'wealth_tracker.db')
    
    try {
      await fs.copyFile(backup.filePath, originalDbPath)
    } catch (error) {
      throw new Error(`Failed to restore backup: ${error}`)
    }
  }

  static async validateBackup(backupPath: string): Promise<boolean> {
    try {
      const tempDb = new (await import('sqlite3')).Database(backupPath)
      
      return new Promise((resolve) => {
        tempDb.get('SELECT name FROM sqlite_master WHERE type="table"', (err, row) => {
          tempDb.close()
          resolve(!err && !!row)
        })
      })
    } catch {
      return false
    }
  }

  private static async saveBackupMetadata(backupInfo: BackupInfo): Promise<void> {
    const metadataPath = path.join(this.backupDir, 'backups-metadata.json')
    
    let metadata = { backups: [] as BackupInfo[] }
    
    try {
      const existingContent = await fs.readFile(metadataPath, 'utf-8')
      metadata = JSON.parse(existingContent)
    } catch {
      // File doesn't exist or is invalid, use empty metadata
    }
    
    metadata.backups.push(backupInfo)
    metadata.backups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
  }

  private static async removeBackupMetadata(backupId: string): Promise<void> {
    const metadataPath = path.join(this.backupDir, 'backups-metadata.json')
    
    try {
      const existingContent = await fs.readFile(metadataPath, 'utf-8')
      const metadata = JSON.parse(existingContent)
      
      metadata.backups = metadata.backups.filter((backup: BackupInfo) => backup.id !== backupId)
      
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2))
    } catch (error) {
      console.error('Error removing backup metadata:', error)
    }
  }

  static async getBackupStats(): Promise<{
    totalBackups: number
    totalSize: number
    lastBackup: string | null
  }> {
    const backups = await this.listBackups()
    
    return {
      totalBackups: backups.length,
      totalSize: backups.reduce((sum, backup) => sum + backup.size, 0),
      lastBackup: backups.length > 0 ? backups[0].created_at : null
    }
  }

  static async cleanupOldBackups(keepCount: number = 10): Promise<void> {
    const backups = await this.listBackups()
    
    if (backups.length <= keepCount) return
    
    const backupsToDelete = backups.slice(keepCount)
    
    for (const backup of backupsToDelete) {
      try {
        await this.deleteBackup(backup.id)
      } catch (error) {
        console.error(`Failed to delete old backup ${backup.id}:`, error)
      }
    }
  }
}