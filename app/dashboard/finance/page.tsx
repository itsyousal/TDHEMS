import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import FinanceDashboard from '@/components/finance/finance-dashboard';
import { getUserRoles } from '@/lib/rbac';
import { AccessDenied } from '@/components/access-denied';
import { RefreshCw } from 'lucide-react';

async function getPermissions(userId: string, orgId: string): Promise<{
  canView: boolean;
  canEdit: boolean;
  canReconcile: boolean;
  canManage: boolean;
}> {
  const results = await Promise.all([
    hasPermission(userId, 'finance.view', orgId),
    hasPermission(userId, 'finance.edit', orgId),
    hasPermission(userId, 'finance.reconcile', orgId),
    hasPermission(userId, 'finance.manage', orgId),
  ]);
  
  // Explicitly return primitive booleans
  return { 
    canView: results[0] === true, 
    canEdit: results[1] === true, 
    canReconcile: results[2] === true, 
    canManage: results[3] === true 
  };
}

async function FinancePage() {
  const session = await getAuthSession();
  
  if (!session?.user?.id || !session?.user?.organizationId) {
    redirect('/auth/login');
  }
  
  // Extract primitive string values
  const userId = `${session.user.id}`;
  const orgId = `${session.user.organizationId}`;
  
  const permResult = await getPermissions(userId, orgId);
  
  // Create a plain object with primitive values only
  const permissions = {
    canView: permResult.canView === true,
    canEdit: permResult.canEdit === true,
    canReconcile: permResult.canReconcile === true,
    canManage: permResult.canManage === true,
  };

  // Determine if user is superadmin (role slug: owner-super-admin)
  const roles = await getUserRoles(userId, orgId);
  const isSuperAdmin = roles.some((ur: any) => ur.role?.slug === 'owner-super-admin');

  // Server-side fetch initial dashboard data so the client renders immediately
  const today = new Date().toISOString().slice(0, 10);
  const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL || `http://localhost:${process.env.PORT || 3000}`;
  const [statsRes, txRes, reconRes] = await Promise.all([
    fetch(new URL(`/api/finance/stats?period=day`, base).toString()),
    fetch(new URL(`/api/finance/transactions?limit=10`, base).toString()),
    fetch(new URL(`/api/finance/reconciliation?date=${today}`, base).toString()),
  ]);

  const [initialStats, initialTx, initialRecon] = await Promise.all([
    statsRes.ok ? statsRes.json().catch(() => null) : null,
    txRes.ok ? txRes.json().catch(() => null) : null,
    reconRes.ok ? reconRes.json().catch(() => null) : null,
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
        initialTransactions={initialTx?.data ?? null}
        initialReconciliation={initialRecon || null}
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
