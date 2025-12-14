import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const url = new URL(request.url);
    const customerId = url.searchParams.get('customerId');
    const type = url.searchParams.get('type');
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(5, parseInt(url.searchParams.get('limit') || '20')));

    // Build where clause
    const where: {
      customer: { orgId: string };
      customerId?: string;
      type?: string;
    } = {
      customer: { orgId },
    };

    if (customerId) {
      where.customerId = customerId;
    }

    if (type) {
      where.type = type;
    }

    const [interactions, total] = await Promise.all([
      prisma.customerInteraction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          customerId: true,
          type: true,
          subject: true,
          notes: true,
          outcome: true,
          attachments: true,
          createdAt: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.customerInteraction.count({ where }),
    ]);

    return NextResponse.json({
      data: interactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Error fetching interactions:', error);
    return NextResponse.json({ error: 'Failed to fetch interactions' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const orgId = session.user.organizationId;
    const body = await request.json();

    const { customerId, type, subject, notes, outcome, attachments } = body;

    // Validate required fields
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: 'Interaction type is required' }, { status: 400 });
    }

    // Validate type
    const validTypes = ['call', 'email', 'complaint', 'feedback', 'purchase', 'return', 'meeting', 'note'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid interaction type' }, { status: 400 });
    }

    // Verify customer belongs to org
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, orgId },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Create interaction
    const interaction = await prisma.customerInteraction.create({
      data: {
        customerId,
        type,
        subject: subject?.trim() || null,
        notes: notes?.trim() || null,
        outcome: outcome?.trim() || null,
        attachments: attachments || [],
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json(interaction, { status: 201 });
  } catch (error) {
    console.error('Error creating interaction:', error);
    return NextResponse.json({ error: 'Failed to create interaction' }, { status: 500 });
  }
}
