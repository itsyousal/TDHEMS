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
  CreditCard,
  ShoppingBag,
  ChevronRight,
  X,
  Lock,
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
    name: 'Admin Dashboard',
    href: '/dashboard/admin',
    icon: <Users size={20} />,
    permission: 'admin.view',
    submenu: [
      {
        name: 'Password Management',
        href: '/dashboard/admin/password-management',
        icon: <></>,
        permission: 'user.reset_password',
      },
    ],
  },
  {
    name: 'Sales',
    href: '/dashboard/sales',
    icon: <ShoppingCart size={20} />,
    submenu: [
      {
        name: 'Orders',
        href: '/dashboard/orders',
        icon: <></>,
        permission: 'orders.view',
      },
      {
        name: 'POS',
        href: '/pos',
        icon: <></>,
      },
      {
        name: 'Customer Portal',
        href: '/order',
        icon: <></>,
      },
    ],
  },
  {
    name: 'Operations',
    href: '/dashboard/operations',
    icon: <Zap size={20} />,
    submenu: [
      {
        name: 'Production',
        href: '/dashboard/production',
        icon: <></>,
        permission: 'production.view',
      },
      {
        name: 'Inventory',
        href: '/dashboard/inventory',
        icon: <></>,
        permission: 'inventory.view',
      },
      {
        name: 'Warehouse',
        href: '/dashboard/warehouse',
        icon: <></>,
        permission: 'warehouse.view',
      },
      {
        name: 'Menu Management',
        href: '/dashboard/menu',
        icon: <></>,
        permission: 'inventory.view',
      },
    ],
  },
  {
    name: 'People',
    href: '/dashboard/people',
    icon: <Users size={20} />,
    submenu: [
      {
        name: 'HR & Employees',
        href: '/dashboard/hr',
        icon: <></>,
        permission: 'hr.view',
      },
      {
        name: 'Employee Management',
        href: '/dashboard/employees',
        icon: <></>,
        permission: 'hr.view',
      },
    ],
  },
  {
    name: 'Business',
    href: '/dashboard/business',
    icon: <DollarSign size={20} />,
    submenu: [
      {
        name: 'Finance',
        href: '/dashboard/finance',
        icon: <></>,
        permission: 'finance.view',
      },
      {
        name: 'Marketing',
        href: '/dashboard/marketing',
        icon: <></>,
        permission: 'marketing.view',
      },
      {
        name: 'CRM',
        href: '/dashboard/crm',
        icon: <></>,
        permission: 'crm.view',
      },
      {
        name: 'Customers',
        href: '/dashboard/customers',
        icon: <></>,
        permission: 'crm.view',
      },
    ],
  },
  {
    name: 'Tools',
    href: '/dashboard/tools',
    icon: <Gauge size={20} />,
    submenu: [
      {
        name: 'Checklists',
        href: '/dashboard/checklists',
        icon: <></>,
        permission: 'checklists.view',
      },
      {
        name: 'Automation',
        href: '/dashboard/automation',
        icon: <></>,
        permission: 'rules_engine.view',
      },
    ],
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
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ userPermissions = [], isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]
    );
  };

  // Prefer explicit `userPermissions` prop when provided, otherwise derive from session
  const sessionPermissions: string[] = (session?.user as any)?.permissions || [];
  const sessionRoles: string[] = (session?.user as any)?.roles || [];

  const effectivePermissions =
    userPermissions && userPermissions.length > 0 ? userPermissions : sessionPermissions;

  const isSuperAdmin = sessionRoles.includes('owner-super-admin') || sessionRoles.includes('super-admin');

  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true;
    if (isSuperAdmin) return true;
    // If no explicit permissions are available, deny access to permissioned routes
    if (!effectivePermissions || effectivePermissions.length === 0) return false;
    return effectivePermissions.includes(permission);
  };

  const isActive = (href: string): boolean => {
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const filteredItems = navItems.filter((item) => hasPermission(item.permission));

  // Mobile drawer
  const mobileSidebar = isOpen && (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 overflow-y-auto z-50 lg:hidden shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>
        <nav className="space-y-1 p-4">
          {filteredItems.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={isActive}
              isExpanded={expandedItems.includes(item.href)}
              onToggleExpand={() => toggleExpand(item.href)}
              onNavigate={onClose}
            />
          ))}
        </nav>
      </aside>
    </>
  );

  // Desktop sidebar
  const desktopSidebar = (
    <aside className="hidden w-64 border-r border-gray-200 bg-white overflow-y-auto shadow-sm lg:block lg:fixed lg:left-0 lg:top-16 lg:h-[calc(100vh-4rem)] z-20">
      <nav className="space-y-1 p-4">
        {filteredItems.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={isActive}
            isExpanded={expandedItems.includes(item.href)}
            onToggleExpand={() => toggleExpand(item.href)}
          />
        ))}
      </nav>
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 bg-gray-50 p-4">
        <div className="text-xs text-gray-600">
          <div className="font-semibold truncate">{session?.user?.email}</div>
          <div className="text-gray-500">Logged in</div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {mobileSidebar}
      {desktopSidebar}
    </>
  );
}

function NavItem({
  item,
  isActive,
  isExpanded,
  onToggleExpand,
  onNavigate,
}: {
  item: NavItem;
  isActive: (href: string) => boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div>
      <Link
        href={item.href}
        onClick={(e) => {
          if (item.submenu) {
            e.preventDefault();
            onToggleExpand();
          }
          onNavigate?.();
        }}
        className={`flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
          isActive(item.href)
            ? 'bg-dough-brown-100 text-dough-brown-600 font-semibold shadow-sm'
            : 'text-gray-700 hover:bg-gray-100'
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          <span className="flex-shrink-0">{item.icon}</span>
          <span className="truncate">{item.name}</span>
        </div>
        {item.submenu && (
          <ChevronRight
            size={16}
            className={`flex-shrink-0 transition-transform duration-200 ${
              isExpanded ? 'rotate-90' : ''
            }`}
          />
        )}
      </Link>

      {item.submenu && isExpanded && (
        <div className="mt-1 space-y-1 pl-2">
          {item.submenu.map((subitem) => (
            <Link
              key={subitem.href}
              href={subitem.href}
              onClick={onNavigate}
              className={`flex items-center space-x-3 px-4 py-2 rounded-lg text-sm transition-colors duration-200 ${
                isActive(subitem.href)
                  ? 'bg-dough-brown-50 text-dough-brown-600 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="h-1 w-1 rounded-full bg-gray-400 flex-shrink-0" />
              <span className="truncate">{subitem.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
