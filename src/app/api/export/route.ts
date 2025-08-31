import { NextRequest, NextResponse } from 'next/server';
import { AccountService, BalanceService } from '@/lib/db-operations';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const [accounts, balances] = await Promise.all([
      AccountService.getAccountsByFamilyId(session.user.family_id),
      BalanceService.getBalancesByFamilyId(session.user.family_id)
    ]);

    const accountMap = new Map(accounts.map(acc => [acc.id, acc]));

    const csvHeader = 'Date,Account Name,Account Category,Currency,IBAN,Amount\n';
    
    const csvRows = balances.map(balance => {
      const account = accountMap.get(balance.account_id);
      return [
        balance.date,
        account?.name || 'Unknown Account',
        account?.category || 'Unknown',
        account?.currency || 'EUR',
        account?.iban_encrypted || '',
        balance.amount.toString()
      ].map(field => `"${field}"`).join(',');
    });

    const csvContent = csvHeader + csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="wealth-tracker-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}