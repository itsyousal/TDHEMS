'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Settings, Trash2, Power, PowerOff, Clock, Zap, TrendingUp, CheckCircle2 } from 'lucide-react';
import { AutomationRuleDialog } from '@/components/automation/automation-rule-dialog';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

export default function AutomationPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState({
    activeRules: 0,
    workflows: 0,
    executionsToday: 0,
    successRate: '0%',
  });
  const [rules, setRules] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<any>(null);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, rulesRes, executionsRes] = await Promise.all([
        fetch('/api/automation/stats'),
        fetch('/api/automation/rules'),
        fetch('/api/automation/executions?limit=10'),
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setRules(rulesData.rules || []);
      }

      if (executionsRes.ok) {
        const executionsData = await executionsRes.json();
        setExecutions(executionsData.executions || []);
      }
    } catch (error) {
      console.error('Error fetching automation data:', error);
      toast.error('Failed to load automation data');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (rule: any) => {
    try {
      const response = await fetch('/api/automation/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rule.id,
          isActive: !rule.isActive,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update rule');
      }

      toast.success(`Rule ${rule.isActive ? 'disabled' : 'enabled'}`);
      fetchData();
    } catch (error) {
      console.error('Error toggling rule:', error);
      toast.error('Failed to update rule');
    }
  };

  const handleDelete = async (rule: any) => {
    if (!confirm(`Are you sure you want to delete "${rule.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/automation/rules?id=${rule.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      toast.success('Rule deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  const handleEdit = (rule: any) => {
    setSelectedRule(rule);
    setIsDialogOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedRule(null);
    setIsDialogOpen(true);
  };

  const getTriggerLabel = (triggerType: string) => {
    const labels: Record<string, string> = {
      order_created: 'Order Created',
      inventory_low: 'Low Inventory',
      schedule: 'Scheduled',
      manual: 'Manual',
    };
    return labels[triggerType] || triggerType;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <AutomationSkeleton />;
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Automation</h1>
          <p className="text-sm text-gray-600 mt-1">Workflow automation and rules engine</p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Active Rules</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.activeRules}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <Power className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Total Workflows</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.workflows}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Zap className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Executions Today</h3>
              <p className="text-3xl font-bold text-purple-600 mt-2">{stats.executionsToday}</p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Clock className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-600">Success Rate</h3>
              <p className="text-3xl font-bold text-amber-600 mt-2">{stats.successRate}</p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Automation Rules</h2>
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">No automation rules configured</p>
              <p className="text-gray-400 text-sm mt-2">Click "Create Rule" to build your first automation</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{rule.name}</p>
                        <Badge variant={rule.isActive ? 'default' : 'secondary'} className="text-xs">
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {rule.description && (
                        <p className="text-xs text-gray-600 mt-1">{rule.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {getTriggerLabel(rule.triggerType)}
                        </span>
                        <span>{rule.actions?.length || 0} action{rule.actions?.length !== 1 ? 's' : ''}</span>
                        {rule._count?.executions > 0 && (
                          <span>{rule._count.executions} run{rule._count.executions !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(rule)}
                        title={rule.isActive ? 'Disable' : 'Enable'}
                      >
                        {rule.isActive ? (
                          <Power className="w-4 h-4 text-green-600" />
                        ) : (
                          <PowerOff className="w-4 h-4 text-gray-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(rule)}
                        title="Edit"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rule)}
                        className="text-red-600 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Recent Executions</h2>
          {executions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">No execution history</p>
              <p className="text-gray-400 text-sm mt-2">Automation execution logs will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map((exec) => (
                <div key={exec.id} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{exec.rule?.name || 'Unknown Rule'}</p>
                      {exec.error && (
                        <p className="text-xs text-red-600 mt-1">{exec.error}</p>
                      )}
                    </div>
                    <Badge
                      variant={
                        exec.status === 'success' ? 'default' :
                        exec.status === 'failed' ? 'destructive' :
                        'secondary'
                      }
                      className="text-xs"
                    >
                      {exec.status === 'success' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {exec.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{formatDate(exec.createdAt)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AutomationRuleDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        rule={selectedRule}
        onSuccess={() => {
          fetchData();
          setSelectedRule(null);
        }}
      />
    </>
  );
}

function AutomationSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-64 bg-gray-200 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
