import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { systemLogger, type LogFilters } from '@/lib/system-logger';
import { z } from 'zod';

const logsQuerySchema = z.object({
  level: z.array(z.enum(['info', 'warn', 'error', 'success'])).optional(),
  category: z.array(z.enum(['debt_update', 'email', 'backup', 'system', 'auth'])).optional(),
  status: z.array(z.enum(['started', 'completed', 'failed'])).optional(),
  familyId: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().min(1).max(1000).optional().default(50),
  offset: z.number().min(0).optional().default(0),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.user || session.user.role !== 'administrator') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse query parameters
    const filters: LogFilters = {};
    
    if (searchParams.get('level')) {
      filters.level = searchParams.get('level')!.split(',') as any;
    }
    
    if (searchParams.get('category')) {
      filters.category = searchParams.get('category')!.split(',') as any;
    }
    
    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')!.split(',') as any;
    }
    
    if (searchParams.get('familyId')) {
      filters.familyId = parseInt(searchParams.get('familyId')!);
    }
    
    if (searchParams.get('startDate')) {
      filters.startDate = searchParams.get('startDate')!;
    }
    
    if (searchParams.get('endDate')) {
      filters.endDate = searchParams.get('endDate')!;
    }
    
    filters.limit = parseInt(searchParams.get('limit') || '50');
    filters.offset = parseInt(searchParams.get('offset') || '0');

    // Validate filters
    const validatedFilters = logsQuerySchema.parse(filters);

    // Get logs
    const result = await systemLogger.getLogs(validatedFilters);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching logs:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 });
  }
}

// Delete old logs (cleanup)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession(request);
    if (!session.user || session.user.role !== 'administrator') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { daysToKeep = 90 } = body;

    if (typeof daysToKeep !== 'number' || daysToKeep < 1 || daysToKeep > 365) {
      return NextResponse.json({
        error: 'daysToKeep must be a number between 1 and 365'
      }, { status: 400 });
    }

    const deletedCount = await systemLogger.cleanupOldLogs(daysToKeep);

    return NextResponse.json({
      message: `Successfully cleaned up old logs`,
      deletedCount,
      daysToKeep
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    return NextResponse.json({ error: 'Failed to cleanup logs' }, { status: 500 });
  }
}