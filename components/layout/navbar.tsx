'use client';

import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ChevronDown, LogOut, Settings, User } from 'lucide-react';

export function Navbar() {
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Logo and Brand */}
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="h-8 w-8 rounded-lg bg-dough-brown-500 flex items-center justify-center text-white font-bold">
            DH
          </div>
          <span className="text-lg font-semibold text-gray-900">The Dough House</span>
        </Link>

        {/* User Menu */}
        <div className="flex items-center space-x-4">
          {session?.user && (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-gold-accent-500 flex items-center justify-center text-dough-brown-600 font-semibold">
                  {(session.user.email?.[0] || 'U').toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {session.user.email}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                  <Link
                    href="/settings/profile"
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                  >
                    <User size={16} />
                    <span>Profile Settings</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100"
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
