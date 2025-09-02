import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getUnifiedEmailService } from '@/lib/unified-email-service';

const resendConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  from: z.string().email('Valid from email is required')
});

const testEmailSchema = z.object({
  email: z.string().email('Valid email address is required')
});

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
    const resendService = emailService.getResendService();
    const config = await resendService.getConfig();

    return NextResponse.json({
      configured: resendService.isConfigured(),
      config: config ? {
        from: config.from,
        apiKey: config.apiKey ? '***masked***' : null
      } : null
    });
  } catch (error) {
    console.error('Get Resend config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session.user || session.user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Administrator access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const config = resendConfigSchema.parse(body);

    const emailService = getUnifiedEmailService();
    const resendService = emailService.getResendService();
    
    await resendService.updateConfig(config);

    return NextResponse.json({
      message: 'Resend configuration updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid configuration data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Update Resend config error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session.user || session.user.role !== 'administrator') {
      return NextResponse.json(
        { error: 'Administrator access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    if (body.action === 'test-connection') {
      const emailService = getUnifiedEmailService();
      const resendService = emailService.getResendService();
      const result = await resendService.testConnection();
      
      return NextResponse.json(result);
    }
    
    if (body.action === 'test-email') {
      const { email } = testEmailSchema.parse(body);
      
      const emailService = getUnifiedEmailService();
      const resendService = emailService.getResendService();
      const result = await resendService.sendTestEmail(email);
      
      return NextResponse.json(result);
    }

    if (body.action === 'set-active') {
      const emailService = getUnifiedEmailService();
      await emailService.setProvider('resend');
      
      return NextResponse.json({
        message: 'Resend set as active email provider'
      });
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Resend action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}