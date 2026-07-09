import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import FinanceDashboard from '@/components/finance/finance-dashboard';
import { getUserRoles } from '@/lib/rbac';
import { AccessDenied } from '@/components/access-denied';
import { RefreshCw } from 'lucide-react';

async function FinancePage() {
  const session = await getAuthSession();
  
  if (!session?.user?.id || !session?.user?.organizationId) {
    redirect('/auth/login');
  }
  
  // Extract primitive string values
  const userId = `${session.user.id}`;
  const orgId = `${session.user.organizationId}`;

  const roles = await getUserRoles(userId, orgId);
  const permissions = {
    canView: roles.some((ur: any) =>
      ur.role?.rolePermissions?.some((rp: any) => rp.permission?.slug === 'finance.view')
    ),
    canEdit: roles.some((ur: any) =>
      ur.role?.rolePermissions?.some((rp: any) => rp.permission?.slug === 'finance.edit')
    ),
    canReconcile: roles.some((ur: any) =>
      ur.role?.rolePermissions?.some((rp: any) => rp.permission?.slug === 'finance.reconcile')
    ),
    canManage: roles.some((ur: any) =>
      ur.role?.rolePermissions?.some((rp: any) => rp.permission?.slug === 'finance.manage')
    ),
  };

  // Determine if user is superadmin (role slug: owner-super-admin)
  const isSuperAdmin = roles.some((ur: any) => ur.role?.slug === 'owner-super-admin');

  // Server-side fetch initial dashboard data so the client renders immediately
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`;
  const [statsRes, txRes] = await Promise.all([
    fetch(new URL(`/api/finance/stats?period=day`, base).toString()),
    fetch(new URL(`/api/finance/transactions?limit=10&lite=true`, base).toString()),
  ]);

  const [initialStats, initialTx] = await Promise.all([
    statsRes.ok ? statsRes.json().catch(() => null) : null,
    txRes.ok ? txRes.json().catch(() => null) : null,
  ]);

  // Check if user has at least view permission
  if (!permissions.canView) {
    return (
      <AccessDenied
        pageName="Finance"
        requiredPermission="finance.view"
        message="You don't have permission to access the Finance page. Contact your administrator if you need access."
      />
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Finance</h1>
        <p className="text-sm text-gray-600 mt-1">
          Financial overview, transactions, and daily reconciliation
        </p>
      </div>

      <FinanceDashboard
        permissions={permissions}
        initialStats={initialStats?.summary ? {
          totalRevenue: initialStats.summary.totalRevenue || 0,
          totalExpenses: initialStats.summary.totalExpenses || 0,
          netProfit: initialStats.summary.netProfit || 0,
          pendingInvoices: initialStats.counts?.pendingReconciliations || 0,
          overdueInvoices: 0,
          revenueByChannel: initialStats.revenueByChannel || [],
          expensesByCategory: initialStats.expensesByCategory || [],
          comparison: initialStats.trends || { revenueChange: 0, expenseChange: 0, profitChange: 0 },
        } : null}
        initialTransactions={initialTx?.data ?? []}
        initialReconciliation={null}
        isSuperAdmin={isSuperAdmin}
      />
    </>
  );
}

export default function FinancePageWrapper() {
  return (
    <Suspense fallback={<FinanceSkeleton />}>
      <FinancePage />
    </Suspense>
  );
}

function FinanceSkeleton() {
  return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
