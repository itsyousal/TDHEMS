'use client';

import React from 'react';
import { Navbar } from './navbar';
import { Sidebar } from './sidebar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userPermissions?: string[];
}

export function DashboardLayout({
  children,
  userPermissions = [],
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* Navigation Bar */}
      <Navbar />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - hidden on small screens to free space */}
        <Sidebar userPermissions={userPermissions} />

        {/* Content - account for sidebar width on md+ screens */}
        <main className="flex-1 overflow-y-auto ml-64 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
