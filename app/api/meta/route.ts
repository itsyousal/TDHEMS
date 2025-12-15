import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId') || undefined;
    const orgSlug = searchParams.get('orgSlug') || undefined;

    const organization = await prisma.organization.findFirst({
      where: {
        isActive: true,
        ...(orgId ? { id: orgId } : {}),
        ...(orgSlug ? { slug: orgSlug } : {}),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
      },
      orderBy: [{ createdAt: 'asc' }],
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const [locations, channelSources, skus] = await Promise.all([
      prisma.location.findMany({
        where: { orgId: organization.id, isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          isActive: true,
        },
        orderBy: [{ createdAt: 'asc' }],
      }),
      prisma.channelSource.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
        orderBy: [{ createdAt: 'asc' }],
      }),
      prisma.sku.findMany({
        where: { orgId: organization.id, isActive: true },
        select: {
          id: true,
          name: true,
          basePrice: true,
          category: true,
        },
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
      }),
    ]);

    return NextResponse.json({
      org: organization,
      locations,
      channelSources,
      skus,
    });
  } catch (error) {
    console.error('[META_GET]', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
