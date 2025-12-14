import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/db';

// GET - List all automation rules
export async function GET(req: NextRequest) {
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

    // Check permissions
    const roles = user.userRoles.map(ur => ur.role.slug);
    const hasPermission = roles.some(role => 
      ['owner-super-admin', 'general-manager'].includes(role)
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const rules = await prisma.automationRule.findMany({
      where: { orgId: userOrg },
      include: {
        actions: true,
        _count: {
          select: {
            executions: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error('Error fetching automation rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch automation rules' },
      { status: 500 }
    );
  }
}

// POST - Create new automation rule
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

    // Check permissions
    const roles = user.userRoles.map(ur => ur.role.slug);
    const hasPermission = roles.some(role => 
      ['owner-super-admin', 'general-manager'].includes(role)
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      triggerType,
      triggerConfig,
      conditions,
      actions,
      isActive,
      priority,
    } = body;

    // Validate required fields
    if (!name || !triggerType) {
      return NextResponse.json(
        { error: 'Name and trigger type are required' },
        { status: 400 }
      );
    }

    // Create rule with actions
    const rule = await prisma.automationRule.create({
      data: {
        orgId: userOrg,
        name,
        description: description || null,
        triggerType,
        triggerConfig: triggerConfig || {},
        conditions: conditions || [],
        isActive: isActive !== undefined ? isActive : true,
        priority: priority || 0,
        createdBy: user.id,
        actions: {
          create: (actions || []).map((action: any, index: number) => ({
            actionType: action.type,
            actionData: action.data,
            order: index,
          })),
        },
      },
      include: {
        actions: true,
      },
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error('Error creating automation rule:', error);
    return NextResponse.json(
      { error: 'Failed to create automation rule' },
      { status: 500 }
    );
  }
}

// PUT - Update automation rule
export async function PUT(req: NextRequest) {
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

    // Check permissions
    const roles = user.userRoles.map(ur => ur.role.slug);
    const hasPermission = roles.some(role => 
      ['owner-super-admin', 'general-manager'].includes(role)
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await req.json();
    const { id, name, description, triggerType, triggerConfig, conditions, actions, isActive, priority } = body;

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    // Verify rule belongs to user's org
    const existingRule = await prisma.automationRule.findFirst({
      where: { id, orgId: userOrg },
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Update rule and replace actions
    const rule = await prisma.automationRule.update({
      where: { id },
      data: {
        name: name || existingRule.name,
        description: description !== undefined ? description : existingRule.description,
        triggerType: triggerType || existingRule.triggerType,
        triggerConfig: triggerConfig !== undefined ? triggerConfig : existingRule.triggerConfig,
        conditions: conditions !== undefined ? conditions : existingRule.conditions,
        isActive: isActive !== undefined ? isActive : existingRule.isActive,
        priority: priority !== undefined ? priority : existingRule.priority,
        actions: actions ? {
          deleteMany: {},
          create: actions.map((action: any, index: number) => ({
            actionType: action.type,
            actionData: action.data,
            order: index,
          })),
        } : undefined,
      },
      include: {
        actions: true,
      },
    });

    return NextResponse.json({ rule });
  } catch (error) {
    console.error('Error updating automation rule:', error);
    return NextResponse.json(
      { error: 'Failed to update automation rule' },
      { status: 500 }
    );
  }
}

// DELETE - Delete automation rule
export async function DELETE(req: NextRequest) {
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

    // Check permissions
    const roles = user.userRoles.map(ur => ur.role.slug);
    const hasPermission = roles.some(role => 
      ['owner-super-admin', 'general-manager'].includes(role)
    );

    if (!hasPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 });
    }

    // Verify rule belongs to user's org
    const existingRule = await prisma.automationRule.findFirst({
      where: { id, orgId: userOrg },
    });

    if (!existingRule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    // Delete rule (cascade will delete actions and executions)
    await prisma.automationRule.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting automation rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete automation rule' },
      { status: 500 }
    );
  }
}
