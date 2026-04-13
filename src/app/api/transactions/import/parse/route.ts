import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { detectAndParse } from '@/lib/parsers';
import { TransactionService } from '@/lib/transaction-service';
import { CategoryService } from '@/lib/category-service';
import { TransferRuleService } from '@/lib/transfer-rule-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = session.user.family_id;
    await CategoryService.seedDefaultCategories(familyId);
    await TransferRuleService.seedDefaultRules(familyId);

    const formData = await request.formData();
    const file = formData.get('csvFile') as File;
    const accountIdStr = formData.get('accountId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (!accountIdStr) {
      return NextResponse.json({ error: 'accountId is required' }, { status: 400 });
    }

    const accountId = parseInt(accountIdStr);
    const csvText = await file.text();

    // Parse CSV
    const parseResult = detectAndParse(csvText);

    if (parseResult.detectedFormat === 'unknown') {
      return NextResponse.json({
        error: 'Unrecognized CSV format',
        errors: parseResult.errors,
      }, { status: 400 });
    }

    // Check duplicates
    const { newTransactions, duplicates } = await TransactionService.checkDuplicates(
      accountId,
      parseResult.transactions
    );

    // Mark transfers
    const markedTransactions = await TransactionService.markTransfers(familyId, newTransactions);

    return NextResponse.json({
      format: parseResult.detectedFormat,
      totalParsed: parseResult.transactions.length,
      newCount: newTransactions.length,
      duplicateCount: duplicates.length,
      parseErrors: parseResult.errors,
      transactions: markedTransactions.map(t => ({
        ...t.transaction,
        isTransfer: t.isTransfer,
      })),
      duplicates: duplicates,
    });
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
