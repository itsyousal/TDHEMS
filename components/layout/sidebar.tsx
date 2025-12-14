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
  Gauge,
  CreditCard,
  ShoppingBag,
  ChevronRight,
  BarChart3,
  X,
  Lock,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
  superAdminOnly?: boolean;
  submenu?: NavItem[];
}

const navItems: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard size={20} />,
  },
  {
    name: 'Admin',
    href: '#admin',
    icon: <LayoutDashboard size={20} />,
    permission: 'admin.view',
    submenu: [
      {
        name: 'Admin Dashboard',
        href: '/dashboard/admin',
        icon: <></>,
        permission: 'admin.view',
      },
      {
        name: 'Password Management',
        href: '/dashboard/admin/password-management',
        icon: <></>,
        permission: 'user.reset_password',
      },
      {
        name: 'Checklist Analytics',
        href: '/dashboard/checklists/analytics',
        icon: <></>,
        permission: 'checklists.manage',
        superAdminOnly: true,
      },
    ],
  },
  {
    name: 'Sales',
    href: '#sales',
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
    href: '#operations',
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
        permission: 'admin.view',
      },
      {
        name: 'Equipment',
        href: '/dashboard/equipment',
        icon: <></>,
        permission: 'equipment.view',
      },
    ],
  },
  {
    name: 'People',
    href: '#people',
    icon: <Users size={20} />,
    submenu: [
      {
        name: 'HR & People',
        href: '/dashboard/hr',
        icon: <></>,
        permission: 'hr.view',
      },
      {
        name: 'Employees',
        href: '/dashboard/employees',
        icon: <></>,
        permission: 'hr.manage',
      },
      {
        name: 'Access Management',
        href: '/dashboard/admin/access-management',
        icon: <></>,
        permission: 'admin.manage_users',
      },
    ],
  },
  {
    name: 'Business',
    href: '#business',
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
    ],
  },
  {
    name: 'Tools',
    href: '#tools',
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
];

interface SidebarProps {
  userPermissions?: string[];
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ userPermissions = [], isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [expandedItems, setExpandedItems] = React.useState<string[]>([]);

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? [] : [href]
    );
  };

  // Derive permissions and roles from session
  const sessionPermissions: string[] = (session?.user as any)?.permissions || [];
  const sessionRoles: string[] = (session?.user as any)?.roles || [];

  const isSuperAdmin = sessionRoles.includes('owner-super-admin') || sessionRoles.includes('super-admin');

  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true;
    if (isSuperAdmin) return true;
    if (!sessionPermissions || sessionPermissions.length === 0) return false;
    return sessionPermissions.includes(permission);
  };

  const canAccessItem = (item: NavItem): boolean => {
    if (item.superAdminOnly && !isSuperAdmin) return false;
    return hasPermission(item.permission);
  };

  const isActive = (href: string): boolean => {
    return pathname === href || pathname?.startsWith(href + '/');
  };

  const filteredItems = navItems.filter((item) => canAccessItem(item));

  // Handle link click on mobile - close sidebar
  const handleLinkClick = () => {
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-gray-200 
          transform transition-transform duration-300 ease-out
          lg:translate-x-0 lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:z-30
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between h-14 px-4 border-b border-gray-200">
          <span className="font-semibold text-gray-900">Menu</span>
          <button
            onClick={onClose}
            className="p-2 -mr-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex flex-col h-[calc(100%-3.5rem)] lg:h-full overflow-hidden">
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {filteredItems.map((item) => (
              <div key={item.href}>
                <Link
                  href={item.href}
                  onClick={(e) => {
                    if (item.submenu) {
                      e.preventDefault();
                      toggleExpand(item.href);
                    } else {
                      handleLinkClick();
                    }
                  }}
                  className={`
                    flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-300 ease-in-out
                    group relative overflow-hidden transform hover:scale-[1.02] active:scale-[0.98]
                    ${isActive(item.href)
                      ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 font-medium shadow-sm'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  {/* Active indicator */}
                  {isActive(item.href) && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-500 rounded-r-full" />
                  )}
                  
                  <div className="flex items-center gap-3">
                    <span className={`flex-shrink-0 transition-colors ${
                      isActive(item.href) ? 'text-amber-600' : 'text-gray-500 group-hover:text-gray-700'
                    }`}>
                      {item.icon}
                    </span>
                    <span className="text-sm">{item.name}</span>
                  </div>
                  {item.submenu && (
                    <ChevronRight
                      size={16}
                      className={`text-gray-400 transition-all duration-300 ease-in-out ${
                        expandedItems.includes(item.href) ? 'rotate-90 text-amber-500' : ''
                      }`}
                    />
                  )}
                </Link>

                {/* Submenu */}
                {item.submenu && (
                  <div
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      expandedItems.includes(item.href)
                        ? 'max-h-96 opacity-100 mt-1'
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-1">
                      {item.submenu.map((subitem, index) => (
                        <Link
                          key={subitem.href}
                          href={subitem.href}
                          onClick={handleLinkClick}
                          className={`
                            flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200
                            transform hover:translate-x-1 hover:scale-[1.02] active:scale-[0.98]
                            ${isActive(subitem.href)
                              ? 'bg-amber-50 text-amber-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }
                          `}
                          style={{
                            transitionDelay: expandedItems.includes(item.href) ? `${index * 30}ms` : '0ms'
                          }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                          <span>{subitem.name}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50/80 p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-medium text-sm shadow-sm">
                {(session?.user?.email?.[0] || 'U').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session?.user?.email}
                </p>
                <p className="text-xs text-gray-500">Logged in</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
