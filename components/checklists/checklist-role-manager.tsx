'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Settings,
  Users,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Save,
  X,
  AlertCircle,
  Info,
} from 'lucide-react';

// All available roles - these must match the role slugs in the database
const AVAILABLE_ROLES = [
  { slug: 'owner-super-admin', name: 'Owner / Super Admin', description: 'Full system access' },
  { slug: 'general-manager', name: 'General Manager', description: 'Overall operations management' },
  { slug: 'store-manager', name: 'Store Manager', description: 'Store-level management' },
  { slug: 'production-manager', name: 'Production Manager', description: 'Production oversight' },
  { slug: 'warehouse-lead', name: 'Warehouse Lead', description: 'Warehouse operations lead' },
  { slug: 'kitchen-assistant-cooks', name: 'Kitchen / Cooks', description: 'Kitchen staff and cooks' },
  { slug: 'pos-operator', name: 'POS / Cashier', description: 'Point of sale operators' },
  { slug: 'packers-warehouse-staff', name: 'Warehouse Staff', description: 'Packers and warehouse workers' },
  { slug: 'logistics-coordinator', name: 'Logistics', description: 'Logistics coordination' },
  { slug: 'finance-accountant', name: 'Finance', description: 'Finance and accounting' },
  { slug: 'hr-people-ops', name: 'HR / People Ops', description: 'Human resources' },
  { slug: 'qa-food-safety-officer', name: 'QA / Food Safety', description: 'Quality assurance' },
  { slug: 'marketing-manager', name: 'Marketing', description: 'Marketing team' },
  { slug: 'procurement-buyer', name: 'Procurement', description: 'Procurement and buying' },
  { slug: 'customer-support', name: 'Customer Support', description: 'Customer service' },
];

interface ChecklistItem {
  id: string;
  title: string;
  description?: string | null;
  order: number;
  isRequired: boolean;
  roles: string[];
}

interface Checklist {
  id: string;
  name: string;
  description?: string | null;
  frequency: string;
  roles: string[];
  items: ChecklistItem[];
}

interface ChecklistRoleManagerProps {
  checklist: Checklist;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function ChecklistRoleManager({
  checklist,
  open,
  onOpenChange,
  onSave,
}: ChecklistRoleManagerProps) {
  // State for checklist-level roles
  const [checklistRoles, setChecklistRoles] = useState<string[]>(checklist.roles || []);
  // State for item-level roles
  const [itemRoles, setItemRoles] = useState<Record<string, string[]>>({});
  // Track expanded items
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize item roles from checklist
  useEffect(() => {
    const initialItemRoles: Record<string, string[]> = {};
    checklist.items?.forEach((item) => {
      initialItemRoles[item.id] = item.roles || [];
    });
    setItemRoles(initialItemRoles);
    setChecklistRoles(checklist.roles || []);
    setHasChanges(false);
  }, [checklist]);

  // Toggle checklist-level role
  const toggleChecklistRole = useCallback((roleSlug: string) => {
    setChecklistRoles((prev) => {
      const newRoles = prev.includes(roleSlug)
        ? prev.filter((r) => r !== roleSlug)
        : [...prev, roleSlug];
      return newRoles;
    });
    setHasChanges(true);
  }, []);

  // Toggle item-level role
  const toggleItemRole = useCallback((itemId: string, roleSlug: string) => {
    setItemRoles((prev) => {
      const currentRoles = prev[itemId] || [];
      const newRoles = currentRoles.includes(roleSlug)
        ? currentRoles.filter((r) => r !== roleSlug)
        : [...currentRoles, roleSlug];
      return { ...prev, [itemId]: newRoles };
    });
    setHasChanges(true);
  }, []);

  // Apply checklist roles to all items
  const applyToAllItems = useCallback(() => {
    const newItemRoles: Record<string, string[]> = {};
    checklist.items?.forEach((item) => {
      newItemRoles[item.id] = [...checklistRoles];
    });
    setItemRoles(newItemRoles);
    setHasChanges(true);
    toast.success('Applied checklist roles to all items');
  }, [checklist.items, checklistRoles]);

  // Clear all item-specific roles (inherit from checklist)
  const clearItemRoles = useCallback(() => {
    const clearedRoles: Record<string, string[]> = {};
    checklist.items?.forEach((item) => {
      clearedRoles[item.id] = [];
    });
    setItemRoles(clearedRoles);
    setHasChanges(true);
    toast.success('Cleared item-specific roles (will inherit from checklist)');
  }, [checklist.items]);

  // Toggle item expansion
  const toggleItemExpansion = useCallback((itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Save changes
  const handleSave = async () => {
    setSaving(true);
    try {
      // Build items array with updated roles
      const updatedItems = checklist.items?.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        order: item.order,
        isRequired: item.isRequired,
        roles: itemRoles[item.id] || [],
      }));

      const res = await fetch(`/api/checklists/${checklist.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roles: checklistRoles,
          items: updatedItems,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save roles');
      }

      toast.success('Roles updated successfully');
      setHasChanges(false);
      onSave();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save roles');
    } finally {
      setSaving(false);
    }
  };

  // Get role display info
  const getRoleInfo = (slug: string) => {
    return AVAILABLE_ROLES.find((r) => r.slug === slug) || { slug, name: slug, description: '' };
  };

  // Calculate effective roles for an item (item roles or inherited from checklist)
  const getEffectiveRoles = (itemId: string): { roles: string[]; inherited: boolean } => {
    const itemSpecificRoles = itemRoles[itemId] || [];
    if (itemSpecificRoles.length > 0) {
      return { roles: itemSpecificRoles, inherited: false };
    }
    return { roles: checklistRoles, inherited: true };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-lg sm:text-xl">
            <div className="p-2 rounded-full bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <span className="truncate">Manage Roles - {checklist.name}</span>
          </DialogTitle>
          <DialogDescription className="text-sm">
            Assign which roles can view and execute this checklist and its tasks.
            Items without specific roles will inherit from the checklist.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 py-4">
          {/* Checklist-Level Roles */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-gray-50/50 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-primary" />
                    Checklist Roles
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    Default roles for the entire checklist (inherited by items without specific roles)
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applyToAllItems}
                  disabled={checklistRoles.length === 0}
                  className="w-full sm:w-auto shrink-0"
                >
                  Apply to All Items
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {AVAILABLE_ROLES.map((role, idx) => (
                  <div
                    key={role.slug}
                    className={`flex items-start space-x-3 p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer touch-manipulation animate-in ${
                      checklistRoles.includes(role.slug)
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                    }`}
                    style={{ animationDelay: `${idx * 0.02}s` }}
                    onClick={() => toggleChecklistRole(role.slug)}
                  >
                    <Checkbox
                      id={`checklist-role-${role.slug}`}
                      checked={checklistRoles.includes(role.slug)}
                      onCheckedChange={() => toggleChecklistRole(role.slug)}
                      className="mt-0.5 h-5 w-5"
                    />
                    <div className="flex-1 min-w-0">
                      <Label
                        htmlFor={`checklist-role-${role.slug}`}
                        className="text-sm font-medium cursor-pointer"
                      >
                        {role.name}
                      </Label>
                      <p className="text-xs text-muted-foreground truncate">{role.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              {checklistRoles.length === 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>No roles selected - all users with permission can view this checklist</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Item-Level Roles */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-3 bg-gray-50/50 border-b">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Task-Specific Roles
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm mt-1">
                    Override roles for specific tasks. Empty = inherit from checklist.
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearItemRoles}
                  className="w-full sm:w-auto shrink-0"
                >
                  Clear All Item Roles
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-2">
              {checklist.items?.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                    <ListChecks className="h-6 w-6 opacity-50" />
                  </div>
                  <p>No tasks in this checklist</p>
                </div>
              ) : (
                checklist.items?.map((item, idx) => {
                  const isExpanded = expandedItems.has(item.id);
                  const { roles: effectiveRoles, inherited } = getEffectiveRoles(item.id);
                  const itemSpecificRoles = itemRoles[item.id] || [];

                  return (
                    <div
                      key={item.id}
                      className="border rounded-xl overflow-hidden transition-all duration-200 hover:shadow-sm animate-in"
                      style={{ animationDelay: `${idx * 0.03}s` }}
                    >
                      {/* Item Header */}
                      <div
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 cursor-pointer hover:bg-accent/50 transition-colors touch-manipulation"
                        onClick={() => toggleItemExpansion(item.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <span className="text-muted-foreground text-sm font-medium">{idx + 1}.</span>
                          <span className="font-medium truncate">{item.title}</span>
                          {item.isRequired && (
                            <Badge variant="secondary" className="text-xs shrink-0">
                              Required
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap sm:ml-auto pl-6 sm:pl-0">
                          {inherited ? (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground bg-gray-100 px-2 py-1 rounded-full">
                              <Info className="h-3 w-3" />
                              <span>Inherited</span>
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                              Custom
                            </Badge>
                          )}
                          {effectiveRoles.slice(0, 2).map((roleSlug) => (
                            <Badge
                              key={roleSlug}
                              variant={inherited ? 'secondary' : 'default'}
                              className="text-xs"
                            >
                              {getRoleInfo(roleSlug).name}
                            </Badge>
                          ))}
                          {effectiveRoles.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{effectiveRoles.length - 2}
                            </Badge>
                          )}
                          {effectiveRoles.length === 0 && (
                            <span className="text-xs text-muted-foreground">All roles</span>
                          )}
                        </div>
                      </div>

                      {/* Expanded Role Selection */}
                      <div className={`overflow-hidden transition-all duration-300 ease-out ${
                        isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                      }`}>
                        <div className="border-t bg-gradient-to-b from-gray-50 to-white p-3 sm:p-4">
                          {item.description && (
                            <p className="text-sm text-muted-foreground mb-3 p-2 bg-gray-50 rounded-lg">{item.description}</p>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {AVAILABLE_ROLES.map((role) => (
                              <div
                                key={role.slug}
                                className={`flex items-center space-x-2 p-2.5 rounded-lg border-2 transition-all duration-200 cursor-pointer touch-manipulation ${
                                  itemSpecificRoles.includes(role.slug)
                                    ? 'border-primary bg-primary/5'
                                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50'
                                }`}
                                onClick={() => toggleItemRole(item.id, role.slug)}
                              >
                                <Checkbox
                                  id={`item-${item.id}-role-${role.slug}`}
                                  checked={itemSpecificRoles.includes(role.slug)}
                                  onCheckedChange={() => toggleItemRole(item.id, role.slug)}
                                  className="h-5 w-5"
                                />
                                <Label
                                  htmlFor={`item-${item.id}-role-${role.slug}`}
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  {role.name}
                                </Label>
                              </div>
                            ))}
                          </div>
                          {itemSpecificRoles.length === 0 && (
                            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1 p-2 bg-blue-50 text-blue-600 rounded-lg">
                              <Info className="h-3 w-3 shrink-0" />
                              <span>No roles selected - inheriting from checklist ({checklistRoles.length > 0 ? checklistRoles.map(r => getRoleInfo(r).name).join(', ') : 'All roles'})</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-4 border-t">
          <div className="text-sm text-muted-foreground w-full sm:w-auto text-center sm:text-left">
            {hasChanges && (
              <span className="flex items-center justify-center sm:justify-start gap-1 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                <AlertCircle className="h-4 w-4" />
                Unsaved changes
              </span>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              disabled={saving}
              className="flex-1 sm:flex-none"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving || !hasChanges}
              className="flex-1 sm:flex-none"
            >
              {saving ? (
                <>
                  <Save className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
