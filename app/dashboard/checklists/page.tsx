import React, { Suspense } from 'react';
import { ChecklistDashboard } from '@/components/checklists/checklist-dashboard';
import { RefreshCw } from 'lucide-react';

export default function ChecklistsPage() {
  return (
    <Suspense fallback={<ChecklistsSkeleton />}>
      <ChecklistDashboard />
    </Suspense>
  );
}

function ChecklistsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="h-9 w-40 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-72 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mt-2" />
            <div className="h-3 w-20 bg-gray-200 rounded animate-pulse mt-2" />
          </div>
        ))}
      </div>

      {/* Main content skeleton */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-300" />
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="h-6 w-28 bg-gray-200 rounded animate-pulse mb-4" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
