import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { SettingsService } from '@/lib/settings-service'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const enabled = await SettingsService.isRegistrationEnabled()
    
    return NextResponse.json({ enabled })
  } catch (error) {
    console.error('Get registration settings error:', error)
    return NextResponse.json({ error: 'Failed to get registration settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { enabled } = await request.json()
    
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    await SettingsService.updateSettings({ registrationEnabled: enabled })

    return NextResponse.json({ 
      message: 'Registration settings updated successfully',
      enabled 
    })
  } catch (error) {
    console.error('Update registration settings error:', error)
    return NextResponse.json({ error: 'Failed to update registration settings' }, { status: 500 })
  }
}