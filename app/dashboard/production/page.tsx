'use client';

import React, { useEffect, useState } from 'react';
import { Factory, Package, AlertCircle, BarChart3 } from 'lucide-react';

interface ProductionStats {
  activeBatches: number;
  completedToday: number;
  delayedBatches: number;
  productionRate: number;
}

interface ProductionBatch {
  id: string;
  product: string;
  qty: string;
  status: string;
  start: string;
  end: string;
}

export default function ProductionPage() {
  const [stats, setStats] = useState<ProductionStats>({
    activeBatches: 0,
    completedToday: 0,
    delayedBatches: 0,
    productionRate: 0,
  });
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, batchesRes] = await Promise.all([
          fetch('/api/production/stats'),
          fetch('/api/production'),
        ]);

        if (statsRes.ok) {
          setStats(await statsRes.json());
        }
        if (batchesRes.ok) {
          setBatches(await batchesRes.json());
        }
      } catch (error) {
        console.error('Failed to fetch production data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-center">Loading production data...</div>;
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Production</h1>
        <p className="text-sm text-gray-600 mt-1">Production batches and manufacturing</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Batches</p>
              <p className="text-3xl font-bold text-dough-brown-600 mt-2">{stats.activeBatches}</p>
            </div>
            <Factory className="w-10 h-10 text-dough-brown-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed Today</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.completedToday}</p>
            </div>
            <Package className="w-10 h-10 text-green-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Delayed Batches</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.delayedBatches}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-orange-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Production Rate</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.productionRate}%</p>
            </div>
            <BarChart3 className="w-10 h-10 text-blue-200" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Production Batches</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Batch ID</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Product</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Quantity</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Start Date</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Target End</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">No production batches found.</td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">{batch.id}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{batch.product}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{batch.qty}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${batch.status === 'Completed' ? 'bg-green-100 text-green-800' :
                          batch.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-orange-100 text-orange-800'
                        }`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{batch.start}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{batch.end}</td>
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
