import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { BalanceService } from '@/lib/db-operations';
import { getSession } from '@/lib/auth';

const updateBalanceSchema = z.object({
  amount: z.number(),
  date: z.string(),
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
    const balanceId = parseInt(id);
    const body = await request.json();
    const { amount, date } = updateBalanceSchema.parse(body);

    await BalanceService.updateBalance(balanceId, amount, date);

    return NextResponse.json({ message: 'Balance updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Update balance error:', error);
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
    const balanceId = parseInt(id);
    await BalanceService.deleteBalance(balanceId);

    return NextResponse.json({ message: 'Balance deleted successfully' });
  } catch (error) {
    console.error('Delete balance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}