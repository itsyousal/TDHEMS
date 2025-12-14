import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { AccessDenied } from '@/components/access-denied';

async function CustomersTable() {
  const session = await getAuthSession();
  if (!session?.user?.organizationId) {
    redirect('/auth/login');
  }

  const orgId = session.user.organizationId;
  const userId = session.user.id;

  console.log('[Customers Page] User ID:', userId);
  console.log('[Customers Page] Org ID:', orgId);
  console.log('[Customers Page] Session roles:', session.user.roles);
  console.log('[Customers Page] Session permissions:', session.user.permissions);

  // Check CRM permission (customers are part of CRM)
  const hasCustomerAccess = await hasPermission(userId, 'crm.view', orgId);
  console.log('[Customers Page] Has customer access:', hasCustomerAccess);

  if (!hasCustomerAccess) {
    console.log('[Customers Page] Denying access - showing AccessDenied');
    return (
      <AccessDenied
        pageName="Customers"
        requiredPermission="crm.view"
        message="You don't have permission to access the Customers section. Contact your administrator if you need access."
      />
    );
  }

  const [total, list] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.findMany({
      take: 12,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        loyaltyTier: true,
        lifetimeValue: true,
        lastOrderDate: true,
      },
    }),
  ]);

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-dough-brown-700">Customers</h1>
        <p className="text-sm text-gray-600">Total customers: {total}</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h2 className="text-lg font-medium mb-4">Recent Customers</h2>
        {list.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No customers found</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full w-full table-auto text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-gray-700">Name</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Email</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Phone</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Tier</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Lifetime</th>
                  <th className="px-4 py-3 font-semibold text-gray-700">Last Order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {list.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">{c.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700 text-xs">{c.email ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">{c.phone ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900">{c.loyaltyTier}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-green-600 font-medium">${c.lifetimeValue.toFixed(2)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">{c.lastOrderDate ? new Date(c.lastOrderDate).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<CustomersSkeleton />}>
      <CustomersTable />
    </Suspense>
  );
}

function CustomersSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-8 w-40 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-52 bg-gray-200 rounded" />
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
