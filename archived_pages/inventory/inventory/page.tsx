import React from 'react';
import prisma from '@/lib/db';

export default async function InventoryPage() {
  const [total, items] = await Promise.all([
    prisma.inventory.count(),
    prisma.inventory.findMany({
      take: 12,
      orderBy: { updatedAt: 'desc' },
      include: { sku: true, location: true },
    }),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-dough-brown-700">Inventory</h1>
        <p className="text-sm text-gray-600">Total inventory records: {total}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Recent Inventory</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-gray-600">
                <th className="px-3 py-2">SKU</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Location</th>
                <th className="px-3 py-2">Available</th>
                <th className="px-3 py-2">Reserved</th>
                <th className="px-3 py-2">Last Count</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-2">{it.sku.code}</td>
                  <td className="px-3 py-2">{it.sku.name}</td>
                  <td className="px-3 py-2">{it.location?.name ?? '—'}</td>
                  <td className="px-3 py-2">{it.availableQuantity}</td>
                  <td className="px-3 py-2">{it.reservedQuantity}</td>
                  <td className="px-3 py-2">{it.lastCountAt ? new Date(it.lastCountAt).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
