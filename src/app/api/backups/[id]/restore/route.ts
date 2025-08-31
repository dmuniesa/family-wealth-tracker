import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { BackupService } from '@/lib/backup-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    
    const backup = await BackupService.getBackupById(id)
    if (!backup) {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }

    const isValid = await BackupService.validateBackup(backup.filePath)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid backup file' }, { status: 400 })
    }
    
    await BackupService.restoreBackup(id)
    
    return NextResponse.json({ 
      message: 'Backup restored successfully' 
    })
  } catch (error) {
    console.error('Restore backup error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to restore backup' 
    }, { status: 500 })
  }
}