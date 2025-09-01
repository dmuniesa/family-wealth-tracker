import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { NotificationScheduler } from '@/lib/notification-scheduler';

const sendReportSchema = z.object({
  familyId: z.number().optional(),
  allFamilies: z.boolean().default(false)
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
    const { familyId, allFamilies } = sendReportSchema.parse(body);

    const scheduler = NotificationScheduler.getInstance();

    if (allFamilies) {
      // Send to all families
      await scheduler.sendWeeklyReportsToAllFamilies();
      
      return NextResponse.json({
        message: 'Weekly reports sent to all families'
      });
    } else if (familyId) {
      // Send to specific family
      const result = await scheduler.sendWeeklyReportToFamily(familyId, {
        locale: 'en', // TODO: Get from family preferences
        includeCharts: true
      });

      if (result.success) {
        return NextResponse.json({
          message: `Weekly report sent successfully to family ${familyId}`
        });
      } else {
        return NextResponse.json(
          { error: `Failed to send weekly report: ${result.error}` },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Either familyId or allFamilies must be specified' },
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
    
    console.error('Send notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}