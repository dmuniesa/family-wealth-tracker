import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { getUnifiedEmailService } from '@/lib/unified-email-service';
import { NotificationScheduler } from '@/lib/notification-scheduler';

const testEmailSchema = z.object({
  type: z.enum(['connection', 'weekly-report']),
  email: z.string().email(),
  familyId: z.number().optional()
});

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
    const { type, email, familyId } = testEmailSchema.parse(body);

    const emailService = getUnifiedEmailService();
    
    if (!emailService.isConfigured()) {
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 400 }
      );
    }

    let result: { success: boolean; error?: string; provider?: string };

    if (type === 'connection') {
      // Test basic email connection
      result = await emailService.sendTestEmail(email);
    } else {
      // Test weekly report
      if (!familyId) {
        return NextResponse.json(
          { error: 'familyId is required for weekly report test' },
          { status: 400 }
        );
      }

      const scheduler = NotificationScheduler.getInstance();
      result = await scheduler.sendTestReport(familyId, email, {
        locale: 'en', // TODO: Get from user preferences
        includeCharts: true,
        customMessage: 'This is a test email to verify your weekly report configuration.'
      });
    }

    if (result.success) {
      const activeProvider = await emailService.getActiveProvider();
      return NextResponse.json({
        message: `Test email sent successfully via ${activeProvider || 'unknown'}`,
        provider: activeProvider
      });
    } else {
      return NextResponse.json(
        { error: `Test email failed: ${result.error}` },
        { status: 400 }
      );
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}