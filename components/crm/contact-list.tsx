'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2,
  Search,
  Filter,
  User,
  Building2,
  Truck,
  Star,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Package,
  MessageSquare,
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle,
  Crown,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CustomerDetailModal } from './customer-detail-modal';

const DEFAULT_LIMIT = 12;

type CustomerSegment = 'all' | 'customer' | 'supplier' | 'contractor';
type CustomerStatus = 'all' | 'active' | 'inactive' | 'vip' | 'blocked';
type LoyaltyTier = 'all' | 'bronze' | 'silver' | 'gold' | 'platinum';

interface CustomerSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  segment: string | null;
  loyaltyTier: string;
  status: string;
  lifetimeValue: number;
  lastOrderDate: string | null;
  createdAt: string;
  _count: {
    orders: number;
    interactions: number;
  };
}

interface ContactListProps {
  segment?: CustomerSegment;
  onContactCountChange?: (count: number) => void;
}

const segmentIcons = {
  customer: User,
  supplier: Building2,
  contractor: Truck,
};

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  vip: 'bg-purple-100 text-purple-700',
  blocked: 'bg-red-100 text-red-700',
};

const tierColors: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-700',
  silver: 'bg-slate-100 text-slate-600',
  gold: 'bg-yellow-100 text-yellow-700',
  platinum: 'bg-indigo-100 text-indigo-700',
};

export function ContactList({ segment = 'all', onContactCountChange }: ContactListProps) {
  const [contacts, setContacts] = useState<CustomerSummary[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: DEFAULT_LIMIT, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<CustomerStatus>('all');
  const [tierFilter, setTierFilter] = useState<LoyaltyTier>('all');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    []
  );

  const loadContacts = useCallback(
    async (targetPage: number, query: string, signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('page', String(targetPage));
        params.set('limit', String(DEFAULT_LIMIT));
        
        if (query) params.set('search', query);
        if (segment !== 'all') params.set('segment', segment);
        if (statusFilter !== 'all') params.set('status', statusFilter);
        if (tierFilter !== 'all') params.set('loyaltyTier', tierFilter);

        const response = await fetch(`/api/customers?${params.toString()}`, { signal });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err?.error || 'Failed to load contacts');
        }

        const payload = await response.json();
        setContacts(payload.data ?? []);
        if (typeof payload.meta === 'object') {
          setMeta((prev) => ({ ...prev, ...payload.meta }));
          onContactCountChange?.(payload.meta.total);
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        toast.error((error as Error).message || 'Unable to load contacts');
      } finally {
        setIsLoading(false);
      }
    },
    [segment, statusFilter, tierFilter, onContactCountChange]
  );

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, segment, statusFilter, tierFilter]);

  // Load contacts
  useEffect(() => {
    const controller = new AbortController();
    loadContacts(page, debouncedSearch, controller.signal);
    return () => controller.abort();
  }, [page, debouncedSearch, loadContacts]);

  const handleViewContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setShowDetailModal(true);
  };

  const handleQuickStatusChange = async (contactId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/customers/${contactId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      toast.success(`Status updated to ${newStatus}`);
      loadContacts(page, debouncedSearch);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const getSegmentIcon = (seg: string | null) => {
    const Icon = segmentIcons[(seg || 'customer') as keyof typeof segmentIcons] || User;
    return <Icon className="h-4 w-4" />;
  };

  const getSegmentLabel = (seg: string | null) => {
    switch (seg) {
      case 'supplier':
        return 'Supplier';
      case 'contractor':
        return 'Contractor';
      default:
        return 'Customer';
    }
  };

  const canGoBack = page > 1;
  const canGoForward = page < (meta.totalPages || 1);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, email, phone, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as CustomerStatus)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
            </SelectContent>
          </Select>
          {segment === 'all' || segment === 'customer' ? (
            <Select value={tierFilter} onValueChange={(v) => setTierFilter(v as LoyaltyTier)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="bronze">Bronze</SelectItem>
                <SelectItem value="silver">Silver</SelectItem>
                <SelectItem value="gold">Gold</SelectItem>
                <SelectItem value="platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && contacts.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-dough-brown-500" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No contacts found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          {/* Contact Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleViewContact(contact.id)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-dough-brown-100 rounded-full flex items-center justify-center">
                      {getSegmentIcon(contact.segment)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{contact.name}</h3>
                      <p className="text-xs text-gray-500">{getSegmentLabel(contact.segment)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge className={`${statusColors[contact.status]} text-[10px]`}>
                      {contact.status.toUpperCase()}
                    </Badge>
                    {contact.segment !== 'supplier' && contact.segment !== 'contractor' && (
                      <Badge className={`${tierColors[contact.loyaltyTier]} text-[10px]`}>
                        {contact.loyaltyTier.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-1 text-sm mb-3">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="h-3 w-3" />
                      <span>{contact.phone}</span>
                    </div>
                  )}
                  {contact.city && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="text-xs">📍 {contact.city}</span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {contact._count.orders}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {contact._count.interactions}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-dough-brown-600">
                      {currencyFormatter.format(contact.lifetimeValue || 0)}
                    </p>
                    {contact.lastOrderDate && (
                      <p className="text-[10px] text-gray-400">
                        Last: {format(new Date(contact.lastOrderDate), 'MMM dd')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-1 mt-3 pt-3 border-t border-gray-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-xs h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewContact(contact.id);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                  {contact.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs h-7 text-purple-600 hover:text-purple-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickStatusChange(contact.id, 'vip');
                      }}
                    >
                      <Crown className="h-3 w-3 mr-1" />
                      VIP
                    </Button>
                  )}
                  {contact.status === 'vip' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 text-xs h-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickStatusChange(contact.id, 'active');
                      }}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Button>
                  )}
                  {contact.status !== 'blocked' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 text-red-500 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickStatusChange(contact.id, 'blocked');
                      }}
                    >
                      <Ban className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
            <p>
              Showing {(page - 1) * meta.limit + 1} - {Math.min(page * meta.limit, meta.total)} of{' '}
              {meta.total} contacts
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoBack || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="flex items-center px-3">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={!canGoForward || isLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal */}
      <CustomerDetailModal
        customerId={selectedContactId}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        onUpdate={() => loadContacts(page, debouncedSearch)}
        onDelete={() => loadContacts(page, debouncedSearch)}
      />
    </div>
  );
}
