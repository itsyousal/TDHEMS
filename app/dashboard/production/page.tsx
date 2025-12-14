'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Factory,
  Package,
  AlertCircle,
  BarChart3,
  PlusCircle,
  ClipboardList,
  Loader2,
  Activity,
  Clock,
  Flag,
} from 'lucide-react';

interface ProductionStats {
  activeBatches: number;
  completedToday: number;
  delayedBatches: number;
  productionRate: number;
}

interface ProductionBatch {
  id: string;
  product: string;
  qty: string;
  status: string;
  start: string;
  end: string;
  priority?: 'Normal' | 'Expedite' | 'Critical';
}

type BatchFilter = 'all' | 'active' | 'completed' | 'delayed';

type FormState = {
  product: string;
  qty: string;
  targetDate: string;
  priority: 'Normal' | 'Expedite' | 'Critical';
  notes: string;
};

export default function ProductionPage() {
  const [stats, setStats] = useState<ProductionStats>({
    activeBatches: 0,
    completedToday: 0,
    delayedBatches: 0,
    productionRate: 0,
  });
  const [batches, setBatches] = useState<ProductionBatch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [filter, setFilter] = useState<BatchFilter>('all');
  const [formState, setFormState] = useState<FormState>({
    product: '',
    qty: '',
    targetDate: '',
    priority: 'Normal',
    notes: '',
  });
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success'>('idle');
  const [formError, setFormError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, batchesRes] = await Promise.all([
        fetch('/api/production/stats'),
        fetch('/api/production'),
      ]);

      if (!statsRes.ok || !batchesRes.ok) {
        throw new Error('Failed to load production data.');
      }

      setStats(await statsRes.json());
      setBatches(await batchesRes.json());
      setGlobalError(null);
    } catch (error) {
      console.error(error);
      setGlobalError('Unable to load production telemetry. Check the connection and try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const filteredBatches = useMemo(() => {
    if (filter === 'all') return batches;
    if (filter === 'active') return batches.filter((batch) => batch.status !== 'Completed' && batch.status !== 'Delayed');
    if (filter === 'completed') return batches.filter((batch) => batch.status === 'Completed');
    return batches.filter((batch) => batch.status === 'Delayed');
  }, [batches, filter]);

  const handleFormChange = (field: keyof FormState, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.product.trim() || !formState.qty.trim()) {
      setFormError('Product name and planned quantity are required.');
      return;
    }

    const quantity = Number(formState.qty);
    if (Number.isNaN(quantity) || quantity <= 0) {
      setFormError('Quantity must be a positive number.');
      return;
    }

    setFormError(null);
    setFormStatus('submitting');

    try {
      const response = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: formState.product.trim(),
          quantity,
          targetDate: formState.targetDate || null,
          priority: formState.priority,
          notes: formState.notes.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Create batch failed');
      }

      setFormStatus('success');
      setNotification({ message: 'New batch queued successfully.', type: 'success' });
      setFormState({ product: '', qty: '', targetDate: '', priority: 'Normal', notes: '' });
      await refreshData();

      window.setTimeout(() => setFormStatus('idle'), 1200);
    } catch (error) {
      console.error(error);
      setFormStatus('idle');
      setNotification({ message: 'Unable to schedule the batch right now. Please try again.', type: 'error' });
    }
  };

  const handleBatchAction = async (batchId: string, action: 'start' | 'complete' | 'delay') => {
    if (actionLoading) return;
    setActionLoading(batchId);
    try {
      const response = await fetch(`/api/production/${batchId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        throw new Error('Action failed');
      }

      const actionMessages: Record<string, string> = {
        start: `Batch ${batchId} started.`,
        complete: `Batch ${batchId} completed. Inventory has been updated with finished goods.`,
        delay: `Batch ${batchId} marked as delayed.`,
      };

      setNotification({ message: actionMessages[action], type: 'success' });
      await refreshData();
    } catch (error) {
      console.error(error);
      setNotification({ message: 'Unable to update batch status right now.', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const badgeForStatus = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'Delayed':
        return 'bg-orange-100 text-orange-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-600">Loading production data...</div>;
  }

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Production</h1>
            <p className="text-sm text-gray-600 mt-1">Manage batches, priorities, and throughput metrics.</p>
          </div>
          <button
            type="button"
            onClick={refreshData}
            disabled={isRefreshing}
            className="px-4 py-2 rounded-md border border-gray-200 bg-white text-sm font-medium text-gray-700 shadow-sm transition hover:border-dough-brown-500 disabled:opacity-60"
          >
            {isRefreshing ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Refreshing
              </span>
            ) : (
              'Refresh'
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Batches</p>
              <p className="text-3xl font-bold text-dough-brown-600 mt-2">{stats.activeBatches}</p>
            </div>
            <Factory className="w-10 h-10 text-dough-brown-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed Today</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.completedToday}</p>
            </div>
            <Package className="w-10 h-10 text-green-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Delayed Batches</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.delayedBatches}</p>
            </div>
            <AlertCircle className="w-10 h-10 text-orange-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Production Rate</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.productionRate}%</p>
            </div>
            <BarChart3 className="w-10 h-10 text-blue-200" />
          </div>
        </div>
      </div>

      {globalError && (
        <div role="alert" className="mb-4 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {globalError}
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-gray-600">
            <Activity className="h-4 w-4" />
            Live batches
          </div>
          <div className="flex items-center gap-3 text-sm">
            {(['all', 'active', 'completed', 'delayed'] as BatchFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${filter === option ? 'bg-dough-brown-500 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setFilter(option)}
              >
                {option === 'all' && 'All'}
                {option === 'active' && 'In Progress'}
                {option === 'completed' && 'Completed'}
                {option === 'delayed' && 'Delayed'}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Start</th>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500">
                    No production batches match this filter.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => (
                  <tr key={batch.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">#{batch.id}</td>
                    <td className="py-3 px-4 text-gray-600">{batch.product}</td>
                    <td className="py-3 px-4 text-gray-600">{batch.qty}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeForStatus(batch.status)}`}>
                        {batch.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{batch.start}</td>
                    <td className="py-3 px-4 text-gray-600">{batch.end}</td>
                    <td className="py-3 px-4 text-gray-600">{batch.priority ?? 'Normal'}</td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={batch.status === 'Completed' || actionLoading === batch.id}
                          onClick={() => handleBatchAction(batch.id, 'start')}
                          className="inline-flex items-center gap-1 rounded-md border border-dough-brown-400 px-2 py-1 text-xs font-medium text-dough-brown-700 disabled:opacity-60"
                        >
                          Start
                        </button>
                        <button
                          type="button"
                          disabled={batch.status === 'Completed' || actionLoading === batch.id}
                          onClick={() => handleBatchAction(batch.id, 'complete')}
                          className="inline-flex items-center gap-1 rounded-md border border-green-400 px-2 py-1 text-xs font-medium text-green-700 disabled:opacity-60"
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          disabled={batch.status === 'Delayed' || actionLoading === batch.id}
                          onClick={() => handleBatchAction(batch.id, 'delay')}
                          className="inline-flex items-center gap-1 rounded-md border border-orange-400 px-2 py-1 text-xs font-medium text-orange-700 disabled:opacity-60"
                        >
                          Delay
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
            <PlusCircle className="h-4 w-4" />
            Schedule a new batch
          </div>

          <div className="mt-4 grid gap-4">
            <div>
              <label htmlFor="production-product" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                Product name
              </label>
              <input
                id="production-product"
                type="text"
                value={formState.product}
                onChange={(event) => handleFormChange('product', event.target.value)}
                className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                placeholder="e.g., Sourdough loaf"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="production-quantity" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Quantity
                </label>
                <input
                  id="production-quantity"
                  type="number"
                  min={1}
                  value={formState.qty}
                  onChange={(event) => handleFormChange('qty', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                  placeholder="120"
                />
              </div>
              <div>
                <label htmlFor="production-target" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Target completion
                </label>
                <input
                  id="production-target"
                  type="date"
                  value={formState.targetDate}
                  onChange={(event) => handleFormChange('targetDate', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="production-priority" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Priority
                </label>
                <select
                  id="production-priority"
                  value={formState.priority}
                  onChange={(event) => handleFormChange('priority', event.target.value as FormState['priority'])}
                  className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                >
                  <option>Normal</option>
                  <option>Expedite</option>
                  <option>Critical</option>
                </select>
              </div>
              <div>
                <label htmlFor="production-notes" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Notes
                </label>
                <input
                  id="production-notes"
                  type="text"
                  value={formState.notes}
                  onChange={(event) => handleFormChange('notes', event.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                  placeholder="Any special handling or shipment requirements."
                />
              </div>
            </div>

            {formError && <p className="text-xs text-red-600">{formError}</p>}

            <button
              type="submit"
              disabled={formStatus === 'submitting'}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-dough-brown-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-dough-brown-600 disabled:opacity-60"
            >
              {formStatus === 'submitting' ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Scheduling
                </span>
              ) : (
                'Schedule batch'
              )}
            </button>
          </div>
        </form>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
            <ClipboardList className="h-4 w-4" />
            Workflow intelligence
          </div>
          <p className="mt-3 text-sm text-gray-600">
            Use this dashboard to keep the floor team focused: prioritize expedite batches, flag delays, and document capacity notes so the planning team has a single source of truth.
          </p>
          <ul className="mt-4 space-y-3 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <Flag className="h-4 w-4 text-dough-brown-500 mt-0.5" />
              <span>Updates sync with crew ops in under 5 seconds, so shift leads can react to delays.</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-blue-500 mt-0.5" />
              <span>Target dates keep the prep and finishing teams aligned. Push them only with checked-in approval.</span>
            </li>
            <li className="flex items-start gap-2">
              <Package className="h-4 w-4 text-green-500 mt-0.5" />
              <span>Completed batches drop into fulfillment once QA signs off.</span>
            </li>
          </ul>
        </div>
      </div>

      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-md px-4 py-3 text-sm ${
            notification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}
        >
          {notification.message}
        </div>
      )}
    </>
  );
}
