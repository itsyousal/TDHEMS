'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingCart,
  Zap,
  Box,
  Warehouse,
  Users,
  Megaphone,
  Users2,
  DollarSign,
  CheckSquare,
  Settings,
  Gauge,
  ChevronRight,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
  submenu?: NavItem[];
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard size={20} />,
  },
  {
    name: 'Orders',
    href: '/dashboard/orders',
    icon: <ShoppingCart size={20} />,
    permission: 'orders.view',
  },
  {
    name: 'Production',
    href: '/dashboard/production',
    icon: <Zap size={20} />,
    permission: 'production.view',
  },
  {
    name: 'Inventory',
    href: '/dashboard/inventory',
    icon: <Box size={20} />,
    permission: 'inventory.view',
  },
  {
    name: 'Warehouse',
    href: '/dashboard/warehouse',
    icon: <Warehouse size={20} />,
    permission: 'warehouse.view',
  },
  {
    name: 'HR & People',
    href: '/dashboard/hr',
    icon: <Users size={20} />,
    permission: 'hr.view',
  },
  {
    name: 'Marketing',
    href: '/dashboard/marketing',
    icon: <Megaphone size={20} />,
    permission: 'marketing.view',
  },
  {
    name: 'CRM',
    href: '/dashboard/crm',
    icon: <Users2 size={20} />,
    permission: 'crm.view',
  },
  {
    name: 'Finance',
    href: '/dashboard/finance',
    icon: <DollarSign size={20} />,
    permission: 'finance.view',
  },
  {
    name: 'Checklists',
    href: '/dashboard/checklists',
    icon: <CheckSquare size={20} />,
    permission: 'checklists.view',
  },
  {
    name: 'Automation',
    href: '/dashboard/automation',
    icon: <Gauge size={20} />,
    permission: 'rules_engine.view',
  },
  {
    name: 'Settings',
    href: '/dashboard/settings',
    icon: <Settings size={20} />,
    permission: 'settings.view',
  },
];

interface SidebarProps {
  userPermissions?: string[];
}

export function Sidebar({ userPermissions = [] }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]
    );
  };

  // Derive permissions from props. If not available, assume open access.
  const derivedPermissions: string[] =
    userPermissions && userPermissions.length > 0
      ? userPermissions
      : [];

  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true;
    // If there is no permissions data available, allow access by default so links are visible.
    if (!derivedPermissions || derivedPermissions.length === 0) return true;
    return derivedPermissions.includes(permission);
  };

  const isActive = (href: string): boolean => {
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const filteredItems = navItems.filter((item) => hasPermission(item.permission));

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 border-r border-gray-200 bg-white overflow-y-auto z-40">
      <div className="flex flex-col min-h-full">
        <div className="flex-1 space-y-1 p-4 pb-20">
          {filteredItems.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={(e) => {
                  if (item.submenu) {
                    e.preventDefault();
                    toggleExpand(item.href);
                  }
                }}
                className={`
                  flex items-center justify-between px-4 py-3 rounded-lg transition-colors
                  ${isActive(item.href)
                    ? 'bg-dough-brown-100 text-dough-brown-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span>{item.name}</span>
                </div>
                {item.submenu && (
                  <ChevronRight
                    size={16}
                    className={`transition-transform ${expandedItems.includes(item.href) ? 'rotate-90' : ''
                      }`}
                  />
                )}
              </Link>

              {/* Submenu */}
              {item.submenu && expandedItems.includes(item.href) && (
                <div className="mt-1 space-y-1 pl-2 md:pl-2">
                  {item.submenu.map((subitem) => (
                    <Link
                      key={subitem.href}
                      href={subitem.href}
                      className={`
                        flex items-center space-x-3 px-4 py-2 rounded-lg text-sm transition-colors
                        ${isActive(subitem.href)
                          ? 'bg-dough-brown-50 text-dough-brown-600 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                        }
                      `}
                    >
                      <span className="h-1 w-1 rounded-full bg-gray-400" />
                      <span>{subitem.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Info - Now part of scrollable content */}
        <div className="sticky bottom-0 left-0 right-0 border-t border-gray-200 bg-gray-50 p-4 mt-auto">
          <div className="text-xs text-gray-600 space-y-1">
            <div className="font-semibold">{session?.user?.email}</div>
            <div className="text-gray-500">Logged in</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
