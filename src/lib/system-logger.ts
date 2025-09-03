import { getDatabase } from './database';

export type LogLevel = 'info' | 'warn' | 'error' | 'success';
export type LogCategory = 'debt_update' | 'email' | 'backup' | 'system' | 'auth';
export type LogStatus = 'started' | 'completed' | 'failed';

export interface SystemLogEntry {
  id?: number;
  timestamp?: string;
  level: LogLevel;
  category: LogCategory;
  operation: string;
  details?: string;
  familyId?: number;
  userId?: number;
  durationMs?: number;
  status: LogStatus;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

export interface LogFilters {
  level?: LogLevel[];
  category?: LogCategory[];
  status?: LogStatus[];
  familyId?: number;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export class SystemLogger {
  private static instance: SystemLogger | null = null;

  static getInstance(): SystemLogger {
    if (!this.instance) {
      this.instance = new SystemLogger();
    }
    return this.instance;
  }

  /**
   * Log a new entry to the system logs
   */
  async log(entry: SystemLogEntry): Promise<void> {
    try {
      const db = await getDatabase();
      
      const metadataJson = entry.metadata ? JSON.stringify(entry.metadata) : null;
      
      await db.run(`
        INSERT INTO system_logs (
          level, category, operation, details, family_id, user_id,
          duration_ms, status, error_message, metadata, timestamp
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        entry.level,
        entry.category,
        entry.operation,
        entry.details || null,
        entry.familyId || null,
        entry.userId || null,
        entry.durationMs || null,
        entry.status,
        entry.errorMessage || null,
        metadataJson
      ]);
    } catch (error) {
      console.error('Failed to write to system log:', error);
      // Don't throw - logging failures shouldn't crash the application
    }
  }

  /**
   * Log the start of an operation
   */
  async logStart(
    category: LogCategory,
    operation: string,
    details?: string,
    familyId?: number,
    userId?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      level: 'info',
      category,
      operation,
      details,
      familyId,
      userId,
      status: 'started',
      metadata
    });
  }

  /**
   * Log the successful completion of an operation
   */
  async logSuccess(
    category: LogCategory,
    operation: string,
    details?: string,
    familyId?: number,
    userId?: number,
    durationMs?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      level: 'success',
      category,
      operation,
      details,
      familyId,
      userId,
      durationMs,
      status: 'completed',
      metadata
    });
  }

  /**
   * Log an operation failure
   */
  async logError(
    category: LogCategory,
    operation: string,
    error: string | Error,
    details?: string,
    familyId?: number,
    userId?: number,
    durationMs?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const errorMessage = error instanceof Error ? error.message : error;
    
    await this.log({
      level: 'error',
      category,
      operation,
      details,
      familyId,
      userId,
      durationMs,
      status: 'failed',
      errorMessage,
      metadata
    });
  }

  /**
   * Log a warning
   */
  async logWarning(
    category: LogCategory,
    operation: string,
    details?: string,
    familyId?: number,
    userId?: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.log({
      level: 'warn',
      category,
      operation,
      details,
      familyId,
      userId,
      status: 'completed',
      metadata
    });
  }

  /**
   * Create a performance timer for an operation
   */
  createTimer(
    category: LogCategory,
    operation: string,
    familyId?: number,
    userId?: number,
    metadata?: Record<string, any>
  ) {
    const startTime = Date.now();
    
    // Log start immediately
    this.logStart(category, operation, undefined, familyId, userId, metadata);

    return {
      success: async (details?: string, additionalMetadata?: Record<string, any>) => {
        const duration = Date.now() - startTime;
        const finalMetadata = { ...metadata, ...additionalMetadata };
        await this.logSuccess(category, operation, details, familyId, userId, duration, finalMetadata);
      },
      
      error: async (error: string | Error, details?: string, additionalMetadata?: Record<string, any>) => {
        const duration = Date.now() - startTime;
        const finalMetadata = { ...metadata, ...additionalMetadata };
        await this.logError(category, operation, error, details, familyId, userId, duration, finalMetadata);
      }
    };
  }

  /**
   * Retrieve logs with filtering and pagination
   */
  async getLogs(filters: LogFilters = {}): Promise<{
    logs: SystemLogEntry[];
    total: number;
    hasMore: boolean;
  }> {
    try {
      const db = await getDatabase();
      
      // Build WHERE clause
      const conditions: string[] = [];
      const params: any[] = [];

      if (filters.level && filters.level.length > 0) {
        const placeholders = filters.level.map(() => '?').join(',');
        conditions.push(`level IN (${placeholders})`);
        params.push(...filters.level);
      }

      if (filters.category && filters.category.length > 0) {
        const placeholders = filters.category.map(() => '?').join(',');
        conditions.push(`category IN (${placeholders})`);
        params.push(...filters.category);
      }

      if (filters.status && filters.status.length > 0) {
        const placeholders = filters.status.map(() => '?').join(',');
        conditions.push(`status IN (${placeholders})`);
        params.push(...filters.status);
      }

      if (filters.familyId) {
        conditions.push('family_id = ?');
        params.push(filters.familyId);
      }

      if (filters.startDate) {
        conditions.push('timestamp >= ?');
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        conditions.push('timestamp <= ?');
        params.push(filters.endDate);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `SELECT COUNT(*) as count FROM system_logs ${whereClause}`;
      const countResult = await db.get(countQuery, params) as { count: number };
      const total = countResult.count;

      // Get logs with pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      
      const logsQuery = `
        SELECT * FROM system_logs 
        ${whereClause}
        ORDER BY timestamp DESC 
        LIMIT ? OFFSET ?
      `;
      
      const logs = await db.all(logsQuery, [...params, limit, offset]) as SystemLogEntry[];
      
      // Parse metadata JSON
      const parsedLogs = logs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata as string) : undefined
      }));

      return {
        logs: parsedLogs,
        total,
        hasMore: offset + logs.length < total
      };
      
    } catch (error) {
      console.error('Failed to retrieve system logs:', error);
      return {
        logs: [],
        total: 0,
        hasMore: false
      };
    }
  }

  /**
   * Clean up old logs (keep last N days)
   */
  async cleanupOldLogs(daysToKeep: number = 90): Promise<number> {
    try {
      const db = await getDatabase();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      const result = await db.run(`
        DELETE FROM system_logs 
        WHERE timestamp < ?
      `, [cutoffDate.toISOString()]);

      await this.log({
        level: 'info',
        category: 'system',
        operation: 'log_cleanup',
        details: `Cleaned up ${result.changes} old log entries (older than ${daysToKeep} days)`,
        status: 'completed',
        metadata: { deletedCount: result.changes, daysToKeep }
      });

      return result.changes;
    } catch (error) {
      await this.logError('system', 'log_cleanup', error, 'Failed to clean up old logs');
      return 0;
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats(days: number = 7): Promise<{
    totalLogs: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<LogCategory, number>;
    byStatus: Record<LogStatus, number>;
  }> {
    try {
      const db = await getDatabase();
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Total logs
      const totalResult = await db.get(`
        SELECT COUNT(*) as count 
        FROM system_logs 
        WHERE timestamp >= ?
      `, [cutoffDate.toISOString()]) as { count: number };

      // By level
      const levelStats = await db.all(`
        SELECT level, COUNT(*) as count 
        FROM system_logs 
        WHERE timestamp >= ?
        GROUP BY level
      `, [cutoffDate.toISOString()]) as { level: LogLevel; count: number }[];

      // By category  
      const categoryStats = await db.all(`
        SELECT category, COUNT(*) as count 
        FROM system_logs 
        WHERE timestamp >= ?
        GROUP BY category
      `, [cutoffDate.toISOString()]) as { category: LogCategory; count: number }[];

      // By status
      const statusStats = await db.all(`
        SELECT status, COUNT(*) as count 
        FROM system_logs 
        WHERE timestamp >= ?
        GROUP BY status
      `, [cutoffDate.toISOString()]) as { status: LogStatus; count: number }[];

      // Convert to records
      const byLevel = {} as Record<LogLevel, number>;
      levelStats.forEach(stat => byLevel[stat.level] = stat.count);

      const byCategory = {} as Record<LogCategory, number>;  
      categoryStats.forEach(stat => byCategory[stat.category] = stat.count);

      const byStatus = {} as Record<LogStatus, number>;
      statusStats.forEach(stat => byStatus[stat.status] = stat.count);

      return {
        totalLogs: totalResult.count,
        byLevel,
        byCategory,
        byStatus
      };
      
    } catch (error) {
      console.error('Failed to get log statistics:', error);
      return {
        totalLogs: 0,
        byLevel: {} as Record<LogLevel, number>,
        byCategory: {} as Record<LogCategory, number>,
        byStatus: {} as Record<LogStatus, number>
      };
    }
  }
}

export const systemLogger = SystemLogger.getInstance();