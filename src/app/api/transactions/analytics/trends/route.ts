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
    const months = searchParams.get('months') ? parseInt(searchParams.get('months')!) : 6;

    await CategoryService.seedDefaultCategories(session.user.family_id);
    const trends = await TransactionService.getTrends(session.user.family_id, months);
    return NextResponse.json(trends);
  } catch (error) {
    console.error('Error fetching trends:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
