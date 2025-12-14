'use client';

import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { ChevronDown, LogOut, Settings, Menu, X } from 'lucide-react';

interface NavbarProps {
  onMenuClick?: () => void;
  isSidebarOpen?: boolean;
}

export function Navbar({ onMenuClick, isSidebarOpen }: NavbarProps) {
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 1000);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="flex h-14 sm:h-16 items-center justify-between px-4 sm:px-6">
        {/* Left side - Menu button and Logo */}
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-3 -ml-2 rounded-lg text-gray-800 hover:bg-dough-brown-100 active:bg-dough-brown-200 transition-all border-2 border-gray-300 hover:border-dough-brown-500 shadow-sm"
            aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
          >
            {isSidebarOpen ? (
              <X className="h-7 w-7" strokeWidth={2.5} />
            ) : (
              <Menu className="h-7 w-7" strokeWidth={2.5} />
            )}
          </button>

          {/* Logo and Brand */}
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-sm group-hover:shadow-md transition-shadow">
              DH
            </div>
            <span className="hidden sm:block text-base sm:text-lg font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">
              The Dough House
            </span>
          </Link>
        </div>

        {/* Right side - User Menu */}
        <div className="flex items-center gap-2 sm:gap-4">
          {session?.user && (
            <div
              ref={dropdownRef}
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl hover:bg-gray-100 transition-all duration-200 group"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                  {(session.user.email?.[0] || 'U').toUpperCase()}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700 max-w-[150px] truncate group-hover:text-gray-900">
                  {session.user.email}
                </span>
                <ChevronDown 
                  className={`hidden sm:block h-4 w-4 text-gray-400 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
                />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 animate-fade-in-down">
                  {/* User info header */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.user.email}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">Logged in</p>
                  </div>
                  
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setIsDropdownOpen(false)}
                  >
                    <Settings className="h-4 w-4 text-gray-400" />
                    <span>Settings</span>
                  </Link>
                  <button
                    onClick={() => signOut({ callbackUrl: '/auth/login' })}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
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
