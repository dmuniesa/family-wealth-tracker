import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const db = await getDatabase();
    
    // Get all balance records with their dates
    const balanceRecords = await db.all(`
      SELECT 
        DATE(b.date) as date,
        a.category,
        b.amount,
        b.account_id,
        ROW_NUMBER() OVER (PARTITION BY b.account_id, DATE(b.date) ORDER BY b.created_at DESC) as rn
      FROM balances b
      JOIN accounts a ON b.account_id = a.id
      WHERE a.family_id = ?
      ORDER BY DATE(b.date) ASC
    `, [session.user.family_id]);

    // Filter to get only the latest balance per account per date
    const latestBalances = balanceRecords.filter((record: any) => record.rn === 1);

    // Get date range
    if (latestBalances.length === 0) {
      return NextResponse.json([]);
    }

    const minDate = new Date(latestBalances[0].date);
    const maxDate = new Date(latestBalances[latestBalances.length - 1].date);
    
    // Generate day-by-day data
    const historicalData = [];
    const currentDate = new Date(minDate);
    
    // Track the last known balance for each account
    const accountBalances = new Map();

    while (currentDate <= maxDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Update account balances for this date
      latestBalances
        .filter((record: any) => record.date === dateStr)
        .forEach((record: any) => {
          accountBalances.set(record.account_id, {
            amount: record.amount,
            category: record.category
          });
        });

      // Calculate totals for this date
      let totalBanking = 0;
      let totalInvestment = 0;
      let totalDebt = 0;

      for (const [accountId, balance] of accountBalances.entries()) {
        switch (balance.category) {
          case 'Banking':
            totalBanking += balance.amount;
            break;
          case 'Investment':
            totalInvestment += balance.amount;
            break;
          case 'Debt':
            totalDebt += balance.amount;
            break;
        }
      }

      const totalActive = totalBanking + totalInvestment;
      const netWorth = totalActive - totalDebt;

      if (totalActive > 0 || totalDebt > 0) {
        historicalData.push({
          date: dateStr,
          total_active: totalActive,
          net_worth: netWorth,
          total_banking: totalBanking,
          total_investment: totalInvestment,
          total_debt: totalDebt
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json(historicalData);
  } catch (error) {
    console.error('Get historical data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}