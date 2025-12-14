import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import { CRMDashboard } from '@/components/crm/crm-dashboard';
import { AccessDenied } from '@/components/access-denied';

export default async function CRMPage() {
  const session = await getAuthSession();
  if (!session?.user?.organizationId || !session?.user?.id) {
    redirect('/auth/login');
  }

  const orgId = session.user.organizationId;
  const userId = session.user.id;

  console.log('[CRM Page] User ID:', userId);
  console.log('[CRM Page] Org ID:', orgId);
  console.log('[CRM Page] Session roles:', session.user.roles);
  console.log('[CRM Page] Session permissions:', session.user.permissions);

  // Check CRM permission
  const hasCRMAccess = await hasPermission(userId, 'crm.view', orgId);
  console.log('[CRM Page] Has CRM access:', hasCRMAccess);

  if (!hasCRMAccess) {
    console.log('[CRM Page] Denying access - showing AccessDenied');
    return (
      <AccessDenied
        pageName="CRM"
        requiredPermission="crm.view"
        message="You don't have permission to access the CRM section. Contact your administrator if you need access."
      />
    );
  }

  // Fetch comprehensive CRM stats
  const [
    totalContacts,
    customerCount,
    supplierCount,
    contractorCount,
    activeCount,
    vipCount,
    inactiveCount,
    blockedCount,
    lifetimeValueAgg,
    loyaltyTiers,
    recentContacts,
    recentInteractions,
  ] = await Promise.all([
    // Total contacts
    prisma.customer.count({ where: { orgId } }),
    // Customers only
    prisma.customer.count({
      where: {
        orgId,
        OR: [{ segment: null }, { segment: 'customer' }],
      },
    }),
    // Suppliers
    prisma.customer.count({ where: { orgId, segment: 'supplier' } }),
    // Contractors
    prisma.customer.count({ where: { orgId, segment: 'contractor' } }),
    // Active
    prisma.customer.count({ where: { orgId, status: 'active' } }),
    // VIP
    prisma.customer.count({ where: { orgId, status: 'vip' } }),
    // Inactive
    prisma.customer.count({ where: { orgId, status: 'inactive' } }),
    // Blocked
    prisma.customer.count({ where: { orgId, status: 'blocked' } }),
    // Lifetime value
    prisma.customer.aggregate({
      where: { orgId },
      _sum: { lifetimeValue: true },
      _avg: { lifetimeValue: true },
    }),
    // Loyalty tier breakdown
    prisma.customer.groupBy({
      by: ['loyaltyTier'],
      where: { orgId },
      _count: { id: true },
    }),
    // Recent contacts (last 5)
    prisma.customer.findMany({
      where: { orgId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        segment: true,
        loyaltyTier: true,
        status: true,
        createdAt: true,
      },
    }),
    // Recent interactions (last 8)
    prisma.customerInteraction.findMany({
      where: { customer: { orgId } },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        type: true,
        subject: true,
        outcome: true,
        createdAt: true,
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  // Format loyalty breakdown
  const loyaltyBreakdown = {
    bronze: 0,
    silver: 0,
    gold: 0,
    platinum: 0,
  };
  loyaltyTiers.forEach((tier) => {
    const tierName = tier.loyaltyTier.toLowerCase() as keyof typeof loyaltyBreakdown;
    if (tierName in loyaltyBreakdown) {
      loyaltyBreakdown[tierName] = tier._count.id;
    }
  });

  // Prepare serializable data for client component
  const stats = {
    totalContacts,
    customerCount,
    supplierCount,
    contractorCount,
    activeCount,
    vipCount,
    inactiveCount,
    blockedCount,
    totalLifetimeValue: lifetimeValueAgg._sum?.lifetimeValue ?? 0,
  };

  // Status breakdown for display
  const statusBreakdown = [
    { status: 'Active', count: activeCount, color: '#22c55e' },
    { status: 'VIP', count: vipCount, color: '#a855f7' },
    { status: 'Inactive', count: inactiveCount, color: '#9ca3af' },
    { status: 'Blocked', count: blockedCount, color: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">CRM</h1>
        <p className="text-sm text-gray-600 mt-1">
          Manage customers, suppliers, and contractors. Track interactions and build relationships.
        </p>
      </div>

      {/* Pass serializable data to client component */}
      <CRMDashboard
        stats={stats}
        statusBreakdown={statusBreakdown}
        loyaltyBreakdown={loyaltyBreakdown}
        recentContacts={recentContacts.map((c) => ({
          ...c,
          createdAt: c.createdAt.toISOString(),
        }))}
        recentInteractions={recentInteractions.map((i) => ({
          ...i,
          createdAt: i.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
