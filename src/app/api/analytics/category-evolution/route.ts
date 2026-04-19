import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { TransactionService } from '@/lib/transaction-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const months = searchParams.get('months') ? parseInt(searchParams.get('months')!) : 6;

    const evolution = await TransactionService.getCategoryEvolution(
      session.user.family_id, months
    );
    return NextResponse.json(evolution);
  } catch (error) {
    console.error('Error fetching category evolution:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
