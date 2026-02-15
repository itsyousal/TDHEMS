'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Loader2 } from 'lucide-react';

interface QuickAddSKUDialogProps {
  open: boolean;
  onClose: () => void;
  onSKUCreated: (sku: any) => void;
  locationId: string;
}

export function QuickAddSKUDialog({ open, onClose, onSKUCreated, locationId }: QuickAddSKUDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    unit: 'kg',
    basePrice: '',
    category: 'raw',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/inventory/skus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: formData.code.trim(),
          name: formData.name.trim(),
          unit: formData.unit,
          basePrice: parseFloat(formData.basePrice) || 0,
          category: formData.category,
          isActive: true,
          // Create initial stock entry for the location
          locations: [
            {
              locationId,
              currentStock: 0,
              reorderPoint: 0,
              reorderQuantity: 0,
            }
          ]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Helper to extract message from potentially nested error object
        const errorMessage = errorData.error?.message || errorData.error || 'Failed to create SKU';
        throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
      }

      const data = await response.json();
      onSKUCreated(data.sku);

      // Reset form
      setFormData({
        code: '',
        name: '',
        unit: 'kg',
        basePrice: '',
        category: 'raw',
      });

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create SKU');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5 text-dough-brown-600" />
            Quick Add SKU
          </DialogTitle>
          <p className="text-sm text-gray-500">
            Add a new ingredient or item to inventory and immediately use it in this purchase order.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="quick-sku-code">SKU Code *</Label>
              <Input
                id="quick-sku-code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., FLOUR-001"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="quick-sku-name">Name *</Label>
              <Input
                id="quick-sku-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., All Purpose Flour"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="quick-sku-unit">Unit *</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
                disabled={loading}
              >
                <SelectTrigger id="quick-sku-unit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  <SelectItem value="g">Grams (g)</SelectItem>
                  <SelectItem value="L">Liters (L)</SelectItem>
                  <SelectItem value="mL">Milliliters (mL)</SelectItem>
                  <SelectItem value="units">Units</SelectItem>
                  <SelectItem value="boxes">Boxes</SelectItem>
                  <SelectItem value="bags">Bags</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="quick-sku-price">Base Price (₹) *</Label>
              <Input
                id="quick-sku-price"
                type="number"
                min="0"
                step="0.01"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                placeholder="0.00"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="quick-sku-category">Category</Label>
            <Select
              value={formData.category}
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              disabled={loading}
            >
              <SelectTrigger id="quick-sku-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw">Raw Material</SelectItem>
                <SelectItem value="packaging">Packaging</SelectItem>
                <SelectItem value="finished">Finished Product</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
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
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create SKU
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
