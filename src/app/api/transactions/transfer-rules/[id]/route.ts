import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { TransferRuleService } from '@/lib/transfer-rule-service';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    await TransferRuleService.updateRule(parseInt(id), body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating transfer rule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await TransferRuleService.deleteRule(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transfer rule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
