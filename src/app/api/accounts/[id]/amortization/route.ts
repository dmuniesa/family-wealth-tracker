import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/database';
import { amortizationService } from '@/lib/amortization-service';
import type { Account } from '@/types';

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

    // Get account and verify ownership
    const account = await db.get(`
      SELECT a.*, 
             COALESCE(
               (SELECT amount FROM balances 
                WHERE account_id = a.id 
                ORDER BY date DESC, created_at DESC 
                LIMIT 1), 
               0
             ) as current_balance
      FROM accounts a 
      WHERE a.id = ? AND a.family_id = ? AND a.category = 'Debt'
    `, [accountId, session.user.family_id]) as Account & { current_balance: number };

    if (!account) {
      return NextResponse.json({ error: 'Debt account not found' }, { status: 404 });
    }

    // Generate amortization schedule
    const schedule = amortizationService.generateAmortizationSchedule(account, account.current_balance);
    const nextPayment = amortizationService.calculateNextPayment(account, account.current_balance);

    return NextResponse.json({
      account,
      schedule,
      nextPayment,
      currentBalance: account.current_balance
    });
  } catch (error) {
    console.error('Get amortization error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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
    const db = await getDatabase();

    // Verify ownership
    const account = await db.get(`
      SELECT id FROM accounts 
      WHERE id = ? AND family_id = ? AND category = 'Debt'
    `, [accountId, session.user.family_id]);

    if (!account) {
      return NextResponse.json({ error: 'Debt account not found' }, { status: 404 });
    }

    // Apply monthly update
    const result = await amortizationService.applyMonthlyUpdate(accountId);
    
    return NextResponse.json({
      success: result.success,
      newBalance: result.newBalance,
      interestAdded: result.interestAdded,
      error: result.error
    });
  } catch (error) {
    console.error('Apply monthly update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}