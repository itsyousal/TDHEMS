"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Calendar, CheckSquare, User, MapPin, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

interface EmployeeStats {
    employee: any;
    shift: any;
    attendance: any[];
    checklists: any[];
    currentStatus: string;
}

export function EmployeeDashboard() {
    const { data: session } = useSession();
    const [stats, setStats] = useState<EmployeeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const isOwnerSuperAdmin = Array.isArray((session as any)?.user?.roles)
        ? ((session as any).user.roles as string[]).some(r => r === 'owner-super-admin' || /owner/i.test(r) || /super\s*admin/i.test(r))
        : false;

    async function fetchStats() {
        try {
            const res = await fetch("/api/dashboard/employee-stats");
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error("Failed to fetch employee stats", error);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchStats();
    }, []);

    const handleClockAction = async () => {
        if (!stats) return;
        setActionLoading(true);
        const action = stats.currentStatus === 'clocked_in' ? 'clock_out' : 'clock_in';

        try {
            const res = await fetch("/api/attendance/clock", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            });

            if (res.ok) {
                // Refresh stats to show new status
                await fetchStats();
            }
        } catch (error) {
            console.error("Clock action failed", error);
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center">Loading dashboard...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Welcome Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Welcome back, {session?.user?.name?.split(" ")[0] || "Employee"}!
                    </h1>
                    <p className="text-gray-500 mt-1">
                        Here's what's happening today, {format(new Date(), "EEEE, MMMM do")}.
                    </p>
                </div>
                    <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm ${stats?.currentStatus === 'clocked_in'
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : 'bg-gray-100 text-gray-700 border border-gray-200'
                        }`}>
                        <div className={`w-2.5 h-2.5 rounded-full animate-pulse ${stats?.currentStatus === 'clocked_in' ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                        {stats?.currentStatus === 'clocked_in' ? 'Clocked In' : 'Clocked Out'}
                    </div>

                    {!isOwnerSuperAdmin && (
                        <Button
                            onClick={handleClockAction}
                            disabled={actionLoading}
                            size="lg"
                            variant={stats?.currentStatus === 'clocked_in' ? 'destructive' : 'secondary'}
                            className="font-semibold shadow-md hover:shadow-lg transition-all px-6"
                        >
                            {actionLoading ? "Processing..." : (stats?.currentStatus === 'clocked_in' ? "Clock Out" : "Clock In")}
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Today's Shift Card */}
                <Card className="border-l-4 border-l-dough-brown-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-900">
                            <Calendar className="h-5 w-5 text-dough-brown-500" />
                            Today's Shift
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.shift ? (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Shift</span>
                                    <span className="font-medium text-gray-900">{stats.shift.shift.name}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Time</span>
                                    <span className="font-medium text-gray-900">
                                        {stats.shift.shift.startTime} - {stats.shift.shift.endTime}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Location</span>
                                    <span className="font-medium text-gray-900 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {stats.shift.location.name}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                No shift assigned for today.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Attendance Summary Card */}
                <Card className="border-l-4 border-l-gold-accent-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-900">
                            <Clock className="h-5 w-5 text-gold-accent-500" />
                            Recent Activity
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.attendance && stats.attendance.length > 0 ? (
                            <div className="space-y-3">
                                {stats.attendance.slice(0, 3).map((event: any) => (
                                    <div key={event.id} className="flex justify-between items-center border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                                        <span className="text-sm capitalize text-gray-700">
                                            {event.eventType.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-gray-500 font-mono">
                                            {format(new Date(event.eventTime), "h:mm a")}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                No activity recorded today.
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* My Tasks Card */}
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-900">
                            <CheckSquare className="h-5 w-5 text-blue-500" />
                            My Tasks
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {stats?.checklists && stats.checklists.length > 0 ? (
                            <div className="space-y-3">
                                {stats.checklists.map((run: any) => (
                                    <div key={run.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-gray-50 transition-colors">
                                        <div className="mt-1">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{run.checklist.name}</p>
                                            <p className="text-xs text-gray-500">Started {format(new Date(run.startedAt), "h:mm a")}</p>
                                        </div>
                                    </div>
                                ))}
                                <Button variant="outline" className="w-full text-xs h-8 mt-2">
                                    View All Tasks
                                </Button>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500 text-sm">
                                No active tasks at the moment.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
