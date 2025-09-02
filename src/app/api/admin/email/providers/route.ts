import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUnifiedEmailService } from '@/lib/unified-email-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session.user || session.user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Administrator access required' },
        { status: 403 }
      );
    }

    const emailService = getUnifiedEmailService();
    const providers = await emailService.getAvailableProviders();
    const activeProvider = await emailService.getActiveProvider();

    return NextResponse.json({
      providers,
      activeProvider,
      anyConfigured: emailService.isConfigured()
    });
  } catch (error) {
    console.error('Get email providers error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}