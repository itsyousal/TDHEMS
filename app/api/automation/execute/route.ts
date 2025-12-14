import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';

// POST - Manually trigger a rule execution
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userOrg = user.userRoles[0]?.orgId;
    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const body = await req.json();
    const { ruleId, triggerData } = body;

    if (!ruleId) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    // Verify rule exists and belongs to org
    const rule = await prisma.automationRule.findFirst({
      where: {
        id: ruleId,
        orgId: userOrg,
      },
      include: {
        actions: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    if (!rule.isActive) {
      return NextResponse.json({ error: 'Rule is not active' }, { status: 400 });
    }

    // Create execution record
    const execution = await prisma.automationExecution.create({
      data: {
        ruleId: rule.id,
        status: 'running',
        triggeredBy: user.id,
        triggerData: triggerData || {},
        startedAt: new Date(),
      },
    });

    // Execute actions
    const results = [];
    let hasError = false;
    let errorMessage = '';

    for (const action of rule.actions) {
      try {
        const result = await executeAction(action, triggerData, userOrg);
        results.push({
          actionType: action.actionType,
          success: true,
          result,
        });
      } catch (error: any) {
        hasError = true;
        errorMessage = error.message;
        results.push({
          actionType: action.actionType,
          success: false,
          error: error.message,
        });
        break; // Stop on first error
      }
    }

    // Update execution with results
    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: hasError ? 'failed' : 'success',
        result: { actions: results },
        error: hasError ? errorMessage : null,
        completedAt: new Date(),
      },
    });

    // Update rule lastRunAt
    await prisma.automationRule.update({
      where: { id: rule.id },
      data: { lastRunAt: new Date() },
    });

    return NextResponse.json({
      executionId: execution.id,
      status: hasError ? 'failed' : 'success',
      results,
    });
  } catch (error) {
    console.error('Error executing automation:', error);
    return NextResponse.json(
      { error: 'Failed to execute automation' },
      { status: 500 }
    );
  }
}

// Helper function to execute individual actions
async function executeAction(action: any, triggerData: any, orgId: string): Promise<any> {
  const { actionType, actionData } = action;

  switch (actionType) {
    case 'send_email':
      // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
      console.log('Sending email:', actionData);
      return { sent: true, to: actionData.to };

    case 'send_notification':
      // TODO: Integrate with notification service
      console.log('Sending notification:', actionData);
      return { sent: true, title: actionData.title };

    case 'create_purchase_order':
      // TODO: Create purchase order logic
      console.log('Creating purchase order:', actionData);
      return { created: true, poNumber: 'PO-' + Date.now() };

    case 'update_inventory':
      // Example: Update inventory
      if (actionData.skuId && actionData.quantity !== undefined) {
        await prisma.inventory.updateMany({
          where: {
            orgId,
            skuId: actionData.skuId,
          },
          data: {
            quantity: {
              increment: actionData.quantity,
            },
          },
        });
        return { updated: true, skuId: actionData.skuId };
      }
      throw new Error('Invalid inventory update data');

    case 'webhook':
      // Call external webhook
      if (actionData.url) {
        const response = await fetch(actionData.url, {
          method: actionData.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...actionData.body,
            triggerData,
          }),
        });
        
        if (!response.ok) {
          throw new Error(`Webhook failed: ${response.statusText}`);
        }

        return { called: true, status: response.status };
      }
      throw new Error('Webhook URL is required');

    default:
      throw new Error(`Unknown action type: ${actionType}`);
  }
}
