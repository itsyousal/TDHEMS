'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout';
import { StatCard } from '@/components/molecules/stat-card';
import {
  ShoppingCart,
  Zap,
  Box,
  Users,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

// Mock data - will be replaced with real API calls
const mockOrdersTrend = [
  { date: 'Mon', orders: 24, revenue: 2400 },
  { date: 'Tue', orders: 32, revenue: 2210 },
  { date: 'Wed', orders: 28, revenue: 2290 },
  { date: 'Thu', orders: 35, revenue: 2000 },
  { date: 'Fri', orders: 42, revenue: 2181 },
  { date: 'Sat', orders: 38, revenue: 2500 },
  { date: 'Sun', orders: 30, revenue: 2100 },
];

const mockChannelBreakdown = [
  { name: 'Direct', value: 35, color: '#8B4513' },
  { name: 'Swiggy', value: 28, color: '#FFD700' },
  { name: 'Zomato', value: 22, color: '#10B981' },
  { name: 'In-Store', value: 15, color: '#3B82F6' },
];

const mockTopProducts = [
  { name: 'Chocolate Cake', sales: 4200 },
  { name: 'Sourdough Bread', sales: 3800 },
  { name: 'Croissants', sales: 3200 },
  { name: 'Donuts', sales: 2800 },
  { name: 'Cookies', sales: 2400 },
];

const mockRecentActivity = [
  { id: 1, type: 'order', message: 'Order #ORD-12345-000001 created', time: '2 hours ago' },
  { id: 2, type: 'batch', message: 'Batch #BATCH-001 moved to QC', time: '3 hours ago' },
  { id: 3, type: 'alert', message: 'Low stock alert: Flour (100kg)', time: '4 hours ago' },
  { id: 4, type: 'order', message: 'Order #ORD-12345-000002 shipped', time: '5 hours ago' },
  { id: 5, type: 'batch', message: 'Batch #BATCH-002 completed', time: '6 hours ago' },
];

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 324,
    totalRevenue: 45680,
    activeProduction: 12,
    employeesPresent: 28,
  });

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === 'unauthenticated') {
      redirect('/auth/login');
    }

    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [status]);

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-8 animate-pulse">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
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
          subtitle="This month"
          icon={ShoppingCart}
          trend={{ value: 12.5, direction: 'up', period: 'vs last month' }}
          variant="info"
        />
        <StatCard
          title="Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          subtitle="This month"
          icon={TrendingUp}
          trend={{ value: 8.2, direction: 'up', period: 'vs last month' }}
          variant="success"
        />
        <StatCard
          title="Active Production"
          value={stats.activeProduction}
          subtitle="Batches in progress"
          icon={Zap}
          trend={{ value: 15, direction: 'down', period: 'vs yesterday' }}
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockOrdersTrend}>
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
                data={mockChannelBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {mockChannelBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-4">
            {mockChannelBreakdown.map((channel) => (
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
            <BarChart data={mockTopProducts}>
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
            {mockRecentActivity.map((activity) => (
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
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
