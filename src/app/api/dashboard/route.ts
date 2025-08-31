import { NextRequest, NextResponse } from 'next/server';
import { BalanceService } from '@/lib/db-operations';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const dashboardData = await BalanceService.getDashboardData(session.user.family_id);
    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Get dashboard data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}