'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { EmployeeDashboard } from '@/components/dashboard/employee-dashboard';

export default function DashboardPage() {
  const { status } = useSession();

  if (status === 'loading') {
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

  if (status === 'unauthenticated') {
    redirect('/auth/login');
  }

  return <EmployeeDashboard />;
}
