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
    
    const historicalData = await db.all(`
      SELECT 
        DATE(b.date) as date,
        SUM(b.amount) as net_worth
      FROM balances b
      JOIN accounts a ON b.account_id = a.id
      WHERE a.family_id = ?
      GROUP BY DATE(b.date)
      ORDER BY DATE(b.date) ASC
    `, [session.user.family_id]);

    return NextResponse.json(historicalData);
  } catch (error) {
    console.error('Get historical data error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}