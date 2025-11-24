'use client';

import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ChevronDown, LogOut, Settings, User, Menu } from 'lucide-react';

interface NavbarProps {
  onMenuToggle?: () => void;
}

export function Navbar({ onMenuToggle }: NavbarProps) {
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

  return (
    <nav className="border-b border-gray-200 bg-white shadow-sm sticky top-0 z-30">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Left: Logo and Hamburger */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg lg:hidden hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-dough-brown-500 flex items-center justify-center text-white font-bold text-sm">
              DH
            </div>
            <span className="hidden sm:inline text-lg font-semibold text-gray-900">The Dough House</span>
          </Link>
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center space-x-4">
          {session?.user && (
            <div className="relative">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-expanded={isDropdownOpen}
                aria-label="User menu"
              >
                <div className="h-8 w-8 rounded-full bg-gold-accent-500 flex items-center justify-center text-dough-brown-600 font-semibold text-sm">
                  {(session.user.email?.[0] || 'U').toUpperCase()}
                </div>
                <span className="hidden sm:inline text-sm font-medium text-gray-700 truncate max-w-xs">
                  {session.user.email}
                </span>
                <ChevronDown
                  size={16}
                  className={`text-gray-400 transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 max-w-sm bg-white border border-gray-200 rounded-lg shadow-lg z-50 -mr-2 sm:mr-0">
                  <Link
                    href="/settings/profile"
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <User size={16} />
                    <span>Profile Settings</span>
                  </Link>
                  <Link
                    href="/settings"
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100 transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      signOut();
                    }}
                    className="flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
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
