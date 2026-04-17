import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { CategoryService } from '@/lib/category-service';
import { AIService } from '@/lib/ai-service';
import type { Transaction } from '@/types';

interface PreviewTransaction {
  index: number;
  description: string;
  detail?: string;
  amount: number;
  movementType?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = session.user.family_id;
    const body = await request.json();
    const { transactions } = body as { transactions: PreviewTransaction[] };

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ error: 'transactions must be a non-empty array' }, { status: 400 });
    }

    // Get categories
    const categories = await CategoryService.getCategoriesByFamily(familyId);

    // Build temporary Transaction-like objects for AI (use index as fake id)
    const fakeTransactions: Transaction[] = transactions.map(t => ({
      id: t.index,
      account_id: 0,
      family_id: familyId,
      amount: t.amount,
      currency: 'EUR',
      date: '',
      description: t.description,
      detail: t.detail || null,
      movement_type: t.movementType || null,
      is_transfer: false,
      source_hash: '',
      created_at: '',
      updated_at: '',
    }));

    // Call AI categorization
    const results = await AIService.categorizeTransactions(familyId, fakeTransactions, categories);

    // Map results back using index
    const categorizations = results.map(r => ({
      index: r.transactionId,
      categoryId: r.categoryId,
      confidence: r.confidence,
    }));

    return NextResponse.json({ categorizations });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error categorizing preview:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
