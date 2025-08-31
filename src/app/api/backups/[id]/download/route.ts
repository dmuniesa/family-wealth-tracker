import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import { getSession } from '@/lib/auth'
import { BackupService } from '@/lib/backup-service'

export async function GET(
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

    const fileBuffer = await fs.readFile(backup.filePath)
    
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${backup.name}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Download backup error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to download backup' 
    }, { status: 500 })
  }
}