import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { BackupScheduler, type BackupFrequency } from '@/lib/backup-scheduler'

const scheduleSchema = z.object({
  frequency: z.enum(['off', 'daily', 'weekly', 'monthly']),
  time: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const scheduler = BackupScheduler.getInstance()
    const config = await scheduler.getScheduleConfig()
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('Get backup schedule error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request)
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { frequency, time } = scheduleSchema.parse(body)
    
    const scheduler = BackupScheduler.getInstance()
    await scheduler.updateSchedule(frequency as BackupFrequency, time)
    
    return NextResponse.json({ 
      message: 'Backup schedule updated successfully' 
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Update backup schedule error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}