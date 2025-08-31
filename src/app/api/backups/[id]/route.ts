import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { BackupService } from '@/lib/backup-service'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { id } = await params
    
    await BackupService.deleteBackup(id)
    
    return NextResponse.json({ 
      message: 'Backup deleted successfully' 
    })
  } catch (error) {
    console.error('Delete backup error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to delete backup' 
    }, { status: 500 })
  }
}