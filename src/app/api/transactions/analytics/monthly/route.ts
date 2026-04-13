import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { TransactionService } from '@/lib/transaction-service';
import { CategoryService } from '@/lib/category-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: 'month parameter is required (YYYY-MM format)' }, { status: 400 });
    }

    await CategoryService.seedDefaultCategories(session.user.family_id);
    const summary = await TransactionService.getMonthlySummary(session.user.family_id, month);
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Error fetching monthly analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
