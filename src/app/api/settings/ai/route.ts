import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { AIService } from '@/lib/ai-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await AIService.getSettings(session.user.family_id);
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching AI settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request, NextResponse.next());
    if (!session.user?.id || !session.user?.family_id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    await AIService.saveSettings(session.user.family_id, {
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
      model: body.model,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving AI settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
