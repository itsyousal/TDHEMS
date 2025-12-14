'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { format, subDays, isAfter } from 'date-fns';
import {
    Users,
    Briefcase,
    Award,
    TrendingUp,
    Clock,
    UserPlus,
    UserCheck,
    UserX,
    AlertCircle,
    ChevronRight,
    Calendar,
    Activity,
    Building,
    Loader2,
    RefreshCw,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================
interface Employee {
    id: string;
    employeeId: string;
    firstName: string;
    lastName: string;
    email: string;
    department: string | null;
    designation: string | null;
    status: string;
    joinDate: string;
    exitDate: string | null;
    user?: {
        id: string;
        isActive: boolean;
        lastLogin: string | null;
        userRoles?: { role: { slug: string; name: string } }[];
    } | null;
}

interface AttendanceEvent {
    id: string;
    userId: string;
    employeeId: string | null;
    eventType: string;
    eventTime: string;
    employee?: {
        firstName: string;
        lastName: string;
    } | null;
}

interface HRStats {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
    onLeaveEmployees: number;
    terminatedEmployees: number;
    newHires30Days: number;
    departmentCounts: Record<string, number>;
    roleDistribution: Record<string, number>;
    attendanceToday: {
        clockedIn: number;
        clockedOut: number;
        notClocked: number;
    };
}

// ============================================================================
// Helper Functions
// ============================================================================
function calculateStats(employees: Employee[], todayAttendance: AttendanceEvent[]): HRStats {
    const thirtyDaysAgo = subDays(new Date(), 30);

    const stats: HRStats = {
        totalEmployees: employees.length,
        activeEmployees: 0,
        inactiveEmployees: 0,
        onLeaveEmployees: 0,
        terminatedEmployees: 0,
        newHires30Days: 0,
        departmentCounts: {},
        roleDistribution: {},
        attendanceToday: {
            clockedIn: 0,
            clockedOut: 0,
            notClocked: 0,
        },
    };

    // Track who is currently clocked in
    const clockedInUserIds = new Set<string>();
    const clockedOutUserIds = new Set<string>();

    // Process attendance events (sorted by time, latest first)
    const sortedEvents = [...todayAttendance].sort(
        (a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime()
    );

    // Get latest status for each user
    const userLatestStatus = new Map<string, string>();
    for (const event of sortedEvents) {
        if (!userLatestStatus.has(event.userId)) {
            userLatestStatus.set(event.userId, event.eventType);
        }
    }

    for (const [userId, eventType] of userLatestStatus) {
        if (eventType === 'clock_in') {
            clockedInUserIds.add(userId);
        } else {
            clockedOutUserIds.add(userId);
        }
    }

    employees.forEach((emp) => {
        // Status counts
        switch (emp.status) {
            case 'active':
                stats.activeEmployees++;
                break;
            case 'inactive':
                stats.inactiveEmployees++;
                break;
            case 'on_leave':
                stats.onLeaveEmployees++;
                break;
            case 'terminated':
                stats.terminatedEmployees++;
                break;
        }

        // New hires in last 30 days
        if (emp.joinDate && isAfter(new Date(emp.joinDate), thirtyDaysAgo)) {
            stats.newHires30Days++;
        }

        // Department distribution
        const dept = emp.department || 'Unassigned';
        stats.departmentCounts[dept] = (stats.departmentCounts[dept] || 0) + 1;

        // Role distribution
        const role = emp.user?.userRoles?.[0]?.role?.name || 'No Role';
        stats.roleDistribution[role] = (stats.roleDistribution[role] || 0) + 1;

        // Attendance tracking for active employees
        if (emp.status === 'active' && emp.user?.id) {
            if (clockedInUserIds.has(emp.user.id)) {
                stats.attendanceToday.clockedIn++;
            } else if (clockedOutUserIds.has(emp.user.id)) {
                stats.attendanceToday.clockedOut++;
            } else {
                stats.attendanceToday.notClocked++;
            }
        }
    });

    return stats;
}

// ============================================================================
// Subcomponents
// ============================================================================
function StatCard({
    title,
    value,
    icon: Icon,
    iconColor,
    bgColor,
    trend,
    trendLabel,
}: {
    title: string;
    value: number | string;
    icon: React.ElementType;
    iconColor: string;
    bgColor: string;
    trend?: number;
    trendLabel?: string;
}) {
    return (
        <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">{title}</p>
                        <p className="text-3xl font-bold text-gray-900">{value}</p>
                        {trend !== undefined && (
                            <div className="flex items-center text-xs">
                                {trend >= 0 ? (
                                    <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                                ) : (
                                    <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                                )}
                                <span className={trend >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {Math.abs(trend)}%
                                </span>
                                {trendLabel && <span className="text-gray-400 ml-1">{trendLabel}</span>}
                            </div>
                        )}
                    </div>
                    <div className={`p-3 rounded-full ${bgColor}`}>
                        <Icon className={`h-6 w-6 ${iconColor}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function DepartmentBreakdown({ departments }: { departments: Record<string, number> }) {
    const sortedDepts = Object.entries(departments).sort((a, b) => b[1] - a[1]);
    const total = sortedDepts.reduce((sum, [, count]) => sum + count, 0);

    const colors = [
        'bg-dough-brown-500',
        'bg-gold-accent-500',
        'bg-blue-500',
        'bg-green-500',
        'bg-purple-500',
        'bg-orange-500',
        'bg-pink-500',
        'bg-teal-500',
    ];

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Building className="h-5 w-5 text-gray-500" />
                    Department Distribution
                </CardTitle>
            </CardHeader>
            <CardContent>
                {sortedDepts.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No department data available</p>
                ) : (
                    <div className="space-y-3">
                        {sortedDepts.map(([dept, count], index) => {
                            const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                            return (
                                <div key={dept} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-medium text-gray-700">{dept}</span>
                                        <span className="text-gray-500">
                                            {count} ({percentage}%)
                                        </span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${colors[index % colors.length]} transition-all duration-300`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function RecentHires({ employees }: { employees: Employee[] }) {
    const recentHires = useMemo(() => {
        return [...employees]
            .filter((e) => e.joinDate && e.status === 'active')
            .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime())
            .slice(0, 5);
    }, [employees]);

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-green-500" />
                        Recent Hires
                    </CardTitle>
                    <Link href="/dashboard/employees">
                        <Button variant="ghost" size="sm" className="text-xs">
                            View All <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                {recentHires.length === 0 ? (
                    <div className="text-center py-8">
                        <Users className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No recent hires</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {recentHires.map((emp) => (
                            <div
                                key={emp.id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-dough-brown-100 flex items-center justify-center">
                                        <span className="text-sm font-semibold text-dough-brown-600">
                                            {emp.firstName[0]}
                                            {emp.lastName[0]}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {emp.firstName} {emp.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500">{emp.designation || 'No title'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">
                                        {format(new Date(emp.joinDate), 'MMM d, yyyy')}
                                    </p>
                                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 mt-1">
                                        New
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function AttendanceOverview({ stats }: { stats: HRStats }) {
    const total = stats.attendanceToday.clockedIn + stats.attendanceToday.clockedOut + stats.attendanceToday.notClocked;
    const attendanceRate = total > 0 ? Math.round((stats.attendanceToday.clockedIn / total) * 100) : 0;

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    Today's Attendance
                </CardTitle>
                <CardDescription>
                    {format(new Date(), 'EEEE, MMMM d, yyyy')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                        <UserCheck className="h-6 w-6 text-green-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-green-700">{stats.attendanceToday.clockedIn}</p>
                        <p className="text-xs text-green-600">Clocked In</p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <UserX className="h-6 w-6 text-gray-400 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-gray-700">{stats.attendanceToday.clockedOut}</p>
                        <p className="text-xs text-gray-500">Clocked Out</p>
                    </div>
                    <div className="text-center p-3 bg-amber-50 rounded-lg">
                        <AlertCircle className="h-6 w-6 text-amber-500 mx-auto mb-1" />
                        <p className="text-2xl font-bold text-amber-700">{stats.attendanceToday.notClocked}</p>
                        <p className="text-xs text-amber-600">Not Clocked</p>
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Attendance Rate</span>
                        <span className="font-semibold text-gray-900">{attendanceRate}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{ width: `${attendanceRate}%` }}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function QuickActions() {
    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-500" />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                <Link href="/dashboard/employees" className="block">
                    <Button variant="outline" className="w-full justify-start text-left h-auto py-3">
                        <Users className="h-4 w-4 mr-3 text-dough-brown-500" />
                        <div>
                            <p className="font-medium text-sm">Manage Employees</p>
                            <p className="text-xs text-gray-500">View, add, or edit employee records</p>
                        </div>
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}

// ============================================================================
// Main Component
// ============================================================================
export default function HRPage() {
    const { data: session, status: authStatus } = useSession();
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [todayAttendance, setTodayAttendance] = useState<AttendanceEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

    // Fetch data
    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const [empRes, attendanceRes] = await Promise.all([
                fetch('/api/employees'),
                fetch('/api/hr/attendance-today').catch(() => null), // Optional endpoint
            ]);

            if (!empRes.ok) {
                if (empRes.status === 403) {
                    setError('You do not have permission to access HR data.');
                    return;
                }
                throw new Error('Failed to fetch employee data');
            }

            const empData = await empRes.json();
            setEmployees(empData);

            if (attendanceRes?.ok) {
                const attendanceData = await attendanceRes.json();
                setTodayAttendance(attendanceData);
            }

            setLastRefresh(new Date());
        } catch (err) {
            console.error('Error fetching HR data:', err);
            setError(err instanceof Error ? err.message : 'Failed to load HR data');
            toast.error('Failed to load HR data');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (authStatus === 'unauthenticated') {
            redirect('/auth/login');
        }
        if (authStatus === 'authenticated') {
            fetchData();
        }
    }, [authStatus, fetchData]);

    // Calculate stats
    const stats = useMemo(() => calculateStats(employees, todayAttendance), [employees, todayAttendance]);

    // Loading state
    if (authStatus === 'loading' || (isLoading && employees.length === 0)) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-dough-brown-500 mx-auto mb-4" />
                    <p className="text-gray-500">Loading HR dashboard...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
                <div className="bg-red-50 text-red-600 p-6 rounded-lg border border-red-200 max-w-md text-center">
                    <AlertCircle className="h-10 w-10 mx-auto mb-3" />
                    <h3 className="font-semibold text-lg mb-2">Access Error</h3>
                    <p className="text-sm">{error}</p>
                    <Button variant="outline" className="mt-4" onClick={fetchData}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Human Resources</h1>
                    <p className="text-gray-500 mt-1">
                        Overview of workforce and HR operations
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {lastRefresh && (
                        <span className="text-xs text-gray-400">
                            Last updated: {format(lastRefresh, 'h:mm a')}
                        </span>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchData}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Link href="/dashboard/employees">
                        <Button variant="secondary" size="sm">
                            <Users className="h-4 w-4 mr-2" />
                            Manage Employees
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Employees"
                    value={stats.totalEmployees}
                    icon={Users}
                    iconColor="text-dough-brown-600"
                    bgColor="bg-dough-brown-100"
                />
                <StatCard
                    title="Active Employees"
                    value={stats.activeEmployees}
                    icon={UserCheck}
                    iconColor="text-green-600"
                    bgColor="bg-green-100"
                />
                <StatCard
                    title="New Hires (30 days)"
                    value={stats.newHires30Days}
                    icon={TrendingUp}
                    iconColor="text-blue-600"
                    bgColor="bg-blue-100"
                />
                <StatCard
                    title="Departments"
                    value={Object.keys(stats.departmentCounts).length}
                    icon={Briefcase}
                    iconColor="text-gold-accent-600"
                    bgColor="bg-gold-accent-100"
                />
            </div>

            {/* Workforce Status Summary - Moved to top */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold text-gray-900">
                        Workforce Status Summary
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 bg-green-50 rounded-lg text-center">
                            <p className="text-3xl font-bold text-green-700">{stats.activeEmployees}</p>
                            <p className="text-sm text-green-600 mt-1">Active</p>
                        </div>
                        <div className="p-4 bg-amber-50 rounded-lg text-center">
                            <p className="text-3xl font-bold text-amber-700">{stats.onLeaveEmployees}</p>
                            <p className="text-sm text-amber-600 mt-1">On Leave</p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg text-center">
                            <p className="text-3xl font-bold text-gray-700">{stats.inactiveEmployees}</p>
                            <p className="text-sm text-gray-600 mt-1">Inactive</p>
                        </div>
                        <div className="p-4 bg-red-50 rounded-lg text-center">
                            <p className="text-3xl font-bold text-red-700">{stats.terminatedEmployees}</p>
                            <p className="text-sm text-red-600 mt-1">Terminated</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    <RecentHires employees={employees} />
                    <DepartmentBreakdown departments={stats.departmentCounts} />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <AttendanceOverview stats={stats} />
                    <QuickActions />
                </div>
            </div>
        </div>
    );
}
