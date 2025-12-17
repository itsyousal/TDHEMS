'use client';

import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Package,
  TrendingUp,
  AlertCircle,
  Clock,
  PlusCircle,
  Search,
  ArrowUpDown,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  ShoppingBag,
  Printer,
  CheckCircle,
} from 'lucide-react';
import { QuickAddSKUDialog } from '@/components/inventory/quick-add-sku-dialog';

interface InventoryStats {
  totalSkus: number;
  rawSkus: number;
  finishedSkus: number;
  inStockItems: number;
  rawInStockItems: number;
  finishedInStockItems: number;
  lowStockItems: number;
  rawLowStockItems: number;
  finishedLowStockItems: number;
  recentMovements: number;
}

interface InventoryItem {
  id: string;
  sku: string;
  desc: string;
  loc: string;
  skuId: string;
  locationId: string;
  avail: number;
  res: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock' | string;
  type: 'RAW' | 'FINISHED' | string;
}

type AdjustmentFormState = {
  sku: string;
  type: 'in' | 'out';
  quantity: string;
  reason: string;
  locationId: string;
};

type StatusFilterOption = 'all' | 'In Stock' | 'Low Stock' | 'Out of Stock';

type InventoryCategoryOption = 'all' | 'raw' | 'finished';

type PurchaseOrderRow = {
  skuId: string;
  quantity: string;
  unitCost: string;
};

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierContact: string;
  locationName: string;
  deliveryDate: string;
  totalCost: number;
  status: 'PENDING' | 'RECEIVED' | 'PARTIAL';
  createdAt: string;
  receivedAt?: string;
  receivedBy?: string;
  varianceNotes?: string;
}

type ReceiveFormState = {
  receivedAt: string;
  receivedBy: string;
  varianceNotes: string;
};

const INVENTORY_CATEGORY_OPTIONS: { value: InventoryCategoryOption; label: string; description: string }[] = [
  { value: 'all', label: 'All inventory', description: 'Raw + finished goods' },
  { value: 'raw', label: 'Raw materials', description: 'Ingredients and prep stock' },
  { value: 'finished', label: 'Finished goods (Cookies)', description: 'Cookie SKUs only (manual availability in POS)' },
];

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const generatePurchaseOrderNumber = () => `PO-${String(Math.floor(Math.random() * 900000) + 100000)}`;

const StatCard = ({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: number;
  description: string;
  icon: ReactNode;
}) => (
  <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <div className="rounded-full bg-dough-brown-50 p-3">{icon}</div>
  </div>
);

const TypeBreakdownCard = ({
  label,
  count,
  inStock,
  lowStock,
  icon,
  highlight = false,
}: {
  label: string;
  count: number;
  inStock: number;
  lowStock: number;
  icon: ReactNode;
  highlight?: boolean;
}) => (
  <div
    className={`rounded-lg border bg-white p-5 shadow-sm transition ${
      highlight ? 'border-dough-brown-300 shadow-md' : 'border-gray-200'
    }`}
  >
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-3xl font-bold text-gray-900 mt-1">{count}</p>
        <p className="text-xs text-gray-500">SKUs tracked</p>
      </div>
      <div className="rounded-full bg-dough-brown-50 p-3 text-dough-brown-500">{icon}</div>
    </div>
    <div className="mt-4 flex items-center gap-4 text-xs font-semibold text-gray-500">
      <span className="text-gray-700">{inStock} in stock</span>
      <span className="text-orange-500">{lowStock} low</span>
    </div>
  </div>
);

export default function InventoryPage() {
  const [stats, setStats] = useState<InventoryStats>({
    totalSkus: 0,
    rawSkus: 0,
    finishedSkus: 0,
    inStockItems: 0,
    rawInStockItems: 0,
    finishedInStockItems: 0,
    lowStockItems: 0,
    rawLowStockItems: 0,
    finishedLowStockItems: 0,
    recentMovements: 0,
  });
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilterOption>('all');
  const [inventoryCategory, setInventoryCategory] = useState<InventoryCategoryOption>('all');
  const [adjustForm, setAdjustForm] = useState<AdjustmentFormState>({
    sku: '',
    type: 'in',
    quantity: '',
    reason: '',
    locationId: '',
  });
  const [adjustStatus, setAdjustStatus] = useState<'idle' | 'submitting'>('idle');
  const [adjustNotification, setAdjustNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [poSupplierName, setPoSupplierName] = useState('');
  const [poSupplierContact, setPoSupplierContact] = useState('');
  const [poDeliveryDate, setPoDeliveryDate] = useState(() => new Date().toISOString().slice(0, 16));
  const [poItems, setPoItems] = useState<PurchaseOrderRow[]>([{ skuId: '', quantity: '', unitCost: '' }]);
  const [poLocationId, setPoLocationId] = useState('');
  const [poStatus, setPoStatus] = useState<'idle' | 'submitting'>('idle');
  const [poNotification, setPoNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [poDraftId, setPoDraftId] = useState(generatePurchaseOrderNumber);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [receiveForm, setReceiveForm] = useState<ReceiveFormState>({
    receivedAt: new Date().toISOString().slice(0, 16),
    receivedBy: '',
    varianceNotes: '',
  });
  const [receiveStatus, setReceiveStatus] = useState<'idle' | 'submitting'>('idle');

  const refreshInventory = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const inventoryParams = new URLSearchParams();
      if (inventoryCategory !== 'all') {
        inventoryParams.set('type', inventoryCategory);
      }

      const inventoryQuery = inventoryParams.toString() ? `?${inventoryParams.toString()}` : '';
      const [statsRes, itemsRes] = await Promise.all([
        fetch('/api/inventory/stats'),
        fetch(`/api/inventory${inventoryQuery}`),
      ]);

      if (!statsRes.ok || !itemsRes.ok) {
        throw new Error('Unable to load inventory data.');
      }

      setStats(await statsRes.json());
      setItems(await itemsRes.json());
      setInventoryError(null);
    } catch (error) {
      console.error(error);
      setInventoryError('Could not load inventory. Please refresh the page.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [inventoryCategory]);

  useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  const uniqueLocations = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach((item) => {
      if (!map.has(item.locationId)) {
        map.set(item.locationId, item.loc);
      }
    });
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  useEffect(() => {
    if (!adjustForm.locationId && uniqueLocations.length) {
      setAdjustForm((prev) => ({ ...prev, locationId: uniqueLocations[0].id }));
    }
  }, [uniqueLocations, adjustForm.locationId]);

  useEffect(() => {
    if (!poLocationId && uniqueLocations.length) {
      setPoLocationId(uniqueLocations[0].id);
    }
  }, [uniqueLocations, poLocationId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch = item.sku.toLowerCase().includes(searchTerm.toLowerCase()) || item.desc.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesLocation = locationFilter === 'all' || item.loc === locationFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesLocation && matchesStatus;
    });
  }, [items, searchTerm, locationFilter, statusFilter]);

  const rawSkuOptions = useMemo(() => {
    const map = new Map<string, { skuId: string; label: string }>();
    items
      .filter((item) => item.type === 'RAW')
      .forEach((item) => {
        if (!map.has(item.skuId)) {
          map.set(item.skuId, { skuId: item.skuId, label: `${item.sku} · ${item.desc}` });
        }
      });
    return Array.from(map.values());
  }, [items]);

  const purchaseOrderTotal = useMemo(
    () => poItems.reduce((sum, row) => sum + (Number(row.quantity) || 0) * (Number(row.unitCost) || 0), 0),
    [poItems]
  );

  const handlePurchaseItemChange = (index: number, field: keyof PurchaseOrderRow, value: string) => {
    setPoItems((prev) =>
      prev.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row))
    );
  };

  const handleAddPurchaseRow = () => {
    setPoItems((prev) => [...prev, { skuId: '', quantity: '', unitCost: '' }]);
  };

  const handleQuickSKUCreated = async (newSku: any) => {
    // Refresh SKU data to include the new SKU
    await refreshInventory();
    
    // Add a new row with the newly created SKU pre-selected
    setPoItems((prev) => [...prev, { skuId: newSku.id, quantity: '', unitCost: newSku.basePrice?.toString() || '' }]);
    
    // Show success notification
    setPoNotification({ message: `SKU "${newSku.name}" created and added to purchase order.`, type: 'success' });
  };

  const handleRemovePurchaseRow = (index: number) => {
    setPoItems((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handlePurchaseOrderSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPoNotification(null);

    if (!poSupplierName.trim()) {
      setPoNotification({ message: 'Add the supplier name before creating a purchase order.', type: 'error' });
      return;
    }

    if (!poLocationId) {
      setPoNotification({ message: 'Select a receiving location for the order details.', type: 'error' });
      return;
    }

    if (!poDeliveryDate) {
      setPoNotification({ message: 'Provide a delivery date and time.', type: 'error' });
      return;
    }

    const normalized = new Map<string, { skuId: string; quantity: number; unitCost: number }>();
    poItems.forEach((row) => {
      const skuId = row.skuId;
      const quantity = Number(row.quantity);
      const unitCost = Number(row.unitCost);
      if (!skuId || Number.isNaN(quantity) || Number.isNaN(unitCost) || quantity <= 0 || unitCost < 0) {
        return;
      }

      if (!normalized.has(skuId)) {
        normalized.set(skuId, { skuId, quantity, unitCost });
      } else {
        const existing = normalized.get(skuId)!;
        existing.quantity += quantity;
        existing.unitCost = unitCost;
      }
    });

    const consolidatedItems = Array.from(normalized.values());
    if (consolidatedItems.length === 0) {
      setPoNotification({ message: 'Add at least one SKU with quantity and cost.', type: 'error' });
      return;
    }

    const deliveryDateValue = new Date(poDeliveryDate);
    if (Number.isNaN(deliveryDateValue.getTime())) {
      setPoNotification({ message: 'Delivery date is invalid.', type: 'error' });
      return;
    }

    const payload = {
      locationId: poLocationId,
      supplierName: poSupplierName.trim(),
      supplierContact: poSupplierContact.trim(),
      deliveryDate: deliveryDateValue.toISOString(),
      poNumber: poDraftId,
      items: consolidatedItems,
    };

    setPoStatus('submitting');

    try {
      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Purchase order creation failed.');
      }

      const data = await response.json();
      setPoNotification({
        message: `Purchase order ${data.purchaseOrder?.poNumber ?? poDraftId} created and added to inventory.`,
        type: 'success',
      });
      setPoSupplierName('');
      setPoSupplierContact('');
      setPoDeliveryDate(new Date().toISOString().slice(0, 16));
      setPoItems([{ skuId: '', quantity: '', unitCost: '' }]);
      setPoDraftId(generatePurchaseOrderNumber());
      await refreshInventory();
    } catch (error) {
      console.error(error);
      setPoNotification({ message: 'Could not create a purchase order right now.', type: 'error' });
    } finally {
      setPoStatus('idle');
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'In Stock':
        return 'bg-green-100 text-green-800';
      case 'Low Stock':
        return 'bg-orange-100 text-orange-800';
      case 'Out of Stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const typeLabel = (type: string) => {
    if (type === 'RAW') return 'Raw material';
    if (type === 'FINISHED') return 'Finished good';
    return 'Inventory item';
  };

  const typeBadge = (type: string) => {
    switch (type) {
      case 'RAW':
        return 'bg-blue-100 text-blue-800';
      case 'FINISHED':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAdjustFormChange = (field: keyof AdjustmentFormState, value: string) => {
    setAdjustForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAdjustmentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!adjustForm.sku.trim() || !adjustForm.quantity.trim()) {
      setAdjustNotification({ message: 'Provide SKU and quantity before submitting.', type: 'error' });
      return;
    }

    const quantity = Number(adjustForm.quantity);
    if (Number.isNaN(quantity) || quantity <= 0) {
      setAdjustNotification({ message: 'Quantity must be a positive number.', type: 'error' });
      return;
    }

    if (!adjustForm.locationId) {
      setAdjustNotification({ message: 'Select a location before adjusting inventory.', type: 'error' });
      return;
    }

    setAdjustStatus('submitting');

    try {
      const response = await fetch('/api/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: adjustForm.sku.trim(),
          locationId: adjustForm.locationId,
          adjustment: adjustForm.type === 'in' ? quantity : -quantity,
          reason: adjustForm.reason.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Adjustment failed.');
      }

      setAdjustNotification({ message: 'Inventory adjusted. Data refreshed.', type: 'success' });
      setAdjustForm((prev) => ({ ...prev, sku: '', type: 'in', quantity: '', reason: '' }));
      await refreshInventory();
    } catch (error) {
      console.error(error);
      setAdjustNotification({ message: 'Unable to adjust inventory right now.', type: 'error' });
    } finally {
      setAdjustStatus('idle');
    }
  };

  const fetchPurchaseOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/purchase-orders');
      if (response.ok) {
        const data = await response.json();
        setPurchaseOrders(data.purchaseOrders ?? []);
      }
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
    }
  }, []);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  const handlePrintPO = (po?: PurchaseOrder) => {
    const printData = po ?? {
      poNumber: poDraftId,
      supplierName: poSupplierName,
      supplierContact: poSupplierContact,
      deliveryDate: poDeliveryDate,
      locationName: uniqueLocations.find((loc) => loc.id === poLocationId)?.label ?? '',
      totalCost: purchaseOrderTotal,
      items: poItems.map((row) => {
        const sku = rawSkuOptions.find((opt) => opt.skuId === row.skuId);
        return {
          sku: sku?.label ?? row.skuId,
          quantity: row.quantity,
          unitCost: row.unitCost,
          lineTotal: (Number(row.quantity) || 0) * (Number(row.unitCost) || 0),
        };
      }),
    };

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const itemsHtml = 'items' in printData
      ? (printData as { items: { sku: string; quantity: string; unitCost: string; lineTotal: number }[] }).items
          .filter((item) => item.sku)
          .map(
            (item) => `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.sku}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${item.quantity}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${currencyFormatter.format(Number(item.unitCost) || 0)}</td>
              <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${currencyFormatter.format(item.lineTotal)}</td>
            </tr>
          `
          )
          .join('')
      : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order - ${printData.poNumber}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            .header { display: flex; justify-content: space-between; margin-bottom: 32px; }
            .info { margin-bottom: 24px; }
            .info-row { display: flex; gap: 32px; margin-bottom: 8px; }
            .info-label { font-weight: 600; color: #6b7280; font-size: 12px; text-transform: uppercase; }
            .info-value { font-size: 14px; color: #111827; }
            table { width: 100%; border-collapse: collapse; margin-top: 24px; }
            th { text-align: left; padding: 12px 8px; background: #f9fafb; font-size: 12px; text-transform: uppercase; color: #6b7280; border-bottom: 2px solid #e5e7eb; }
            th:not(:first-child) { text-align: right; }
            .total { text-align: right; font-size: 18px; font-weight: 700; margin-top: 16px; padding-top: 16px; border-top: 2px solid #111827; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Purchase Order</h1>
              <p style="color: #6b7280; font-size: 14px;">Dough House</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 20px; font-weight: 700;">${printData.poNumber}</p>
              <p style="color: #6b7280; font-size: 12px;">Created ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div class="info">
            <div class="info-row">
              <div><span class="info-label">Supplier</span><br/><span class="info-value">${printData.supplierName || '—'}</span></div>
              <div><span class="info-label">Contact</span><br/><span class="info-value">${printData.supplierContact || '—'}</span></div>
            </div>
            <div class="info-row">
              <div><span class="info-label">Delivery Location</span><br/><span class="info-value">${printData.locationName || '—'}</span></div>
              <div><span class="info-label">Expected Delivery</span><br/><span class="info-value">${printData.deliveryDate ? new Date(printData.deliveryDate).toLocaleString() : '—'}</span></div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Cost</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total">Total: ${currencyFormatter.format(printData.totalCost)}</div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const openReceiveModal = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setReceiveForm({
      receivedAt: new Date().toISOString().slice(0, 16),
      receivedBy: '',
      varianceNotes: '',
    });
    setIsReceiveModalOpen(true);
  };

  const handleReceiveSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPO) return;

    if (!receiveForm.receivedBy.trim()) {
      setPoNotification({ message: 'Enter the name of the person receiving the order.', type: 'error' });
      return;
    }

    setReceiveStatus('submitting');

    try {
      const response = await fetch(`/api/purchase-orders/${selectedPO.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receivedAt: new Date(receiveForm.receivedAt).toISOString(),
          receivedBy: receiveForm.receivedBy.trim(),
          varianceNotes: receiveForm.varianceNotes.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark PO as received.');
      }

      setPoNotification({ message: `${selectedPO.poNumber} marked as received.`, type: 'success' });
      setIsReceiveModalOpen(false);
      setSelectedPO(null);
      await fetchPurchaseOrders();
      await refreshInventory();
    } catch (error) {
      console.error(error);
      setPoNotification({ message: 'Could not update purchase order status.', type: 'error' });
    } finally {
      setReceiveStatus('idle');
    }
  };

  const poStatusBadge = (status: string) => {
    switch (status) {
      case 'RECEIVED':
        return 'bg-green-100 text-green-800';
      case 'PARTIAL':
        return 'bg-orange-100 text-orange-800';
      case 'PENDING':
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-600">Loading inventory...</div>;
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-600 mt-1">Product inventory, stock adjustments, and replenishment signals.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAdjustModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-dough-brown-200 bg-dough-brown-50 px-3 py-1.5 text-xs font-semibold text-dough-brown-700 transition hover:bg-dough-brown-100"
          >
            <PlusCircle className="h-3.5 w-3.5" aria-hidden />
            Adjust stock
          </button>
          <button
            type="button"
            onClick={() => setIsPurchaseModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-dough-brown-200 bg-dough-brown-50 px-3 py-1.5 text-xs font-semibold text-dough-brown-700 transition hover:bg-dough-brown-100"
          >
            <ShoppingBag className="h-3.5 w-3.5" aria-hidden />
            New PO
          </button>
          <button
            type="button"
            onClick={refreshInventory}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm transition hover:border-dough-brown-500 disabled:opacity-60"
          >
            <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
            {isRefreshing ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {INVENTORY_CATEGORY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setInventoryCategory(option.value)}
            className={`inline-flex flex-col gap-1 rounded-full border px-4 py-1 transition ${
              inventoryCategory === option.value
                ? 'border-dough-brown-500 bg-dough-brown-50 text-dough-brown-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-dough-brown-400'
            }`}
          >
            <span className="text-[10px] font-semibold tracking-wider">{option.label}</span>
            <span className="text-[10px] font-normal uppercase tracking-widest text-gray-400">{option.description}</span>
          </button>
        ))}
        <span className="text-[9px] text-gray-400">
          Viewing {inventoryCategory === 'raw' ? 'raw materials' : inventoryCategory === 'finished' ? 'finished goods' : 'everything'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total SKUs" value={stats.totalSkus} description="Tracked products" icon={<Package className="h-10 w-10 text-dough-brown-200" />} />
        <StatCard title="In Stock" value={stats.inStockItems} description="Available to fulfill" icon={<TrendingUp className="h-10 w-10 text-green-200" />} />
        <StatCard title="Low Stock" value={stats.lowStockItems} description="Needs attention" icon={<AlertCircle className="h-10 w-10 text-orange-200" />} />
        <StatCard title="Recent Scans" value={stats.recentMovements} description="Movements this shift" icon={<Clock className="h-10 w-10 text-blue-200" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-6">
        <TypeBreakdownCard
          label="Raw materials"
          count={stats.rawSkus}
          inStock={stats.rawInStockItems}
          lowStock={stats.rawLowStockItems}
          icon={<ShieldCheck className="h-5 w-5 text-blue-500" />}
          highlight={inventoryCategory === 'raw'}
        />
        <TypeBreakdownCard
          label="Finished goods"
          count={stats.finishedSkus}
          inStock={stats.finishedInStockItems}
          lowStock={stats.finishedLowStockItems}
          icon={<ShieldCheck className="h-5 w-5 text-amber-500" />}
          highlight={inventoryCategory === 'finished'}
        />
      </div>

      {inventoryError && (
        <div role="alert" className="mb-4 rounded-md border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
          {inventoryError}
        </div>
      )}

      <div>
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1">
              <label htmlFor="inventory-search" className="sr-only">
                Search inventory
              </label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                id="inventory-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search SKU or description"
                className="w-full rounded-md border border-gray-200 bg-gray-50 px-10 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
              />
            </div>
            <select
              value={locationFilter}
              onChange={(event) => setLocationFilter(event.target.value)}
              className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
            >
              <option value="all">All locations</option>
              {uniqueLocations.map((location) => (
                <option key={location.id} value={location.label}>
                  {location.label}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as StatusFilterOption)}
              className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
            >
              <option value="all">All statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3">Description</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Avail</th>
                  <th className="py-3 px-3">Reserved</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Type</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-gray-500">
                      No items match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-900">{item.sku}</td>
                      <td className="py-3 px-3 text-gray-600">{item.desc}</td>
                      <td className="py-3 px-3 text-gray-600">{item.loc}</td>
                      <td className="py-3 px-3 text-gray-900">{item.avail}</td>
                      <td className="py-3 px-3 text-gray-600">{item.res}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadge(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${typeBadge(item.type)}`}>
                          {typeLabel(item.type)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {purchaseOrders.length > 0 && (
        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Purchase Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="py-3 px-3">PO Number</th>
                  <th className="py-3 px-3">Supplier</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3">Delivery</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchaseOrders.map((po) => (
                  <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3 font-medium text-gray-900">{po.poNumber}</td>
                    <td className="py-3 px-3 text-gray-600">{po.supplierName}</td>
                    <td className="py-3 px-3 text-gray-600">{po.locationName}</td>
                    <td className="py-3 px-3 text-gray-600">{new Date(po.deliveryDate).toLocaleDateString()}</td>
                    <td className="py-3 px-3 text-gray-900">{currencyFormatter.format(po.totalCost)}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${poStatusBadge(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePrintPO(po)}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Printer className="h-3 w-3" aria-hidden />
                          Print
                        </button>
                        {po.status === 'PENDING' && (
                          <button
                            type="button"
                            onClick={() => openReceiveModal(po)}
                            className="inline-flex items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
                          >
                            <CheckCircle className="h-3 w-3" aria-hidden />
                            Receive
                          </button>
                        )}
                        {po.status === 'RECEIVED' && po.receivedBy && (
                          <span className="text-xs text-gray-500">
                            by {po.receivedBy}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(adjustNotification || poNotification) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {adjustNotification && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-md px-3 py-2 text-xs ${
                adjustNotification.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {adjustNotification.message}
            </div>
          )}
          {poNotification && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-md px-3 py-2 text-xs ${
                poNotification.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {poNotification.message}
            </div>
          )}
        </div>
      )}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-gray-900/70" onClick={() => setIsAdjustModalOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-2xl rounded-3xl border border-gray-100 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Stock adjustment</p>
                <p className="text-xs text-gray-500">Audit-friendly edits stay logged.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-sm font-semibold text-gray-500 transition hover:text-gray-900"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleAdjustmentSubmit} className="space-y-3">
                <div>
                  <label htmlFor="adjust-sku" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    SKU
                  </label>
                  <input
                    id="adjust-sku"
                    type="text"
                    value={adjustForm.sku}
                    onChange={(event) => handleAdjustFormChange('sku', event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                    placeholder="SKU123"
                  />
                </div>
                <div>
                  <label htmlFor="adjust-location" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Location
                  </label>
                  <select
                    id="adjust-location"
                    value={adjustForm.locationId}
                    onChange={(event) => handleAdjustFormChange('locationId', event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                  >
                    <option value="">Select a location</option>
                    {uniqueLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="adjust-type" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Type
                    </label>
                    <select
                      id="adjust-type"
                      value={adjustForm.type}
                      onChange={(event) => handleAdjustFormChange('type', event.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                    >
                      <option value="in">Add inventory</option>
                      <option value="out">Subtract inventory</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="adjust-quantity" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Quantity
                    </label>
                    <input
                      id="adjust-quantity"
                      type="number"
                      min={1}
                      value={adjustForm.quantity}
                      onChange={(event) => handleAdjustFormChange('quantity', event.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                      placeholder="25"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="adjust-reason" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Reason
                  </label>
                  <input
                    id="adjust-reason"
                    type="text"
                    value={adjustForm.reason}
                    onChange={(event) => handleAdjustFormChange('reason', event.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                    placeholder="Damage, transfer, or manual correction"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-gray-400">Auditable history preserved</span>
                  <button
                    type="submit"
                    disabled={adjustStatus === 'submitting'}
                    className="inline-flex items-center gap-2 rounded-md bg-dough-brown-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-dough-brown-600 disabled:opacity-60"
                  >
                    {adjustStatus === 'submitting' ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Saving
                      </span>
                    ) : (
                      'Record adjustment'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-gray-900/70" onClick={() => setIsPurchaseModalOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-4xl rounded-3xl border border-gray-100 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Create purchase order</p>
                <p className="text-xs text-gray-500">Inventory + finance aligned before you hit submit.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsPurchaseModalOpen(false)}
                className="text-sm font-semibold text-gray-500 transition hover:text-gray-900"
              >
                Close
              </button>
            </div>
            <div className="max-h-[80vh] overflow-y-auto p-6">
              <form onSubmit={handlePurchaseOrderSubmit} className="space-y-4">
                <div>
                  <label htmlFor="modal-po-number" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Purchase order ID
                  </label>
                  <input
                    id="modal-po-number"
                    type="text"
                    value={poDraftId}
                    readOnly
                    className="mt-1 w-full rounded-md border border-gray-200 bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-800"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="modal-supplier-name" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Supplier
                    </label>
                    <input
                      id="modal-supplier-name"
                      type="text"
                      value={poSupplierName}
                      onChange={(event) => setPoSupplierName(event.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                      placeholder="Supplier name"
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-supplier-contact" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Contact details
                    </label>
                    <input
                      id="modal-supplier-contact"
                      type="text"
                      value={poSupplierContact}
                      onChange={(event) => setPoSupplierContact(event.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                      placeholder="Phone or email"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="modal-po-location" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Location
                    </label>
                    <select
                      id="modal-po-location"
                      value={poLocationId}
                      onChange={(event) => setPoLocationId(event.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                    >
                      <option value="">Select a receiving location</option>
                      {uniqueLocations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="modal-po-delivery" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                      Delivery date & time
                    </label>
                    <input
                      id="modal-po-delivery"
                      type="datetime-local"
                      value={poDeliveryDate}
                      onChange={(event) => setPoDeliveryDate(event.target.value)}
                      className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <span>Line items</span>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setIsQuickAddOpen(true)}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                      >
                        + Quick Add New SKU
                      </button>
                      <button
                        type="button"
                        onClick={handleAddPurchaseRow}
                        className="text-xs font-semibold text-dough-brown-600 hover:text-dough-brown-800"
                      >
                        + Add Existing SKU
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-3">
                    {poItems.map((row, index) => (
                      <div
                        key={`po-item-${index}`}
                        className="grid gap-3 rounded-md border border-dashed border-gray-200 bg-gray-50 p-3 sm:grid-cols-6"
                      >
                        <div className="sm:col-span-3">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">SKU</label>
                          <select
                            value={row.skuId}
                            onChange={(event) => handlePurchaseItemChange(index, 'skuId', event.target.value)}
                            className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                          >
                            <option value="">Select raw ingredient</option>
                            {rawSkuOptions.length === 0 ? (
                              <option value="" disabled>
                                No raw ingredients tracked yet
                              </option>
                            ) : (
                              rawSkuOptions.map((option) => (
                                <option key={option.skuId} value={option.skuId}>
                                  {option.label}
                                </option>
                              ))
                            )}
                          </select>
                        </div>
                        <div className="sm:col-span-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Qty</label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.quantity}
                            onChange={(event) => handlePurchaseItemChange(index, 'quantity', event.target.value)}
                            className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                          />
                        </div>
                        <div className="sm:col-span-1">
                          <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Unit cost</label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={row.unitCost}
                            onChange={(event) => handlePurchaseItemChange(index, 'unitCost', event.target.value)}
                            className="mt-1 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                          />
                        </div>
                        <div className="sm:col-span-1 flex flex-col justify-end">
                          <span className="text-[10px] uppercase tracking-wide text-gray-400">Line total</span>
                          <span className="text-sm font-semibold text-gray-900">
                            {currencyFormatter.format((Number(row.quantity) || 0) * (Number(row.unitCost) || 0))}
                          </span>
                        </div>
                        <div className="sm:col-span-1 flex items-end justify-end">
                          <button
                            type="button"
                            disabled={poItems.length <= 1}
                            onClick={() => handleRemovePurchaseRow(index)}
                            className="text-xs font-semibold text-red-500 disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-sm font-semibold">
                  <span>Total estimated cost</span>
                  <span>{currencyFormatter.format(purchaseOrderTotal)}</span>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintPO()}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                  >
                    <Printer className="h-4 w-4" aria-hidden />
                    Print PO
                  </button>
                  <button
                    type="submit"
                    disabled={poStatus === 'submitting'}
                    className="inline-flex items-center gap-2 rounded-md bg-dough-brown-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-dough-brown-700 disabled:opacity-60"
                  >
                    {poStatus === 'submitting' ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Creating PO
                      </span>
                    ) : (
                      'Create purchase order'
                    )}
                  </button>
                </div>
                {poNotification && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`rounded-md px-3 py-2 text-sm ${
                      poNotification.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-100'
                        : 'bg-red-50 text-red-700 border border-red-100'
                    }`}
                  >
                    {poNotification.message}
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {isReceiveModalOpen && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8">
          <div className="absolute inset-0 bg-gray-900/70" onClick={() => setIsReceiveModalOpen(false)} aria-hidden />
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-lg rounded-3xl border border-gray-100 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Receive {selectedPO.poNumber}</p>
                <p className="text-xs text-gray-500">Mark this order as received and record variances.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="text-sm font-semibold text-gray-500 transition hover:text-gray-900"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleReceiveSubmit} className="space-y-4">
                <div>
                  <label htmlFor="receive-datetime" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Received date & time
                  </label>
                  <input
                    id="receive-datetime"
                    type="datetime-local"
                    value={receiveForm.receivedAt}
                    onChange={(e) => setReceiveForm((prev) => ({ ...prev, receivedAt: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="receive-by" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Received by
                  </label>
                  <input
                    id="receive-by"
                    type="text"
                    value={receiveForm.receivedBy}
                    onChange={(e) => setReceiveForm((prev) => ({ ...prev, receivedBy: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                    placeholder="Name of person receiving"
                  />
                </div>
                <div>
                  <label htmlFor="receive-variance" className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                    Variance notes (surplus/shortage)
                  </label>
                  <textarea
                    id="receive-variance"
                    rows={3}
                    value={receiveForm.varianceNotes}
                    onChange={(e) => setReceiveForm((prev) => ({ ...prev, varianceNotes: e.target.value }))}
                    className="mt-1 w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 focus:border-dough-brown-500 focus:outline-none"
                    placeholder="e.g. 5 kg flour short, 2 extra bags of sugar"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handlePrintPO(selectedPO)}
                    className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
                  >
                    <Printer className="h-4 w-4" aria-hidden />
                    Print
                  </button>
                  <button
                    type="submit"
                    disabled={receiveStatus === 'submitting'}
                    className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-60"
                  >
                    {receiveStatus === 'submitting' ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Saving
                      </span>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" aria-hidden />
                        Mark as received
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {adjustNotification && (
        <div
          role="status"
          aria-live="polite"
          className={`mt-4 rounded-md px-4 py-3 text-sm ${
            adjustNotification.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
          }`}
        >
          {adjustNotification.message}
        </div>
      )}

      <QuickAddSKUDialog
        open={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSKUCreated={handleQuickSKUCreated}
        locationId={poLocationId}
      />
    </>
  );
}
