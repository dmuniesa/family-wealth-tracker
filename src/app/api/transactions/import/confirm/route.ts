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
    const { accountId, transactions, source } = body;

    if (!accountId || !Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'accountId and transactions array are required' }, { status: 400 });
    }

    const inputs = transactions.map((t: any) => ({
      accountId,
      familyId: session.user!.family_id!,
      parsed: {
        date: t.date,
        valueDate: t.valueDate || undefined,
        description: t.description,
        detail: t.detail || undefined,
        amount: t.amount,
        currency: t.currency || 'EUR',
        movementType: t.movementType || undefined,
        balanceAfter: t.balanceAfter || undefined,
        observations: t.observations || undefined,
      },
      isTransfer: t.isTransfer || false,
      source: source || 'csv',
    }));

    const result = await TransactionService.createTransactions(inputs);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error confirming import:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
