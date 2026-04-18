import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ChatService } from '@/lib/chat-service';
import type { ChatMessageRole } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = Number(id);
    const conversation = await ChatService.getConversationById(conversationId);

    if (!conversation || conversation.family_id !== session.user.family_id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const messages = await ChatService.getMessages(conversationId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = Number(id);
    const conversation = await ChatService.getConversationById(conversationId);

    if (!conversation || conversation.family_id !== session.user.family_id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const { role, content } = body;

    if (!role || !content) {
      return NextResponse.json({ error: 'role and content are required' }, { status: 400 });
    }

    const messageId = await ChatService.addMessage(
      conversationId,
      role as ChatMessageRole,
      content
    );

    return NextResponse.json({ id: messageId }, { status: 201 });
  } catch (error) {
    console.error('Error adding message:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
