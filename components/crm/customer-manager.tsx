'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const DEFAULT_LIMIT = 12;

type CustomerSummary = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  loyaltyTier: string;
  status: string;
  lifetimeValue: number;
  lastOrderDate: string | null;
};

export default function CRMCustomerManager() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [meta, setMeta] = useState({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState({ name: '', email: '', phone: '' });

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const loadCustomers = useCallback(
    async (targetPage: number, query: string, signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(targetPage));
        params.set('limit', String(DEFAULT_LIMIT));
        if (query) {
          params.set('search', query);
        }

        const response = await fetch(`/api/customers?${params.toString()}`, { signal });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error || 'Failed to load customers');
        }

        const payload = await response.json();
        setCustomers(payload.data ?? []);
        if (typeof payload.meta === 'object') {
          setMeta((prev) => ({ ...prev, ...payload.meta }));
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }
        toast.error((error as Error).message || 'Unable to load customers');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    loadCustomers(page, debouncedSearch, controller.signal);
    return () => controller.abort();
  }, [page, debouncedSearch, loadCustomers]);

  const handleCreateCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!formState.name.trim()) {
      toast.error('Name is required');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formState.name.trim(),
          email: formState.email.trim() || undefined,
          phone: formState.phone.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || 'Unable to save customer');
      }

      const created: CustomerSummary = await response.json();
      toast.success(`${created.name} saved`);
      setFormState({ name: '', email: '', phone: '' });
      setSelectedCustomer(created);
      setSearchTerm(created.name);
    } catch (error) {
      toast.error((error as Error).message || 'Unable to save customer');
    } finally {
      setIsSaving(false);
    }
  };

  const canGoBack = page > 1;
  const canGoForward = page < (meta.totalPages || 1);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
            <p className="text-sm text-gray-500">Search across your organization&apos;s CRM records</p>
          </div>
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-dough-brown-500" />}
        </div>

        <div className="mt-4">
          <Input
            placeholder="Search by name, email, or phone"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-2 py-3">Name</th>
                <th className="px-2 py-3">Contact</th>
                <th className="px-2 py-3">Tier</th>
                <th className="px-2 py-3">Lifetime</th>
                <th className="px-2 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {customers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer)}
                  className={`border-t border-gray-100 transition-colors hover:bg-gray-50 ${
                    selectedCustomer?.id === customer.id ? 'bg-dough-brown-50' : ''
                  }`}
                >
                  <td className="px-2 py-3 font-medium text-gray-900">{customer.name}</td>
                  <td className="px-2 py-3 text-xs text-gray-600">
                    {customer.email || customer.phone || '—'}
                    {customer.lastOrderDate && (
                      <div className="text-[11px] text-gray-400">Last order {new Date(customer.lastOrderDate).toLocaleDateString()}</div>
                    )}
                  </td>
                  <td className="px-2 py-3 uppercase tracking-wide text-xs text-dough-brown-600">{customer.loyaltyTier}</td>
                  <td className="px-2 py-3 text-gray-900">{currencyFormatter.format(customer.lifetimeValue || 0)}</td>
                  <td className="px-2 py-3 text-xs text-gray-500">{customer.status}</td>
                </tr>
              ))}
              {!isLoading && customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-gray-500">
                    No customers found for this search
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <p>
            Showing page {meta.page} of {meta.totalPages} · {meta.total} record{meta.total === 1 ? '' : 's'}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!canGoBack} onClick={() => canGoBack && setPage((prev) => Math.max(1, prev - 1))}>
              Prev
            </Button>
            <Button variant="outline" size="sm" disabled={!canGoForward} onClick={() => canGoForward && setPage((prev) => prev + 1)}>
              Next
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-dashed border-gray-200 p-6 bg-dough-brown-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-dough-brown-900">Selected customer</h3>
            <p className="text-xs text-dough-brown-600">Tap a row to view a quick summary</p>
          </div>
          {selectedCustomer && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)}>
              Clear
            </Button>
          )}
        </div>

        <div className="mt-4 min-h-[72px]">
          {selectedCustomer ? (
            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
              <div className="flex-auto rounded-lg border border-dough-brown-200 bg-white px-3 py-2">
                <p className="text-sm font-medium text-gray-900">{selectedCustomer.name}</p>
                <p className="text-xs text-gray-500">
                  {selectedCustomer.email || 'No email'} · {selectedCustomer.phone || 'No phone'}
                </p>
              </div>
              <div className="rounded-full border border-dough-brown-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase text-dough-brown-600">
                {selectedCustomer.loyaltyTier}
              </div>
              <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-600">
                {currencyFormatter.format(selectedCustomer.lifetimeValue || 0)} lifetime
              </div>
              <div className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold text-gray-600">
                {selectedCustomer.status}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Select a customer to see recent activity and status.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 p-6 bg-white shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Add a customer</h3>
        <p className="text-sm text-gray-500">New customers will be available for orders immediately.</p>

        <form className="mt-4 space-y-3" onSubmit={handleCreateCustomer}>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Name</label>
            <Input
              required
              placeholder="Full name"
              value={formState.name}
              onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Email</label>
            <Input
              placeholder="email@example.com"
              value={formState.email}
              onChange={(event) => setFormState((prev) => ({ ...prev, email: event.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500">Phone</label>
            <Input
              placeholder="+1 (555) 123-4567"
              value={formState.phone}
              onChange={(event) => setFormState((prev) => ({ ...prev, phone: event.target.value }))}
            />
          </div>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Create customer'}
          </Button>
        </form>
      </div>
    </div>
  );
}
