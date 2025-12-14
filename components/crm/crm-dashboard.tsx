'use client';

import { useState } from 'react';
import {
  Users,
  Building2,
  Truck,
  Plus,
  Star,
  MessageSquare,
  ArrowRight,
  Clock,
  TrendingUp,
  Sparkles,
  Award,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContactList } from './contact-list';
import { AddContactDialog } from './add-contact-dialog';
import { CustomerDetailModal } from './customer-detail-modal';

type CustomerSegment = 'all' | 'customer' | 'supplier' | 'contractor';

interface CRMStats {
  totalContacts: number;
  customerCount: number;
  supplierCount: number;
  contractorCount: number;
  activeCount: number;
  vipCount: number;
  inactiveCount: number;
  blockedCount: number;
  totalLifetimeValue: number;
}

interface StatusBreakdown {
  status: string;
  count: number;
  color: string;
}

interface LoyaltyBreakdown {
  bronze: number;
  silver: number;
  gold: number;
  platinum: number;
}

interface RecentContact {
  id: string;
  name: string;
  email: string | null;
  segment: string | null;
  loyaltyTier: string;
  status: string;
  createdAt: string;
}

interface RecentInteraction {
  id: string;
  type: string;
  subject: string | null;
  outcome: string | null;
  createdAt: string;
  customer: {
    id: string;
    name: string;
  };
}

interface CRMDashboardProps {
  stats: CRMStats;
  statusBreakdown: StatusBreakdown[];
  loyaltyBreakdown: LoyaltyBreakdown;
  recentContacts: RecentContact[];
  recentInteractions: RecentInteraction[];
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-700',
  vip: 'bg-purple-100 text-purple-700',
  blocked: 'bg-red-100 text-red-700',
};

const tierColors: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-700 border-amber-200',
  silver: 'bg-slate-100 text-slate-600 border-slate-200',
  gold: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  platinum: 'bg-indigo-100 text-indigo-700 border-indigo-200',
};

const interactionTypeEmojis: Record<string, string> = {
  call: '📞',
  email: '✉️',
  complaint: '⚠️',
  feedback: '⭐',
  purchase: '🛒',
  return: '↩️',
  meeting: '📅',
  note: '📝',
};

export function CRMDashboard({
  stats,
  statusBreakdown,
  loyaltyBreakdown,
  recentContacts,
  recentInteractions,
}: CRMDashboardProps) {
  const [activeTab, setActiveTab] = useState<CustomerSegment>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addDialogSegment, setAddDialogSegment] = useState<'customer' | 'supplier' | 'contractor'>('customer');
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAddContact = (segment: 'customer' | 'supplier' | 'contractor') => {
    setAddDialogSegment(segment);
    setShowAddDialog(true);
  };

  const handleContactCreated = () => {
    setRefreshKey((k) => k + 1);
  };

  const handleViewContact = (contactId: string) => {
    setSelectedContactId(contactId);
    setShowDetailModal(true);
  };

  const tabs = [
    { key: 'all' as CustomerSegment, label: 'All Contacts', icon: Users },
    { key: 'customer' as CustomerSegment, label: 'Customers', icon: Users },
    { key: 'supplier' as CustomerSegment, label: 'Suppliers', icon: Building2 },
    { key: 'contractor' as CustomerSegment, label: 'Contractors', icon: Truck },
  ];

  // Segment stats for display
  const segmentStats = [
    { segment: 'Customers', count: stats.customerCount, icon: Users, color: 'text-dough-brown-600' },
    { segment: 'Suppliers', count: stats.supplierCount, icon: Building2, color: 'text-blue-600' },
    { segment: 'Contractors', count: stats.contractorCount, icon: Truck, color: 'text-orange-600' },
  ];

  // Overview stats for display
  const overviewStats = [
    {
      title: 'Total Contacts',
      value: stats.totalContacts,
      icon: Users,
      description: 'All customers, suppliers & contractors',
      color: 'text-dough-brown-600',
      bgColor: 'bg-dough-brown-50',
    },
    {
      title: 'Active Relationships',
      value: stats.activeCount,
      icon: Sparkles,
      description: 'Contacts marked as active',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'VIP Contacts',
      value: stats.vipCount,
      icon: Award,
      description: 'High-value customers marked VIP',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Lifetime Value',
      value: `₹${Number(stats.totalLifetimeValue).toLocaleString('en-IN')}`,
      icon: TrendingUp,
      description: 'Total revenue from all contacts',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
  ];

  const totalLoyalty = loyaltyBreakdown.bronze + loyaltyBreakdown.silver + loyaltyBreakdown.gold + loyaltyBreakdown.platinum;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewStats.map((stat) => {
          const StatIcon = stat.icon;
          return (
            <div
              key={stat.title}
              className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {stat.title}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <StatIcon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
              <p className="mt-2 text-xs text-gray-500">{stat.description}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions + Segments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Segment Breakdown */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Types</h3>
          <div className="space-y-3">
            {segmentStats.map((seg) => {
              const SegIcon = seg.icon;
              return (
                <div
                  key={seg.segment}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => setActiveTab(seg.segment.toLowerCase().slice(0, -1) as CustomerSegment)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-white ${seg.color}`}>
                      <SegIcon className="h-4 w-4" />
                    </div>
                    <span className="font-medium text-gray-900">{seg.segment}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{seg.count}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Add Buttons */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-3">QUICK ADD</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => handleAddContact('customer')}
              >
                <Plus className="h-3 w-3 mr-1" />
                Customer
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => handleAddContact('supplier')}
              >
                <Plus className="h-3 w-3 mr-1" />
                Supplier
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={() => handleAddContact('contractor')}
              >
                <Plus className="h-3 w-3 mr-1" />
                Contractor
              </Button>
            </div>
          </div>
        </div>

        {/* Status & Loyalty Breakdown */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Status Overview</h3>
          
          {/* Status bars */}
          <div className="space-y-3 mb-6">
            {statusBreakdown.map((item) => {
              const percentage = stats.totalContacts
                ? (item.count / stats.totalContacts) * 100
                : 0;
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.status}</span>
                    <span className="font-medium text-gray-900">{item.count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: item.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Loyalty Tiers */}
          {totalLoyalty > 0 && (
            <>
              <h4 className="text-xs font-medium text-gray-500 mb-3">LOYALTY TIERS</h4>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(loyaltyBreakdown).map(([tier, count]) => (
                  <div
                    key={tier}
                    className={`text-center p-2 rounded-lg border ${tierColors[tier]}`}
                  >
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-[10px] font-medium uppercase">{tier}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
            <Clock className="h-4 w-4 text-gray-400" />
          </div>
          
          {recentInteractions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No recent interactions</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {recentInteractions.map((interaction) => (
                <div
                  key={interaction.id}
                  className="flex gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => handleViewContact(interaction.customer.id)}
                >
                  <div className="text-lg">
                    {interactionTypeEmojis[interaction.type] || '💬'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {interaction.customer.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {interaction.subject || `${interaction.type} logged`}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {formatDistanceToNow(new Date(interaction.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recent Contacts */}
          {recentContacts.length > 0 && (
            <>
              <h4 className="text-xs font-medium text-gray-500 mt-4 pt-4 border-t mb-3">
                RECENTLY ADDED
              </h4>
              <div className="space-y-2">
                {recentContacts.slice(0, 3).map((contact) => (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
                    onClick={() => handleViewContact(contact.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-dough-brown-100 rounded-full flex items-center justify-center">
                        <Users className="h-3 w-3 text-dough-brown-600" />
                      </div>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-[120px]">
                        {contact.name}
                      </span>
                    </div>
                    <Badge className={`${statusColors[contact.status]} text-[10px]`}>
                      {contact.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Tabs + Contact List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <div className="flex gap-1 px-4 pt-4">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isActive
                      ? 'border-dough-brown-600 text-dough-brown-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <TabIcon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Add Contact Button */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {tabs.find((t) => t.key === activeTab)?.label}
            </h2>
            <p className="text-sm text-gray-500">
              {activeTab === 'all'
                ? 'View and manage all your contacts'
                : `Manage your ${activeTab}s and their information`}
            </p>
          </div>
          <Button onClick={() => handleAddContact(activeTab === 'all' ? 'customer' : (activeTab as 'customer' | 'supplier' | 'contractor'))}>
            <Plus className="h-4 w-4 mr-2" />
            Add {activeTab === 'all' ? 'Contact' : tabs.find((t) => t.key === activeTab)?.label.slice(0, -1)}
          </Button>
        </div>

        {/* Contact List */}
        <div className="p-6">
          <ContactList key={`${activeTab}-${refreshKey}`} segment={activeTab} />
        </div>
      </div>

      {/* Add Contact Dialog */}
      <AddContactDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        defaultSegment={addDialogSegment}
        onSuccess={handleContactCreated}
      />

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customerId={selectedContactId}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        onUpdate={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
