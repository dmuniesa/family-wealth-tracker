import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { NotificationScheduler } from '@/lib/notification-scheduler';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session.user || session.user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Administrator access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const scheduler = NotificationScheduler.getInstance();
    const history = await scheduler.getNotificationHistory(limit);

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Get notification history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session.user || session.user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Administrator access required' },
        { status: 403 }
      );
    }

    const scheduler = NotificationScheduler.getInstance();
    await scheduler.clearHistory();

    return NextResponse.json({
      message: 'Notification history cleared successfully'
    });
  } catch (error) {
    console.error('Clear notification history error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}