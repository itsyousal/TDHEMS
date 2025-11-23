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
        {/* Sidebar */}
        <Sidebar userPermissions={userPermissions} />

        {/* Content */}
        <main className="flex-1 overflow-y-auto ml-64 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
