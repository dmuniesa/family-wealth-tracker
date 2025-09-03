'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Trash2, RefreshCw, Filter } from 'lucide-react';

interface SystemLogEntry {
  id: number;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'debt_update' | 'email' | 'backup' | 'system' | 'auth';
  operation: string;
  details?: string;
  familyId?: number;
  userId?: number;
  durationMs?: number;
  status: 'started' | 'completed' | 'failed';
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

interface LogStats {
  totalLogs: number;
  byLevel: Record<string, number>;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  period: string;
}

const LEVEL_COLORS: Record<string, string> = {
  info: 'bg-blue-100 text-blue-800',
  success: 'bg-green-100 text-green-800',
  warn: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<string, string> = {
  started: 'bg-gray-100 text-gray-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export function SystemLogs() {
  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    level: [] as string[],
    category: [] as string[],
    status: [] as string[],
    familyId: '',
    startDate: '',
    endDate: '',
    limit: 50,
    offset: 0,
  });

  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      if (filters.level.length) params.set('level', filters.level.join(','));
      if (filters.category.length) params.set('category', filters.category.join(','));
      if (filters.status.length) params.set('status', filters.status.join(','));
      if (filters.familyId) params.set('familyId', filters.familyId);
      if (filters.startDate) params.set('startDate', filters.startDate);
      if (filters.endDate) params.set('endDate', filters.endDate);
      params.set('limit', filters.limit.toString());
      params.set('offset', filters.offset.toString());

      const response = await fetch(`/api/admin/logs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      
      const data = await response.json();
      setLogs(data.logs);
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/logs/stats?days=7');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleCleanupLogs = async () => {
    const daysToKeep = prompt('How many days of logs to keep? (default: 90)', '90');
    if (!daysToKeep) return;

    try {
      const response = await fetch('/api/admin/logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daysToKeep: parseInt(daysToKeep) })
      });

      if (!response.ok) throw new Error('Failed to cleanup logs');
      const data = await response.json();
      
      alert(`Cleaned up ${data.deletedCount} old log entries`);
      fetchLogs();
      fetchStats();
    } catch (error) {
      console.error('Error cleaning up logs:', error);
      alert('Failed to cleanup logs');
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">System Logs</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowFilters(!showFilters)} variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleCleanupLogs} variant="outline" size="sm">
            <Trash2 className="w-4 h-4 mr-2" />
            Cleanup
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Logs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLogs}</div>
              <p className="text-xs text-muted-foreground">{stats.period}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">By Level</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(stats.byLevel).map(([level, count]) => (
                <div key={level} className="flex justify-between">
                  <Badge className={LEVEL_COLORS[level] || ''}>{level}</Badge>
                  <span className="text-sm">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">By Category</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(stats.byCategory).map(([category, count]) => (
                <div key={category} className="flex justify-between">
                  <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                  <span className="text-sm">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">By Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <Badge className={STATUS_COLORS[status] || ''}>{status}</Badge>
                  <span className="text-sm">{count}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Level</label>
                <Select
                  multiple
                  value={filters.level}
                  onValueChange={(value) => setFilters({...filters, level: value as string[], offset: 0})}
                  options={[
                    { value: 'info', label: 'Info' },
                    { value: 'success', label: 'Success' },
                    { value: 'warn', label: 'Warning' },
                    { value: 'error', label: 'Error' },
                  ]}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Category</label>
                <Select
                  multiple
                  value={filters.category}
                  onValueChange={(value) => setFilters({...filters, category: value as string[], offset: 0})}
                  options={[
                    { value: 'debt_update', label: 'Debt Updates' },
                    { value: 'email', label: 'Email' },
                    { value: 'backup', label: 'Backup' },
                    { value: 'system', label: 'System' },
                    { value: 'auth', label: 'Authentication' },
                  ]}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Status</label>
                <Select
                  multiple
                  value={filters.status}
                  onValueChange={(value) => setFilters({...filters, status: value as string[], offset: 0})}
                  options={[
                    { value: 'started', label: 'Started' },
                    { value: 'completed', label: 'Completed' },
                    { value: 'failed', label: 'Failed' },
                  ]}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Family ID</label>
                <Input
                  type="number"
                  placeholder="Filter by family ID"
                  value={filters.familyId}
                  onChange={(e) => setFilters({...filters, familyId: e.target.value, offset: 0})}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Start Date</label>
                <Input
                  type="datetime-local"
                  value={filters.startDate}
                  onChange={(e) => setFilters({...filters, startDate: e.target.value, offset: 0})}
                />
              </div>

              <div>
                <label className="text-sm font-medium">End Date</label>
                <Input
                  type="datetime-local"
                  value={filters.endDate}
                  onChange={(e) => setFilters({...filters, endDate: e.target.value, offset: 0})}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button 
                onClick={() => {
                  setFilters({
                    level: [], category: [], status: [], familyId: '',
                    startDate: '', endDate: '', limit: 50, offset: 0
                  });
                }}
                variant="outline"
                size="sm"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Recent Logs ({total} total)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Time</th>
                      <th className="text-left py-2">Level</th>
                      <th className="text-left py-2">Category</th>
                      <th className="text-left py-2">Operation</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Duration</th>
                      <th className="text-left py-2">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 text-sm">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="py-2">
                          <Badge className={LEVEL_COLORS[log.level]}>
                            {log.level}
                          </Badge>
                        </td>
                        <td className="py-2 text-sm capitalize">
                          {log.category.replace('_', ' ')}
                        </td>
                        <td className="py-2 text-sm font-mono">
                          {log.operation}
                        </td>
                        <td className="py-2">
                          <Badge className={STATUS_COLORS[log.status]}>
                            {log.status}
                          </Badge>
                        </td>
                        <td className="py-2 text-sm">
                          {formatDuration(log.durationMs)}
                        </td>
                        <td className="py-2 text-sm max-w-xs truncate">
                          {log.details || log.errorMessage || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {filters.offset + 1} to {Math.min(filters.offset + filters.limit, total)} of {total} entries
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={() => setFilters({...filters, offset: Math.max(0, filters.offset - filters.limit)})}
                    disabled={filters.offset === 0}
                    variant="outline"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  
                  <Button
                    onClick={() => setFilters({...filters, offset: filters.offset + filters.limit})}
                    disabled={!hasMore}
                    variant="outline"
                    size="sm"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}