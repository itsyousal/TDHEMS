'use client';

import React, { useEffect, useState } from 'react';
import { Package, MapPin, AlertCircle, Truck, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddWarehouseDialog } from '@/components/warehouse/add-warehouse-dialog';
import { WarehouseCard } from '@/components/warehouse/warehouse-card';
import { toast } from 'sonner';

interface Warehouse {
  id: string;
  name: string;
  locationId: string;
  capacity: number | null;
  currentUtilization: number | null;
  isActive: boolean;
  location?: { id: string; name: string };
  // bins removed from UI; keep model on server if needed
}

interface Location {
  id: string;
  name: string;
}

export default function WarehousePage() {
  const [stats, setStats] = useState<{
    totalLocations: number;
    totalBins: number;
    totalCapacity: number;
    totalUtilization: number;
  } | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [addWarehouseDialogOpen, setAddWarehouseDialogOpen] = useState(false);

  const fetchAllData = async () => {
    try {
      const [statsRes, warehousesRes, locationsRes] = await Promise.all([
        fetch('/api/warehouse/stats'),
        fetch('/api/warehouse'),
        fetch('/api/admin/locations'),
      ]);

      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }

      if (warehousesRes.ok) {
        const data = await warehousesRes.json();
        setWarehouses(data);
      }

      if (locationsRes.ok) {
        const data = await locationsRes.json();
        setLocations(data);
      }
    } catch (e) {
      console.error('Error fetching warehouse data', e);
      toast.error('Failed to load warehouse data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleWarehouseCreated = (newWarehouse: Warehouse) => {
    setWarehouses((prev) => [...prev, newWarehouse]);
    setAddWarehouseDialogOpen(false);
    // Refresh stats
    fetchAllData();
  };

  const handleWarehouseDeleted = (id: string) => {
    setWarehouses((prev) => prev.filter((w) => w.id !== id));
    // Refresh stats
    fetchAllData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Loading warehouse data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Warehouse</h1>
          <p className="text-sm text-gray-600 mt-1">Inventory and warehouse management</p>
        </div>
        <Button
          onClick={() => setAddWarehouseDialogOpen(true)}
          className="bg-dough-brown-600 hover:bg-dough-brown-700"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        {/* Total Bins removed per request */}
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
                {stats?.totalUtilization ?? 0}%
              </p>
            </div>
            <Truck className="w-10 h-10 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Warehouses Grid */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold">Your Warehouses</h2>
        {warehouses.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No warehouses yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Create your first warehouse to get started with inventory management
            </p>
            <Button
              onClick={() => setAddWarehouseDialogOpen(true)}
              className="mt-4 bg-dough-brown-600 hover:bg-dough-brown-700"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Warehouse
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {warehouses.map((warehouse) => (
              <WarehouseCard
                key={warehouse.id}
                id={warehouse.id}
                name={warehouse.name}
                locationName={warehouse.location?.name || 'Unknown'}
                capacity={warehouse.capacity}
                currentUtilization={warehouse.currentUtilization}
                isActive={warehouse.isActive}
                onDelete={handleWarehouseDeleted}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Warehouse Dialog */}
      <AddWarehouseDialog
        open={addWarehouseDialogOpen}
        onClose={() => setAddWarehouseDialogOpen(false)}
        onWarehouseCreated={handleWarehouseCreated}
        locations={locations}
      />
    </>
  );
}
