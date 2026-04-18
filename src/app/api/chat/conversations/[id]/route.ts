import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { ChatService } from '@/lib/chat-service';

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
    return NextResponse.json({ conversation, messages });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
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

    await ChatService.deleteConversation(conversationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
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
    if (body.status === 'closed') {
      await ChatService.closeConversation(conversationId);
    }
    if (body.title) {
      await ChatService.updateConversationTitle(conversationId, body.title);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
