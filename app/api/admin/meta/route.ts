import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const organization = await prisma.organization.findUnique({ where: { id: session.user.organizationId } });
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const locations = await prisma.location.findMany({ where: { orgId: organization.id } });
    const channels = await prisma.channelSource.findMany().catch(() => []);
    const skus = await prisma.sku.findMany({ where: { orgId: organization.id } }).catch(() => []);
    const recentCustomers = await prisma.customer.findMany({
      where: { orgId: organization.id },
      take: 8,
      orderBy: [{ lastOrderDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        loyaltyTier: true,
      },
    });

    return NextResponse.json({
      org: organization,
      locations,
      channelSources: channels,
      skus,
      recentCustomers,
    });
  } catch (error) {
    console.error('[ADMIN_META_GET]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
