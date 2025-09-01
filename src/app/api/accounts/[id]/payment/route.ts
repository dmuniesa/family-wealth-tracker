import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/database';
import { amortizationService } from '@/lib/amortization-service';

const recordPaymentSchema = z.object({
  amount: z.number().min(0.01),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  paymentType: z.enum(['principal', 'interest', 'mixed']).optional().default('mixed'),
  principalAmount: z.number().min(0).optional(),
  interestAmount: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(request);
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const accountId = parseInt(params.id);
    const body = await request.json();
    const validatedData = recordPaymentSchema.parse(body);

    const db = await getDatabase();

    // Get account and verify ownership and that it's a debt account
    const account = await db.get(`
      SELECT a.*, 
             COALESCE(
               (SELECT amount FROM balances 
                WHERE account_id = a.id 
                ORDER BY date DESC, created_at DESC 
                LIMIT 1), 
               a.original_balance,
               0
             ) as current_balance
      FROM accounts a 
      WHERE a.id = ? AND a.family_id = ? AND a.category = 'Debt'
    `, [accountId, session.user.family_id]);

    if (!account) {
      return NextResponse.json({ error: 'Debt account not found' }, { status: 404 });
    }

    let { amount, date, paymentType, principalAmount, interestAmount, notes } = validatedData;
    const currentBalance = account.current_balance;

    // Calculate payment breakdown if needed
    if (paymentType === 'mixed' && account.apr_rate && (!principalAmount || !interestAmount)) {
      const nextPayment = amortizationService.calculateNextPayment(account, currentBalance);
      if (nextPayment) {
        // Auto-calculate breakdown based on amortization schedule
        const ratio = amount / nextPayment.totalPayment;
        principalAmount = principalAmount ?? Math.min(nextPayment.principalPayment * ratio, currentBalance);
        interestAmount = interestAmount ?? (amount - principalAmount);
      }
    } else if (paymentType === 'principal') {
      principalAmount = Math.min(amount, currentBalance);
      interestAmount = 0;
    } else if (paymentType === 'interest') {
      principalAmount = 0;
      interestAmount = amount;
    }

    // Ensure we don't overpay principal
    principalAmount = Math.min(principalAmount || 0, currentBalance);
    interestAmount = interestAmount || 0;

    // Calculate new balance (debt is reduced by principal payment only)
    const newBalance = Math.max(0, currentBalance - (principalAmount || 0));

    // Record the payment as a balance entry
    await db.run(`
      INSERT INTO balances (
        account_id, amount, date, balance_type, 
        interest_amount, principal_amount, payment_amount, notes,
        created_at, updated_at
      )
      VALUES (?, ?, ?, 'payment', ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      accountId,
      newBalance,
      date,
      interestAmount,
      principalAmount,
      amount,
      notes || `Payment: $${principalAmount?.toFixed(2) || '0.00'} principal, $${interestAmount?.toFixed(2) || '0.00'} interest`
    ]);

    // Update remaining months if we paid principal and have amortization data
    if (principalAmount && principalAmount > 0 && account.remaining_months) {
      // Estimate how many months this payment advances us
      let monthsReduced = 0;
      if (account.monthly_payment && account.monthly_payment > 0) {
        monthsReduced = Math.floor(principalAmount / account.monthly_payment);
      }
      
      const newRemainingMonths = Math.max(0, account.remaining_months - monthsReduced);
      await db.run(`
        UPDATE accounts 
        SET remaining_months = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newRemainingMonths, accountId]);
    }

    return NextResponse.json({
      message: 'Payment recorded successfully',
      newBalance,
      principalPaid: principalAmount || 0,
      interestPaid: interestAmount || 0,
      totalPaid: amount
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid payment data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Record payment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession(request);
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const accountId = parseInt(params.id);
    const db = await getDatabase();

    // Verify ownership
    const account = await db.get(`
      SELECT id FROM accounts 
      WHERE id = ? AND family_id = ? AND category = 'Debt'
    `, [accountId, session.user.family_id]);

    if (!account) {
      return NextResponse.json({ error: 'Debt account not found' }, { status: 404 });
    }

    // Get payment history
    const payments = await db.all(`
      SELECT 
        date,
        amount as balance,
        payment_amount,
        principal_amount,
        interest_amount,
        balance_type,
        notes,
        created_at
      FROM balances 
      WHERE account_id = ? AND balance_type = 'payment'
      ORDER BY date DESC, created_at DESC
      LIMIT 50
    `, [accountId]);

    return NextResponse.json({ payments });
  } catch (error) {
    console.error('Get payment history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}