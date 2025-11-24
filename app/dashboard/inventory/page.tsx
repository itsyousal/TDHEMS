'use client';

import React, { useEffect, useState } from 'react';
import { Package, TrendingUp, AlertCircle, Clock } from 'lucide-react';

interface InventoryStats {
  totalSkus: number;
  inStockItems: number;
  lowStockItems: number;
  recentMovements: number;
}

interface InventoryItem {
  id: string;
  sku: string;
  desc: string;
  loc: string;
  avail: number;
  res: number;
  status: string;
}

export default function InventoryPage() {
  const [stats, setStats] = useState<InventoryStats>({
    totalSkus: 0,
    inStockItems: 0,
    lowStockItems: 0,
    recentMovements: 0,
  });
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, itemsRes] = await Promise.all([
          fetch('/api/inventory/stats'),
          fetch('/api/inventory'),
        ]);

        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
        if (itemsRes.ok) {
          setItems(await itemsRes.json());
        }
      } catch (error) {
        console.error('Failed to fetch inventory data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center">Loading inventory...</div>;
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-600 mt-1">Product inventory and stock management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total SKUs</p>
              <p className="text-3xl font-bold text-dough-brown-600 mt-2">{stats.totalSkus}</p>
            </div>
            <Package className="w-10 h-10 text-dough-brown-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">In Stock</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.inStockItems}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.lowStockItems}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-orange-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recent Movements</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.recentMovements}</p>
            </div>
            <Clock className="w-10 h-10 text-blue-200" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Inventory Items</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">SKU</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Description</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Location</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Available</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Reserved</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No inventory items found.</td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{item.sku}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.desc}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.loc}</td>
                    <td className="py-3 px-4 text-sm text-gray-900">{item.avail}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{item.res}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === 'In Stock' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
