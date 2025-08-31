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
      return NextResponse.redirect(new URL('/backups?error=google_drive_auth_failed', request.url))
    }

    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET
    const redirectUri = `${request.nextUrl.origin}/api/auth/google-drive/callback`

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/backups?error=google_drive_not_configured', request.url))
    }

    const { accessToken, refreshToken } = await CloudStorageService.exchangeGoogleDriveCode(clientId, clientSecret, code, redirectUri)
    
    await CloudStorageService.updateCloudConfig('google-drive', {
      accessToken,
      refreshToken,
      enabled: true
    })

    return NextResponse.redirect(new URL('/backups?success=google_drive_connected', request.url))
  } catch (error) {
    console.error('Google Drive callback error:', error)
    return NextResponse.redirect(new URL('/backups?error=google_drive_auth_failed', request.url))
  }
}