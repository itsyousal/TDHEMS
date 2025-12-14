'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Loader2, Package } from 'lucide-react';

interface EquipmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const categories = ['Baking', 'Cooling', 'Storage', 'Mixing', 'Packaging', 'Conveyor', 'Other'];
const statuses = ['active', 'inactive', 'maintenance', 'repair', 'decommissioned'];
const conditions = ['excellent', 'good', 'fair', 'poor', 'critical'];

export default function EquipmentDialog({ open, onClose, onSuccess }: EquipmentDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    category: 'Baking',
    manufacturer: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    purchaseCost: '',
    installationDate: '',
    warrantyExpiryDate: '',
    status: 'active',
    condition: 'good',
    location: '',
    capacity: '',
    notes: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | string,
    fieldName?: string
  ) => {
    if (typeof e === 'string' && fieldName) {
      setFormData((prev) => ({ ...prev, [fieldName]: e }));
    } else if (typeof e !== 'string') {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!formData.code || !formData.name || !formData.category) {
        throw new Error('Code, name, and category are required');
      }

      const response = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        console.error('Equipment creation failed:', responseData);
        throw new Error(responseData.error || responseData.details || 'Failed to create equipment');
      }

      console.log('Equipment created successfully:', responseData);

      // Reset form
      setFormData({
        code: '',
        name: '',
        category: 'Baking',
        manufacturer: '',
        model: '',
        serialNumber: '',
        purchaseDate: '',
        purchaseCost: '',
        installationDate: '',
        warrantyExpiryDate: '',
        status: 'active',
        condition: 'good',
        location: '',
        capacity: '',
        notes: '',
      });

      onSuccess();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create equipment';
      console.error('Error creating equipment:', errorMsg, err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-dough-brown-600" />
            Add New Equipment
          </DialogTitle>
          <p className="text-sm text-gray-600 mt-1">
            Enter equipment details. Fields marked with * are required.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 flex items-center gap-3 text-red-700">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Basic Information Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Basic Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="code" className="text-xs font-semibold uppercase">
                  Equipment Code *
                </Label>
                <Input
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder="e.g., OVEN-001"
                  required
                  disabled={loading}
                  className="mt-1 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Unique identifier</p>
              </div>

              <div>
                <Label htmlFor="name" className="text-xs font-semibold uppercase">
                  Equipment Name *
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Industrial Rotary Oven"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category" className="text-xs font-semibold uppercase">
                  Category *
                </Label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-dough-brown-500 focus:outline-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="status" className="text-xs font-semibold uppercase">
                  Status
                </Label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-dough-brown-500 focus:outline-none"
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="condition" className="text-xs font-semibold uppercase">
                  Condition
                </Label>
                <select
                  id="condition"
                  name="condition"
                  value={formData.condition}
                  onChange={handleChange}
                  disabled={loading}
                  className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-dough-brown-500 focus:outline-none"
                >
                  {conditions.map((cond) => (
                    <option key={cond} value={cond}>
                      {cond.charAt(0).toUpperCase() + cond.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="capacity" className="text-xs font-semibold uppercase">
                  Capacity
                </Label>
                <Input
                  id="capacity"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  placeholder="e.g., 50kg/batch"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Manufacturer Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Manufacturer Details
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="manufacturer" className="text-xs font-semibold uppercase">
                  Manufacturer
                </Label>
                <Input
                  id="manufacturer"
                  name="manufacturer"
                  value={formData.manufacturer}
                  onChange={handleChange}
                  placeholder="e.g., Hobart"
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="model" className="text-xs font-semibold uppercase">
                  Model Number
                </Label>
                <Input
                  id="model"
                  name="model"
                  value={formData.model}
                  onChange={handleChange}
                  placeholder="e.g., AR-50"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="serialNumber" className="text-xs font-semibold uppercase">
                Serial Number
              </Label>
              <Input
                id="serialNumber"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                placeholder="Unique serial number"
                disabled={loading}
              />
            </div>
          </div>

          {/* Financial & Dates */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Financial & Dates
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchaseDate" className="text-xs font-semibold uppercase">
                  Purchase Date
                </Label>
                <Input
                  id="purchaseDate"
                  name="purchaseDate"
                  type="date"
                  value={formData.purchaseDate}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="purchaseCost" className="text-xs font-semibold uppercase">
                  Purchase Cost (₹)
                </Label>
                <Input
                  id="purchaseCost"
                  name="purchaseCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchaseCost}
                  onChange={handleChange}
                  placeholder="0.00"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="installationDate" className="text-xs font-semibold uppercase">
                  Installation Date
                </Label>
                <Input
                  id="installationDate"
                  name="installationDate"
                  type="date"
                  value={formData.installationDate}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div>
                <Label htmlFor="warrantyExpiryDate" className="text-xs font-semibold uppercase">
                  Warranty Expiry Date
                </Label>
                <Input
                  id="warrantyExpiryDate"
                  name="warrantyExpiryDate"
                  type="date"
                  value={formData.warrantyExpiryDate}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
              Additional Information
            </h3>

            <div>
              <Label htmlFor="location" className="text-xs font-semibold uppercase">
                Physical Location
              </Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Section A, Row 2"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Location within facility</p>
            </div>

            <div>
              <Label htmlFor="notes" className="text-xs font-semibold uppercase">
                Notes
              </Label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional information about this equipment..."
                rows={3}
                disabled={loading}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-dough-brown-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-dough-brown-600 hover:bg-dough-brown-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Package className="mr-2 h-4 w-4" />
                  Create Equipment
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
