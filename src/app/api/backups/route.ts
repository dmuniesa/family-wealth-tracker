import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { BackupService } from '@/lib/backup-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const backups = await BackupService.listBackups()
    const stats = await BackupService.getBackupStats()
    
    return NextResponse.json({
      backups,
      lastBackup: stats.lastBackup,
      totalBackups: stats.totalBackups,
      totalSize: stats.totalSize
    })
  } catch (error) {
    console.error('Get backups error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const backup = await BackupService.createBackup()
    
    // Try to upload to enabled cloud storage providers
    try {
      const { CloudStorageService } = await import('@/lib/cloud-storage')
      await CloudStorageService.uploadBackupToCloud(backup.filePath, backup.name)
    } catch (error) {
      console.error('Cloud upload failed (backup still created locally):', error)
    }
    
    return NextResponse.json({ 
      message: 'Backup created successfully', 
      backup 
    })
  } catch (error) {
    console.error('Create backup error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create backup' 
    }, { status: 500 })
  }
}