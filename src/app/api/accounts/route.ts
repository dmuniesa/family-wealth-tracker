import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AccountService } from '@/lib/db-operations';
import { getSession } from '@/lib/auth';

const createAccountSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['Banking', 'Investment']),
  currency: z.string().min(3).max(3),
  iban: z.string().min(10),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const accounts = await AccountService.getAccountsByFamilyId(session.user.family_id);
    return NextResponse.json(accounts);
  } catch (error) {
    console.error('Get accounts error:', error);
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
    const { name, category, currency, iban, notes } = createAccountSchema.parse(body);

    const accountId = await AccountService.createAccount(
      session.user.family_id,
      name,
      category,
      currency,
      iban,
      notes
    );

    return NextResponse.json({ message: 'Account created successfully', accountId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Create account error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}