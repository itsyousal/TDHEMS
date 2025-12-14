'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Filter,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { format } from 'date-fns';

interface AnalyticsData {
  history: {
    runs: RunHistory[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
  metrics: {
    today: PeriodMetrics;
    week: PeriodMetrics;
    month: PeriodMetrics;
  };
  employeePerformance: EmployeePerformance[];
  checklistMetrics: ChecklistMetric[];
  trends: TrendData[];
}

interface RunHistory {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: string;
  completionRate: number;
  employee: {
    id: string;
    name: string;
  };
  checklist: {
    id: string;
    name: string;
  };
  completedItems: number;
  totalItems: number;
  duration: number | null;
}

interface PeriodMetrics {
  totalRuns: number;
  completedRuns: number;
  averageCompletionRate: number;
  averageDuration: number;
}

interface EmployeePerformance {
  userId: string;
  userName: string;
  totalRuns: number;
  completedRuns: number;
  averageCompletionRate: number;
  averageDuration: number;
}

interface ChecklistMetric {
  checklistId: string;
  checklistName: string;
  totalRuns: number;
  completedRuns: number;
  averageCompletionRate: number;
  averageDuration: number;
}

interface TrendData {
  date: string;
  runs: number;
  completionRate: number;
}

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

export function ChecklistAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [checklistFilter, setChecklistFilter] = useState<string>('all');
  const [checklists, setChecklists] = useState<Array<{ id: string; name: string }>>([]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate date range based on period
      const now = new Date();
      let startDate = new Date();
      switch (period) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      const baseParams = new URLSearchParams({
        startDate: startDate.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      });
      
      if (statusFilter !== 'all') {
        baseParams.append('status', statusFilter);
      }
      
      if (checklistFilter !== 'all') {
        baseParams.append('checklistId', checklistFilter);
      }
      
      // Fetch all analytics types in parallel
      const [overviewRes, historyRes, employeeRes, trendsRes] = await Promise.all([
        fetch(`/api/checklists/analytics?type=overview&${baseParams}`),
        fetch(`/api/checklists/analytics?type=history&${baseParams}&page=${page}&limit=20`),
        fetch(`/api/checklists/analytics?type=employee-performance&${baseParams}`),
        fetch(`/api/checklists/analytics?type=trends&${baseParams}`),
      ]);
      
      // Check for permission errors
      if (overviewRes.status === 403) {
        const errorData = await overviewRes.json();
        throw new Error(errorData.error || 'Access denied');
      }
      
      if (!overviewRes.ok || !historyRes.ok || !employeeRes.ok || !trendsRes.ok) {
        throw new Error('Failed to fetch analytics');
      }
      
      const [overview, history, employees, trendsData] = await Promise.all([
        overviewRes.json(),
        historyRes.json(),
        employeeRes.json(),
        trendsRes.json(),
      ]);
      
      // Transform data to match expected format
      const transformedData: AnalyticsData = {
        history: {
          runs: history.data?.map((run: any) => ({
            id: run.id,
            startedAt: run.startedAt,
            completedAt: run.completedAt,
            status: run.status?.toUpperCase() || 'IN_PROGRESS',
            completionRate: run.progress || 0,
            employee: {
              id: run.user?.id || '',
              name: run.user?.name || 'Unknown',
            },
            checklist: {
              id: run.checklist?.id || '',
              name: run.checklist?.name || 'Unknown',
            },
            completedItems: run.itemsCompleted || 0,
            totalItems: run.totalItems || 0,
            duration: run.durationMinutes ? run.durationMinutes * 60000 : null,
          })) || [],
          pagination: {
            page: history.meta?.page || 1,
            limit: history.meta?.limit || 20,
            total: history.meta?.total || 0,
            totalPages: history.meta?.totalPages || 1,
          },
        },
        metrics: {
          today: {
            totalRuns: overview.overview?.todayRuns || 0,
            completedRuns: Math.round((overview.overview?.todayRuns || 0) * (overview.overview?.completionRate || 0) / 100),
            averageCompletionRate: overview.overview?.completionRate || 0,
            averageDuration: (overview.overview?.avgCompletionTimeMinutes || 0) * 60000,
          },
          week: {
            totalRuns: overview.overview?.weeklyRuns || 0,
            completedRuns: Math.round((overview.overview?.weeklyRuns || 0) * (overview.overview?.completionRate || 0) / 100),
            averageCompletionRate: overview.overview?.completionRate || 0,
            averageDuration: (overview.overview?.avgCompletionTimeMinutes || 0) * 60000,
          },
          month: {
            totalRuns: overview.overview?.monthlyRuns || 0,
            completedRuns: overview.overview?.completedRuns || 0,
            averageCompletionRate: overview.overview?.completionRate || 0,
            averageDuration: (overview.overview?.avgCompletionTimeMinutes || 0) * 60000,
          },
        },
        employeePerformance: employees.data?.map((emp: any) => ({
          userId: emp.userId,
          userName: emp.name,
          totalRuns: emp.totalRuns,
          completedRuns: emp.completedRuns,
          averageCompletionRate: emp.completionRate,
          averageDuration: 0, // Not provided by API
        })) || [],
        checklistMetrics: overview.checklistBreakdown?.map((cl: any) => ({
          checklistId: cl.checklistId,
          checklistName: cl.name,
          totalRuns: cl.runCount,
          completedRuns: 0, // Would need separate query
          averageCompletionRate: 0,
          averageDuration: 0,
        })) || [],
        trends: trendsData.trends?.map((t: any) => ({
          date: t.date,
          runs: t.total,
          completionRate: t.completionRate,
        })) || [],
      };
      
      setAnalyticsData(transformedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const fetchChecklists = async () => {
    try {
      const response = await fetch('/api/checklists');
      if (response.ok) {
        const data = await response.json();
        setChecklists(data.checklists || []);
      }
    } catch (err) {
      console.error('Failed to fetch checklists:', err);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [period, page, statusFilter, checklistFilter]);

  const exportToCSV = () => {
    if (!analyticsData?.history.runs.length) return;
    
    const headers = ['Checklist', 'Employee', 'Started At', 'Completed At', 'Status', 'Completion Rate', 'Duration (min)'];
    const rows = analyticsData.history.runs.map(run => [
      run.checklist.name,
      run.employee.name,
      format(new Date(run.startedAt), 'yyyy-MM-dd HH:mm'),
      run.completedAt ? format(new Date(run.completedAt), 'yyyy-MM-dd HH:mm') : '-',
      run.status,
      `${run.completionRate}%`,
      run.duration ? Math.round(run.duration / 60000).toString() : '-',
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checklist-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && !analyticsData) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-primary/60" />
          <p className="text-muted-foreground animate-pulse">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center animate-in">
        <div className="p-4 rounded-full bg-amber-100 mb-4">
          <AlertTriangle className="h-10 w-10 text-amber-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Analytics</h3>
        <p className="text-gray-500 mb-6 max-w-md">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          Retry
        </button>
      </div>
    );
  }

  const metrics = analyticsData?.metrics;
  const history = analyticsData?.history;
  const employeePerf = analyticsData?.employeePerformance || [];
  const checklistMetrics = analyticsData?.checklistMetrics || [];
  const trends = analyticsData?.trends || [];

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Checklist Analytics
          </h1>
          <p className="text-sm sm:text-base text-gray-500">Track checklist completions, employee performance, and trends</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={fetchAnalytics}
            className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
            title="Refresh"
          >
            <RefreshCw className={`h-5 w-5 transition-transform ${loading ? 'animate-spin' : 'hover:rotate-180'}`} />
          </button>
          <button
            onClick={exportToCSV}
            disabled={!history?.runs.length}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 text-gray-500">
          <CalendarDays className="h-5 w-5" />
          <span className="text-sm font-medium">Time Period:</span>
        </div>
        <div className="flex rounded-xl border border-gray-200 overflow-hidden shadow-sm w-full sm:w-auto">
          {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                setPage(1);
              }}
              className={`flex-1 sm:flex-none px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                period === p
                  ? 'bg-primary text-white shadow-inner'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Runs"
          value={metrics?.[period === 'week' ? 'week' : 'month']?.totalRuns || 0}
          subtitle={`This ${period}`}
          icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
          delay="0.1s"
        />
        <StatsCard
          title="Completed"
          value={metrics?.[period === 'week' ? 'week' : 'month']?.completedRuns || 0}
          subtitle={`This ${period}`}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
          trend={metrics?.[period === 'week' ? 'week' : 'month']?.completedRuns ? 'up' : undefined}
          delay="0.15s"
        />
        <StatsCard
          title="Avg. Completion Rate"
          value={`${Math.round(metrics?.[period === 'week' ? 'week' : 'month']?.averageCompletionRate || 0)}%`}
          subtitle={`This ${period}`}
          icon={<TrendingUp className="h-5 w-5 text-amber-500" />}
          delay="0.2s"
        />
        <StatsCard
          title="Avg. Duration"
          value={formatDuration(metrics?.[period === 'week' ? 'week' : 'month']?.averageDuration || 0)}
          subtitle={`This ${period}`}
          icon={<Clock className="h-5 w-5 text-purple-500" />}
          delay="0.25s"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="history" className="w-full animate-in" style={{ animationDelay: '0.3s' }}>
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap pb-px">
          <TabsTrigger value="history" className="flex items-center gap-2 shrink-0">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Run History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2 shrink-0">
            <TrendingUp className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2 shrink-0">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Employee Performance</span>
            <span className="sm:hidden">Employees</span>
          </TabsTrigger>
          <TabsTrigger value="checklists" className="flex items-center gap-2 shrink-0">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Checklist Metrics</span>
            <span className="sm:hidden">Metrics</span>
          </TabsTrigger>
        </TabsList>

        {/* Run History Tab */}
        <TabsContent value="history" className="animate-in">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Filters */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <Filter className="h-4 w-4" />
                  <span className="text-sm font-medium">Filters:</span>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                >
                  <option value="all">All Status</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="ABANDONED">Abandoned</option>
                </select>
                <select
                  value={checklistFilter}
                  onChange={(e) => {
                    setChecklistFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200"
                >
                  <option value="all">All Checklists</option>
                  {checklists.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Table */}
            {history?.runs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-full bg-gray-100 mb-4">
                  <Clock className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Run History Yet</h3>
                <p className="text-gray-500 max-w-sm">Checklist runs will appear here once employees start completing them.</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {history?.runs.map((run, idx) => (
                    <div key={run.id} className="p-4 hover:bg-gray-50/50 transition-colors animate-in" style={{ animationDelay: `${idx * 0.03}s` }}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{run.checklist.name}</p>
                          <p className="text-sm text-gray-500">{run.employee.name}</p>
                        </div>
                        <StatusBadge status={run.status} />
                      </div>
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Progress</span>
                          <span className="font-medium">{run.completedItems}/{run.totalItems}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              run.completionRate === 100
                                ? 'bg-green-500'
                                : run.completionRate >= 50
                                ? 'bg-amber-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${run.completionRate}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                          <span>{format(new Date(run.startedAt), 'MMM d, h:mm a')}</span>
                          <span>{run.duration ? formatDuration(run.duration) : '-'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="font-semibold">Checklist</TableHead>
                        <TableHead className="font-semibold">Employee</TableHead>
                        <TableHead className="font-semibold">Started</TableHead>
                        <TableHead className="font-semibold">Completed</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Progress</TableHead>
                        <TableHead className="font-semibold">Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history?.runs.map((run, idx) => (
                        <TableRow 
                          key={run.id} 
                          className="hover:bg-gray-50/80 transition-colors animate-in"
                          style={{ animationDelay: `${idx * 0.02}s` }}
                        >
                          <TableCell className="font-medium">{run.checklist.name}</TableCell>
                          <TableCell>{run.employee.name}</TableCell>
                          <TableCell className="text-gray-500">
                            {format(new Date(run.startedAt), 'MMM d, h:mm a')}
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {run.completedAt ? format(new Date(run.completedAt), 'MMM d, h:mm a') : '-'}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={run.status} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-100 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all duration-500 ${
                                    run.completionRate === 100
                                      ? 'bg-green-500'
                                      : run.completionRate >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${run.completionRate}%` }}
                                />
                              </div>
                              <span className="text-sm text-gray-600 tabular-nums">
                                {run.completedItems}/{run.totalItems}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-500">
                            {run.duration ? formatDuration(run.duration) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {history && history.pagination.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-100 bg-gray-50/30">
                    <div className="text-sm text-gray-500 order-2 sm:order-1">
                      Showing {(history.pagination.page - 1) * history.pagination.limit + 1} to{' '}
                      {Math.min(history.pagination.page * history.pagination.limit, history.pagination.total)} of{' '}
                      {history.pagination.total} runs
                    </div>
                    <div className="flex items-center gap-2 order-1 sm:order-2">
                      <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm text-gray-600 px-2">
                        Page {history.pagination.page} of {history.pagination.totalPages}
                      </span>
                      <button
                        onClick={() => setPage((p) => Math.min(history.pagination.totalPages, p + 1))}
                        disabled={page === history.pagination.totalPages}
                        className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="animate-in">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Runs Over Time */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Runs Over Time</h3>
              {trends.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <TrendingUp className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>No data available</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="runs" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={{ fill: '#f59e0b', strokeWidth: 2 }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      name="Runs"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Completion Rate Trend */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Completion Rate Trend</h3>
              {trends.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>No data available</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    />
                    <YAxis 
                      tick={{ fontSize: 11 }} 
                      domain={[0, 100]}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM d, yyyy')}
                      formatter={(value: number) => [`${Math.round(value)}%`, 'Completion Rate']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completionRate" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      dot={{ fill: '#22c55e', strokeWidth: 2 }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                      name="Completion Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Status Distribution */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
              {!history?.runs.length ? (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>No data available</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={getStatusDistribution(history.runs)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {getStatusDistribution(history.runs).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top Checklists */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Most Active Checklists</h3>
              {checklistMetrics.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  <div className="text-center">
                    <BarChart3 className="h-10 w-10 mx-auto mb-2 text-gray-300" />
                    <p>No data available</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={checklistMetrics.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis 
                      dataKey="checklistName" 
                      type="category" 
                      tick={{ fontSize: 11 }}
                      width={100}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar 
                      dataKey="totalRuns" 
                      fill="#f59e0b" 
                      radius={[0, 6, 6, 0]}
                      name="Total Runs"
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Employee Performance Tab */}
        <TabsContent value="employees" className="animate-in">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {employeePerf.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-full bg-gray-100 mb-4">
                  <Users className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Employee Data Yet</h3>
                <p className="text-gray-500 max-w-sm">Employee performance metrics will appear once checklists are completed.</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {employeePerf.map((emp, idx) => (
                    <div key={emp.userId} className="p-4 hover:bg-gray-50/50 transition-colors animate-in" style={{ animationDelay: `${idx * 0.03}s` }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{emp.userName}</p>
                          <PerformanceBadge rate={emp.averageCompletionRate} />
                        </div>
                        <span className={`text-lg font-bold ${getCompletionRateColor(emp.averageCompletionRate)}`}>
                          {Math.round(emp.averageCompletionRate)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Total Runs</p>
                          <p className="font-medium">{emp.totalRuns}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Completed</p>
                          <p className="font-medium">{emp.completedRuns}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="font-semibold">Employee</TableHead>
                        <TableHead className="text-right font-semibold">Total Runs</TableHead>
                        <TableHead className="text-right font-semibold">Completed</TableHead>
                        <TableHead className="text-right font-semibold">Avg. Completion Rate</TableHead>
                        <TableHead className="text-right font-semibold">Avg. Duration</TableHead>
                        <TableHead className="font-semibold">Performance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employeePerf.map((emp, idx) => (
                        <TableRow 
                          key={emp.userId}
                          className="hover:bg-gray-50/80 transition-colors animate-in"
                          style={{ animationDelay: `${idx * 0.02}s` }}
                        >
                          <TableCell className="font-medium">{emp.userName}</TableCell>
                          <TableCell className="text-right tabular-nums">{emp.totalRuns}</TableCell>
                          <TableCell className="text-right tabular-nums">{emp.completedRuns}</TableCell>
                          <TableCell className="text-right">
                            <span className={`font-medium ${getCompletionRateColor(emp.averageCompletionRate)}`}>
                              {Math.round(emp.averageCompletionRate)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-gray-500">
                            {formatDuration(emp.averageDuration)}
                          </TableCell>
                          <TableCell>
                            <PerformanceBadge rate={emp.averageCompletionRate} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        {/* Checklist Metrics Tab */}
        <TabsContent value="checklists" className="animate-in">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {checklistMetrics.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="p-4 rounded-full bg-gray-100 mb-4">
                  <BarChart3 className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Checklist Data Yet</h3>
                <p className="text-gray-500 max-w-sm">Checklist metrics will appear once they are run.</p>
              </div>
            ) : (
              <>
                {/* Mobile Cards View */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {checklistMetrics.map((cl, idx) => (
                    <div key={cl.checklistId} className="p-4 hover:bg-gray-50/50 transition-colors animate-in" style={{ animationDelay: `${idx * 0.03}s` }}>
                      <div className="flex items-start justify-between mb-3">
                        <p className="font-medium text-gray-900">{cl.checklistName}</p>
                        <span className={`text-lg font-bold ${getCompletionRateColor(cl.averageCompletionRate)}`}>
                          {Math.round(cl.averageCompletionRate)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Total Runs</p>
                          <p className="font-medium">{cl.totalRuns}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Completed</p>
                          <p className="font-medium">{cl.completedRuns}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50/50">
                        <TableHead className="font-semibold">Checklist</TableHead>
                        <TableHead className="text-right font-semibold">Total Runs</TableHead>
                        <TableHead className="text-right font-semibold">Completed</TableHead>
                        <TableHead className="text-right font-semibold">Avg. Completion Rate</TableHead>
                        <TableHead className="text-right font-semibold">Avg. Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {checklistMetrics.map((cl, idx) => (
                        <TableRow 
                          key={cl.checklistId}
                          className="hover:bg-gray-50/80 transition-colors animate-in"
                          style={{ animationDelay: `${idx * 0.02}s` }}
                        >
                          <TableCell className="font-medium">{cl.checklistName}</TableCell>
                          <TableCell className="text-right tabular-nums">{cl.totalRuns}</TableCell>
                          <TableCell className="text-right tabular-nums">{cl.completedRuns}</TableCell>
                          <TableCell className="text-right">
                            <span className={`font-medium ${getCompletionRateColor(cl.averageCompletionRate)}`}>
                              {Math.round(cl.averageCompletionRate)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-gray-500">
                            {formatDuration(cl.averageDuration)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Components
function StatsCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  delay,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  delay?: string;
}) {
  return (
    <div 
      className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm hover:shadow-md transition-all duration-200 group animate-in"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm font-medium text-gray-500">{title}</span>
        <div className="p-2 rounded-full bg-gray-50 group-hover:bg-gray-100 transition-colors">
          {icon}
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-xl sm:text-2xl font-bold text-gray-900">{value}</span>
        {trend && (
          <TrendingUp
            className={`h-4 w-4 ${trend === 'up' ? 'text-green-500' : 'text-red-500 rotate-180'}`}
          />
        )}
      </div>
      <p className="text-xs sm:text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ReactNode }> = {
    COMPLETED: { color: 'bg-green-100 text-green-800 border-green-200', icon: <CheckCircle2 className="h-3 w-3" /> },
    IN_PROGRESS: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Clock className="h-3 w-3" /> },
    ABANDONED: { color: 'bg-red-100 text-red-800 border-red-200', icon: <XCircle className="h-3 w-3" /> },
  };
  
  const { color, icon } = config[status] || { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: null };
  
  return (
    <Badge className={`${color} flex items-center gap-1 border`}>
      {icon}
      <span className="hidden sm:inline">{status.replace('_', ' ')}</span>
      <span className="sm:hidden">{status === 'IN_PROGRESS' ? 'Progress' : status === 'COMPLETED' ? 'Done' : status}</span>
    </Badge>
  );
}

function PerformanceBadge({ rate }: { rate: number }) {
  if (rate >= 90) {
    return <Badge className="bg-green-100 text-green-800 border border-green-200">Excellent</Badge>;
  } else if (rate >= 75) {
    return <Badge className="bg-blue-100 text-blue-800 border border-blue-200">Good</Badge>;
  } else if (rate >= 50) {
    return <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200">Average</Badge>;
  } else {
    return <Badge className="bg-red-100 text-red-800 border border-red-200">Needs Improvement</Badge>;
  }
}

// Helper Functions
function formatDuration(ms: number): string {
  if (!ms || ms === 0) return '-';
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function getCompletionRateColor(rate: number): string {
  if (rate >= 90) return 'text-green-600 font-medium';
  if (rate >= 75) return 'text-blue-600 font-medium';
  if (rate >= 50) return 'text-yellow-600 font-medium';
  return 'text-red-600 font-medium';
}

function getStatusDistribution(runs: RunHistory[]): Array<{ name: string; value: number; color: string }> {
  const counts: Record<string, number> = {};
  runs.forEach((run) => {
    counts[run.status] = (counts[run.status] || 0) + 1;
  });
  
  const colorMap: Record<string, string> = {
    COMPLETED: '#22c55e',
    IN_PROGRESS: '#3b82f6',
    ABANDONED: '#ef4444',
  };
  
  return Object.entries(counts).map(([name, value]) => ({
    name: name.replace('_', ' '),
    value,
    color: colorMap[name] || '#9ca3af',
  }));
}
