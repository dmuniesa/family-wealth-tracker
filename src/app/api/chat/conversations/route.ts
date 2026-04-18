import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ChatService } from '@/lib/chat-service';
import type { ConversationType } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as ConversationType | null;
    const status = searchParams.get('status') || undefined;
    const userId = searchParams.get('userId') ? Number(searchParams.get('userId')) : undefined;

    const conversations = await ChatService.getConversationsByFamily(
      session.user.family_id,
      { type: type || undefined, status, userId }
    );

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.family_id || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, type } = body;

    const id = await ChatService.createConversation(
      session.user.family_id,
      session.user.id,
      title || '',
      type || 'manual'
    );

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
