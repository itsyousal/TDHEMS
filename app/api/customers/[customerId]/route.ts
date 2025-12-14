import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db';
import { getAuthSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerId } = await params;
    const orgId = session.user.organizationId;

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, orgId },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            netAmount: true,
            createdAt: true,
          },
        },
        interactions: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            type: true,
            subject: true,
            notes: true,
            outcome: true,
            createdAt: true,
          },
        },
        loyalty: true,
        _count: {
          select: {
            orders: true,
            interactions: true,
            invoices: true,
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerId } = await params;
    const orgId = session.user.organizationId;

    // Verify customer exists and belongs to org
    const existing = await prisma.customer.findFirst({
      where: { id: customerId, orgId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const body = await request.json();

    // Validate segment if provided
    const validSegments = ['customer', 'supplier', 'contractor'];
    if (body.segment && !validSegments.includes(body.segment.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid segment' }, { status: 400 });
    }

    // Validate status if provided
    const validStatuses = ['active', 'inactive', 'vip', 'blocked'];
    if (body.status && !validStatuses.includes(body.status.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Validate loyalty tier if provided
    const validTiers = ['bronze', 'silver', 'gold', 'platinum'];
    if (body.loyaltyTier && !validTiers.includes(body.loyaltyTier.toLowerCase())) {
      return NextResponse.json({ error: 'Invalid loyalty tier' }, { status: 400 });
    }

    // Check for duplicate email if changing it
    if (body.email && body.email !== existing.email) {
      const emailExists = await prisma.customer.findFirst({
        where: {
          orgId,
          email: body.email,
          NOT: { id: customerId },
        },
      });
      if (emailExists) {
        return NextResponse.json({ error: 'A customer with this email already exists' }, { status: 409 });
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'email', 'phone', 'address', 'city', 'state',
      'postalCode', 'country', 'segment', 'status', 'loyaltyTier', 'metadata'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (typeof body[field] === 'string') {
          updateData[field] = body[field].trim() || null;
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: updateData,
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Error updating customer:', error);
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { customerId } = await params;
    const orgId = session.user.organizationId;

    // Verify customer exists and belongs to org
    const existing = await prisma.customer.findFirst({
      where: { id: customerId, orgId },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Prevent deletion if customer has orders
    if (existing._count.orders > 0) {
      return NextResponse.json(
        { error: 'Cannot delete customer with existing orders. Consider marking as inactive instead.' },
        { status: 400 }
      );
    }

    await prisma.customer.delete({
      where: { id: customerId },
    });

    return NextResponse.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Error deleting customer:', error);
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 });
  }
}
