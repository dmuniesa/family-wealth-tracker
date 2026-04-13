import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { TransferRuleService } from '@/lib/transfer-rule-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await TransferRuleService.seedDefaultRules(session.user.family_id);
    const rules = await TransferRuleService.getRulesByFamily(session.user.family_id);
    return NextResponse.json(rules);
  } catch (error) {
    console.error('Error fetching transfer rules:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { rule_type, pattern, field } = body;

    if (!rule_type || !pattern) {
      return NextResponse.json({ error: 'rule_type and pattern are required' }, { status: 400 });
    }

    const id = await TransferRuleService.createRule(session.user.family_id, {
      rule_type,
      pattern,
      field: field || 'any',
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error('Error creating transfer rule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
