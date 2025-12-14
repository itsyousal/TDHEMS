import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import FinanceDashboard from '@/components/finance/finance-dashboard';
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

      <FinanceDashboard permissions={permissions} />
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
