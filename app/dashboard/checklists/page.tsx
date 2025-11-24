import React, { Suspense } from 'react';
import prisma from '@/lib/db';

async function ChecklistsPage() {
  const [totalChecklists, recent] = await Promise.all([
    prisma.checklist.count(),
    prisma.checklist.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        frequency: true,
        createdAt: true,
        _count: { select: { items: true } },
      },
    }),
  ]);

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const activeCount = recent.filter(c => c.isActive).length;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Checklists</h1>
        <p className="text-sm text-gray-600 mt-1">Quality assurance and process checklists</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Total Checklists</h3>
          <p className="text-3xl font-bold text-dough-brown-600 mt-2">{totalChecklists}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Active</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {activeCount}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Completed Today</h3>
          <p className="text-3xl font-bold text-gold-accent-500 mt-2">0</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Quality Checklists</h2>
        {recent.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No checklists found</p>
        ) : (
          <div className="space-y-3">
            {recent.map((checklist) => (
              <div key={checklist.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{checklist.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{checklist.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-4 ${getStatusColor(checklist.isActive)}`}>
                    {checklist.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{checklist._count.items} items • Created {new Date(checklist.createdAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function ChecklistsPageWrapper() {
  return (
    <Suspense fallback={<ChecklistsSkeleton />}>
      <ChecklistsPage />
    </Suspense>
  );
}

function ChecklistsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-64 bg-gray-200 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
