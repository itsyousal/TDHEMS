'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface MenuItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  basePrice: number;
  costPrice: number;
  unit: string;
  weight: number | null;
  status: string;
}

interface EditMenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem: MenuItem | null;
  onSuccess?: () => void;
}

export function EditMenuItemDialog({ open, onOpenChange, menuItem, onSuccess }: EditMenuItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<MenuItem | null>(null);

  React.useEffect(() => {
    if (menuItem && open) {
      setFormData({ ...menuItem });
    }
  }, [menuItem, open]);

  const handleChange = (field: keyof MenuItem, value: string | number) => {
    if (formData) {
      setFormData(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/menu', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update menu item');
      }

      toast.success('Menu item updated successfully!');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error updating menu item:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update menu item');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open || !formData) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Edit Menu Item</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Code & Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code" className="text-sm font-medium text-gray-900">
                Product Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="e.g., BRD-001"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="name" className="text-sm font-medium text-gray-900">
                Product Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Sourdough Bread"
                required
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description" className="text-sm font-medium text-gray-900">
              Description
            </Label>
            <textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Product description..."
              rows={3}
              className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            />
          </div>

          {/* Category & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category" className="text-sm font-medium text-gray-900">
                Category
              </Label>
              <Input
                id="category"
                value={formData.category || ''}
                onChange={(e) => handleChange('category', e.target.value)}
                placeholder="e.g., Bread, Pastry"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="status" className="text-sm font-medium text-gray-900">
                Status
              </Label>
              <Select value={formData.status} onValueChange={(v) => handleChange('status', v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="discontinued">Discontinued</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="basePrice" className="text-sm font-medium text-gray-900">
                Base Price (₹) <span className="text-red-500">*</span>
              </Label>
              <Input
                id="basePrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.basePrice}
                onChange={(e) => handleChange('basePrice', parseFloat(e.target.value))}
                placeholder="0.00"
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="costPrice" className="text-sm font-medium text-gray-900">
                Cost Price (₹)
              </Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.costPrice}
                onChange={(e) => handleChange('costPrice', parseFloat(e.target.value))}
                placeholder="0.00"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Unit & Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit" className="text-sm font-medium text-gray-900">
                Unit <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.unit} onValueChange={(v) => handleChange('unit', v)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="units">Units</SelectItem>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="g">Grams (g)</SelectItem>
                  <SelectItem value="liter">Liters (L)</SelectItem>
                  <SelectItem value="ml">Milliliters (ml)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="weight" className="text-sm font-medium text-gray-900">
                Weight
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                min="0"
                value={formData.weight || ''}
                onChange={(e) => handleChange('weight', parseFloat(e.target.value))}
                placeholder="0.00"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gray-900 hover:bg-gray-800 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2 text-white" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
