'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { StatCard } from '@/components/molecules/stat-card';
import {
  ShoppingCart,
  Zap,
  Users,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  activeProduction: number;
  employeesPresent: number;
  ordersTrend?: { value: number; direction: 'up' | 'down'; period: string } | null;
  revenueTrend?: { value: number; direction: 'up' | 'down'; period: string } | null;
  productionTrend?: { value: number; direction: 'up' | 'down'; period: string } | null;
  salesTrend: Array<{ date: string; orders: number; revenue: number }>;
  channelBreakdown: Array<{ name: string; value: number; color: string }>;
  topProducts: Array<{ name: string; sales: number }>;
  recentActivity: Array<{ id: string; type: string; message: string; time: string }>;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalRevenue: 0,
    activeProduction: 0,
    employeesPresent: 0,
    salesTrend: [],
    channelBreakdown: [],
    topProducts: [],
    recentActivity: [],
  });

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      redirect('/auth/login');
    }

    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (status === 'authenticated') {
      fetchStats();
    }
  }, [status]);

  if (status === 'loading' || isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back, {session?.user?.email}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          subtitle="All time"
          icon={ShoppingCart}
          trend={stats.ordersTrend || undefined}
          variant="info"
        />
        <StatCard
          title="Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          subtitle="All time"
          icon={TrendingUp}
          trend={stats.revenueTrend || undefined}
          variant="success"
        />
        <StatCard
          title="Active Production"
          value={stats.activeProduction}
          subtitle="Batches in progress"
          icon={Zap}
          trend={stats.productionTrend || undefined}
          variant="default"
        />
        <StatCard
          title="Employees Present"
          value={stats.employeesPresent}
          subtitle="On duty today"
          icon={Users}
          variant="warning"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend (Last 7 Days)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.salesTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#8B4513"
                strokeWidth={2}
                dot={{ fill: '#8B4513', r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#FFD700"
                strokeWidth={2}
                dot={{ fill: '#FFD700', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Channel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats.channelBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {stats.channelBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {stats.channelBreakdown.map((channel) => (
              <div key={channel.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: channel.color }}
                  />
                  <span className="text-gray-700">{channel.name}</span>
                </div>
                <span className="font-medium text-gray-900">{channel.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats.topProducts}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="sales" fill="#8B4513" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-gray-500">No recent activity.</p>
            ) : (
              stats.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                  <div className="mt-1">
                    {activity.type === 'order' && (
                      <ShoppingCart size={18} className="text-blue-600" />
                    )}
                    {activity.type === 'batch' && (
                      <CheckCircle2 size={18} className="text-green-600" />
                    )}
                    {activity.type === 'alert' && (
                      <AlertCircle size={18} className="text-yellow-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
