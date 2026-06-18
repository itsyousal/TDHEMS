'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Receipt,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  IndianRupee,
  BarChart3,
  PiggyBank,
  Wallet,
  X,
  Check,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';

// Currency formatter for INR
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

interface FinanceDashboardProps {
  permissions: {
    canView: boolean;
    canEdit: boolean;
    canReconcile: boolean;
    canManage: boolean;
  };
}

interface FinanceStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  pendingInvoices: number;
  overdueInvoices: number;
  revenueByChannel: Array<{
    channel: string;
    channelName: string;
    amount: number;
    orderCount: number;
  }>;
  expensesByCategory: Array<{
    category: string;
    amount: number;
    count: number;
  }>;
  comparison: {
    revenueChange: number;
    expenseChange: number;
    profitChange: number;
  };
}

interface DailyReconciliation {
  id?: string;
  reconciliationDate: string;
  totalRevenue: number;
  totalExpenses: number;
  totalTax: number;
  netIncome: number;
  revenueByChannel: Array<{
    channel: string;
    channelName: string;
    amount: number;
    orderCount: number;
  }>;
  orderCount: number;
  averageOrderValue: number;
  status: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

interface Transaction {
  id: string;
  transactionNumber: string;
  type: string;
  category: string;
  amount: number;
  taxAmount?: number;
  netAmount?: number;
  description: string;
  transactionDate: string;
  paymentStatus: string;
  paymentMethod?: string;
  referenceType?: string;
}

export default function FinanceDashboard({ permissions }: FinanceDashboardProps) {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reconciliation, setReconciliation] = useState<DailyReconciliation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReconciling, setIsReconciling] = useState(false);
  const [showReconciliationModal, setShowReconciliationModal] = useState(false);
  const [reconciliationNotes, setReconciliationNotes] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSubmittingTxn, setIsSubmittingTxn] = useState(false);
  const [txnForm, setTxnForm] = useState({
    type: 'revenue',
    category: '',
    amount: '',
    taxAmount: '0',
    description: '',
    paymentMethod: 'cash',
    transactionDate: new Date().toISOString().slice(0, 10),
  });

  // Coalesced fetch: fetch stats, transactions and reconciliation together to avoid duplicate
  // network requests. Keeps existing endpoints and response mappings intact.
  const fetchDashboardData = useCallback(async (opts?: { period?: string; txnFilter?: string }) => {
    try {
      setIsLoading(true);
      const apiPeriod = (opts?.period ?? selectedPeriod) === 'today' ? 'day' : (opts?.period ?? selectedPeriod);

      const txParams = new URLSearchParams({ limit: '10' });
      if ((opts?.txnFilter ?? transactionFilter) !== 'all') txParams.set('type', opts?.txnFilter ?? transactionFilter);

      const statsPromise = fetch(`/api/finance/stats?period=${apiPeriod}`);
      const txPromise = fetch(`/api/finance/transactions?${txParams}`);
      const today = new Date().toISOString().slice(0, 10);
      const reconPromise = fetch(`/api/finance/reconciliation?date=${today}`);

      const [sRes, tRes, rRes] = await Promise.all([statsPromise, txPromise, reconPromise]);

      if (!sRes.ok) {
        const err = await sRes.json().catch(() => ({ error: 'Unknown' }));
        console.error('Finance stats API error', sRes.status, err);
        toast.error('Failed to load financial statistics');
      } else {
        const data = await sRes.json();
        const mappedStats: FinanceStats = {
          totalRevenue: data.summary?.totalRevenue || 0,
          totalExpenses: data.summary?.totalExpenses || 0,
          netProfit: data.summary?.netProfit || 0,
          pendingInvoices: data.counts?.pendingReconciliations || 0,
          overdueInvoices: 0,
          revenueByChannel: (data.revenueByChannel || []).map((ch: any) => ({
            channel: ch.channelId,
            channelName: ch.channelName,
            amount: ch.revenue,
            orderCount: ch.orderCount,
          })),
          expensesByCategory: data.expensesByCategory || [],
          comparison: {
            revenueChange: data.trends?.revenueTrend || 0,
            expenseChange: data.trends?.expenseTrend || 0,
            profitChange: data.trends?.revenueTrend || 0,
          },
        };
        setStats(mappedStats);
      }

      if (!tRes.ok) {
        const err = await tRes.json().catch(() => ({ error: 'Unknown' }));
        console.error('Finance transactions API error', tRes.status, err);
        toast.error('Failed to load transactions');
      } else {
        const tData = await tRes.json();
        setTransactions(tData.data || []);
      }

      if (!rRes.ok) {
        const err = await rRes.json().catch(() => ({ error: 'Unknown' }));
        console.error('Finance reconciliation API error', rRes.status, err);
      } else {
        const rd = await rRes.json();
        const channelData = rd.revenueByChannel || {};
        const revenueByChannelArray = Object.entries(channelData).map(([channelId, info]: [string, any]) => ({
          channel: channelId,
          channelName: info.name || 'Direct',
          amount: info.amount || 0,
          orderCount: info.orderCount || 0,
        }));

        const mappedReconciliation: DailyReconciliation = {
          id: rd.id,
          reconciliationDate: rd.date || rd.reconciliationDate,
          totalRevenue: rd.totalRevenue || 0,
          totalExpenses: rd.totalExpenses || 0,
          totalTax: rd.taxCollected || rd.netTax || 0,
          netIncome: rd.netProfit || 0,
          revenueByChannel: revenueByChannelArray,
          orderCount: rd.totalOrders || 0,
          averageOrderValue: rd.totalOrders > 0 ? (rd.totalRevenue || 0) / rd.totalOrders : 0,
          status: rd.status || 'pending',
          confirmedBy: rd.confirmedBy,
          confirmedAt: rd.confirmedAt,
        };
        setReconciliation(mappedReconciliation);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod, transactionFilter]);

  useEffect(() => {
    if (permissions.canView) fetchDashboardData();
  }, [permissions.canView, fetchDashboardData]);

  const handleConfirmReconciliation = async () => {
    if (!permissions.canReconcile) {
      toast.error('You do not have permission to confirm reconciliation');
      return;
    }

    setIsReconciling(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await fetch('/api/finance/reconciliation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          notes: reconciliationNotes,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to confirm reconciliation');
      }

      const data = await res.json();
      setReconciliation(data);
      setShowReconciliationModal(false);
      setReconciliationNotes('');
      toast.success('Daily reconciliation confirmed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to confirm reconciliation');
    } finally {
      setIsReconciling(false);
    }
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.canManage) return toast.error('Permission denied');
    
    setIsSubmittingTxn(true);
    try {
      const url = editingTransaction 
        ? `/api/finance/transactions/${editingTransaction.id}` 
        : '/api/finance/transactions';
      
      const method = editingTransaction ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...txnForm,
          amount: parseFloat(txnForm.amount),
          taxAmount: parseFloat(txnForm.taxAmount) || 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${editingTransaction ? 'update' : 'create'} transaction`);
      }

      toast.success(`Transaction ${editingTransaction ? 'updated' : 'created'} successfully`);
      setShowTransactionModal(false);
      setEditingTransaction(null);
      setTxnForm({
        type: 'revenue',
        category: '',
        amount: '',
        taxAmount: '0',
        description: '',
        paymentMethod: 'cash',
        transactionDate: new Date().toISOString().slice(0, 10),
      });
      // Refresh consolidated dashboard data
      fetchDashboardData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmittingTxn(false);
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'revenue':
        return 'text-green-600';
      case 'expense':
      case 'payroll':
      case 'purchase':
        return 'text-red-600';
      case 'refund':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      completed: 'default',
      pending: 'secondary',
      failed: 'destructive',
      cancelled: 'outline',
    };
    return variants[status] || 'secondary';
  };

  if (!permissions.canView) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
          <p className="text-muted-foreground">
            You do not have permission to view financial data. Please contact your administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  function loadData(event?: React.MouseEvent<HTMLButtonElement>): void {
    // Refresh dashboard data when user clicks Refresh
    fetchDashboardData();
  }

  return (
    <div className="space-y-6">
      {/* Daily Reconciliation Banner */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Daily Financial Summary</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date().toLocaleDateString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 lg:max-w-2xl">
              <div className="text-center p-2 bg-green-50 rounded-lg">
                <p className="text-xs text-green-600 font-medium">Revenue</p>
                <p className="text-lg font-bold text-green-700">
                  {formatCurrency(reconciliation?.totalRevenue || 0)}
                </p>
              </div>
              <div className="text-center p-2 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600 font-medium">Expenses</p>
                <p className="text-lg font-bold text-red-700">
                  {formatCurrency(reconciliation?.totalExpenses || 0)}
                </p>
              </div>
              <div className="text-center p-2 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">Tax</p>
                <p className="text-lg font-bold text-blue-700">
                  {formatCurrency(reconciliation?.totalTax || 0)}
                </p>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-600 font-medium">Net Income</p>
                <p className="text-lg font-bold text-purple-700">
                  {formatCurrency(reconciliation?.netIncome || 0)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {reconciliation?.status === 'confirmed' ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Reconciled
                </Badge>
              ) : (
                permissions.canReconcile && (
                  <Button onClick={() => setShowReconciliationModal(true)}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Daily Reconciliation
                  </Button>
                )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.totalRevenue || 0)}
            </div>
            {stats?.comparison && (
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                {stats.comparison.revenueChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                {Math.abs(stats.comparison.revenueChange).toFixed(1)}% from previous period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats?.totalExpenses || 0)}
            </div>
            {stats?.comparison && (
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                {stats.comparison.expenseChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-red-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-green-500 mr-1" />
                )}
                {Math.abs(stats.comparison.expenseChange).toFixed(1)}% from previous period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <PiggyBank className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.netProfit || 0) >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {formatCurrency(stats?.netProfit || 0)}
            </div>
            {stats?.comparison && (
              <p className="text-xs text-muted-foreground flex items-center mt-1">
                {stats.comparison.profitChange >= 0 ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                )}
                {Math.abs(stats.comparison.profitChange).toFixed(1)}% from previous period
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <FileText className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pendingInvoices || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.overdueInvoices || 0} overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Period Selector */}
      <div className="flex items-center gap-4">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Revenue by Channel & Expenses by Category */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by Channel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Revenue by Channel
            </CardTitle>
            <CardDescription>Breakdown of revenue by sales channel</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.revenueByChannel && stats.revenueByChannel.length > 0 ? (
              <div className="space-y-4">
                {stats.revenueByChannel.map((channel) => (
                  <div key={channel.channel} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{channel.channelName}</span>
                        <span className="text-sm text-muted-foreground">
                          {channel.orderCount} orders
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 rounded-full"
                          style={{
                            width: `${((channel.amount / stats.totalRevenue) * 100).toFixed(0)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="ml-4 font-semibold text-green-600 min-w-[100px] text-right">
                      {formatCurrency(channel.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No revenue data for this period
              </p>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expenses by Category
            </CardTitle>
            <CardDescription>Breakdown of expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.expensesByCategory && stats.expensesByCategory.length > 0 ? (
              <div className="space-y-4">
                {stats.expensesByCategory.map((cat) => (
                  <div key={cat.category} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium capitalize">
                          {cat.category.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {cat.count} transactions
                        </span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{
                            width: `${((cat.amount / stats.totalExpenses) * 100).toFixed(0)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="ml-4 font-semibold text-red-600 min-w-[100px] text-right">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No expense data for this period
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
              <CardDescription>Latest financial transactions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                  <SelectItem value="payroll">Payroll</SelectItem>
                  <SelectItem value="purchase">Purchases</SelectItem>
                </SelectContent>
              </Select>
              {permissions.canManage && (
                <Button onClick={() => setShowTransactionModal(true)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Transaction #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell className="font-mono text-sm">
                      {txn.transactionNumber}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {txn.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {txn.description}
                    </TableCell>
                    <TableCell>{formatDate(txn.transactionDate)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadge(txn.paymentStatus)}>
                        {txn.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${getTransactionTypeColor(txn.type)}`}>
                      {txn.amount >= 0 ? '+' : ''}{formatCurrency(txn.amount)}
                    </TableCell>
                    <TableCell className="text-left">
                      {txn.paymentMethod}
                    </TableCell>
                    {permissions.canManage && (
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            setEditingTransaction(txn);
                            setTxnForm({
                              type: txn.type,
                              category: txn.category,
                              amount: Math.abs(txn.amount).toString(),
                              taxAmount: (txn.taxAmount || 0).toString(),
                              description: txn.description || '',
                              paymentMethod: txn.paymentMethod || 'cash',
                              transactionDate: new Date(txn.transactionDate).toISOString().slice(0, 10),
                            });
                            setShowTransactionModal(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No transactions found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Daily Reconciliation Modal */}
      <Dialog open={showReconciliationModal} onOpenChange={setShowReconciliationModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Daily Reconciliation
            </DialogTitle>
            <DialogDescription>
              Review and confirm today's financial summary. This action will lock today's records.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-700 font-medium">Total Revenue</p>
                <p className="text-xl font-bold text-green-800">
                  {formatCurrency(reconciliation?.totalRevenue || 0)}
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-700 font-medium">Total Expenses</p>
                <p className="text-xl font-bold text-red-800">
                  {formatCurrency(reconciliation?.totalExpenses || 0)}
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-700 font-medium">Tax Collected</p>
                <p className="text-xl font-bold text-blue-800">
                  {formatCurrency(reconciliation?.totalTax || 0)}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700 font-medium">Net Income</p>
                <p className="text-xl font-bold text-purple-800">
                  {formatCurrency(reconciliation?.netIncome || 0)}
                </p>
              </div>
            </div>

            {/* Revenue by Channel */}
            <div className="space-y-3">
              <h4 className="font-semibold">Revenue by Channel</h4>
              <div className="border rounded-lg divide-y">
                {reconciliation?.revenueByChannel && reconciliation.revenueByChannel.length > 0 ? (
                  reconciliation.revenueByChannel.map((channel) => (
                    <div
                      key={channel.channel}
                      className="flex items-center justify-between p-3"
                    >
                      <div>
                        <p className="font-medium">{channel.channelName}</p>
                        <p className="text-sm text-muted-foreground">
                          {channel.orderCount} orders
                        </p>
                      </div>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(channel.amount)}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No revenue recorded today
                  </div>
                )}
              </div>
            </div>

            {/* Order Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-lg font-semibold">{reconciliation?.orderCount || 0}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Average Order Value</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(reconciliation?.averageOrderValue || 0)}
                </p>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Reconciliation Notes (Optional)</Label>
              <Input
                id="notes"
                value={reconciliationNotes}
                onChange={(e) => setReconciliationNotes(e.target.value)}
                placeholder="Add any notes about today's reconciliation..."
              />
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Important</p>
                <p className="text-sm text-yellow-700">
                  Confirming reconciliation will finalize today's financial records. 
                  This action cannot be undone. Please ensure all transactions are accurate.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReconciliationModal(false)}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmReconciliation}
              disabled={isReconciling}
              className="bg-green-600 hover:bg-green-700"
            >
              {isReconciling ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Confirm Daily Reconciliation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transaction Modal */}
      <Dialog open={showTransactionModal} onOpenChange={(open) => {
        setShowTransactionModal(open);
        if (!open) {
          setEditingTransaction(null);
          setTxnForm({
            type: 'revenue',
            category: '',
            amount: '',
            taxAmount: '0',
            description: '',
            paymentMethod: 'cash',
            transactionDate: new Date().toISOString().slice(0, 10),
          });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTransaction ? 'Edit Transaction' : 'Add Transaction'}</DialogTitle>
            <DialogDescription>
              {editingTransaction ? 'Update the details of this transaction.' : 'Manually record a financial transaction.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitTransaction} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={txnForm.type} onValueChange={(val) => setTxnForm({...txnForm, type: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="revenue">Revenue</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input required value={txnForm.category} onChange={e => setTxnForm({...txnForm, category: e.target.value})} placeholder="e.g. Sales, Rent" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" required value={txnForm.amount} onChange={e => setTxnForm({...txnForm, amount: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Tax Amount</Label>
                <Input type="number" step="0.01" value={txnForm.taxAmount} onChange={e => setTxnForm({...txnForm, taxAmount: e.target.value})} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" required value={txnForm.transactionDate} onChange={e => setTxnForm({...txnForm, transactionDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select value={txnForm.paymentMethod} onValueChange={(val) => setTxnForm({...txnForm, paymentMethod: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Yousuf personal acc">Yousuf personal acc</SelectItem>
                    <SelectItem value="Zeerak personal acc">Zeerak personal acc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={txnForm.description} onChange={e => setTxnForm({...txnForm, description: e.target.value})} placeholder="Optional description..." />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowTransactionModal(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmittingTxn}>
                {isSubmittingTxn ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Save Transaction
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
