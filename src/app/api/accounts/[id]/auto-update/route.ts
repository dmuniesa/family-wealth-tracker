import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { AccountService } from '@/lib/db-operations';
import { amortizationService } from '@/lib/amortization-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request);
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const accountId = parseInt(id);
    
    // Verify account belongs to user's family
    const account = await AccountService.getAccountById(accountId);
    if (!account || account.family_id !== session.user.family_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.category !== 'Debt') {
      return NextResponse.json({ error: 'Account is not a debt account' }, { status: 400 });
    }

    // Apply monthly update
    const result = await amortizationService.applyMonthlyUpdate(accountId);

    if (result.success) {
      return NextResponse.json({
        message: 'Monthly update applied successfully',
        newBalance: result.newBalance,
        interestAdded: result.interestAdded
      });
    } else {
      return NextResponse.json({
        error: result.error || 'Failed to apply monthly update'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Auto-update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}