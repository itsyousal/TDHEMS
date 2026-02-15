'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AddWarehouseDialogProps {
  open: boolean;
  onClose: () => void;
  onWarehouseCreated: (warehouse: any) => void;
  locations: Array<{ id: string; name: string }>;
}

export function AddWarehouseDialog({
  open,
  onClose,
  onWarehouseCreated,
  locations,
}: AddWarehouseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    locationId: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLocationChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      locationId: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError('Warehouse name is required');
      return;
    }

    if (!formData.locationId) {
      setError('Location is required');
      return;
    }

    // capacity field removed per request

    setLoading(true);

    try {
      const response = await fetch('/api/warehouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: formData.name.trim(),
            locationId: formData.locationId,
            isActive: true,
          }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to create warehouse');
      }

      const data = await response.json();
      toast.success('Warehouse created successfully');
      onWarehouseCreated(data.data || data.warehouse);

      // Reset form
      setFormData({
        name: '',
        locationId: '',
      });

      onClose();
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create warehouse';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-[480px] p-8 inset-x-0 bottom-0 sm:inset-x-0 sm:top-[clamp(7.5rem,6vh,4rem)] sm:bottom-auto sm:mx-auto sm:max-w-[480px] sm:rounded-xl">
        <div className="mb-3">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-dough-brown-100 rounded-lg">
              <PlusCircle className="h-5 w-5 text-dough-brown-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Add Warehouse</h2>
          </div>
          <p className="text-sm text-gray-500">Create a new warehouse location for your inventory.</p>
        </div>

        <form onSubmit={handleSubmit} className="">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 mb-2 flex items-start gap-3 text-sm text-red-700">
              <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-4">
            <Label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Warehouse Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Main Warehouse"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-dough-brown-500 focus:border-transparent"
            />
          </div>

          <div className="mb-4">
            <Label htmlFor="locationId" className="block text-sm font-medium text-gray-700 mb-2">
              Location <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.locationId} onValueChange={handleLocationChange} disabled={loading}>
              <SelectTrigger id="locationId" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-dough-brown-500 focus:border-transparent">
                <SelectValue placeholder="Select location..." />
              </SelectTrigger>
              <SelectContent>
                {locations.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500">No locations available</div>
                ) : (
                  locations.map((loc) => (
                    <SelectItem key={loc.id} value={loc.id}>
                      {loc.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* capacity removed per request */}

          <div className="flex justify-end items-center gap-3 mt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium text-sm hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-dough-brown-600 text-white rounded-md font-medium text-sm hover:bg-dough-brown-700 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  Add Warehouse
                </span>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
