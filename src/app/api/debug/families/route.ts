import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const db = await getDatabase();
    const families = await db.all(`
      SELECT family_id, COUNT(*) as member_count 
      FROM users 
      GROUP BY family_id 
      ORDER BY family_id
    `);
    
    return NextResponse.json({ families });
  } catch (error) {
    console.error('Debug families error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}