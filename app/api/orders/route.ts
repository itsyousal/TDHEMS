import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { getAuthSession } from '@/lib/auth';

// Tax should be provided by client as an absolute amount (taxAmount). Avoid using hardcoded constants here.

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = session.user.organizationId;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: { orgId: string; status?: string } = { orgId };
    if (status) {
      where.status = status;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: true,
          channelSource: true,
          items: {
            include: { sku: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// Helper function to find or create a customer
async function findOrCreateCustomer(
  orgId: string,
  customerData: {
    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
  }
): Promise<string | undefined> {
  const { customerId, customerName, customerEmail, customerPhone } = customerData;

  // If a customer ID is provided, validate it exists
  if (customerId?.trim()) {
    const existingCustomer = await prisma.customer.findFirst({
      where: { id: customerId.trim(), orgId },
    });
    if (existingCustomer) {
      return existingCustomer.id;
    }
    // If ID is invalid, don't fail - try to find/create by other fields
  }

  // If customer email is provided, try to find by email
  if (customerEmail?.trim()) {
    const existingByEmail = await prisma.customer.findFirst({
      where: { orgId, email: customerEmail.trim() },
    });
    if (existingByEmail) {
      return existingByEmail.id;
    }
  }

  // If customer phone is provided, try to find by phone
  if (customerPhone?.trim()) {
    const existingByPhone = await prisma.customer.findFirst({
      where: { orgId, phone: customerPhone.trim() },
    });
    if (existingByPhone) {
      return existingByPhone.id;
    }
  }

  // If we have at least a name, create a new customer
  if (customerName?.trim()) {
    const newCustomer = await prisma.customer.create({
      data: {
        orgId,
        name: customerName.trim(),
        email: customerEmail?.trim() || null,
        phone: customerPhone?.trim() || null,
        status: 'active',
        loyaltyTier: 'bronze',
        segment: 'customer',
      },
    });
    return newCustomer.id;
  }

  // No customer information provided
  return undefined;
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const orgId = session.user.organizationId;

    const body = (await request.json()) as {
      locationId?: string;
      channelSourceId?: string;
      customerId?: string;
      customerName?: string;      // New: for auto-creating customer
      customerEmail?: string;     // New: for auto-creating customer
      customerPhone?: string;     // New: for auto-creating customer
        deliveryDate?: string;
        discountAmount?: number;
        taxAmount?: number;
      notes?: string;
      paymentStatus?: string;
      items?: Array<{ skuId?: string; quantity?: number; unitPrice?: number; notes?: string }>;
    };

    const {
      locationId,
      channelSourceId,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      deliveryDate,
      discountAmount,
      notes,
      paymentStatus,
      items,
    } = body;

    if (!locationId || !channelSourceId || !items?.length) {
      return NextResponse.json({ error: 'Missing essential fields' }, { status: 400 });
    }

    const location = await prisma.location.findFirst({
      where: { id: locationId, orgId },
      select: { id: true, orgId: true },
    });
    if (!location) {
      return NextResponse.json({ error: 'Invalid location' }, { status: 400 });
    }

    const channelExists = await prisma.channelSource.findUnique({ where: { id: channelSourceId } });
    if (!channelExists) {
      return NextResponse.json({ error: 'Invalid channel source' }, { status: 400 });
    }

    // Find or create customer - this is the auto-create logic
    const validatedCustomerId = await findOrCreateCustomer(orgId, {
      customerId,
      customerName,
      customerEmail,
      customerPhone,
    });

    const parsedDeliveryDate = deliveryDate ? new Date(deliveryDate) : null;

    const normalizedItems = items
      .map((item: any) => {
        if (!item?.skuId || !item.quantity || !item.unitPrice) {
          return null;
        }
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        if (quantity <= 0 || unitPrice <= 0) {
          return null;
        }
        const trimmedNotes = item.notes?.trim();
        return {
          skuId: item.skuId,
          quantity,
          unitPrice,
          totalPrice: Number((quantity * unitPrice).toFixed(2)),
          notes: trimmedNotes || undefined,
        };
      })
      .filter(Boolean) as Array<{
        skuId: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        notes?: string;
      }>;

    if (!normalizedItems.length) {
      return NextResponse.json({ error: 'Items must include valid SKUs' }, { status: 400 });
    }

    const computedTotal = normalizedItems.reduce((sum: number, item: { totalPrice: number }) => sum + item.totalPrice, 0);
    const sanitizedDiscount = Math.max(0, Number(discountAmount ?? 0));
    // Use taxAmount from payload if provided (absolute value). Do not fall back to a constant tax rate.
    const providedTax = typeof body.taxAmount === 'number' ? Number(body.taxAmount) : undefined;
    const computedTax = providedTax !== undefined && !Number.isNaN(providedTax) ? providedTax : 0;
    const netAmount = Math.max(computedTotal + computedTax - sanitizedDiscount, 0);

    // Attempt create with retries for unique orderNumber collisions (Prisma P2002)
    const maxAttempts = 3;
    let lastError: any = null;
    let order: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const now = Date.now();
        const rand = Math.floor(Math.random() * 900 + 100); // 3-digit random
        const orderNumber = `ORD-${now}-${rand}`;

        order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          const createdOrder = await tx.order.create({
            data: {
              orgId,
              locationId,
              channelSourceId,
              customerId: validatedCustomerId,
              deliveryDate: parsedDeliveryDate,
              notes,
              status: 'pending',
              paymentStatus: paymentStatus || 'pending',
              totalAmount: computedTotal,
              netAmount,
              taxAmount: computedTax,
              discountAmount: sanitizedDiscount,
              orderNumber,
              items: {
                create: normalizedItems,
              },
            },
            include: {
              customer: true,
              channelSource: true,
              items: {
                include: { sku: true },
              },
            },
          });

          // Update customer lifetime value and last order date
          if (validatedCustomerId) {
            await tx.customer.update({
              where: { id: validatedCustomerId },
              data: {
                lifetimeValue: { increment: netAmount },
                lastOrderDate: parsedDeliveryDate ?? new Date(),
              },
            });

            // Also create a purchase interaction to track this order in CRM
            await tx.customerInteraction.create({
              data: {
                customerId: validatedCustomerId,
                type: 'purchase',
                subject: `Order ${createdOrder.orderNumber}`,
                notes: `Order placed for ₹${netAmount.toLocaleString('en-IN')}`,
                outcome: 'pending',
              },
            });
          }

          // Auto-record financial transaction for this order
          const today = new Date();
          const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
          const txnCount = await tx.financialTransaction.count({
            where: {
              orgId,
              transactionNumber: { startsWith: `TXN-${dateStr}` },
            },
          });
          const transactionNumber = `TXN-${dateStr}-${String(txnCount + 1).padStart(5, '0')}`;

          await tx.financialTransaction.create({
            data: {
              orgId,
              transactionNumber,
              type: 'revenue',
              category: 'sales',
              subCategory: createdOrder.channelSource?.name || 'order',
              amount: netAmount,
              taxAmount: computedTax,
              netAmount: netAmount,
              referenceType: 'order',
              referenceId: createdOrder.id,
              paymentMethod: paymentStatus === 'paid' ? 'online' : null,
              paymentStatus: paymentStatus === 'paid' ? 'completed' : 'pending',
              description: `Order ${createdOrder.orderNumber} - ${createdOrder.customer?.name || 'Guest'}`,
              transactionDate: parsedDeliveryDate || new Date(),
              createdBy: session.user.id,
              approvalStatus: 'approved', // Revenue auto-approved
            },
          });

          return createdOrder;
        });

        // success
        break;
      } catch (err: any) {
        lastError = err;
        // Prisma unique constraint failed error code P2002
        if (err?.code === 'P2002' && attempt < maxAttempts) {
          // collision - retry with a new orderNumber
          continue;
        }
        // other errors - rethrow
        throw err;
      }
    }

    if (!order && lastError) {
      throw lastError;
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Error creating order:', error);
    // Return the underlying error message to the client for easier debugging.
    const msg = error instanceof Error ? error.message : 'Failed to create order';
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
