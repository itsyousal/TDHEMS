'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  Package,
  DollarSign,
  Tag,
  TrendingUp,
  AlertCircle,
  Loader2,
  Settings,
  Copy
} from 'lucide-react';
import { AddProductDialog } from '@/components/admin/add-product-dialog';
import { EditMenuItemDialog } from '@/components/admin/edit-menu-item-dialog';
import { ManageOptionsDialog } from '@/components/admin/manage-options-dialog';
import { toast } from 'sonner';

interface ProductVariation {
  id: string;
  name: string;
  priceModifier: number;
  sortOrder: number;
  isActive: boolean;
}

interface ProductAddon {
  id: string;
  name: string;
  price: number;
  sortOrder: number;
  isActive: boolean;
}

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
  inventoryType: string;
  image: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  variations?: ProductVariation[];
  addons?: ProductAddon[];
}

export default function MenuManagementPage() {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isManageOptionsOpen, setIsManageOptionsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);

  // Check if user is admin or manager
  const sessionRoles: string[] = (session?.user as any)?.roles || [];
  const isAdminOrManager = sessionRoles.includes('owner-super-admin') || 
                           sessionRoles.includes('general-manager');

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/login');
    }

    if (status === 'authenticated' && !isAdminOrManager) {
      redirect('/dashboard');
    }
  }, [status, isAdminOrManager]);

  useEffect(() => {
    if (status === 'authenticated' && isAdminOrManager) {
      fetchMenuItems();
    }
  }, [status, isAdminOrManager]);

  useEffect(() => {
    filterMenuItems();
  }, [searchQuery, categoryFilter, statusFilter, menuItems]);

  const fetchMenuItems = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/menu');
      
      if (!response.ok) {
        throw new Error('Failed to fetch menu items');
      }

      const data = await response.json();
      setMenuItems(data.menuItems);
      setFilteredItems(data.menuItems);
    } catch (error) {
      console.error('Error fetching menu items:', error);
      toast.error('Failed to load menu items');
    } finally {
      setIsLoading(false);
    }
  };

  const filterMenuItems = () => {
    let filtered = [...menuItems];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredItems(filtered);
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setIsEditDialogOpen(true);
  };

  const handleManageOptions = (item: MenuItem) => {
    setSelectedItem(item);
    setIsManageOptionsOpen(true);
  };

  const handleDelete = async (item: MenuItem) => {
    if (!confirm(`Are you sure you want to remove "${item.name}" from the menu?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/menu?id=${item.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete menu item');
      }

      toast.success('Menu item removed successfully');
      fetchMenuItems();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to remove menu item');
    }
  };

  const handleDuplicate = async (item: MenuItem) => {
    try {
      // Create a copy with modified code and name
      const newCode = `${item.code}-COPY`;
      const newName = `${item.name} (Copy)`;

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          description: item.description,
          category: item.category,
          basePrice: item.basePrice,
          costPrice: item.costPrice,
          unit: item.unit,
          weight: item.weight,
          status: 'inactive', // Create as inactive by default
          inventoryType: 'FINISHED',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to duplicate item');
      }

      const result = await response.json();
      const newSkuId = result.product.id;

      // Duplicate variations if any
      if (item.variations && item.variations.length > 0) {
        for (const variation of item.variations) {
          await fetch('/api/admin/product-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              skuId: newSkuId,
              type: 'variation',
              name: variation.name,
              priceModifier: variation.priceModifier,
              sortOrder: variation.sortOrder,
            }),
          });
        }
      }

      // Duplicate addons if any
      if (item.addons && item.addons.length > 0) {
        for (const addon of item.addons) {
          await fetch('/api/admin/product-options', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              skuId: newSkuId,
              type: 'addon',
              name: addon.name,
              price: addon.price,
              sortOrder: addon.sortOrder,
            }),
          });
        }
      }

      toast.success(`Duplicated "${item.name}" as "${newName}"`);
      fetchMenuItems();
    } catch (error) {
      console.error('Error duplicating menu item:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate item');
    }
  };

  const categories = Array.from(new Set(menuItems.map(item => item.category).filter(Boolean)));
  const totalItems = menuItems.length;
  const activeItems = menuItems.filter(item => item.status === 'active').length;
  const totalValue = menuItems.reduce((sum, item) => sum + item.basePrice, 0);
  const avgPrice = totalItems > 0 ? totalValue / totalItems : 0;

  if (status === 'loading' || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-600 mt-1">Manage your menu items and products</p>
        </div>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gray-900 hover:bg-gray-800 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Menu Item
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalItems}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Items</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{activeItems}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Price</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">₹{avgPrice.toFixed(0)}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Categories</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{categories.length}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Tag className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by name, code, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat || ''}>{cat || 'Uncategorized'}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Options
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No menu items found</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.code}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {item.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs">
                        {item.category || 'Uncategorized'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₹{item.basePrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {item.variations && item.variations.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {item.variations.length} var{item.variations.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {item.addons && item.addons.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {item.addons.length} addon{item.addons.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {(!item.variations || item.variations.length === 0) && 
                         (!item.addons || item.addons.length === 0) && (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          item.status === 'active' ? 'default' : 
                          item.status === 'inactive' ? 'secondary' : 
                          'destructive'
                        }
                        className="text-xs"
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => handleManageOptions(item)}
                          variant="outline"
                          size="sm"
                          className="hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                          title="Manage variations and add-ons"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDuplicate(item)}
                          variant="outline"
                          size="sm"
                          className="hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200"
                          title="Duplicate item"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleEdit(item)}
                          variant="outline"
                          size="sm"
                          className="hover:bg-gray-100"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(item)}
                          variant="outline"
                          size="sm"
                          className="hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Product Dialog */}
      <AddProductDialog 
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={() => {
          fetchMenuItems();
        }}
      />

      {/* Edit Menu Item Dialog */}
      <EditMenuItemDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        menuItem={selectedItem}
        onSuccess={() => {
          fetchMenuItems();
        }}
      />

      {/* Manage Options Dialog */}
      {selectedItem && (
        <ManageOptionsDialog
          open={isManageOptionsOpen}
          onOpenChange={setIsManageOptionsOpen}
          skuId={selectedItem.id}
          skuName={selectedItem.name}
          onSuccess={() => {
            // Options saved successfully
          }}
        />
      )}
    </div>
  );
}
