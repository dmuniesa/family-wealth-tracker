import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { BackupService } from '@/lib/backup-service'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const data = await request.formData()
    const file: File | null = data.get('backup') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    // Validate file type (should be .db)
    if (!file.name.endsWith('.db')) {
      return NextResponse.json({ error: 'Invalid file type. Only .db files are allowed.' }, { status: 400 })
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024 // 100MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File too large. Maximum size is 100MB.' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupId = `uploaded-backup-${timestamp}`
    const fileName = `uploaded-${file.name.replace(/[^a-zA-Z0-9.-]/g, '-')}-${timestamp}.db`
    
    // Save the uploaded backup using BackupService
    const backupInfo = await BackupService.saveUploadedBackup(buffer, backupId, fileName)
    
    return NextResponse.json({ 
      message: 'Backup uploaded successfully', 
      backup: backupInfo 
    })
  } catch (error) {
    console.error('Upload backup error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to upload backup' 
    }, { status: 500 })
  }
}