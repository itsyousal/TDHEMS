import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;

    // Get comprehensive CRM stats
    const [
      totalCustomers,
      activeCustomers,
      vipCustomers,
      inactiveCustomers,
      blockedCustomers,
      supplierCount,
      contractorCount,
      customerCount,
      lifetimeValueAgg,
      loyaltyTiers,
      recentCustomers,
      recentInteractions,
      customersByMonth,
    ] = await Promise.all([
      // Total customers
      prisma.customer.count({ where: { orgId } }),
      // Active customers
      prisma.customer.count({ where: { orgId, status: 'active' } }),
      // VIP customers
      prisma.customer.count({ where: { orgId, status: 'vip' } }),
      // Inactive customers
      prisma.customer.count({ where: { orgId, status: 'inactive' } }),
      // Blocked customers
      prisma.customer.count({ where: { orgId, status: 'blocked' } }),
      // Suppliers (using segment field)
      prisma.customer.count({ where: { orgId, segment: 'supplier' } }),
      // Contractors
      prisma.customer.count({ where: { orgId, segment: 'contractor' } }),
      // Regular customers (null segment or 'customer')
      prisma.customer.count({
        where: {
          orgId,
          OR: [{ segment: null }, { segment: 'customer' }],
        },
      }),
      // Lifetime value aggregate
      prisma.customer.aggregate({
        where: { orgId },
        _sum: { lifetimeValue: true },
        _avg: { lifetimeValue: true },
      }),
      // Customers by loyalty tier
      prisma.customer.groupBy({
        by: ['loyaltyTier'],
        where: { orgId },
        _count: { id: true },
      }),
      // Recent customers (last 5)
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
      // Recent interactions (last 10)
      prisma.customerInteraction.findMany({
        where: {
          customer: { orgId },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
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
      // Customers added by month (last 6 months)
      prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('month', "createdAt") as month,
          COUNT(*) as count
        FROM "Customer"
        WHERE "orgId" = ${orgId}::uuid
          AND "createdAt" >= NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
      ` as Promise<Array<{ month: Date; count: bigint }>>,
    ]);

    // Format loyalty tiers for response
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

    // Format monthly data
    const monthlyGrowth = customersByMonth.map((row) => ({
      month: row.month.toISOString(),
      count: Number(row.count),
    }));

    return NextResponse.json({
      overview: {
        totalCustomers,
        activeCustomers,
        vipCustomers,
        inactiveCustomers,
        blockedCustomers,
        totalLifetimeValue: lifetimeValueAgg._sum?.lifetimeValue ?? 0,
        averageLifetimeValue: lifetimeValueAgg._avg?.lifetimeValue ?? 0,
      },
      segments: {
        customers: customerCount,
        suppliers: supplierCount,
        contractors: contractorCount,
      },
      loyaltyBreakdown,
      recentCustomers,
      recentInteractions,
      monthlyGrowth,
    });
  } catch (error) {
    console.error('Error fetching CRM stats:', error);
    return NextResponse.json({ error: 'Failed to fetch CRM stats' }, { status: 500 });
  }
}
