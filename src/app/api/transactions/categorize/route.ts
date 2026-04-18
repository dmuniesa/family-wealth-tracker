import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { TransactionService } from '@/lib/transaction-service';
import { CategoryService } from '@/lib/category-service';
import { AIService } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const familyId = session.user.family_id;
    const body = await request.json();
    const { transactionIds } = body;

    if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json({ error: 'transactionIds must be a non-empty array' }, { status: 400 });
    }

    // Fetch transactions
    const transactions = [];
    for (const id of transactionIds) {
      const tx = await TransactionService.getTransactionById(id);
      if (tx && tx.family_id === familyId) {
        transactions.push(tx);
      }
    }

    if (transactions.length === 0) {
      return NextResponse.json({ error: 'No valid transactions found' }, { status: 404 });
    }

    // Get categories
    const categories = await CategoryService.getCategoriesByFamily(familyId);

    // Categorize using AI (in batches of 50)
    let categorized = 0;
    let failed = 0;
    const batchSize = 50;
    const allLogs: Array<{ type: string; message: string }> = [];

    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      try {
        const { categorizations, logs } = await AIService.categorizeTransactions(familyId, batch, categories);
        allLogs.push(...logs);

        // Apply results
        for (const result of categorizations) {
          const category = categories.find(c => c.id === result.categoryId);
          if (category) {
            await TransactionService.updateTransaction(result.transactionId, {
              category_id: result.categoryId,
            });
            categorized++;
          }
        }
      } catch (error) {
        console.error('AI categorization batch failed:', error);
        failed += batch.length;
        allLogs.push({ type: 'error', message: `Batch failed: ${(error as Error).message}` });
      }
    }

    return NextResponse.json({ categorized, failed, aiLogs: allLogs });
  } catch (error) {
    console.error('Error categorizing transactions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
