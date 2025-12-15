import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { subDays, startOfDay, format } from 'date-fns';

export async function GET() {
    try {
        const today = new Date();
        const sevenDaysAgo = subDays(today, 7);

        // 1. Basic Stats
        const [
            totalOrders,
            totalRevenue,
            activeProduction,
            employeesPresent
        ] = await Promise.all([
            prisma.order.count(),
            prisma.order.aggregate({
                _sum: { netAmount: true },
            }),
            prisma.productionBatch.count({
                where: { status: 'in_progress' },
            }),
            prisma.attendanceEvent.count({
                where: {
                    eventType: 'clock_in',
                    eventTime: { gte: startOfDay(today) },
                },
            }),
        ]);

        // Calculate trends by comparing current month vs previous month
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

        // Get previous month stats for comparison
        const [
            prevMonthOrders,
            prevMonthRevenue,
            prevMonthProduction,
        ] = await Promise.all([
            prisma.order.count({
                where: {
                    createdAt: {
                        gte: startOfPreviousMonth,
                        lte: endOfPreviousMonth,
                    },
                },
            }),
            prisma.order.aggregate({
                where: {
                    createdAt: {
                        gte: startOfPreviousMonth,
                        lte: endOfPreviousMonth,
                    },
                },
                _sum: { netAmount: true },
            }),
            prisma.productionBatch.count({
                where: {
                    createdAt: {
                        gte: startOfPreviousMonth,
                        lte: endOfPreviousMonth,
                    },
                },
            }),
        ]);

        // Get current month stats for comparison
        const [
            currentMonthOrders,
            currentMonthRevenue,
            currentMonthProduction,
        ] = await Promise.all([
            prisma.order.count({
                where: {
                    createdAt: { gte: startOfCurrentMonth },
                },
            }),
            prisma.order.aggregate({
                where: {
                    createdAt: { gte: startOfCurrentMonth },
                },
                _sum: { netAmount: true },
            }),
            prisma.productionBatch.count({
                where: {
                    createdAt: { gte: startOfCurrentMonth },
                },
            }),
        ]);

        // Calculate percentage changes (return null if insufficient data)
        const calculateTrend = (current: number, previous: number) => {
            if (previous === 0) return null; // Insufficient data
            const change = ((current - previous) / previous) * 100;
            return {
                value: Math.abs(parseFloat(change.toFixed(1))),
                direction: change >= 0 ? ('up' as const) : ('down' as const),
                period: 'vs last month',
            };
        };

        const ordersTrend = calculateTrend(currentMonthOrders, prevMonthOrders);
        const revenueTrend = calculateTrend(
            currentMonthRevenue._sum.netAmount || 0,
            prevMonthRevenue._sum.netAmount || 0
        );
        const productionTrend = calculateTrend(currentMonthProduction, prevMonthProduction);

        // 2. Sales Trend (Last 7 Days)
        const ordersLast7Days = await prisma.order.findMany({
            where: {
                createdAt: { gte: sevenDaysAgo },
                status: { not: 'cancelled' }
            },
            select: {
                createdAt: true,
                netAmount: true,
            }
        });

        const salesTrendMap = new Map();
        // Initialize last 7 days with 0
        for (let i = 6; i >= 0; i--) {
            const date = format(subDays(today, i), 'EEE'); // Mon, Tue...
            salesTrendMap.set(date, { date, orders: 0, revenue: 0 });
        }

        ordersLast7Days.forEach((order: { createdAt: Date; netAmount: number }) => {
            const date = format(new Date(order.createdAt), 'EEE');
            if (salesTrendMap.has(date)) {
                const entry = salesTrendMap.get(date);
                entry.orders += 1;
                entry.revenue += order.netAmount;
            }
        });
        const salesTrend = Array.from(salesTrendMap.values());

        // 3. Channel Breakdown
        const channelStats = await prisma.order.groupBy({
            by: ['channelSourceId'],
            _count: { id: true },
            where: { status: { not: 'cancelled' } }
        });

        const channels = await prisma.channelSource.findMany({
            where: { id: { in: channelStats.map((c: { channelSourceId: string }) => c.channelSourceId) } }
        });

        const totalValidOrders = channelStats.reduce((acc: number, curr: { _count: { id: number } }) => acc + curr._count.id, 0);
        const channelBreakdown = channelStats.map((stat: { channelSourceId: string; _count: { id: number } }) => {
            const channel = channels.find((c: { id: string; slug?: string }) => c.id === stat.channelSourceId);
            return {
                name: channel?.name || 'Unknown',
                value: totalValidOrders > 0 ? Math.round((stat._count.id / totalValidOrders) * 100) : 0,
                color: getChannelColor(channel?.slug),
            };
        });

        // 4. Top Products
        const topItems = await prisma.orderItem.groupBy({
            by: ['skuId'],
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5,
        });

        const skus = await prisma.sku.findMany({
            where: { id: { in: topItems.map((i: { skuId: string }) => i.skuId) } }
        });

        const topProducts = topItems.map((item: { skuId: string; _sum: { quantity: number | null } }) => {
            const sku = skus.find((s: { id: string; name?: string }) => s.id === item.skuId);
            return {
                name: sku?.name || 'Unknown Item',
                sales: item._sum.quantity || 0,
            };
        });

        // 5. Recent Activity
        const recentOrders = await prisma.order.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { channelSource: true }
        });

        const recentBatches = await prisma.productionBatch.findMany({
            take: 5,
            orderBy: { updatedAt: 'desc' },
        });

        const activities = [
            ...recentOrders.map((o: { id: string; orderNumber: string; createdAt: Date; channelSource: { name: string } }) => ({
                id: o.id,
                type: 'order',
                message: `Order #${o.orderNumber} from ${o.channelSource.name}`,
                time: o.createdAt,
            })),
            ...recentBatches.map((b: { id: string; batchNumber: string; status: string; updatedAt: Date }) => ({
                id: b.id,
                type: 'batch',
                message: `Batch ${b.batchNumber} is ${b.status.replace('_', ' ')}`,
                time: b.updatedAt,
            }))
        ]
            .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
            .slice(0, 5)
            .map((a: { id: string; type: string; message: string; time: Date }) => ({
                ...a,
                time: formatTimeAgo(new Date(a.time))
            }));

        return NextResponse.json({
            totalOrders,
            totalRevenue: totalRevenue._sum.netAmount || 0,
            activeProduction,
            employeesPresent,
            ordersTrend,
            revenueTrend,
            productionTrend,
            salesTrend,
            channelBreakdown,
            topProducts,
            recentActivity: activities,
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch dashboard stats' },
            { status: 500 }
        );
    }
}

function getChannelColor(slug?: string) {
    switch (slug) {
        case 'direct': return '#8B4513';
        case 'swiggy': return '#FFD700';
        case 'zomato': return '#10B981';
        case 'in-store': return '#3B82F6';
        default: return '#9CA3AF';
    }
}

function formatTimeAgo(date: Date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
}
