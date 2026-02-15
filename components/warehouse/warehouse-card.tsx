'use client';

import { useState } from 'react';
import { Trash2, Edit2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface WarehouseCardProps {
  id: string;
  name: string;
  locationName: string;
  capacity: number | null;
  currentUtilization: number | null;
  isActive: boolean;
  onDelete: (id: string) => void;
  onEdit?: (warehouse: any) => void;
}

export function WarehouseCard({
  id,
  name,
  locationName,
  capacity,
  currentUtilization,
  isActive,
  onDelete,
  onEdit,
}: WarehouseCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const utilizationPercentage = capacity && currentUtilization 
    ? Math.round((currentUtilization / capacity) * 100)
    : 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/warehouse/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to delete warehouse');
      }

      toast.success('Warehouse deleted successfully');
      onDelete(id);
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete warehouse');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{name}</h3>
            <p className="text-sm text-gray-600 mt-1">{locationName}</p>
          </div>
          <div className="flex gap-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit({
                  id,
                  name,
                  locationName,
                  capacity,
                  isActive,
                })}
                className="text-blue-600 hover:bg-blue-50"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isActive
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          {capacity && (
            <div>
              <p className="text-xs text-gray-600 font-medium">Utilization</p>
              <div className="mt-2">
                <p className="text-2xl font-bold text-blue-600">{utilizationPercentage}%</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${utilizationPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Capacity Info */}
        {capacity && (
          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
            <p className="text-xs text-blue-700 font-medium">Capacity: {capacity} units</p>
            {currentUtilization && (
              <p className="text-xs text-blue-600 mt-1">Current Usage: {currentUtilization} units</p>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Warehouse</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
              className="hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Warehouse'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
