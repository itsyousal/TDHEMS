'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface AutomationRuleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: any;
  onSuccess?: () => void;
}

const TRIGGER_TYPES = [
  { value: 'order_created', label: 'Order Created', description: 'Triggers when a new order is placed' },
  { value: 'inventory_low', label: 'Low Inventory', description: 'Triggers when inventory falls below threshold' },
  { value: 'schedule', label: 'Scheduled', description: 'Triggers at specified times' },
  { value: 'manual', label: 'Manual', description: 'Manually triggered by user' },
];

const ACTION_TYPES = [
  { value: 'send_email', label: 'Send Email', fields: ['to', 'subject', 'body'] },
  { value: 'send_notification', label: 'Send Notification', fields: ['title', 'message'] },
  { value: 'create_purchase_order', label: 'Create Purchase Order', fields: ['supplierId', 'items'] },
  { value: 'update_inventory', label: 'Update Inventory', fields: ['skuId', 'quantity'] },
  { value: 'webhook', label: 'Call Webhook', fields: ['url', 'method', 'body'] },
];

export function AutomationRuleDialog({ open, onOpenChange, rule, onSuccess }: AutomationRuleDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: rule?.name || '',
    description: rule?.description || '',
    triggerType: rule?.triggerType || '',
    triggerConfig: rule?.triggerConfig || {},
    conditions: rule?.conditions || [],
    isActive: rule?.isActive !== undefined ? rule.isActive : true,
    priority: rule?.priority || 0,
  });
  const [actions, setActions] = useState(rule?.actions || []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const method = rule ? 'PUT' : 'POST';
      const body = {
        ...formData,
        actions: actions.map((action: any) => ({
          type: action.actionType || action.type,
          data: action.actionData || action.data || {},
        })),
        ...(rule ? { id: rule.id } : {}),
      };

      const response = await fetch('/api/automation/rules', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save rule');
      }

      toast.success(rule ? 'Rule updated successfully' : 'Rule created successfully');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving rule:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save rule');
    } finally {
      setLoading(false);
    }
  };

  const addAction = () => {
    setActions([...actions, { type: '', data: {} }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_: any, i: number) => i !== index));
  };

  const updateAction = (index: number, field: string, value: any) => {
    const newActions = [...actions];
    if (field === 'type') {
      newActions[index] = { type: value, data: {} };
    } else {
      newActions[index] = {
        ...newActions[index],
        data: { ...newActions[index].data, [field]: value },
      };
    }
    setActions(newActions);
  };

  const selectedTrigger = TRIGGER_TYPES.find(t => t.value === formData.triggerType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit' : 'Create'} Automation Rule</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Rule Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Low Inventory Alert"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of what this rule does"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  min={0}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">Higher numbers run first</p>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
              </div>
            </div>
          </div>

          {/* Trigger */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3">Trigger</h3>
            <div>
              <Label htmlFor="triggerType">When should this rule run? *</Label>
              <Select
                value={formData.triggerType}
                onValueChange={(value) => setFormData({ ...formData, triggerType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger type" />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((trigger) => (
                    <SelectItem key={trigger.value} value={trigger.value}>
                      <div>
                        <div className="font-medium">{trigger.label}</div>
                        <div className="text-xs text-gray-500">{trigger.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Trigger Config */}
            {formData.triggerType === 'inventory_low' && (
              <div className="mt-3">
                <Label htmlFor="threshold">Threshold Quantity</Label>
                <Input
                  id="threshold"
                  type="number"
                  value={(formData.triggerConfig as any).threshold || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    triggerConfig: { ...formData.triggerConfig, threshold: parseInt(e.target.value) }
                  })}
                  placeholder="10"
                />
              </div>
            )}

            {formData.triggerType === 'schedule' && (
              <div className="mt-3">
                <Label htmlFor="cron">Schedule (Cron Expression)</Label>
                <Input
                  id="cron"
                  value={(formData.triggerConfig as any).cron || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    triggerConfig: { ...formData.triggerConfig, cron: e.target.value }
                  })}
                  placeholder="0 9 * * *"
                />
                <p className="text-xs text-gray-500 mt-1">e.g., "0 9 * * *" runs daily at 9 AM</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Actions</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAction}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Action
              </Button>
            </div>

            {actions.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <p className="text-gray-500">No actions configured</p>
                <p className="text-xs text-gray-400 mt-1">Click "Add Action" to define what happens when this rule triggers</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actions.map((action: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between mb-3">
                      <Label>Action {index + 1}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAction(index)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <Select
                      value={action.actionType || action.type}
                      onValueChange={(value) => updateAction(index, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select action type" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACTION_TYPES.map((actionType) => (
                          <SelectItem key={actionType.value} value={actionType.value}>
                            {actionType.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Action-specific fields */}
                    {(action.actionType || action.type) === 'send_email' && (
                      <div className="space-y-2 mt-3">
                        <Input
                          placeholder="To email address"
                          value={(action.actionData || action.data)?.to || ''}
                          onChange={(e) => updateAction(index, 'to', e.target.value)}
                        />
                        <Input
                          placeholder="Email subject"
                          value={(action.actionData || action.data)?.subject || ''}
                          onChange={(e) => updateAction(index, 'subject', e.target.value)}
                        />
                        <Input
                          placeholder="Email body"
                          value={(action.actionData || action.data)?.body || ''}
                          onChange={(e) => updateAction(index, 'body', e.target.value)}
                        />
                      </div>
                    )}

                    {(action.actionType || action.type) === 'send_notification' && (
                      <div className="space-y-2 mt-3">
                        <Input
                          placeholder="Notification title"
                          value={(action.actionData || action.data)?.title || ''}
                          onChange={(e) => updateAction(index, 'title', e.target.value)}
                        />
                        <Input
                          placeholder="Notification message"
                          value={(action.actionData || action.data)?.message || ''}
                          onChange={(e) => updateAction(index, 'message', e.target.value)}
                        />
                      </div>
                    )}

                    {(action.actionType || action.type) === 'webhook' && (
                      <div className="space-y-2 mt-3">
                        <Input
                          placeholder="Webhook URL"
                          value={(action.actionData || action.data)?.url || ''}
                          onChange={(e) => updateAction(index, 'url', e.target.value)}
                        />
                        <Select
                          value={(action.actionData || action.data)?.method || 'POST'}
                          onValueChange={(value) => updateAction(index, 'method', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="GET">GET</SelectItem>
                            <SelectItem value="POST">POST</SelectItem>
                            <SelectItem value="PUT">PUT</SelectItem>
                            <SelectItem value="DELETE">DELETE</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.name || !formData.triggerType}>
              {loading ? 'Saving...' : rule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
