import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BalanceService, AccountService } from '@/lib/db-operations';
import { getSession } from '@/lib/auth';

const createBalanceSchema = z.object({
  account_id: z.number(),
  amount: z.number(),
  date: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const url = new URL(request.url);
    const accountId = url.searchParams.get('account_id');

    if (accountId) {
      const account = await AccountService.getAccountById(parseInt(accountId));
      if (!account || account.family_id !== session.user.family_id) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
      
      const balances = await BalanceService.getBalancesByAccountId(parseInt(accountId));
      return NextResponse.json(balances);
    } else {
      const balances = await BalanceService.getBalancesByFamilyId(session.user.family_id);
      return NextResponse.json(balances);
    }
  } catch (error) {
    console.error('Get balances error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { account_id, amount, date } = createBalanceSchema.parse(body);

    const account = await AccountService.getAccountById(account_id);
    if (!account || account.family_id !== session.user.family_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const balanceId = await BalanceService.createBalance(account_id, amount, date);

    return NextResponse.json({ message: 'Balance created successfully', balanceId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Create balance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}