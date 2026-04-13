import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { AIService } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await AIService.testConnection(session.user.family_id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error testing AI connection:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
