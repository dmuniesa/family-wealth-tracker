import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { CloudStorageService } from '@/lib/cloud-storage'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const configs = await CloudStorageService.getCloudConfig()
    
    // Don't expose sensitive tokens in the response
    const safeConfigs = configs.map(config => ({
      provider: config.provider,
      enabled: config.enabled,
      connected: !!config.accessToken
    }))

    return NextResponse.json(safeConfigs)
  } catch (error) {
    console.error('Get cloud storage config error:', error)
    return NextResponse.json({ error: 'Failed to get cloud storage config' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { provider, enabled } = await request.json()
    
    if (!provider || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    await CloudStorageService.updateCloudConfig(provider, { enabled })

    return NextResponse.json({ message: 'Cloud storage config updated' })
  } catch (error) {
    console.error('Update cloud storage config error:', error)
    return NextResponse.json({ error: 'Failed to update cloud storage config' }, { status: 500 })
  }
}