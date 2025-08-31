import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { CloudStorageService } from '@/lib/cloud-storage'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const clientId = process.env.DROPBOX_CLIENT_ID
    if (!clientId) {
      return NextResponse.json({ error: 'Dropbox not configured' }, { status: 500 })
    }

    const redirectUri = `${request.nextUrl.origin}/api/auth/dropbox/callback`
    const authUrl = CloudStorageService.generateDropboxAuthUrl(clientId, redirectUri)

    return NextResponse.json({ authUrl })
  } catch (error) {
    console.error('Dropbox auth error:', error)
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 })
  }
}