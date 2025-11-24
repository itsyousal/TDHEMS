import React from 'react';
import { DashboardLayout } from '@/components/layout';
import prisma from '@/lib/db';

export default async function OrdersPage() {
  const [total, recent] = await Promise.all([
    prisma.order.count(),
    prisma.order.findMany({
      take: 12,
      orderBy: { createdAt: 'desc' },
      include: { customer: true, channelSource: true },
    }),
  ]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-dough-brown-700">Orders</h1>
        <p className="text-sm text-gray-600">Total orders: {total}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-gray-600">
                <th className="px-3 py-2">Order #</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Channel</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="px-3 py-2">{o.orderNumber}</td>
                  <td className="px-3 py-2">{o.customer?.name ?? 'Guest'}</td>
                  <td className="px-3 py-2">{o.channelSource?.name ?? 'direct'}</td>
                  <td className="px-3 py-2">{o.status}</td>
                  <td className="px-3 py-2">{o.totalAmount.toFixed(2)}</td>
                  <td className="px-3 py-2">{new Date(o.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
