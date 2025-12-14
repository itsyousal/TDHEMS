import React, { Suspense } from 'react';
import { ChecklistAnalytics } from '@/components/checklists/checklist-analytics';
import { RefreshCw } from 'lucide-react';

export default function ChecklistAnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsSkeleton />}>
      <ChecklistAnalytics />
    </Suspense>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="h-9 w-48 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-5 w-80 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-gray-200 rounded animate-pulse" />
          <div className="h-9 w-28 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>

      {/* Period selector skeleton */}
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
        <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-80 bg-gray-200 rounded animate-pulse" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mt-2" />
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mt-2" />
          </div>
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="space-y-4">
        <div className="h-10 w-96 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
