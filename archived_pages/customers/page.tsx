import React from 'react';
import { DashboardLayout } from '@/components/layout';
import prisma from '@/lib/db';

export default async function CustomersPage() {
  const [total, list] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.findMany({ take: 12, orderBy: { createdAt: 'desc' } }),
  ]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-dough-brown-700">Customers</h1>
        <p className="text-sm text-gray-600">Total customers: {total}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Recent Customers</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-gray-600">
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Lifetime</th>
                <th className="px-3 py-2">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="px-3 py-2">{c.name}</td>
                  <td className="px-3 py-2">{c.email ?? '—'}</td>
                  <td className="px-3 py-2">{c.phone ?? '—'}</td>
                  <td className="px-3 py-2">{c.loyaltyTier}</td>
                  <td className="px-3 py-2">{c.lifetimeValue.toFixed(2)}</td>
                  <td className="px-3 py-2">{c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
