import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/database';

const notificationPreferencesSchema = z.object({
  notificationsEnabled: z.boolean()
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationsEnabled } = notificationPreferencesSchema.parse(body);

    const db = await getDatabase();
    
    // Check if notifications_enabled column exists, if not add it
    try {
      await db.run(
        'ALTER TABLE users ADD COLUMN notifications_enabled BOOLEAN DEFAULT TRUE'
      );
    } catch (error) {
      // Column likely already exists, ignore error
    }

    await db.run(
      'UPDATE users SET notifications_enabled = ? WHERE id = ?',
      [notificationsEnabled, session.user.id]
    );

    return NextResponse.json({
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Update notification preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const db = await getDatabase();
    const user = await db.get(
      'SELECT notifications_enabled FROM users WHERE id = ?',
      [session.user.id]
    );

    return NextResponse.json({
      notificationsEnabled: user?.notifications_enabled ?? true
    });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}