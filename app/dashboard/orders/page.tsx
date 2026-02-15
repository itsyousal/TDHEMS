'use client';

import React, { useEffect, useState } from 'react';
import { ShoppingCart, DollarSign, Truck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});

type OrderSummary = {
  id: string;
  orderNumber: string;
  customer?: { name?: string };
  channelSource?: { name?: string };
  netAmount: number;
  status: string;
  createdAt: string;
  paymentStatus?: string;
  items?: Array<{ id: string; quantity: number; totalPrice: number; sku?: { name?: string } }>;
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [printOrderId, setPrintOrderId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      toast.error('Unable to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handlePrintOrder = (orderId: string) => {
    if (!orderId) return;
    setPrintOrderId(orderId);
  };

  useEffect(() => {
    if (!printOrderId || typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      window.print();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [printOrderId]);

  if (isLoading) {
    return <div className="p-8">Loading orders...</div>;
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
        <p className="text-sm text-gray-600 mt-1">Order management and fulfillment</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-3xl font-bold text-dough-brown-600 mt-2">{orders.length}</p>
            </div>
            <Truck className="w-10 h-10 text-dough-brown-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-3xl font-bold text-dough-brown-600 mt-2">{orders.filter((o) => o.status === 'pending').length}</p>
            </div>
            <Clock className="w-10 h-10 text-dough-brown-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Delivered</p>
              <p className="text-3xl font-bold text-dough-brown-600 mt-2">{orders.filter((o) => o.status === 'delivered').length}</p>
            </div>
            <DollarSign className="w-10 h-10 text-dough-brown-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Shipped</p>
              <p className="text-3xl font-bold text-dough-brown-600 mt-2">{orders.filter((o) => o.status === 'shipped').length}</p>
            </div>
            <ShoppingCart className="w-10 h-10 text-dough-brown-200" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Order ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Channel</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Total</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Date</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{order.orderNumber}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{order.customer?.name || 'Guest'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{order.channelSource?.name || 'Direct'}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 font-medium">{currencyFormatter.format(order.netAmount)}</td>
                  <td className="py-3 px-4 text-sm">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${order.status === 'delivered'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'shipped'
                            ? 'bg-blue-100 text-blue-800'
                            : order.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                        }`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{new Date(order.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 px-4 text-sm text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="no-print"
                      onClick={() => handlePrintOrder(order.id)}
                    >
                      Print bill
                    </Button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {printOrderId && (
        (() => {
          const printingOrder = orders.find((order) => order.id === printOrderId);
          if (!printingOrder) return null;
          return (
            <section className={`print-area ${printOrderId === printingOrder.id ? 'active' : ''}`} aria-hidden={printOrderId !== printingOrder.id}>
              <div className="space-y-3 text-sm text-black">
                <div>
                  <p className="print-heading">The Dough House</p>
                  <p>Bill #{printingOrder.orderNumber}</p>
                  <p>Date: {new Date(printingOrder.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p>Customer: {printingOrder.customer?.name || 'Guest'}</p>
                  <p>Channel: {printingOrder.channelSource?.name || 'Direct'}</p>
                  <p>Payment status: {printingOrder.paymentStatus ?? 'unrecorded'}</p>
                  <p>Order status: {printingOrder.status}</p>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th className="text-left">Item</th>
                      <th className="text-right">Quantity</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {printingOrder.items?.length ? (
                      printingOrder.items.map((item) => (
                        <tr key={`${printingOrder.id}-${item.id}`}>
                          <td>{item.sku?.name || item.id}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right">{currencyFormatter.format(item.totalPrice)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="text-xs text-black">
                          Item details unavailable on this summary.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Payable amount</span>
                    <span className="font-semibold">{currencyFormatter.format(printingOrder.netAmount)}</span>
                  </div>
                </div>
                <p className="text-xs mt-4">Hope to serve you again!</p>
              </div>
            </section>
          );
        })()
      )}
    </>
  );
}
