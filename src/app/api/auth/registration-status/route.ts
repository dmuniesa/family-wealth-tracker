import { NextRequest, NextResponse } from 'next/server'
import { SettingsService } from '@/lib/settings-service'

export async function GET(request: NextRequest) {
  try {
    const enabled = await SettingsService.isRegistrationEnabled()
    
    return NextResponse.json({ enabled })
  } catch (error) {
    console.error('Get registration status error:', error)
    return NextResponse.json({ error: 'Failed to get registration status' }, { status: 500 })
  }
}