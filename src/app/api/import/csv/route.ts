import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { AccountService, BalanceService } from '@/lib/db-operations';

interface CSVRow {
  accountName: string;
  amount: number;
  date: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('csvFile') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'File must be a CSV' }, { status: 400 });
    }

    const csvText = await file.text();
    const rows = csvText.split('\n').map(row => row.trim()).filter(row => row);
    
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV must have header and data rows' }, { status: 400 });
    }

    // Parse CSV
    const csvData: CSVRow[] = [];
    const errors: string[] = [];
    
    // Skip header row (assuming first row is header)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const columns = row.split(',').map(col => col.trim().replace(/^"(.*)"$/, '$1'));
      
      if (columns.length < 3) {
        errors.push(`Row ${i + 1}: Missing columns (expected: Account Name, Amount, Date)`);
        continue;
      }

      const [accountName, amountStr, dateStr] = columns;
      
      // Validate amount
      const amount = parseFloat(amountStr);
      if (isNaN(amount)) {
        errors.push(`Row ${i + 1}: Invalid amount "${amountStr}"`);
        continue;
      }

      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(dateStr)) {
        errors.push(`Row ${i + 1}: Invalid date format "${dateStr}" (expected: YYYY-MM-DD)`);
        continue;
      }

      csvData.push({
        accountName: accountName,
        amount: amount,
        date: dateStr
      });
    }

    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'CSV validation failed', 
        details: errors 
      }, { status: 400 });
    }

    // Get family accounts
    const accounts = await AccountService.getAccountsByFamilyId(session.user.family_id);
    const accountMap = new Map(accounts.map(acc => [acc.name.toLowerCase(), acc.id]));

    // Process imports
    const importResults = {
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const row of csvData) {
      try {
        const accountId = accountMap.get(row.accountName.toLowerCase());
        
        if (!accountId) {
          importResults.failed++;
          importResults.errors.push(`Account "${row.accountName}" not found`);
          continue;
        }

        await BalanceService.createBalance(accountId, row.amount, row.date);
        importResults.successful++;
        
      } catch (error) {
        importResults.failed++;
        importResults.errors.push(`Failed to import balance for "${row.accountName}": ${error}`);
      }
    }

    return NextResponse.json({
      message: 'Import completed',
      results: importResults
    });

  } catch (error) {
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}