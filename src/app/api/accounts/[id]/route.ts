import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AccountService } from '@/lib/db-operations';
import { getSession } from '@/lib/auth';

const updateAccountSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['Banking', 'Investment', 'Debt']),
  currency: z.string().min(3).max(3),
  iban: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.category === 'Debt') {
    return true;
  }
  return data.iban && data.iban.length >= 10;
}, {
  message: 'IBAN is required for Banking and Investment accounts',
  path: ['iban']
});

export async function PUT(
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
    const body = await request.json();
    const { name, category, currency, iban, notes } = updateAccountSchema.parse(body);

    const existingAccount = await AccountService.getAccountById(accountId);
    if (!existingAccount || existingAccount.family_id !== session.user.family_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    await AccountService.updateAccount(accountId, name, category, currency, iban, notes);

    return NextResponse.json({ message: 'Account updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Update account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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
    const existingAccount = await AccountService.getAccountById(accountId);
    
    if (!existingAccount || existingAccount.family_id !== session.user.family_id) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    await AccountService.deleteAccount(accountId);

    return NextResponse.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}