import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { amortizationService } from '@/lib/amortization-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const summaries = await amortizationService.getDebtSummaries(session.user.family_id);
    
    return NextResponse.json({ summaries });
  } catch (error) {
    console.error('Get debt summaries error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}