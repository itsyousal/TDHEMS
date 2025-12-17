'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Loader2,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  MessageSquare,
  Package,
  Edit2,
  Trash2,
  Star,
  Building2,
  User,
  Truck,
  History,
  Plus,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CustomerDetailModalProps {
  customerId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
  onDelete?: () => void;
}

interface CustomerDetail {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  segment: string | null;
  loyaltyTier: string;
  status: string;
  lifetimeValue: number;
  lastOrderDate: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    totalAmount: number;
    netAmount: number;
    createdAt: string;
  }>;
  interactions: Array<{
    id: string;
    type: string;
    subject: string | null;
    notes: string | null;
    outcome: string | null;
    createdAt: string;
  }>;
  loyalty: {
    points: number;
    redeemedPoints: number;
    balancePoints: number;
    tier: string;
  } | null;
  _count: {
    orders: number;
    interactions: number;
    invoices: number;
  };
}

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

const interactionTypeIcons: Record<string, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  complaint: <MessageSquare className="h-4 w-4 text-red-500" />,
  feedback: <Star className="h-4 w-4 text-yellow-500" />,
  purchase: <Package className="h-4 w-4 text-green-500" />,
  return: <Package className="h-4 w-4 text-orange-500" />,
  meeting: <Calendar className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
};

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function CustomerDetailModal({
  customerId,
  open,
  onOpenChange,
  onUpdate,
  onDelete,
}: CustomerDetailModalProps) {
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'interactions'>('overview');
  const [editData, setEditData] = useState<Record<string, string>>({});

  // Add interaction state
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [interactionData, setInteractionData] = useState({
    type: 'note',
    subject: '',
    notes: '',
    outcome: '',
  });
  const [isSavingInteraction, setIsSavingInteraction] = useState(false);

  const loadCustomer = useCallback(async () => {
    if (!customerId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/customers/${customerId}`);
      if (!response.ok) {
        throw new Error('Failed to load customer');
      }
      const data = await response.json();
      setCustomer(data);
      setEditData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        postalCode: data.postalCode || '',
        country: data.country || '',
        status: data.status || 'active',
        loyaltyTier: data.loyaltyTier || 'bronze',
      });
    } catch (error) {
      toast.error('Failed to load customer details');
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, onOpenChange]);

  useEffect(() => {
    if (open && customerId) {
      loadCustomer();
      setActiveTab('overview');
      setIsEditing(false);
    }
  }, [open, customerId, loadCustomer]);

  const handleSave = async () => {
    if (!customerId) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update customer');
      }

      toast.success('Customer updated successfully');
      setIsEditing(false);
      loadCustomer();
      onUpdate?.();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!customerId || !customer) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${customer.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to delete customer');
      }

      toast.success('Customer deleted successfully');
      onOpenChange(false);
      onDelete?.();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddInteraction = async () => {
    if (!customerId) return;

    setIsSavingInteraction(true);
    try {
      const response = await fetch('/api/crm/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          ...interactionData,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to add interaction');
      }

      toast.success('Interaction logged successfully');
      setShowAddInteraction(false);
      setInteractionData({ type: 'note', subject: '', notes: '', outcome: '' });
      loadCustomer();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsSavingInteraction(false);
    }
  };

  const getSegmentIcon = () => {
    switch (customer?.segment) {
      case 'supplier':
        return <Building2 className="h-5 w-5" />;
      case 'contractor':
        return <Truck className="h-5 w-5" />;
      default:
        return <User className="h-5 w-5" />;
    }
  };

  const getSegmentLabel = () => {
    switch (customer?.segment) {
      case 'supplier':
        return 'Supplier';
      case 'contractor':
        return 'Contractor';
      default:
        return 'Customer';
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl md:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                getSegmentIcon()
              )}
              <span>{customer?.name || 'Loading...'}</span>
            </div>
            {customer && !isEditing && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-red-500 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-dough-brown-500" />
          </div>
        ) : customer ? (
          <div className="flex-1 overflow-y-auto">
            {/* Header badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="outline" className="text-xs">
                {getSegmentLabel()}
              </Badge>
              <Badge className={statusColors[customer.status] || statusColors.active}>
                {customer.status.toUpperCase()}
              </Badge>
              {customer.segment !== 'supplier' && customer.segment !== 'contractor' && (
                <Badge className={tierColors[customer.loyaltyTier] || tierColors.bronze}>
                  {customer.loyaltyTier.toUpperCase()}
                </Badge>
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b mb-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-dough-brown-600 text-dough-brown-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'orders'
                    ? 'border-dough-brown-600 text-dough-brown-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Orders ({customer._count.orders})
              </button>
              <button
                onClick={() => setActiveTab('interactions')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'interactions'
                    ? 'border-dough-brown-600 text-dough-brown-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Interactions ({customer._count.interactions})
              </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {isEditing ? (
                  /* Edit Form */
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Name</Label>
                        <Input
                          value={editData.name}
                          onChange={(e) =>
                            setEditData({ ...editData, name: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={editData.email}
                          onChange={(e) =>
                            setEditData({ ...editData, email: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Phone</Label>
                        <Input
                          value={editData.phone}
                          onChange={(e) =>
                            setEditData({ ...editData, phone: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select
                          value={editData.status}
                          onValueChange={(value) =>
                            setEditData({ ...editData, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="vip">VIP</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="blocked">Blocked</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Address</Label>
                      <Input
                        value={editData.address}
                        onChange={(e) =>
                          setEditData({ ...editData, address: e.target.value })
                        }
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label>City</Label>
                        <Input
                          value={editData.city}
                          onChange={(e) =>
                            setEditData({ ...editData, city: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>State</Label>
                        <Input
                          value={editData.state}
                          onChange={(e) =>
                            setEditData({ ...editData, state: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Postal Code</Label>
                        <Input
                          value={editData.postalCode}
                          onChange={(e) =>
                            setEditData({ ...editData, postalCode: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label>Country</Label>
                        <Input
                          value={editData.country}
                          onChange={(e) =>
                            setEditData({ ...editData, country: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    {customer.segment !== 'supplier' && customer.segment !== 'contractor' && (
                      <div>
                        <Label>Loyalty Tier</Label>
                        <Select
                          value={editData.loyaltyTier}
                          onValueChange={(value) =>
                            setEditData({ ...editData, loyaltyTier: value })
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bronze">Bronze</SelectItem>
                            <SelectItem value="silver">Silver</SelectItem>
                            <SelectItem value="gold">Gold</SelectItem>
                            <SelectItem value="platinum">Platinum</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(false)}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-dough-brown-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-dough-brown-600 text-sm font-medium">
                          <DollarSign className="h-4 w-4" />
                          Lifetime Value
                        </div>
                        <p className="text-2xl font-bold text-dough-brown-900 mt-1">
                          {currencyFormatter.format(customer.lifetimeValue || 0)}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
                          <Package className="h-4 w-4" />
                          Total Orders
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {customer._count.orders}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-gray-600 text-sm font-medium">
                          <History className="h-4 w-4" />
                          Interactions
                        </div>
                        <p className="text-2xl font-bold text-gray-900 mt-1">
                          {customer._count.interactions}
                        </p>
                      </div>
                    </div>

                    {/* Contact Details */}
                    <div className="bg-white border rounded-lg p-4">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{customer.email || 'No email'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">{customer.phone || 'No phone'}</span>
                        </div>
                        <div className="flex items-start gap-2 col-span-2">
                          <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                          <span className="text-gray-600">
                            {[customer.address, customer.city, customer.state, customer.postalCode, customer.country]
                              .filter(Boolean)
                              .join(', ') || 'No address'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Last Order & Member Since */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Last Order:</span>
                        <span className="text-gray-900">
                          {customer.lastOrderDate
                            ? format(new Date(customer.lastOrderDate), 'MMM dd, yyyy')
                            : 'Never'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">Member Since:</span>
                        <span className="text-gray-900">
                          {format(new Date(customer.createdAt), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>

                    {/* Loyalty Info (for customers only) */}
                    {customer.loyalty && customer.segment !== 'supplier' && customer.segment !== 'contractor' && (
                      <div className="bg-gradient-to-r from-dough-brown-100 to-dough-brown-50 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-dough-brown-900 mb-2 flex items-center gap-2">
                          <Star className="h-4 w-4" />
                          Loyalty Program
                        </h3>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-dough-brown-600">Points Earned</span>
                            <p className="text-lg font-bold text-dough-brown-900">
                              {customer.loyalty.points.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-dough-brown-600">Points Redeemed</span>
                            <p className="text-lg font-bold text-dough-brown-900">
                              {customer.loyalty.redeemedPoints.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-dough-brown-600">Balance</span>
                            <p className="text-lg font-bold text-dough-brown-900">
                              {customer.loyalty.balancePoints.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                {customer.orders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No orders yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customer.orders.map((order) => (
                      <div
                        key={order.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{order.orderNumber}</p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {currencyFormatter.format(order.netAmount)}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Interactions Tab */}
            {activeTab === 'interactions' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-900">Activity Log</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddInteraction(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Log Interaction
                  </Button>
                </div>

                {/* Add Interaction Form */}
                {showAddInteraction && (
                  <div className="bg-dough-brown-50 rounded-lg p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={interactionData.type}
                          onValueChange={(value) =>
                            setInteractionData({ ...interactionData, type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="call">📞 Call</SelectItem>
                            <SelectItem value="email">✉️ Email</SelectItem>
                            <SelectItem value="meeting">📅 Meeting</SelectItem>
                            <SelectItem value="note">📝 Note</SelectItem>
                            <SelectItem value="feedback">⭐ Feedback</SelectItem>
                            <SelectItem value="complaint">⚠️ Complaint</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Subject</Label>
                        <Input
                          placeholder="Brief subject"
                          value={interactionData.subject}
                          onChange={(e) =>
                            setInteractionData({ ...interactionData, subject: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Notes</Label>
                      <Input
                        placeholder="Details of the interaction..."
                        value={interactionData.notes}
                        onChange={(e) =>
                          setInteractionData({ ...interactionData, notes: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <Label>Outcome</Label>
                      <Input
                        placeholder="Result or next steps"
                        value={interactionData.outcome}
                        onChange={(e) =>
                          setInteractionData({ ...interactionData, outcome: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAddInteraction(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleAddInteraction}
                        disabled={isSavingInteraction}
                      >
                        {isSavingInteraction ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                )}

                {customer.interactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No interactions logged</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {customer.interactions.map((interaction) => (
                      <div
                        key={interaction.id}
                        className="flex gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                          {interactionTypeIcons[interaction.type] || (
                            <MessageSquare className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 capitalize">
                              {interaction.type}
                            </span>
                            {interaction.subject && (
                              <span className="text-gray-600">- {interaction.subject}</span>
                            )}
                          </div>
                          {interaction.notes && (
                            <p className="text-sm text-gray-600 mt-1">{interaction.notes}</p>
                          )}
                          {interaction.outcome && (
                            <p className="text-sm text-green-600 mt-1">
                              ✓ {interaction.outcome}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {format(new Date(interaction.createdAt), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
