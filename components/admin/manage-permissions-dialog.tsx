'use client';

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Shield } from 'lucide-react';

interface Role {
  id: string;
  name: string;
  slug: string;
  rolePermissions: Array<{
    permission: {
      id: string;
      name: string;
      slug: string;
      category: string;
    };
  }>;
}

interface UserPermissionData {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    userRoles: Array<{
      id: string;
      roleId: string;
      orgId: string;
    }>;
  };
  availableRoles: Role[];
}

interface ManagePermissionsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
  orgId: string;
  onSuccess?: () => void;
}

export function ManagePermissionsDialog({
  isOpen,
  onClose,
  userId,
  userName,
  orgId,
  onSuccess,
}: ManagePermissionsDialogProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [data, setData] = useState<UserPermissionData | null>(null);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    fetchPermissionData();
  }, [isOpen, userId]);

  const fetchPermissionData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/users/${userId}/permissions`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error(`API Error: ${response.status}`, errorData);
        throw new Error(errorData.details || `Failed to fetch permissions: ${response.status}`);
      }

      const result = await response.json();
      setData(result);

      // Pre-select current roles for this org
      const currentRoles = result.user.userRoles
        .filter((ur: any) => ur.orgId === orgId)
        .map((ur: any) => ur.roleId);
      setSelectedRoleIds(currentRoles);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load permissions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch(`/api/admin/users/${userId}/permissions`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roleIds: selectedRoleIds,
          orgId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save permissions');
      }

      toast.success(`Permissions updated for ${userName}`);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast.error('Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !data) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Permissions</DialogTitle>
            <DialogDescription>Loading user data...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            <span className="ml-2">Loading permissions...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const groupedRoles = data.availableRoles.reduce(
    (acc, role) => {
      const category = role.slug.split('-')[0];
      if (!acc[category]) acc[category] = [];
      acc[category].push(role);
      return acc;
    },
    {} as Record<string, Role[]>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Permissions</DialogTitle>
          <DialogDescription>
            Edit roles and permissions for <strong>{userName}</strong> ({data.user.email})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Available Roles */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-600" />
              <Label className="text-base font-semibold">Assign Roles</Label>
            </div>

            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              {Object.entries(groupedRoles).map(([category, roles]) => (
                <div key={category}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                    {category} Roles
                  </h4>
                  <div className="space-y-2 ml-2">
                    {roles.map((role) => (
                      <div key={role.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`role-${role.id}`}
                          checked={selectedRoleIds.includes(role.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedRoleIds([...selectedRoleIds, role.id]);
                            } else {
                              setSelectedRoleIds(
                                selectedRoleIds.filter((id) => id !== role.id)
                              );
                            }
                          }}
                        />
                        <Label
                          htmlFor={`role-${role.id}`}
                          className="cursor-pointer font-medium"
                        >
                          {role.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Current Permissions Preview */}
          {selectedRoleIds.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">Resulting Permissions</Label>
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <div className="space-y-2">
                  {Array.from(
                    new Map(
                      selectedRoleIds
                        .flatMap((roleId) => {
                          const role = data.availableRoles.find((r) => r.id === roleId);
                          return role?.rolePermissions.map((rp) => [
                            rp.permission.id,
                            rp.permission,
                          ]) || [];
                        })
                    ).values()
                  ).map((permission: any) => (
                    <div
                      key={permission.id}
                      className="text-sm text-gray-700"
                    >
                      <span className="font-medium">{permission.name}</span>
                      <span className="text-gray-500 ml-2">
                        ({permission.slug})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedRoleIds.length === 0 && (
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <p className="text-sm text-amber-800">
                No roles selected. The user will have no permissions in this organization.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
