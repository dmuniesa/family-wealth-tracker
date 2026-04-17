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
    const { ids, updates } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json({ error: 'updates object is required' }, { status: 400 });
    }

    // Validate updates only contain allowed fields
    const allowedFields = ['category_id', 'notes', 'is_transfer'];
    const filteredUpdates: Record<string, unknown> = {};
    for (const key of Object.keys(updates)) {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const updated = await TransactionService.batchUpdate(ids, session.user.family_id, filteredUpdates);
    return NextResponse.json({ updated });
  } catch (error) {
    console.error('Error batch updating transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}