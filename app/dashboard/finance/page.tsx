import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import FinanceDashboard from '@/components/finance/finance-dashboard';
import { AccessDenied } from '@/components/access-denied';
import { RefreshCw } from 'lucide-react';

async function FinancePage() {
  const session = await getAuthSession();

  if (!session?.user?.id || !session?.user?.organizationId) {
    redirect('/auth/login');
  }

  const permissions = {
    canView: (session.user.permissions || []).includes('finance.view'),
    canEdit: (session.user.permissions || []).includes('finance.edit'),
    canReconcile: (session.user.permissions || []).includes('finance.reconcile'),
    canManage: (session.user.permissions || []).includes('finance.manage'),
  };

  const isSuperAdmin = (session.user.roles || []).includes('owner-super-admin');

  const initialStats = null;
  const initialTx = null;

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
        initialStats={null}
        initialTransactions={[]}
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
