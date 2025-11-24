import React from 'react';
import { DashboardLayout } from '@/components/layout';
import prisma from '@/lib/db';

export default async function ProductionPage() {
  const [total, batches] = await Promise.all([
    prisma.productionBatch.count(),
    prisma.productionBatch.findMany({
      take: 12,
      orderBy: { plannedDate: 'desc' },
    }),
  ]);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-dough-brown-700">Production</h1>
        <p className="text-sm text-gray-600">Batches: {total}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Recent Batches</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-gray-600">
                <th className="px-3 py-2">Batch #</th>
                <th className="px-3 py-2">BOM</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Planned</th>
                <th className="px-3 py-2">Started</th>
                <th className="px-3 py-2">Completed</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-3 py-2">{b.batchNumber}</td>
                  <td className="px-3 py-2">{b.bomId ?? '—'}</td>
                  <td className="px-3 py-2">{b.status}</td>
                  <td className="px-3 py-2">{new Date(b.plannedDate).toLocaleDateString()}</td>
                  <td className="px-3 py-2">{b.startedAt ? new Date(b.startedAt).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2">{b.completedAt ? new Date(b.completedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
