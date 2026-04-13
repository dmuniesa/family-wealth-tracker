import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { TransactionService } from '@/lib/transaction-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }

    const deleted = await TransactionService.batchDelete(ids, session.user.family_id);
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error('Error batch deleting transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
