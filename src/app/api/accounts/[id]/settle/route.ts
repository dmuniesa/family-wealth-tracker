import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { AccountService } from '@/lib/db-operations';
import { amortizationService } from '@/lib/amortization-service';

const settleActionSchema = z.object({
  action: z.enum(['settle', 'reactivate']).optional().default('settle')
});

// Total amortization: mark a loan as fully paid off, set balance to 0
// and stop automatic monthly updates. Action 'reactivate' undoes it.
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

    // No body sent (legacy settle call) defaults to 'settle'
    let action: 'settle' | 'reactivate' = 'settle';
    try {
      const body = await request.json();
      action = settleActionSchema.parse(body).action;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid action', details: error.issues },
          { status: 400 }
        );
      }
      // Empty or missing body - keep default action
    }

    if (action === 'reactivate') {
      const result = await amortizationService.reactivateLoan(accountId);

      if (result.success) {
        return NextResponse.json({
          message: 'Loan reactivated. Balance restored and automatic updates resumed.',
          restoredBalance: result.restoredBalance,
          remainingMonths: result.remainingMonths
        });
      } else {
        return NextResponse.json({
          error: result.error || 'Failed to reactivate loan'
        }, { status: 400 });
      }
    }

    const result = await amortizationService.settleLoan(accountId);

    if (result.success) {
      return NextResponse.json({
        message: 'Loan fully paid off. Automatic updates stopped.',
        settledAmount: result.settledAmount,
        settledDate: result.settledDate
      });
    } else {
      return NextResponse.json({
        error: result.error || 'Failed to settle loan'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Settle loan error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
