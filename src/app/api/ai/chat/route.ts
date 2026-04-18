import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { AIService } from '@/lib/ai-service';
import { ChatService } from '@/lib/chat-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session?.user?.family_id || !session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, context, conversationId } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > 2000) {
      return NextResponse.json({ error: 'Message too long' }, { status: 400 });
    }

    // Get or create active conversation
    let convId = conversationId;
    if (!convId) {
      const { id } = await ChatService.getOrCreateActiveConversation(
        session.user.family_id,
        session.user.id
      );
      convId = id;
    }

    // Save user message
    await ChatService.addMessage(convId, 'user', message.trim());

    // Update conversation title from first message if empty
    const conv = await ChatService.getConversationById(convId);
    if (conv && !conv.title) {
      const title = message.trim().substring(0, 80) + (message.trim().length > 80 ? '...' : '');
      await ChatService.updateConversationTitle(convId, title);
    }

    const response = await AIService.chat(session.user.family_id, message.trim(), context);

    // Save AI response
    const timestamp = new Date().toISOString();
    await ChatService.addMessage(convId, 'ai-response', response);

    return NextResponse.json({
      response,
      timestamp,
      conversationId: convId,
    });
  } catch (error) {
    console.error('[AI Chat] Error:', error);
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: msg },
      { status: msg.includes('No API key') ? 400 : 500 }
    );
  }
}
