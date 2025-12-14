'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import {
  Package,
  Plus,
  Search,
  Filter,
  MoreVertical,
  AlertCircle,
  Wrench,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import EquipmentDialog from '@/components/equipment/equipment-dialog';
import EquipmentDetailView from '@/components/equipment/equipment-detail-view';

interface Equipment {
  id: string;
  code: string;
  name: string;
  category: string;
  manufacturer?: string;
  model?: string;
  status: string;
  condition: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  locationRef?: { id: string; name: string };
}

interface Stats {
  total: number;
  active: number;
  maintenance: number;
  critical: number;
}

export default function EquipmentPage() {
  const { data: session, status } = useSession();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, maintenance: 0, critical: 0 });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterCondition, setFilterCondition] = useState('all');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);

  // Categories for filtering
  const categories = [
    'Baking',
    'Cooling',
    'Storage',
    'Mixing',
    'Packaging',
    'Conveyor',
    'Other',
  ];

  const statuses = ['active', 'inactive', 'maintenance', 'repair', 'decommissioned'];
  const conditions = ['excellent', 'good', 'fair', 'poor', 'critical'];

  async function fetchEquipment() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterCategory !== 'all') params.append('category', filterCategory);
      if (filterCondition !== 'all') params.append('condition', filterCondition);

      const res = await fetch(`/api/equipment?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch equipment');

      const data = await res.json();
      setEquipment(data);

      // Calculate stats
      setStats({
        total: data.length,
        active: data.filter((e: Equipment) => e.status === 'active').length,
        maintenance: data.filter((e: Equipment) => e.status === 'maintenance').length,
        critical: data.filter((e: Equipment) => e.condition === 'critical').length,
      });

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load equipment');
      console.error('Equipment fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session) {
      fetchEquipment();
    }
  }, [searchTerm, filterStatus, filterCategory, filterCondition, session]);

  const handleRefresh = () => {
    fetchEquipment();
  };

  const handleEquipmentCreated = () => {
    setIsDialogOpen(false);
    fetchEquipment();
  };

  const handleEquipmentUpdated = () => {
    setIsDetailViewOpen(false);
    setSelectedEquipment(null);
    fetchEquipment();
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600 bg-green-50';
      case 'good': return 'text-blue-600 bg-blue-50';
      case 'fair': return 'text-yellow-600 bg-yellow-50';
      case 'poor': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'maintenance': return <Wrench className="h-4 w-4 text-blue-600" />;
      case 'repair': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'inactive': return <Clock className="h-4 w-4 text-gray-600" />;
      case 'decommissioned': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return null;
    }
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Equipment Management</h1>
          <p className="text-gray-500 mt-1">Track and manage all facility equipment and maintenance</p>
        </div>
        <Button
          onClick={() => setIsDialogOpen(true)}
          className="bg-dough-brown-600 hover:bg-dough-brown-700 gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Equipment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              <Package className="h-5 w-5 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">In Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold text-blue-600">{stats.maintenance}</p>
              <Wrench className="h-5 w-5 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Critical Condition</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold text-red-600">{stats.critical}</p>
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 flex items-center gap-2 max-w-md">
              <Search className="h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search by name, code, or serial number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-0 bg-transparent focus:ring-0"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Filters:</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-dough-brown-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-dough-brown-500 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-dough-brown-500 focus:outline-none"
            >
              <option value="all">All Conditions</option>
              {conditions.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Equipment Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Equipment List</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-2 animate-pulse" />
              <p className="text-gray-500">Loading equipment...</p>
            </div>
          ) : equipment.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">No equipment found</p>
              <p className="text-gray-500 text-sm mb-4">
                {searchTerm || filterStatus !== 'all' || filterCategory !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Start by adding your first equipment'}
              </p>
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-dough-brown-600 hover:bg-dough-brown-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Equipment
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Code</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Category</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Condition</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-900">Last Maintenance</th>
                    <th className="text-right py-3 px-4 font-semibold text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <span className="font-mono font-semibold text-dough-brown-700">
                          {item.code}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            {item.manufacturer} {item.model}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          <span className="text-xs font-medium capitalize">
                            {item.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(
                            item.condition
                          )}`}
                        >
                          {item.condition.charAt(0).toUpperCase() + item.condition.slice(1)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-gray-600">
                        {item.lastMaintenanceDate
                          ? new Date(item.lastMaintenanceDate).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            console.log('View button clicked for:', item);
                            setSelectedEquipment(item);
                            setIsDetailViewOpen(true);
                          }}
                          className="text-dough-brown-600 hover:text-dough-brown-700"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <EquipmentDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleEquipmentCreated}
      />

      <EquipmentDetailView
        open={isDetailViewOpen && !!selectedEquipment}
        onClose={() => {
          setIsDetailViewOpen(false);
          setSelectedEquipment(null);
        }}
        equipmentId={selectedEquipment?.id || ''}
        onUpdate={handleEquipmentUpdated}
      />
    </div>
  );
}
