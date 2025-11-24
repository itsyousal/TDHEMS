import React, { Suspense } from 'react';
import prisma from '@/lib/db';

async function OrdersTable() {
  // Optimized query: select only needed fields and use lean query when possible
  const [total, recent] = await Promise.all([
    prisma.order.count(),
    prisma.order.findMany({
      take: 12,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        customer: {
          select: { name: true },
        },
        channelSource: {
          select: { name: true },
        },
      },
    }),
  ]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-dough-brown-700">Orders</h1>
        <p className="text-sm text-gray-600">Total orders: {total}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Recent Orders</h2>
        {recent.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No orders found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full w-full table-auto text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">Order #</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Customer</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Channel</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Total</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recent.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900">{o.orderNumber}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{o.customer?.name ?? 'Guest'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{o.channelSource?.name ?? 'direct'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        o.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        o.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        o.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-medium">₹{o.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<OrdersPageSkeleton />}>
      <OrdersTable />
    </Suspense>
  );
}

function OrdersPageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-40 bg-gray-200 rounded" />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
