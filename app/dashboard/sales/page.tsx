import { redirect } from 'next/navigation';
import { getAuthSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, ShoppingCart, CheckCircle2, Clock } from 'lucide-react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

export default async function SalesPage() {
  const session = await getAuthSession();
  if (!session?.user?.id || !session?.user?.organizationId) {
    redirect('/auth/login');
  }

  const orgId = session.user.organizationId;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const yesterdayEnd = new Date(todayStart);

  const [todaySummary, todayStatusCounts, yesterdaySummary, yesterdayStatusCounts, channelRevenue] =
    await Promise.all([
      prisma.order.aggregate({
        where: {
          orgId,
          createdAt: { gte: todayStart, lt: todayEnd },
          status: { not: 'cancelled' },
        },
        _sum: { netAmount: true },
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ['paymentStatus'],
        where: {
          orgId,
          createdAt: { gte: todayStart, lt: todayEnd },
          status: { not: 'cancelled' },
        },
        _count: { _all: true },
      }),
      prisma.order.aggregate({
        where: {
          orgId,
          createdAt: { gte: yesterdayStart, lt: yesterdayEnd },
          status: { not: 'cancelled' },
        },
        _sum: { netAmount: true },
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ['paymentStatus'],
        where: {
          orgId,
          createdAt: { gte: yesterdayStart, lt: yesterdayEnd },
          status: { not: 'cancelled' },
        },
        _count: { _all: true },
      }),
      prisma.order.groupBy({
        by: ['channelSourceId'],
        where: {
          orgId,
          createdAt: { gte: todayStart, lt: todayEnd },
          status: { not: 'cancelled' },
        },
        _sum: { netAmount: true },
        _count: { _all: true },
      }),
    ]);

  const channelIds = channelRevenue.map((item) => item.channelSourceId).filter(Boolean);
  const channels = channelIds.length > 0
    ? await prisma.channelSource.findMany({ where: { id: { in: channelIds } }, select: { id: true, name: true } })
    : [];
  const channelMap = new Map(channels.map((item) => [item.id, item.name]));

  const todayTotal = todaySummary._sum?.netAmount ?? 0;
  const yesterdayTotal = yesterdaySummary._sum?.netAmount ?? 0;
  const todayOrders = todaySummary._count?._all ?? 0;
  const yesterdayOrders = yesterdaySummary._count?._all ?? 0;

  const todayPaid = todayStatusCounts.find((item) => item.paymentStatus === 'paid')?._count?._all ?? 0;
  const todayPending = todayStatusCounts.find((item) => item.paymentStatus === 'pending')?._count?._all ?? 0;
  const yesterdayPaid = yesterdayStatusCounts.find((item) => item.paymentStatus === 'paid')?._count?._all ?? 0;
  const yesterdayPending = yesterdayStatusCounts.find((item) => item.paymentStatus === 'pending')?._count?._all ?? 0;

  const changePercentage = yesterdayTotal > 0
    ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
    : todayTotal > 0
      ? 100
      : 0;

  const topChannels = channelRevenue
    .map((item) => ({
      channelId: item.channelSourceId,
      channelName: channelMap.get(item.channelSourceId) ?? 'Direct',
      amount: item._sum?.netAmount ?? 0,
      orders: item._count?._all ?? 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sales</h1>
        <p className="text-sm text-gray-600 mt-1">
          Daily sales performance and channel summary for your organization.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Today's Revenue</CardTitle>
            <CardDescription>{formatCurrency(todayTotal)}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Orders Today</CardTitle>
            <CardDescription>{todayOrders}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Paid Orders</CardTitle>
            <CardDescription>{todayPaid}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending Orders</CardTitle>
            <CardDescription>{todayPending}</CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Daily Sales Comparison</CardTitle>
            <CardDescription>Compare today with yesterday.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Yesterday</p>
                <p className="mt-2 text-xl font-semibold">{formatCurrency(yesterdayTotal)}</p>
                <p className="text-sm text-gray-500">{yesterdayOrders} orders</p>
              </div>
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500">Change</p>
                <p className="mt-2 flex items-center gap-2 text-xl font-semibold">
                  {changePercentage >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                  {Math.abs(changePercentage).toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">vs yesterday</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yesterday Status</CardTitle>
            <CardDescription>Paid and pending counts from yesterday.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl bg-green-50 p-3">
                <span className="text-sm font-medium">Paid</span>
                <span className="font-semibold text-green-700">{yesterdayPaid}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-yellow-50 p-3">
                <span className="text-sm font-medium">Pending</span>
                <span className="font-semibold text-yellow-700">{yesterdayPending}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Sales Channels</CardTitle>
          <CardDescription>Best-performing channels today.</CardDescription>
        </CardHeader>
        <CardContent>
          {topChannels.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-10">
              No sales channel data available for today.
            </div>
          ) : (
            <div className="space-y-3">
              {topChannels.map((channel) => (
                <div
                  key={channel.channelId}
                  className="flex items-center justify-between rounded-xl border border-gray-200 p-4"
                >
                  <div>
                    <p className="font-medium">{channel.channelName}</p>
                    <p className="text-sm text-gray-500">{channel.orders} orders</p>
                  </div>
                  <p className="font-semibold">{formatCurrency(channel.amount)}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
