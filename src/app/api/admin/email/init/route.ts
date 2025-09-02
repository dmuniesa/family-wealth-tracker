import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { initializeEmailService } from '@/lib/init-email-service';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session.user || session.user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Administrator access required' },
        { status: 403 }
      );
    }

    await initializeEmailService();

    return NextResponse.json({
      message: 'Email service initialized successfully'
    });
  } catch (error) {
    console.error('Initialize email service error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}