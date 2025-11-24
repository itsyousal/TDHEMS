'use client';

import React, { useEffect, useState } from 'react';
import { Package, MapPin, AlertCircle, Truck } from 'lucide-react';

export default function WarehousePage() {
  const [stats, setStats] = useState<{
    totalLocations: number;
    totalBins: number;
    totalCapacity: number;
    totalUtilization: number;
  } | null>(null);
  const [bins, setBins] = useState<Array<{
    location: string;
    type: string;
    capacity: number;
    items: number;
    util: number;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, warehousesRes] = await Promise.all([
          fetch('/api/warehouse/stats'),
          fetch('/api/warehouse'),
        ]);
        if (statsRes.ok) {
          const s = await statsRes.json();
          setStats(s);
        }
        if (warehousesRes.ok) {
          const data = await warehousesRes.json();
          const allBins = data.flatMap((w: any) =>
            (w.bins || []).map((b: any) => ({
              location: b.code,
              type: 'Bin',
              capacity: b.capacity ?? 0,
              items: b.currentUtilization ?? 0,
              util: b.capacity ? Math.round((b.currentUtilization / b.capacity) * 100) : 0,
            }))
          );
          setBins(allBins);
        }
      } catch (e) {
        console.error('Error fetching warehouse data', e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading warehouse data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Warehouse</h1>
        <p className="text-sm text-gray-600 mt-1">Inventory and warehouse management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Locations</p>
              <p className="text-3xl font-bold text-dough-brown-600 mt-2">
                {stats?.totalLocations ?? 0}
              </p>
            </div>
            <MapPin className="w-10 h-10 text-dough-brown-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Bins</p>
              <p className="text-3xl font-bold text-gold-accent-600 mt-2">
                {stats?.totalBins ?? 0}
              </p>
            </div>
            <Package className="w-10 h-10 text-gold-accent-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Capacity</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                {stats?.totalCapacity ?? 0}
              </p>
            </div>
            <AlertCircle className="w-10 h-10 text-orange-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Utilization</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {stats?.totalUtilization ?? 0}
              </p>
            </div>
            <Truck className="w-10 h-10 text-blue-200" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Storage Locations</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Location</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Type</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Capacity</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Current Items</th>
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {bins.map((loc, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm font-medium text-gray-900">{loc.location}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{loc.type}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{loc.capacity}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{loc.items}</td>
                  <td className="py-3 px-4 text-sm">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-dough-brown-600 h-2 rounded-full" style={{ width: `${loc.util}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
