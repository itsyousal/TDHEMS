import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

const DEFAULT_LIMIT = 12;
const MIN_LIMIT = 4;
const MAX_LIMIT = 50;

function normalizeNumber(value: string | null, fallback: number, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const searchParams = url.searchParams;
    const page = normalizeNumber(searchParams.get('page'), 1, 1);
    const limit = normalizeNumber(searchParams.get('limit'), DEFAULT_LIMIT, MIN_LIMIT, MAX_LIMIT);
    const search = searchParams.get('search')?.trim();
    const segment = searchParams.get('segment')?.trim(); // customer, supplier, contractor
    const status = searchParams.get('status')?.trim(); // active, inactive, vip, blocked
    const loyaltyTier = searchParams.get('loyaltyTier')?.trim(); // bronze, silver, gold, platinum

    const where: Prisma.CustomerWhereInput = {
      orgId: session.user.organizationId,
    };

    // Filter by segment (customer type)
    if (segment) {
      if (segment === 'customer') {
        // Regular customers have null or 'customer' segment
        where.OR = [{ segment: null }, { segment: 'customer' }];
      } else {
        where.segment = segment;
      }
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by loyalty tier
    if (loyaltyTier) {
      where.loyaltyTier = loyaltyTier;
    }

    // Search filter (applied on top of other filters)
    if (search) {
      const searchConditions = [
        { name: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { city: { contains: search, mode: 'insensitive' as const } },
      ];

      // If we already have OR conditions from segment filter, we need to combine them
      if (where.OR) {
        const existingOr = where.OR;
        delete where.OR;
        where.AND = [
          { OR: existingOr },
          { OR: searchConditions },
        ];
      } else {
        where.OR = searchConditions;
      }
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: [{ lastOrderDate: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          segment: true,
          loyaltyTier: true,
          status: true,
          lifetimeValue: true,
          lastOrderDate: true,
          createdAt: true,
          metadata: true,
          _count: {
            select: {
              orders: true,
              interactions: true,
            },
          },
        },
      }),
      prisma.customer.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      data: customers,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error);
    return NextResponse.json({ error: 'Unable to load customers' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = (await request.json()) as {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
      segment?: string; // customer, supplier, contractor
      status?: string; // active, inactive, vip, blocked
      loyaltyTier?: string; // bronze, silver, gold, platinum
      metadata?: Record<string, unknown>;
    };

    const name = String(payload.name ?? '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Validate segment
    const validSegments = ['customer', 'supplier', 'contractor'];
    const segment = payload.segment?.trim().toLowerCase();
    if (segment && !validSegments.includes(segment)) {
      return NextResponse.json({ error: 'Invalid segment. Must be customer, supplier, or contractor' }, { status: 400 });
    }

    // Validate status
    const validStatuses = ['active', 'inactive', 'vip', 'blocked'];
    const status = payload.status?.trim().toLowerCase() || 'active';
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be active, inactive, vip, or blocked' }, { status: 400 });
    }

    // Validate loyalty tier
    const validTiers = ['bronze', 'silver', 'gold', 'platinum'];
    const loyaltyTier = payload.loyaltyTier?.trim().toLowerCase() || 'bronze';
    if (!validTiers.includes(loyaltyTier)) {
      return NextResponse.json({ error: 'Invalid loyalty tier. Must be bronze, silver, gold, or platinum' }, { status: 400 });
    }

    // Check for duplicate email if provided
    const email = payload.email?.trim() || null;
    if (email) {
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          orgId: session.user.organizationId,
          email,
        },
      });
      if (existingCustomer) {
        return NextResponse.json({ error: 'A customer with this email already exists' }, { status: 409 });
      }
    }

    const customer = await prisma.customer.create({
      data: {
        orgId: session.user.organizationId,
        name,
        email,
        phone: payload.phone?.trim() || null,
        address: payload.address?.trim() || null,
        city: payload.city?.trim() || null,
        state: payload.state?.trim() || null,
        postalCode: payload.postalCode?.trim() || null,
        country: payload.country?.trim() || null,
        segment: segment || null,
        status,
        loyaltyTier,
        metadata: payload.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Unable to create customer' }, { status: 500 });
  }
}
