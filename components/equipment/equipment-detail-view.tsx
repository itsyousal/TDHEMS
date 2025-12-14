'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  Loader2,
  Package,
  Wrench,
  Calendar,
  DollarSign,
  Trash2,
  Edit2,
  Plus,
} from 'lucide-react';

interface MaintenanceLog {
  id: string;
  maintenanceType: string;
  description: string;
  startDate: string;
  endDate?: string;
  cost?: number;
  notes?: string;
}

interface EquipmentDetail {
  id: string;
  code: string;
  name: string;
  category: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  status: string;
  condition: string;
  purchaseDate?: string;
  purchaseCost?: number;
  installationDate?: string;
  warrantyExpiryDate?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  location?: string;
  capacity?: string;
  notes?: string;
  maintenanceLogs: MaintenanceLog[];
}

interface EquipmentDetailViewProps {
  open: boolean;
  onClose: () => void;
  equipmentId: string;
  onUpdate?: () => void;
}

const conditions = ['excellent', 'good', 'fair', 'poor', 'critical'];
const statuses = ['active', 'inactive', 'maintenance', 'repair', 'decommissioned'];

export default function EquipmentDetailView({
  open,
  onClose,
  equipmentId,
  onUpdate,
}: EquipmentDetailViewProps) {
  const [equipment, setEquipment] = useState<EquipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addingMaintenance, setAddingMaintenance] = useState(false);

  const [editData, setEditData] = useState<Partial<EquipmentDetail>>({});
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenanceType: 'preventive',
    description: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    cost: '',
    notes: '',
  });

  useEffect(() => {
    if (open && equipmentId) {
      console.log('EquipmentDetailView opening for equipmentId:', equipmentId);
      fetchEquipment();
    }
  }, [open, equipmentId]);

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      console.log('Fetching equipment with ID:', equipmentId);
      const res = await fetch(`/api/equipment/${equipmentId}`);
      if (!res.ok) throw new Error('Failed to fetch equipment');
      const data = await res.json();
      console.log('Fetched equipment data:', data);
      setEquipment(data);
      setEditData(data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching equipment:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/equipment/${equipmentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (!response.ok) throw new Error('Failed to update equipment');
      const updated = await response.json();
      setEquipment(updated);
      setEditing(false);
      onUpdate?.();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddMaintenance = async () => {
    try {
      setError(null);
      if (!maintenanceForm.description || !maintenanceForm.maintenanceType) {
        throw new Error('Description and type are required');
      }

      const response = await fetch(`/api/equipment/${equipmentId}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(maintenanceForm),
      });

      if (!response.ok) throw new Error('Failed to add maintenance log');
      
      // Refresh equipment data
      await fetchEquipment();
      setAddingMaintenance(false);
      setMaintenanceForm({
        maintenanceType: 'preventive',
        description: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        cost: '',
        notes: '',
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this equipment? This action cannot be undone.')) {
      return;
    }

    try {
      setError(null);
      const response = await fetch(`/api/equipment/${equipmentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete equipment');
      onUpdate?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!equipment) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-dough-brown-600" />
                {equipment.code} - {equipment.name}
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">{equipment.category}</p>
            </div>
            {!editing && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditing(true)}
                  className="gap-2"
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-600 hover:text-red-700 gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 flex items-center gap-3 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold uppercase">Name</Label>
                  <Input
                    value={editData.name || ''}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase">Status</Label>
                  <select
                    value={editData.status || ''}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-dough-brown-500 focus:outline-none"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold uppercase">Condition</Label>
                  <select
                    value={editData.condition || ''}
                    onChange={(e) => setEditData({ ...editData, condition: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-dough-brown-500 focus:outline-none"
                  >
                    {conditions.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold uppercase">Capacity</Label>
                  <Input
                    value={editData.capacity || ''}
                    onChange={(e) => setEditData({ ...editData, capacity: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold uppercase">Notes</Label>
                <textarea
                  value={editData.notes || ''}
                  onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-dough-brown-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdate}
                  className="bg-dough-brown-600 hover:bg-dough-brown-700"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Equipment Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Status</p>
                  <p className="text-gray-900 capitalize mt-1">{equipment.status}</p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">Condition</p>
                  <p className="text-gray-900 capitalize mt-1">{equipment.condition}</p>
                </div>
                {equipment.manufacturer && (
                  <div>
                    <p className="text-gray-600 font-medium">Manufacturer</p>
                    <p className="text-gray-900 mt-1">{equipment.manufacturer}</p>
                  </div>
                )}
                {equipment.model && (
                  <div>
                    <p className="text-gray-600 font-medium">Model</p>
                    <p className="text-gray-900 mt-1">{equipment.model}</p>
                  </div>
                )}
                {equipment.serialNumber && (
                  <div>
                    <p className="text-gray-600 font-medium">Serial Number</p>
                    <p className="text-gray-900 font-mono mt-1">{equipment.serialNumber}</p>
                  </div>
                )}
                {equipment.capacity && (
                  <div>
                    <p className="text-gray-600 font-medium">Capacity</p>
                    <p className="text-gray-900 mt-1">{equipment.capacity}</p>
                  </div>
                )}
                {equipment.purchaseDate && (
                  <div>
                    <p className="text-gray-600 font-medium">Purchase Date</p>
                    <p className="text-gray-900 mt-1">
                      {new Date(equipment.purchaseDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {equipment.purchaseCost && (
                  <div>
                    <p className="text-gray-600 font-medium">Purchase Cost</p>
                    <p className="text-gray-900 mt-1">₹{equipment.purchaseCost.toLocaleString()}</p>
                  </div>
                )}
                {equipment.warrantyExpiryDate && (
                  <div>
                    <p className="text-gray-600 font-medium">Warranty Expiry</p>
                    <p className="text-gray-900 mt-1">
                      {new Date(equipment.warrantyExpiryDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {equipment.notes && (
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 font-medium mb-2">Notes</p>
                  <p className="text-sm text-gray-900 bg-gray-50 rounded p-3">{equipment.notes}</p>
                </div>
              )}

              {/* Maintenance Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-dough-brown-600" />
                    Maintenance History
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAddingMaintenance(!addingMaintenance)}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Log
                  </Button>
                </div>

                {addingMaintenance && (
                  <div className="space-y-3 mb-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <Label className="text-xs font-semibold uppercase">Type</Label>
                      <select
                        value={maintenanceForm.maintenanceType}
                        onChange={(e) =>
                          setMaintenanceForm({
                            ...maintenanceForm,
                            maintenanceType: e.target.value,
                          })
                        }
                        className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-dough-brown-500 focus:outline-none"
                      >
                        <option value="preventive">Preventive</option>
                        <option value="repair">Repair</option>
                        <option value="inspection">Inspection</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="calibration">Calibration</option>
                      </select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold uppercase">Description</Label>
                      <Input
                        value={maintenanceForm.description}
                        onChange={(e) =>
                          setMaintenanceForm({
                            ...maintenanceForm,
                            description: e.target.value,
                          })
                        }
                        placeholder="What was done..."
                        className="mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs font-semibold uppercase">Start Date</Label>
                        <Input
                          type="date"
                          value={maintenanceForm.startDate}
                          onChange={(e) =>
                            setMaintenanceForm({
                              ...maintenanceForm,
                              startDate: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-xs font-semibold uppercase">End Date</Label>
                        <Input
                          type="date"
                          value={maintenanceForm.endDate}
                          onChange={(e) =>
                            setMaintenanceForm({
                              ...maintenanceForm,
                              endDate: e.target.value,
                            })
                          }
                          className="mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold uppercase">Cost (₹)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={maintenanceForm.cost}
                        onChange={(e) =>
                          setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })
                        }
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs font-semibold uppercase">Notes</Label>
                      <Input
                        value={maintenanceForm.notes}
                        onChange={(e) =>
                          setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })
                        }
                        placeholder="Additional notes..."
                        className="mt-1"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAddingMaintenance(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddMaintenance}
                        className="bg-dough-brown-600 hover:bg-dough-brown-700"
                      >
                        Save Log
                      </Button>
                    </div>
                  </div>
                )}

                {equipment.maintenanceLogs && equipment.maintenanceLogs.length > 0 ? (
                  <div className="space-y-2">
                    {equipment.maintenanceLogs.map((log) => (
                      <div key={log.id} className="border rounded-lg p-3 bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm capitalize text-gray-900">
                              {log.maintenanceType}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                            {log.notes && (
                              <p className="text-xs text-gray-500 mt-2 italic">{log.notes}</p>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                            {new Date(log.startDate).toLocaleDateString()}
                          </span>
                        </div>
                        {(log.cost || log.endDate) && (
                          <div className="flex gap-4 mt-2 text-xs text-gray-600">
                            {log.endDate && (
                              <span>Completed: {new Date(log.endDate).toLocaleDateString()}</span>
                            )}
                            {log.cost && <span>Cost: ₹{log.cost.toLocaleString()}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">No maintenance logs yet</p>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
