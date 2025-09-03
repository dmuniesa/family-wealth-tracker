import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { systemLogger } from '@/lib/system-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.user || session.user.role !== 'administrator') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '7');

    if (days < 1 || days > 365) {
      return NextResponse.json({
        error: 'Days parameter must be between 1 and 365'
      }, { status: 400 });
    }

    const stats = await systemLogger.getLogStats(days);

    return NextResponse.json({
      ...stats,
      period: `${days} days`
    });
  } catch (error) {
    console.error('Error fetching log statistics:', error);
    return NextResponse.json({ error: 'Failed to fetch log statistics' }, { status: 500 });
  }
}