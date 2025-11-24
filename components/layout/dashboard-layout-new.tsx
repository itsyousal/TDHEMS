'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { Navbar } from './navbar-new';
import { Sidebar } from './sidebar-new';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userPermissions?: string[];
}

export function DashboardLayout({
  children,
  userPermissions = [],
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen w-screen flex-col bg-gray-50 overflow-hidden">
      {/* Navigation Bar */}
      <Navbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          userPermissions={userPermissions}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full lg:w-[calc(100%-16rem)]">
          <div className="p-4 lg:p-6 w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
