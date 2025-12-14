'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Play,
  ListChecks,
  Calendar,
  TrendingUp,
  Users,
  RefreshCw,
  Filter,
  Plus,
  ChevronDown,
  ChevronRight,
  Camera,
  FileText,
  XCircle,
  Settings,
  BarChart3,
} from 'lucide-react';
import { ChecklistRoleManager } from './checklist-role-manager';

interface ChecklistItem {
  id: string;
  title: string;
  description: string | null;
  order: number;
  isRequired: boolean;
  roles: string[]; // Role slugs for this specific item
}

interface Checklist {
  id: string;
  name: string;
  description: string | null;
  frequency: 'daily' | 'weekly' | 'monthly';
  dueTime: string | null;
  requiresPhotoEvidence: boolean;
  isActive: boolean;
  roles: string[];
  items: ChecklistItem[];
  _count?: { items: number; runs: number };
  runs?: ChecklistRun[];
}

interface ChecklistRun {
  id: string;
  checklistId: string;
  userId: string;
  status: 'in_progress' | 'completed' | 'overdue' | 'failed';
  startedAt: string;
  completedAt: string | null;
  checklist?: { id: string; name: string; frequency: string; requiresPhotoEvidence?: boolean };
  user?: { id: string; firstName: string; lastName: string };
  evidence?: ChecklistEvidence[];
  progress?: number;
  completedItems?: number;
  totalItems?: number;
}

interface ChecklistEvidence {
  id: string;
  itemId: string;
  runId: string;
  checked: boolean;
  notes: string | null;
  fileUrl: string | null;
  createdAt: string;
  item?: ChecklistItem;
}

interface ChecklistStats {
  overview: {
    totalChecklists: number;
    activeChecklists: number;
    overdueRuns: number;
    monthlyRuns: number;
  };
  today: {
    total: number;
    completed: number;
    inProgress: number;
    failed: number;
    completionRate: number;
    pendingCount: number;
  };
  thisWeek: {
    totalRuns: number;
    completionRate: number;
    completedRuns: number;
  };
  frequencyDistribution: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  recentCompletions: Array<{
    id: string;
    checklistName: string;
    completedBy: string;
    completedAt: string;
  }>;
  pendingToday: Array<{
    id: string;
    name: string;
    itemCount: number;
  }>;
}

// Role mapping for display - must match database role slugs
const roleLabels: Record<string, string> = {
  'owner-super-admin': 'Owner / Super Admin',
  'general-manager': 'General Manager',
  'store-manager': 'Store Manager',
  'production-manager': 'Production Manager',
  'warehouse-lead': 'Warehouse Lead',
  'kitchen-assistant-cooks': 'Kitchen / Cooks',
  'pos-operator': 'POS / Cashier',
  'packers-warehouse-staff': 'Warehouse Staff',
  'logistics-coordinator': 'Logistics',
  'finance-accountant': 'Finance',
  'hr-people-ops': 'HR / People Ops',
  'qa-food-safety-officer': 'QA / Food Safety',
  'marketing-manager': 'Marketing',
  'procurement-buyer': 'Procurement',
  'customer-support': 'Customer Support',
};

// Frequency colors
const frequencyColors: Record<string, string> = {
  daily: 'bg-blue-100 text-blue-800',
  weekly: 'bg-purple-100 text-purple-800',
  monthly: 'bg-green-100 text-green-800',
};

// Status colors and icons
const statusConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  in_progress: { 
    color: 'bg-yellow-100 text-yellow-800', 
    icon: <Clock className="h-4 w-4" />,
    label: 'In Progress'
  },
  completed: { 
    color: 'bg-green-100 text-green-800', 
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Completed'
  },
  overdue: { 
    color: 'bg-red-100 text-red-800', 
    icon: <AlertTriangle className="h-4 w-4" />,
    label: 'Overdue'
  },
  failed: { 
    color: 'bg-orange-100 text-orange-800', 
    icon: <XCircle className="h-4 w-4" />,
    label: 'Incomplete'
  },
};

export function ChecklistDashboard() {
  const [stats, setStats] = useState<ChecklistStats | null>(null);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [runs, setRuns] = useState<ChecklistRun[]>([]);
  const [activeRun, setActiveRun] = useState<ChecklistRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(null);
  const [showActiveRun, setShowActiveRun] = useState(false);
  // Role management state
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [showRoleManager, setShowRoleManager] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check admin permission
  const checkAdminPermission = useCallback(async () => {
    try {
      // Try to access an admin-only endpoint to check permission
      const res = await fetch('/api/checklists?checkManagePermission=true');
      if (res.ok) {
        const data = await res.json();
        setIsAdmin(data.canManage === true);
      }
    } catch {
      setIsAdmin(false);
    }
  }, []);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      const [statsRes, checklistsRes, runsRes] = await Promise.all([
        fetch('/api/checklists/stats'),
        fetch('/api/checklists'),
        fetch('/api/checklists/runs?myRuns=true&limit=10'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (checklistsRes.ok) {
        const checklistsData = await checklistsRes.json();
        setChecklists(checklistsData.data || []);
        // Set admin flag from response
        if (checklistsData.canManage !== undefined) {
          setIsAdmin(checklistsData.canManage);
        }
      }

      if (runsRes.ok) {
        const runsData = await runsRes.json();
        setRuns(runsData.data || []);
        
        // Check for active run
        const active = runsData.data?.find((r: ChecklistRun) => r.status === 'in_progress');
        if (active) {
          setActiveRun(active);
        }
      }
    } catch (error) {
      console.error('Failed to fetch checklist data:', error);
      toast.error('Failed to load checklist data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Start a checklist run
  const startChecklist = async (checklistId: string) => {
    try {
      const res = await fetch('/api/checklists/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checklistId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to start checklist');
      }

      const data = await res.json();
      setActiveRun(data.run);
      setShowActiveRun(true);
      toast.success(data.message || 'Checklist started!');
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to start checklist');
    }
  };

  // Toggle item completion
  const toggleItem = async (itemId: string, checked: boolean) => {
    if (!activeRun) return;

    try {
      const res = await fetch(`/api/checklists/runs/${activeRun.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'complete_item',
          itemId,
          checked,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to update item');
      }

      const updatedRun = await res.json();
      setActiveRun(updatedRun);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update item');
    }
  };

  // Complete the run
  const completeRun = async () => {
    if (!activeRun) return;

    try {
      const res = await fetch(`/api/checklists/runs/${activeRun.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete_run' }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to complete checklist');
      }

      const result = await res.json();
      toast.success(result.message);
      setActiveRun(null);
      setShowActiveRun(false);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to complete checklist');
    }
  };

  // Filter checklists
  const filteredChecklists = checklists.filter((c) => {
    if (frequencyFilter === 'all') return true;
    return c.frequency === frequencyFilter;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-10 w-10 animate-spin text-primary/60" />
          <p className="text-muted-foreground animate-pulse">Loading checklists...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Checklists
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage daily, weekly, and monthly operational tasks
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={refreshing}
            className="flex-1 sm:flex-none transition-all duration-200 hover:bg-gray-100"
          >
            <RefreshCw className={`h-4 w-4 mr-2 transition-transform ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
          <Card className="group hover:shadow-lg transition-all duration-300 animate-in" style={{ animationDelay: '0.1s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Active Checklists</CardTitle>
              <div className="p-2 rounded-full bg-blue-50 group-hover:bg-blue-100 transition-colors">
                <ListChecks className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.overview.activeChecklists}</div>
              <p className="text-xs text-muted-foreground">
                of {stats.overview.totalChecklists} total
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 animate-in" style={{ animationDelay: '0.15s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Today&apos;s Progress</CardTitle>
              <div className="p-2 rounded-full bg-green-50 group-hover:bg-green-100 transition-colors">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.today.completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.today.completed} of {stats.today.total} completed
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 animate-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Pending Today</CardTitle>
              <div className="p-2 rounded-full bg-amber-50 group-hover:bg-amber-100 transition-colors">
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.today.pendingCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.today.inProgress} in progress
              </p>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 animate-in" style={{ animationDelay: '0.25s' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Weekly Rate</CardTitle>
              <div className="p-2 rounded-full bg-purple-50 group-hover:bg-purple-100 transition-colors">
                <Calendar className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">{stats.thisWeek.completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.thisWeek.completedRuns} runs this week
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Overdue Alert */}
      {stats && stats.overview.overdueRuns > 0 && (
        <Card className="border-red-200 bg-gradient-to-r from-red-50 to-red-100/50 animate-in shadow-sm">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-2 rounded-full bg-red-100 animate-pulse">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-red-800">
                {stats.overview.overdueRuns} overdue checklist{stats.overview.overdueRuns > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-600/80">
                Please complete pending checklists to maintain compliance
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Today Quick Actions */}
      {stats && stats.pendingToday.length > 0 && (
        <Card className="animate-in overflow-hidden" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Pending Today
            </CardTitle>
            <CardDescription>Checklists that need to be completed today</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.pendingToday.map((checklist, idx) => (
                <div
                  key={checklist.id}
                  className="flex items-center justify-between p-3 sm:p-4 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/20 transition-all duration-200 group animate-in"
                  style={{ animationDelay: `${0.35 + idx * 0.05}s` }}
                >
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="font-medium truncate">{checklist.name}</p>
                    <p className="text-sm text-muted-foreground">{checklist.itemCount} items</p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => startChecklist(checklist.id)}
                    className="shrink-0 group-hover:scale-105 transition-transform"
                  >
                    <Play className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">Start</span>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Checklists List */}
        <div className="lg:col-span-2 space-y-4 order-2 lg:order-1">
          <Card className="animate-in" style={{ animationDelay: '0.4s' }}>
            <CardHeader className="border-b bg-gray-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>All Checklists</CardTitle>
                  <CardDescription>
                    {filteredChecklists.length} checklist{filteredChecklists.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                    <SelectTrigger className="w-28 sm:w-32 transition-all hover:border-primary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:p-6">
              {filteredChecklists.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <ListChecks className="h-8 w-8 opacity-50" />
                  </div>
                  <p className="font-medium">No checklists found</p>
                  <p className="text-sm mt-1">Checklists will appear here once created</p>
                </div>
              ) : (
                filteredChecklists.map((checklist, idx) => (
                  <div
                    key={checklist.id}
                    className="border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md hover:border-gray-300 animate-in"
                    style={{ animationDelay: `${0.45 + idx * 0.03}s` }}
                  >
                    <div
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors gap-3"
                      onClick={() => setExpandedChecklist(
                        expandedChecklist === checklist.id ? null : checklist.id
                      )}
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0 flex-1">
                        <div className={`transition-transform duration-200 ${expandedChecklist === checklist.id ? 'rotate-90' : ''}`}>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium truncate">{checklist.name}</p>
                            <Badge className={`${frequencyColors[checklist.frequency]} shrink-0`}>
                              {checklist.frequency}
                            </Badge>
                            {checklist.requiresPhotoEvidence && (
                              <Camera className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                          </div>
                          {checklist.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                              {checklist.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 ml-7 sm:ml-0">
                        <div className="text-right text-sm text-muted-foreground hidden sm:block">
                          <p>{checklist.items?.length || checklist._count?.items || 0} items</p>
                          {checklist.roles.length > 0 && (
                            <p className="text-xs">
                              {checklist.roles.map(r => roleLabels[r] || r).join(', ')}
                            </p>
                          )}
                        </div>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedChecklist(checklist);
                              setShowRoleManager(true);
                            }}
                            title="Manage Roles"
                            className="shrink-0 h-9 w-9 p-0 hover:bg-gray-100"
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            startChecklist(checklist.id);
                          }}
                          className="shrink-0 h-9 px-3"
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Items */}
                    <div className={`overflow-hidden transition-all duration-300 ease-out ${
                      expandedChecklist === checklist.id ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}>
                      {checklist.items && (
                        <div className="border-t bg-gradient-to-b from-gray-50 to-white p-3 sm:p-4">
                          <div className="space-y-2">
                            {checklist.items.map((item, idx) => (
                              <div
                                key={item.id}
                                className="flex items-start gap-3 text-sm p-2 sm:p-3 rounded-lg bg-white border shadow-sm hover:shadow transition-shadow"
                              >
                                <span className="text-muted-foreground w-6 text-center font-medium">{idx + 1}.</span>
                                <div className="flex-1 min-w-0">
                                  <p className={`${item.isRequired ? 'font-medium' : ''} break-words`}>
                                    {item.title}
                                    {item.isRequired && (
                                      <Badge variant="secondary" className="ml-2 text-xs">
                                        Required
                                      </Badge>
                                    )}
                                  </p>
                                  {item.description && (
                                    <p className="text-muted-foreground text-xs mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                  {/* Show item-specific roles */}
                                  {item.roles && item.roles.length > 0 && (
                                    <div className="flex items-center gap-1 mt-1.5">
                                      <Users className="h-3 w-3 text-muted-foreground" />
                                      <span className="text-xs text-muted-foreground">
                                        {item.roles.map(r => roleLabels[r] || r).join(', ')}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                {item.isRequired && checklist.requiresPhotoEvidence && (
                                  <span title="Photo required" className="shrink-0">
                                    <Camera className="h-4 w-4 text-muted-foreground" />
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4 order-1 lg:order-2">
          {/* Frequency Distribution */}
          {stats && (
            <Card className="animate-in" style={{ animationDelay: '0.5s' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-muted-foreground" />
                  By Frequency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500 shadow-sm" />
                    <span className="text-sm">Daily</span>
                  </div>
                  <span className="font-semibold text-sm">{stats.frequencyDistribution.daily}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-purple-500 shadow-sm" />
                    <span className="text-sm">Weekly</span>
                  </div>
                  <span className="font-semibold text-sm">{stats.frequencyDistribution.weekly}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
                    <span className="text-sm">Monthly</span>
                  </div>
                  <span className="font-semibold text-sm">{stats.frequencyDistribution.monthly}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Completions */}
          {stats && stats.recentCompletions.length > 0 && (
            <Card className="animate-in" style={{ animationDelay: '0.55s' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Recent Completions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.recentCompletions.map((completion, idx) => (
                  <div 
                    key={completion.id} 
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors animate-in"
                    style={{ animationDelay: `${0.6 + idx * 0.05}s` }}
                  >
                    <div className="p-1.5 rounded-full bg-green-100 shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{completion.checklistName}</p>
                      <p className="text-xs text-muted-foreground">
                        by {completion.completedBy}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(completion.completedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* My Recent Runs */}
          {runs.length > 0 && (
            <Card className="animate-in" style={{ animationDelay: '0.6s' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  My Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {runs.slice(0, 5).map((run, idx) => {
                  const config = statusConfig[run.status];
                  return (
                    <div 
                      key={run.id} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors animate-in"
                      style={{ animationDelay: `${0.65 + idx * 0.05}s` }}
                    >
                      <div className={`p-1.5 rounded-full ${config.color} shrink-0`}>
                        {config.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {run.checklist?.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{config.label}</span>
                          {run.progress !== undefined && (
                            <>
                              <span>•</span>
                              <span className="font-medium">{run.progress}%</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Active Run Dialog */}
      <Dialog open={showActiveRun} onOpenChange={setShowActiveRun}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          {activeRun && (
            <>
              <DialogHeader className="space-y-3">
                <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl">
                  <div className="p-2 rounded-full bg-primary/10">
                    <ListChecks className="h-5 w-5 text-primary" />
                  </div>
                  <span className="truncate">{activeRun.checklist?.name || 'Checklist'}</span>
                </DialogTitle>
                <DialogDescription>
                  Complete each item and submit when done
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                {/* Progress bar */}
                <div className="mb-6 p-4 rounded-xl bg-gray-50">
                  <div className="flex justify-between text-sm mb-3">
                    <span className="font-medium">Progress</span>
                    <span className="text-primary font-semibold">{activeRun.completedItems || 0} / {activeRun.totalItems || 0}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-500 ease-out relative"
                      style={{ width: `${activeRun.progress || 0}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-shimmer" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    {activeRun.progress || 0}% complete
                  </p>
                </div>

                {/* Items list */}
                <div className="space-y-3">
                  {activeRun.evidence?.map((evidence, idx) => (
                    <div
                      key={evidence.id}
                      className={`flex items-start gap-3 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 ${
                        evidence.checked 
                          ? 'bg-green-50 border-green-200 shadow-sm' 
                          : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                      }`}
                      style={{ animationDelay: `${idx * 0.03}s` }}
                    >
                      <button
                        onClick={() => toggleItem(evidence.itemId, !evidence.checked)}
                        className="mt-0.5 shrink-0 touch-manipulation p-1 -m-1 rounded-full hover:bg-gray-100 transition-colors"
                      >
                        {evidence.checked ? (
                          <CheckCircle2 className="h-6 w-6 text-green-600 transition-transform hover:scale-110" />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-400 hover:text-gray-600 transition-colors" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`break-words ${evidence.checked ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                          {evidence.item?.title}
                        </p>
                        {evidence.item?.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {evidence.item.description}
                          </p>
                        )}
                        {evidence.item?.isRequired && activeRun.checklist?.requiresPhotoEvidence && !evidence.fileUrl && (
                          <Badge variant="outline" className="mt-2 text-amber-600 border-amber-200 bg-amber-50">
                            <Camera className="h-3 w-3 mr-1" />
                            Photo required
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setShowActiveRun(false)}
                  className="w-full sm:w-auto"
                >
                  Save & Continue Later
                </Button>
                <Button 
                  onClick={completeRun}
                  className="w-full sm:w-auto"
                  disabled={(activeRun.progress || 0) < 100}
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Checklist
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Management Dialog */}
      {selectedChecklist && (
        <ChecklistRoleManager
          checklist={selectedChecklist}
          open={showRoleManager}
          onOpenChange={(open) => {
            setShowRoleManager(open);
            if (!open) setSelectedChecklist(null);
          }}
          onSave={fetchData}
        />
      )}
    </div>
  );
}
