'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Loader2, Plus, Edit, Trash2, Save } from 'lucide-react';
import { toast } from 'sonner';

interface Variation {
  id: string;
  name: string;
  priceModifier: number;
  sortOrder: number;
  isActive: boolean;
}

interface Addon {
  id: string;
  name: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
}

interface ManageOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skuId: string;
  skuName: string;
  onSuccess?: () => void;
}

export function ManageOptionsDialog({ open, onOpenChange, skuId, skuName, onSuccess }: ManageOptionsDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [newVariation, setNewVariation] = useState({ name: '', priceModifier: '0' });
  const [newAddon, setNewAddon] = useState({ name: '', price: '0' });
  const [editingVariation, setEditingVariation] = useState<string | null>(null);
  const [editingAddon, setEditingAddon] = useState<string | null>(null);

  useEffect(() => {
    if (open && skuId) {
      fetchOptions();
    }
  }, [open, skuId]);

  const fetchOptions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/product-options?skuId=${skuId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch options');
      }

      const data = await response.json();
      setVariations(data.variations);
      setAddons(data.addons);
    } catch (error) {
      console.error('Error fetching options:', error);
      toast.error('Failed to load options');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVariation = async () => {
    if (!newVariation.name.trim()) {
      toast.error('Variation name is required');
      return;
    }

    try {
      const response = await fetch('/api/admin/product-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skuId,
          type: 'variation',
          name: newVariation.name,
          priceModifier: newVariation.priceModifier,
          sortOrder: variations.length
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add variation');
      }

      toast.success('Variation added successfully');
      setNewVariation({ name: '', priceModifier: '0' });
      fetchOptions();
    } catch (error) {
      console.error('Error adding variation:', error);
      toast.error('Failed to add variation');
    }
  };

  const handleAddAddon = async () => {
    if (!newAddon.name.trim()) {
      toast.error('Addon name is required');
      return;
    }

    try {
      const response = await fetch('/api/admin/product-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skuId,
          type: 'addon',
          name: newAddon.name,
          price: newAddon.price,
          sortOrder: addons.length
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add addon');
      }

      toast.success('Addon added successfully');
      setNewAddon({ name: '', price: '0' });
      fetchOptions();
    } catch (error) {
      console.error('Error adding addon:', error);
      toast.error('Failed to add addon');
    }
  };

  const handleUpdateVariation = async (id: string, data: Partial<Variation>) => {
    try {
      const response = await fetch('/api/admin/product-options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          type: 'variation',
          ...data
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update variation');
      }

      toast.success('Variation updated successfully');
      setEditingVariation(null);
      fetchOptions();
    } catch (error) {
      console.error('Error updating variation:', error);
      toast.error('Failed to update variation');
    }
  };

  const handleUpdateAddon = async (id: string, data: Partial<Addon>) => {
    try {
      const response = await fetch('/api/admin/product-options', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          type: 'addon',
          ...data
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update addon');
      }

      toast.success('Addon updated successfully');
      setEditingAddon(null);
      fetchOptions();
    } catch (error) {
      console.error('Error updating addon:', error);
      toast.error('Failed to update addon');
    }
  };

  const handleDeleteVariation = async (id: string) => {
    if (!confirm('Are you sure you want to delete this variation?')) return;

    try {
      const response = await fetch(`/api/admin/product-options?id=${id}&type=variation`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete variation');
      }

      toast.success('Variation deleted successfully');
      fetchOptions();
    } catch (error) {
      console.error('Error deleting variation:', error);
      toast.error('Failed to delete variation');
    }
  };

  const handleDeleteAddon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this addon?')) return;

    try {
      const response = await fetch(`/api/admin/product-options?id=${id}&type=addon`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete addon');
      }

      toast.success('Addon deleted successfully');
      fetchOptions();
    } catch (error) {
      console.error('Error deleting addon:', error);
      toast.error('Failed to delete addon');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Manage Options</h2>
            <p className="text-sm text-gray-600 mt-1">{skuName}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors "
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
          </div>
        ) : (
          <div className="p-6 space-y-8">
            {/* Variations Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Variations</h3>
              <p className="text-sm text-gray-600 mb-4">Variations allow customers to choose one option (e.g., size, flavor). Price modifier is added to base price.</p>
              
              {/* Add New Variation */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Variation name (e.g., 'Large', 'Hazelnut')"
                      value={newVariation.name}
                      onChange={(e) => setNewVariation({ ...newVariation, name: e.target.value })}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Price ₹"
                      value={newVariation.priceModifier}
                      onChange={(e) => setNewVariation({ ...newVariation, priceModifier: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddVariation} className="bg-gray-900 hover:bg-gray-800 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Variations List */}
              <div className="space-y-2">
                {variations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No variations added yet</p>
                ) : (
                  variations.map((variation) => (
                    <div key={variation.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                      {editingVariation === variation.id ? (
                        <>
                          <Input
                            defaultValue={variation.name}
                            onBlur={(e) => handleUpdateVariation(variation.id, { name: e.target.value })}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={variation.priceModifier}
                            onBlur={(e) => handleUpdateVariation(variation.id, { priceModifier: parseFloat(e.target.value) })}
                            className="w-32"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingVariation(null)}
                          >
                            Done
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium text-gray-900">{variation.name}</span>
                          <span className="text-sm text-gray-600 w-24">+₹{variation.priceModifier.toFixed(2)}</span>
                          <Badge variant={variation.isActive ? 'default' : 'secondary'} className="text-xs">
                            {variation.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingVariation(variation.id)}
                            >
                              <Edit className="w-4 h-4 " />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteVariation(variation.id)}
                              className="hover:bg-red-50 hover:text-red-600 hover:border-red-200 "
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Addons Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add-ons</h3>
              <p className="text-sm text-gray-600 mb-4">Add-ons allow customers to select multiple extras (e.g., toppings, sides). Each has its own price.</p>
              
              {/* Add New Addon */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Add-on name (e.g., 'Extra Cheese', 'Chicken')"
                      value={newAddon.name}
                      onChange={(e) => setNewAddon({ ...newAddon, name: e.target.value })}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Price ₹"
                      value={newAddon.price}
                      onChange={(e) => setNewAddon({ ...newAddon, price: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleAddAddon} className="bg-gray-900 hover:bg-gray-800 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Addons List */}
              <div className="space-y-2">
                {addons.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No add-ons added yet</p>
                ) : (
                  addons.map((addon) => (
                    <div key={addon.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
                      {editingAddon === addon.id ? (
                        <>
                          <Input
                            defaultValue={addon.name}
                            onBlur={(e) => handleUpdateAddon(addon.id, { name: e.target.value })}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            step="0.01"
                            defaultValue={addon.price}
                            onBlur={(e) => handleUpdateAddon(addon.id, { price: parseFloat(e.target.value) })}
                            className="w-32"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingAddon(null)}
                          >
                            Done
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium text-gray-900">{addon.name}</span>
                          <span className="text-sm text-gray-600 w-24">₹{addon.price.toFixed(2)}</span>
                          <Badge variant={addon.isActive ? 'default' : 'secondary'} className="text-xs">
                            {addon.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingAddon(addon.id)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteAddon(addon.id)}
                              className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <Button
            onClick={() => {
              onOpenChange(false);
              onSuccess?.();
            }}
            className="bg-gray-900 hover:bg-gray-800 text-white"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
