"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw } from 'lucide-react';

type PosOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  netAmount: number;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  deliveryDate?: string;
  channelSource?: { name: string };
  customer?: { name?: string };
  items: Array<{
    id: string;
    skuId: string;
    sku?: { name?: string };
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    notes?: string;
  }>;
};

const statusBadges: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pending', variant: 'secondary' },
  confirmed: { label: 'Confirmed', variant: 'default' },
  preparing: { label: 'Preparing', variant: 'outline' },
  ready: { label: 'Ready', variant: 'default' },
  packed: { label: 'Packed', variant: 'outline' },
  dispatched: { label: 'Dispatched', variant: 'secondary' },
  delivered: { label: 'Delivered', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'destructive' },
};

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});
const formatCurrency = (value: number) => currencyFormatter.format(value);

export default function PointOfSalePage() {
  const [orders, setOrders] = useState<PosOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<Record<string, 'draft' | 'paid'>>({});
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);
  const [paymentModalOrderId, setPaymentModalOrderId] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi' | 'card' | 'online'>('cash');
  const [cashGiven, setCashGiven] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [transactionDate, setTransactionDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [completedPayments, setCompletedPayments] = useState<Record<string, boolean>>({});
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  const [printTarget, setPrintTarget] = useState<'pos' | null>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/orders?limit=50');
      if (!response.ok) {
        throw new Error('Unable to fetch POS orders');
      }
      const payload = await response.json();
      setOrders(payload.data || []);
      setError(null);
    } catch (err) {
      console.error('[POS] fetch orders', err);
      setError(err instanceof Error ? err.message : 'Failed to sync orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 15000);
    let channel: BroadcastChannel | null = null;
    if (typeof window !== 'undefined') {
      channel = new BroadcastChannel('pos-orders');
      channel.addEventListener('message', () => loadOrders());
    }
    return () => {
      clearInterval(interval);
      channel?.close();
    };
  }, []);

  const filteredOrders = useMemo(() => {
    if (!filter) return orders;
    const needle = filter.toLowerCase();
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(needle) ||
        order.customer?.name?.toLowerCase().includes(needle) ||
        order.status.toLowerCase().includes(needle),
    );
  }, [filter, orders]);

  const visibleOrders = useMemo(
    () => filteredOrders.filter((order) => !['cancelled', 'delivered'].includes(order.status)),
    [filteredOrders],
  );

  const totalOutstanding = useMemo(
    () => visibleOrders.reduce((sum, order) => sum + order.netAmount, 0),
    [visibleOrders],
  );

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error('Unable to update status');
      }
      const updated = await response.json();
      setOrders((prev) => prev.map((order) => (order.id === orderId ? updated : order)));
    } catch (err) {
      console.error('[POS] status update', err);
    }
  };

  const markPaid = (orderId: string) => {
    if (!orderId) return;
    setPaymentModalOrderId(orderId);
    setPaymentMode('cash');
    setCashGiven('');
    setTransactionId('');
    setTransactionDate(new Date().toISOString().slice(0, 16));
    setCompletionMessage(null);
  };

  const cancelOrder = async (orderId: string) => {
    if (!orderId) return;
    setCancelingOrderId(orderId);
    await updateOrderStatus(orderId, 'cancelled');
    setCancelingOrderId(null);
  };

  const paymentModalOrder = orders.find((order) => order.id === paymentModalOrderId) ?? null;
  const netAmount = paymentModalOrder?.netAmount ?? 0;
  const cashChange = paymentMode === 'cash' ? Math.max(0, Number(cashGiven || 0) - netAmount) : 0;
  const paymentModalOpen = Boolean(paymentModalOrder);

  const handlePaymentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!paymentModalOrder) return;
    try {
      const response = await fetch(`/api/orders/${paymentModalOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'paid' }),
      });
      if (!response.ok) {
        throw new Error('Unable to save payment info');
      }
      const updated = await response.json();
      setOrders((prev) => prev.map((order) => (order.id === updated.id ? updated : order)));
      setBillingStatus((prev) => ({ ...prev, [updated.id]: 'paid' }));
      setCompletedPayments((prev) => ({ ...prev, [updated.id]: true }));
      setPaymentModalOrderId(null);
    } catch (err) {
      console.error('[POS] payment submit', err);
    }
  };

  useEffect(() => {
    setCompletedPayments((prev) => {
      let changed = false;
      const next = { ...prev };
      orders.forEach((order) => {
        if (order.paymentStatus === 'paid' && !next[order.id]) {
          next[order.id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [orders]);

  const isPaymentCaptured = (orderId: string | null) => {
    if (!orderId) return false;
    const existing = orders.find((order) => order.id === orderId);
    return Boolean(completedPayments[orderId] || existing?.paymentStatus === 'paid');
  };

  const handlePrintReceipt = () => {
    if (!selectedOrder || typeof window === 'undefined') return;
    setPrintTarget('pos');
    window.setTimeout(() => {
      window.print();
      setPrintTarget(null);
    }, 100);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cleanup = () => setPrintTarget(null);
    window.addEventListener('afterprint', cleanup);
    return () => window.removeEventListener('afterprint', cleanup);
  }, []);

  const handleMarkComplete = async () => {
    if (!selectedOrder) return;
    if (!isPaymentCaptured(selectedOrder.id)) {
      setCompletionMessage('Payment data not entered');
      return;
    }
    setCompletionMessage(null);
    try {
      await updateOrderStatus(selectedOrder.id, 'delivered');
      setSelectedOrderId(null);
    } catch (error) {
      console.error('[POS] mark complete', error);
    }
  };

  useEffect(() => {
    setCompletionMessage(null);
  }, [selectedOrderId]);

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Point of sale</p>
            <h1 className="text-3xl font-semibold text-slate-900">Order queue</h1>
            <p className="text-sm text-slate-500">Live order stream with fulfillment controls and billing.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search order number, customer or status"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className="min-w-[260px]"
            />
            <Button type="button" variant="outline" size="sm" onClick={loadOrders}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.5fr,1fr]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Active orders</p>
                <p className="text-sm text-slate-500">{visibleOrders.length} pending fulfillment</p>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p>Total outstanding</p>
                <p className="font-semibold text-slate-900">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>
            {isLoading ? (
              <div className="mt-8 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </div>
            ) : error ? (
              <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {visibleOrders.map((order) => {
                  const statusMeta = statusBadges[order.status] ?? { label: order.status, variant: 'default' };
                  return (
                    <article
                      key={order.id}
                      className={`rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition-shadow ${
                        selectedOrderId === order.id ? 'shadow-lg border-slate-300' : 'hover:border-slate-300'
                      }`}
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">Order</p>
                          <p className="text-lg font-semibold text-slate-900">#{order.orderNumber}</p>
                        </div>
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
                        <p>{order.customer?.name || 'Walk-in customer'}</p>
                        <p>{order.channelSource?.name || 'Direct'}</p>
                        <p>{order.items.length} items</p>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={(event) => {
                            event.stopPropagation();
                            cancelOrder(order.id);
                          }}
                          disabled={cancelingOrderId === order.id}
                        >
                          {cancelingOrderId === order.id ? 'Cancelling…' : 'Cancel'}
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Focused order</p>
                <p className="text-lg font-semibold text-slate-900">
                  {selectedOrder ? `#${selectedOrder.orderNumber}` : 'Select an order'}
                </p>
              </div>
              <Badge variant={selectedOrder ? 'default' : 'secondary'}>
                {selectedOrder ? selectedOrder.paymentStatus : 'Awaiting selection'}
              </Badge>
            </div>
            {selectedOrder ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm text-slate-500">
                  {selectedOrder.customer?.name || 'Walk-in'} · {selectedOrder.channelSource?.name || 'Direct'}
                </p>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm text-slate-700">
                      <p>
                        <span className="font-semibold text-slate-900">{item.quantity}×</span> {item.sku?.name || item.skuId}
                      </p>
                      <p>{formatCurrency(item.totalPrice)}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm text-slate-600">
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">Subtotal</p>
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(selectedOrder.totalAmount - selectedOrder.taxAmount + selectedOrder.discountAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">Tax</p>
                    <p className="text-lg font-semibold text-slate-900">{formatCurrency(selectedOrder.taxAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">Discount</p>
                    <p className="text-lg font-semibold text-slate-900">-{formatCurrency(selectedOrder.discountAmount)}</p>
                  </div>
                  <div>
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-slate-400">Net total</p>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(selectedOrder.netAmount)}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button type="button" onClick={() => markPaid(selectedOrder.id)}>
                    Mark Payment complete
                  </Button>
                  <Button type="button" variant="outline" onClick={handleMarkComplete}>
                    Mark Complete
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handlePrintReceipt}
                    disabled={!selectedOrder}
                    className="no-print"
                  >
                    Print bill
                  </Button>
                </div>
                {completionMessage && (
                  <p className="text-sm text-rose-500">{completionMessage}</p>
                )}
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-500">
                  {billingStatus[selectedOrder.id] === 'paid'
                    ? 'Billed and paid'
                    : 'Use the buttons above to ticket and capture payment; billing integrates with the order record.'}
                </div>
              </div>
            ) : (
              <p className="mt-6 text-sm text-slate-500">Select an order card to view details, print a bill, and update its status.</p>
            )}
          </section>
        </div>
      </div>
      </div>
      {paymentModalOpen && paymentModalOrder && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">Payment details</p>
              <h3 className="text-xl font-semibold text-slate-900">Order #{paymentModalOrder.orderNumber}</h3>
            </div>
            <button
              type="button"
              onClick={() => setPaymentModalOrderId(null)}
              className="text-slate-500 hover:text-slate-700"
              aria-label="Close payment details"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handlePaymentSubmit} className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-600">Mode of payment</label>
              <select
                value={paymentMode}
                onChange={(event) => setPaymentMode(event.target.value as 'cash' | 'upi' | 'card' | 'online')}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
              </select>
            </div>

            {paymentMode === 'cash' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600">Cash given</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashGiven}
                  onChange={(event) => setCashGiven(event.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <p className="text-sm text-slate-500">
                  Change due: <span className="font-semibold text-slate-900">{formatCurrency(cashChange)}</span>
                </p>
              </div>
            )}

            {paymentMode !== 'cash' && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-600">Transaction ID</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(event) => setTransactionId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-600">Transaction date & time</label>
                  <input
                    type="datetime-local"
                    value={transactionDate}
                    onChange={(event) => setTransactionDate(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Net amount: {formatCurrency(netAmount)}</p>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setPaymentModalOrderId(null)}>
                  Cancel
                </Button>
                <Button type="submit">Submit</Button>
              </div>
            </div>
          </form>
        </div>
      </div>
      )}
      {selectedOrder && (
        <section className={`print-area ${printTarget === 'pos' ? 'active' : ''}`} aria-hidden={printTarget !== 'pos'}>
          <div className="space-y-3">
            <div>
              <p className="print-heading">The Dough House</p>
              <p className="text-sm">Bill #{selectedOrder.orderNumber}</p>
              <p className="text-sm">Date: {new Date().toLocaleString()}</p>
            </div>
            <div className="text-sm">
              <p>Customer: {selectedOrder.customer?.name || 'Walk-in'}</p>
              <p>Channel: {selectedOrder.channelSource?.name || 'Direct'}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th className="text-left">Item</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.sku?.name || item.skuId}</td>
                    <td className="text-right">{item.quantity}</td>
                    <td className="text-right">{formatCurrency(item.totalPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>
                  {formatCurrency(selectedOrder.totalAmount - selectedOrder.taxAmount + selectedOrder.discountAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(selectedOrder.taxAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{formatCurrency(selectedOrder.discountAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Net total</span>
                <span>{formatCurrency(selectedOrder.netAmount)}</span>
              </div>
            </div>
            <div className="text-xs">
              Order ID: {selectedOrder.orderNumber}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
