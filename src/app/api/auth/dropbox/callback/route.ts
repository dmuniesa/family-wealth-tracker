import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { CloudStorageService } from '@/lib/cloud-storage'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error || !code) {
      return NextResponse.redirect(new URL('/backups?error=dropbox_auth_failed', request.url))
    }

    const clientId = process.env.DROPBOX_CLIENT_ID
    const clientSecret = process.env.DROPBOX_CLIENT_SECRET
    const redirectUri = `${request.nextUrl.origin}/api/auth/dropbox/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/backups?error=dropbox_not_configured', request.url))
    }

    const accessToken = await CloudStorageService.exchangeDropboxCode(clientId, clientSecret, code, redirectUri)
    
    await CloudStorageService.updateCloudConfig('dropbox', {
      accessToken,
      enabled: true
    })

    return NextResponse.redirect(new URL('/backups?success=dropbox_connected', request.url))
  } catch (error) {
    console.error('Dropbox callback error:', error)
    return NextResponse.redirect(new URL('/backups?error=dropbox_auth_failed', request.url))
  }
}