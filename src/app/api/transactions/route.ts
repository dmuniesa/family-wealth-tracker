import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { TransactionService } from '@/lib/transaction-service';
import { CategoryService } from '@/lib/category-service';
import { TransferRuleService } from '@/lib/transfer-rule-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = session.user.family_id;

    // Ensure categories and rules are seeded
    await CategoryService.seedDefaultCategories(familyId);
    await TransferRuleService.seedDefaultRules(familyId);

    const { searchParams } = new URL(request.url);
    const filters = {
      accountId: searchParams.get('accountId') ? parseInt(searchParams.get('accountId')!) : undefined,
      month: searchParams.get('month') || undefined,
      categoryId: searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!) : undefined,
      isTransfer: searchParams.get('isTransfer') !== null
        ? searchParams.get('isTransfer') === 'true'
        : undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
    };

    const result = await TransactionService.getTransactions(familyId, filters);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
