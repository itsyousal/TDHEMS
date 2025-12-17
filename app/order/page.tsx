'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, 
  ShoppingCart, 
  CheckCircle2, 
  Plus, 
  Minus,
  Trash2,
  User,
  MapPin,
  Calendar,
  Package,
  CreditCard,
  ChevronRight,
  Sparkles,
  Clock,
  Phone,
  Mail,
  Store,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
type OrderItemForm = {
  skuId: string;
  quantity: string;
  unitPrice: string;
  addons: string;
  addonPreset: string;
  name?: string;
};

type OrderSummary = {
  id: string;
  orderNumber: string;
  netAmount: number;
  totalAmount: number;
  taxAmount: number;
  discountAmount: number;
  status: string;
  deliveryDate?: string;
  items: Array<{ skuId: string; quantity: number; unitPrice: number; totalPrice: number; notes?: string }>;
};

type CustomerSummary = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type MetaPayload = {
  locations: Array<{ id: string; name: string; slug: string }>;
  channelSources: Array<{ id: string; name: string }>;
  skus: Array<{ id: string; name: string; code: string; basePrice: number }>;
};

type MenuVariation = {
  id: string;
  name: string;
  priceModifier: number;
};

type MenuAddon = {
  id: string;
  name: string;
  price: number;
};

type MenuItem = {
  id: string;
  code: string;
  name: string;
  category: string;
  basePrice: number;
  description: string;
  variations?: MenuVariation[];
  addOns?: MenuAddon[];
};

type MenuGroup = {
  category: string;
  items: MenuItem[];
};

const TAX_RATE = 0.05;
const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
});
const formatCurrency = (value: number) => currencyFormatter.format(value);
const normalizeAddonValue = (label: string) =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-');

// Menu item card component
function MenuItemCard({ 
  item, 
  onAdd 
}: { 
  item: MenuItem; 
  onAdd: (selectedAddons: MenuAddon[], variation: MenuVariation | null) => void;
}) {
  const [selectedAddons, setSelectedAddons] = React.useState<MenuAddon[]>([]);
  const [selectedVariation, setSelectedVariation] = React.useState<MenuVariation | null>(null);
  
  const toggleAddon = (addon: MenuAddon) => {
    setSelectedAddons(prev => 
      prev.find(a => a.id === addon.id)
        ? prev.filter(a => a.id !== addon.id)
        : [...prev, addon]
    );
  };

  const selectVariation = (variation: MenuVariation | null) => {
    setSelectedVariation(prev => prev?.id === variation?.id ? null : variation);
  };

  const handleAdd = () => {
    onAdd(selectedAddons, selectedVariation);
    setSelectedAddons([]);
    setSelectedVariation(null);
  };
  
  return (
    <div className="group relative bg-white rounded-lg border border-gray-300 overflow-hidden
                    hover:border-gray-400 transition-all">
      {/* Image placeholder */}
      <div className="h-32 bg-gray-100 border-b border-gray-200
                      flex items-center justify-center relative overflow-hidden">
        <Package className="w-12 h-12 text-gray-400" />
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="text-xs">
            {formatCurrency(item.basePrice)}
          </Badge>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900">
          {item.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
        
        {/* Variations with radio buttons (max 1 selection) */}
        {item.variations && item.variations.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-700 mb-1.5">Variation (choose one):</p>
            <div className="space-y-1.5">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`variation-${item.code}`}
                    checked={selectedVariation === null}
                    onChange={() => selectVariation(null)}
                    className="w-4 h-4 border-gray-300"
                  />
                  <span className="text-sm text-gray-700">Regular</span>
                </div>
              </label>
              {item.variations.map((variation) => (
                <label key={variation.id} className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`variation-${item.code}`}
                      checked={selectedVariation?.id === variation.id}
                      onChange={() => selectVariation(variation)}
                      className="w-4 h-4 border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{variation.name}</span>
                  </div>
                  {variation.priceModifier !== 0 && (
                    <span className="text-xs text-gray-600">
                      +{formatCurrency(variation.priceModifier)}
                    </span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Add-ons with checkboxes */}
        {item.addOns && item.addOns.length > 0 && (
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-700 mb-1.5">Add-ons:</p>
            <div className="space-y-1.5">
              {item.addOns.map((addon) => (
                <label key={addon.id} className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedAddons.some(a => a.id === addon.id)}
                      onChange={() => toggleAddon(addon)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">{addon.name}</span>
                  </div>
                  <span className="text-xs text-gray-600">
                    +{formatCurrency(addon.price)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
        
        <Button
          type="button"
          onClick={handleAdd}
          className="w-full mt-4 gap-2"
          variant="default"
        >
          <Plus className="w-4 h-4" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
}

// Cart item component
function CartItem({
  item,
  sku,
  onUpdateQuantity,
  onRemove,
}: {
  item: OrderItemForm;
  sku: MetaPayload['skus'][0] | undefined;
  onUpdateQuantity: (delta: number) => void;
  onRemove: () => void;
}) {
  const quantity = Number(item.quantity) || 1;
  const unitPrice = Number(item.unitPrice) || 0;
  const lineTotal = quantity * unitPrice;

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
      <div className="flex gap-4">
        {/* Item image placeholder */}
        <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200
                        flex items-center justify-center flex-shrink-0">
          <Package className="w-6 h-6 text-gray-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-gray-900 truncate">
                {sku?.name || item.name || 'Unknown Item'}
              </h4>
              <p className="text-sm text-gray-500">{formatCurrency(unitPrice)} each</p>
              {item.addons && (
                <p className="text-xs text-gray-600 mt-1">Add-ons: {item.addons}</p>
              )}
            </div>
            <button
              onClick={onRemove}
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 
                         rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          
          {/* Quantity controls */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateQuantity(-1)}
                disabled={quantity <= 1}
                className="w-8 h-8 rounded border border-gray-300 bg-white
                           flex items-center justify-center
                           hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <button
                onClick={() => onUpdateQuantity(1)}
                className="w-8 h-8 rounded border border-gray-300 bg-white
                           flex items-center justify-center
                           hover:bg-gray-100 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <p className="font-semibold text-gray-900">
              {formatCurrency(lineTotal)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Order success view
function OrderSuccessView({ 
  order, 
  skus,
  onNewOrder 
}: { 
  order: OrderSummary; 
  skus: MetaPayload['skus'];
  onNewOrder: () => void;
}) {
  return (
    <div className="animate-in fade-in zoom-in-95 duration-500">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4
                        animate-in zoom-in duration-300">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Order Confirmed!</h2>
        <p className="text-gray-500 mt-1">Your order has been placed successfully</p>
      </div>
      
      {/* Order details card */}
      <div className="bg-white rounded-lg border border-gray-300 overflow-hidden">
        <div className="bg-gray-900 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Order Number</p>
              <p className="text-xl font-bold">#{order.orderNumber}</p>
            </div>
            <div className="text-right">
              <Badge className="bg-white/20 text-white hover:bg-white/30">
                {order.status}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {/* Delivery info */}
          {order.deliveryDate && (
            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-100 rounded-lg border border-gray-200">
              <Calendar className="w-5 h-5 text-gray-700" />
              <div>
                <p className="text-sm text-gray-700 font-medium">Expected Delivery</p>
                <p className="text-gray-900">{new Date(order.deliveryDate).toLocaleDateString('en-IN', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</p>
              </div>
            </div>
          )}
          
          {/* Order items */}
          <div className="space-y-3 mb-6">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Items</p>
            {order.items.map((item, idx) => {
              const sku = skus.find((s) => s.id === item.skuId);
              return (
                <div key={`${item.skuId}-${idx}`} 
                     className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200
                                    flex items-center justify-center">
                      <Package className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{sku?.name || 'Item'}</p>
                      <p className="text-sm text-gray-500">
                        Qty: {item.quantity} × {formatCurrency(item.unitPrice)}
                        {item.notes && <span className="ml-2 text-dough-brown-500">• {item.notes}</span>}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold">{formatCurrency(item.totalPrice)}</p>
                </div>
              );
            })}
          </div>
          
          {/* Price breakdown */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatCurrency(order.totalAmount - order.taxAmount + order.discountAmount)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Tax (5%)</span>
              <span>{formatCurrency(order.taxAmount)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(order.discountAmount)}</span>
              </div>
            )}
            <div className="border-t border-gray-300 pt-2 mt-2">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-gray-900">{formatCurrency(order.netAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Action button */}
      <Button onClick={onNewOrder} className="w-full mt-6 h-12 gap-2 bg-gray-900 hover:bg-gray-800">
        <Plus className="w-4 h-4" />
        Place Another Order
      </Button>
    </div>
  );
}

export default function CustomerOrderPage() {
  const [meta, setMeta] = useState<MetaPayload>({
    locations: [],
    channelSources: [],
    skus: [],
  });
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [items, setItems] = useState<OrderItemForm[]>([]);
  const [formState, setFormState] = useState({
    locationId: '',
    channelSourceId: '',
    deliveryDate: '',
    notes: '',
    discount: '0',
  });
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '' });
  const [resolvedCustomerId, setResolvedCustomerId] = useState<string | null>(null);
  const [isFetchingCustomer, setIsFetchingCustomer] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<OrderSummary | null>(null);
  const [summaryChannel, setSummaryChannel] = useState<BroadcastChannel | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const response = await fetch('/api/meta');
        if (!response.ok) {
          throw new Error('Unable to load store settings');
        }
        const payload = await response.json();
        setMeta({
          locations: payload.locations || [],
          channelSources: payload.channelSources || [],
          skus: payload.skus || [],
        });
        setFormState((prev) => ({
          ...prev,
          locationId: prev.locationId || payload.locations?.[0]?.id || '',
          channelSourceId: prev.channelSourceId || payload.channelSources?.[0]?.id || '',
        }));

        // Load menu data with orgId from meta response
        if (payload.org?.id) {
          loadMenuData(payload.org.id);
        }
      } catch (error) {
        console.error('Customer order meta failed', error);
        setMetaError(error instanceof Error ? error.message : 'Unable to load store settings');
      } finally {
        setMetaLoading(false);
      }
    };
    loadMeta();
  }, []);

  const loadMenuData = async (orgId: string) => {
    try {
      setMenuLoading(true);
      setMenuError(null);

      const response = await fetch(`/api/menu?orgId=${orgId}`);
      
      if (!response.ok) {
        throw new Error('Unable to load menu');
      }

      const data = await response.json();

      const transformMenuItem = (raw: any): MenuItem => ({
        id: raw.id,
        code: raw.code,
        name: raw.name,
        category: raw.category || 'Other',
        basePrice: raw.basePrice,
        description: raw.description || '',
        variations: raw.variations || [],
        addOns: raw.addons || [],
      });
      
      // Transform API response to match component expectations
      const transformedItems: MenuItem[] = (data.items || []).map(transformMenuItem);

      const transformedGroups: MenuGroup[] = (data.grouped || []).map((group: any) => ({
        category: group.category,
        items: (group.items || []).map(transformMenuItem),
      }));

      setMenuItems(transformedItems);
      setMenuGroups(transformedGroups);

      // Set first category as active
      if (transformedGroups.length > 0 && !activeCategory) {
        setActiveCategory(transformedGroups[0].category);
      }
    } catch (error) {
      console.error('Failed to load menu', error);
      setMenuError(error instanceof Error ? error.message : 'Unable to load menu');
    } finally {
      setMenuLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('pos-orders');
    setSummaryChannel(channel);
    return () => channel.close();
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return sum + quantity * unitPrice;
    }, 0);
  }, [items]);

  const discountValue = Math.max(0, Number(formState.discount) || 0);
  const taxAmount = Number((subtotal * TAX_RATE).toFixed(2));
  const netAmount = Math.max(subtotal + taxAmount - discountValue, 0);

  const handleItemChange = (index: number, field: keyof OrderItemForm, value: string) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        if (field === 'skuId') {
          const selectedSku = meta.skus.find((sku) => sku.id === value);
          return {
            ...item,
            skuId: value,
            unitPrice: value ? String(selectedSku?.basePrice ?? item.unitPrice) : '0',
            name: selectedSku?.name,
          };
        }
        return { ...item, [field]: value };
      }),
    );
  };

  const updateItemQuantity = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== index) return item;
        const newQty = Math.max(1, (Number(item.quantity) || 1) + delta);
        return { ...item, quantity: String(newQty) };
      })
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const resetForm = () => {
    setItems([]);
    setFormState((prev) => ({
      ...prev,
      deliveryDate: '',
      notes: '',
      discount: '0',
    }));
    setCustomer({ name: '', email: '', phone: '' });
    setResolvedCustomerId(null);
    setActiveCategory(menuGroups[0]?.category ?? null);
  };

  const addMenuItemToOrder = (
    menuItem: MenuItem,
    selectedAddons: MenuAddon[] = [],
    selectedVariation: MenuVariation | null = null
  ) => {
    setFormError(null);
    
    // Calculate total price with variation and addons
    let unitPrice = menuItem.basePrice ?? 0;
    const addonNames: string[] = [];
    
    // Add variation price modifier
    if (selectedVariation) {
      unitPrice += selectedVariation.priceModifier;
      addonNames.push(selectedVariation.name);
    }
    
    // Add addon prices
    selectedAddons.forEach(addon => {
      unitPrice += addon.price;
      addonNames.push(addon.name);
    });
    
    const addonsText = addonNames.length > 0 ? addonNames.join(', ') : '';
    
    // Always add as new item (even if exists) to preserve different addon combinations
    setItems((prev) => [
      ...prev,
      {
        skuId: menuItem.id,
        quantity: '1',
        unitPrice: String(unitPrice),
        addons: addonsText,
        addonPreset: 'none',
        name: menuItem.name,
      },
    ]);
    
    const addonMsg = addonsText ? ` with ${addonsText}` : '';
    toast.success(`${menuItem.name}${addonMsg} added to cart`);
  };

  const handleFetchCustomer = async () => {
    if (isFetchingCustomer) return;
    setFormError(null);
    setIsFetchingCustomer(true);

    try {
      const email = customer.email.trim();
      const phone = customer.phone.trim();
      const name = customer.name.trim();
      const search = email || phone || name;

      if (!search) {
        toast.error('Enter an email, phone, or name to fetch the customer.');
        return;
      }

      const params = new URLSearchParams({ search, limit: '1' });
      const response = await fetch(`/api/customers?${params.toString()}`);

      if (response.status === 401) {
        toast.error('Please sign in to fetch customers.');
        return;
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'Unable to fetch customer' }));
        throw new Error(errorBody?.error || 'Unable to fetch customer');
      }

      const payload = (await response.json()) as { data?: CustomerSummary[] };
      const found = payload.data?.[0];

      if (found) {
        setResolvedCustomerId(found.id);
        setCustomer({
          name: found.name || name,
          email: found.email ?? email,
          phone: found.phone ?? phone,
        });
        toast.success(`Customer found: ${found.name}`);
        return;
      }

      // Not found: create
      if (!name) {
        toast.error('Customer not found. Enter a name to add a new customer.');
        return;
      }

      toast.message('Customer not found. Adding new customer to database');

      const createResponse = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email: email || undefined,
          phone: phone || undefined,
          segment: 'customer',
          status: 'active',
          loyaltyTier: 'bronze',
        }),
      });

      if (createResponse.status === 401) {
        toast.error('Please sign in to add customers.');
        return;
      }

      if (!createResponse.ok) {
        const errorBody = await createResponse.json().catch(() => ({ error: 'Unable to create customer record' }));
        throw new Error(errorBody?.error || 'Unable to create customer record');
      }

      const created = (await createResponse.json()) as CustomerSummary;
      setResolvedCustomerId(created.id);
      setCustomer({
        name: created.name || name,
        email: created.email ?? email,
        phone: created.phone ?? phone,
      });
      toast.success('Customer added to database.');
    } catch (error) {
      console.error('Fetch customer failed', error);
      toast.error(error instanceof Error ? error.message : 'Unable to fetch customer');
    } finally {
      setIsFetchingCustomer(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const trimmedName = customer.name.trim();

    if (!trimmedName) {
      setFormError('Please provide your name.');
      return;
    }

    const validItems = items
      .map((item) => {
        if (!item.skuId) return null;
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);
        if (!quantity || !unitPrice) return null;
        const notes = item.addons.trim() || undefined;
        return {
          skuId: item.skuId,
          quantity,
          unitPrice,
          notes,
        };
      })
      .filter(Boolean) as Array<{ skuId: string; quantity: number; unitPrice: number; notes?: string }>;

    if (!validItems.length) {
      setFormError('Your cart is empty. Add some items first!');
      return;
    }

    setIsSaving(true);
    try {
      let customerId: string | undefined = resolvedCustomerId ?? undefined;
      const contactSearch = (customer.email || customer.phone)?.trim();

      if (!customerId && contactSearch) {
        const params = new URLSearchParams({ search: contactSearch, limit: '1' });
        const searchResponse = await fetch(`/api/customers?${params.toString()}`);
        if (searchResponse.ok) {
          const payload = await searchResponse.json();
          if (payload.data?.length) {
            customerId = payload.data[0].id;
            setResolvedCustomerId(payload.data[0].id);
            toast.success(`Customer found: ${payload.data[0].name || trimmedName}`);
          }
        }
      }

      if (!customerId) {
        toast.message('Customer not found. Adding new customer to database');
        const customerPayload = {
          name: trimmedName,
          email: customer.email.trim() || undefined,
          phone: customer.phone.trim() || undefined,
          segment: 'customer',
          status: 'active',
          loyaltyTier: 'bronze',
        };
        const createdCustomer = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(customerPayload),
        });

        if (!createdCustomer.ok) {
          const errorBody = await createdCustomer.json().catch(() => ({ error: 'Unable to create customer record' }));
          throw new Error(errorBody?.error || 'Unable to create customer record');
        }
        const customerBody = await createdCustomer.json();
        customerId = customerBody.id;
        setResolvedCustomerId(customerBody.id);
        toast.success('Customer added to database.');
      }

      const orderPayload = {
        locationId: formState.locationId,
        channelSourceId: formState.channelSourceId,
        customerId,
        deliveryDate: formState.deliveryDate || undefined,
        notes: formState.notes.trim() || undefined,
        discountAmount: Number(formState.discount) || 0,
        items: validItems,
      };

      const orderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      if (!orderResponse.ok) {
        const errorBody = await orderResponse.json().catch(() => ({ error: 'Unable to place order' }));
        throw new Error(errorBody?.error || 'Unable to place order');
      }

      const createdOrder = await orderResponse.json();
      toast.success('Order placed successfully!');
      const summary: OrderSummary = {
        id: createdOrder.id,
        orderNumber: createdOrder.orderNumber,
        netAmount: createdOrder.netAmount,
        totalAmount: createdOrder.totalAmount,
        taxAmount: createdOrder.taxAmount,
        discountAmount: createdOrder.discountAmount,
        status: createdOrder.status,
        deliveryDate: createdOrder.deliveryDate || undefined,
        items: createdOrder.items || [],
      };
      setLastPlacedOrder(summary);
      summaryChannel?.postMessage({ type: 'order-created', orderId: createdOrder.id });
    } catch (error) {
      console.error('Customer order submission failed', error);
      setFormError(error instanceof Error ? error.message : 'Unable to place the order.');
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (metaLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="text-center animate-pulse">
          <div className="w-16 h-16 bg-dough-brown-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-dough-brown-400" />
          </div>
          <p className="text-dough-brown-600 font-medium">Loading menu...</p>
        </div>
      </div>
    );
  }

  // Show success view if order was placed
  if (lastPlacedOrder) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 md:py-12">
        <div className="max-w-lg mx-auto">
          <OrderSuccessView 
            order={lastPlacedOrder} 
            skus={meta.skus}
            onNewOrder={() => {
              setLastPlacedOrder(null);
              resetForm();
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-300 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-gray-900 text-lg">Dough House</h1>
                <p className="text-sm text-gray-600">Order Online</p>
              </div>
            </div>
            
            {/* Cart indicator */}
            {items.length > 0 && (
              <div
                className="relative flex items-center gap-2 bg-gray-900 text-white 
                           px-4 py-2.5 rounded-lg"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="font-semibold">{formatCurrency(netAmount)}</span>
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full 
                                 text-xs flex items-center justify-center font-bold">
                  {items.length}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {metaError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 
                          flex items-center gap-3 animate-in fade-in">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-lg">⚠️</span>
            </div>
            <p>{metaError}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Catalog */}
          <section className="lg:col-span-8">
            <div className="bg-white rounded-lg border border-gray-300 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                  <p className="text-sm text-gray-500">Tap an item to add it to the cart</p>
                </div>
                {items.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Badge variant="secondary">{items.length} item{items.length !== 1 ? 's' : ''}</Badge>
                    <span className="font-semibold text-gray-900">{formatCurrency(netAmount)}</span>
                  </div>
                )}
              </div>

              {/* Loading state */}
              {menuLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="w-12 h-12 text-gray-400 animate-spin mb-4" />
                  <p className="text-gray-500 text-lg">Loading menu...</p>
                </div>
              )}

              {/* Error state */}
              {menuError && !menuLoading && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-900 font-semibold mb-2">Failed to load menu</p>
                  <p className="text-red-700 text-sm">{menuError}</p>
                  <Button onClick={() => window.location.reload()} className="mt-4" variant="outline">
                    Retry
                  </Button>
                </div>
              )}

              {/* Menu content */}
              {!menuLoading && !menuError && menuGroups.length > 0 && (
                <>
                  <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
                    {menuGroups.map((group) => (
                      <button
                        key={group.category}
                        onClick={() => setActiveCategory(group.category)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border
                          ${activeCategory === group.category
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
                          }
                        `}
                      >
                        {group.category}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {menuGroups
                      .find((g) => g.category === activeCategory)
                      ?.items.map((item) => {
                        return (
                          <MenuItemCard
                            key={item.code}
                            item={item}
                            onAdd={(selectedAddons, variation) =>
                              addMenuItemToOrder(item, selectedAddons, variation)
                            }
                          />
                        );
                      })}
                  </div>
                </>
              )}

              {/* Empty state */}
              {!menuLoading && !menuError && menuGroups.length === 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-16 text-center">
                  <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-900 font-semibold text-lg mb-2">No menu items available</p>
                  <p className="text-gray-600">Please check back later or contact us</p>
                </div>
              )}
            </div>
          </section>

          {/* Right: Cart + Checkout */}
          <aside className="lg:col-span-4">
            <form onSubmit={handleSubmit} className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-white rounded-lg border border-gray-300 p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-gray-900" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Cart</h2>
                      <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(netAmount)}</p>
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ShoppingCart className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600">Your cart is empty</p>
                    <p className="text-xs text-gray-500 mt-1">Add items from the menu to start</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[45vh] overflow-auto pr-1">
                    {items.map((item, index) => {
                      const sku = meta.skus.find((s) => s.id === item.skuId);
                      return (
                        <CartItem
                          key={`${item.skuId}-${index}`}
                          item={item}
                          sku={sku}
                          onUpdateQuantity={(delta) => updateItemQuantity(index, delta)}
                          onRemove={() => removeItem(index)}
                        />
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg border border-gray-300 p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-900" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Customer</h3>
                    <p className="text-sm text-gray-500">Required for placing the order</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      placeholder="Enter your name"
                      value={customer.name}
                      onChange={(e) => {
                        setResolvedCustomerId(null);
                        setCustomer((prev) => ({ ...prev, name: e.target.value }));
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={customer.email}
                        onChange={(e) => {
                          setResolvedCustomerId(null);
                          setCustomer((prev) => ({ ...prev, email: e.target.value }));
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                      <Input
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={customer.phone}
                        onChange={(e) => {
                          setResolvedCustomerId(null);
                          setCustomer((prev) => ({ ...prev, phone: e.target.value }));
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleFetchCustomer}
                      disabled={isFetchingCustomer}
                      className="gap-2"
                    >
                      {isFetchingCustomer ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <User className="w-4 h-4" />
                          Fetch Customer
                        </>
                      )}
                    </Button>

                    {resolvedCustomerId && (
                      <Badge variant="secondary">Customer linked</Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-300 p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-gray-900" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Summary</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax (5%)</span>
                    <span className="font-medium">{formatCurrency(taxAmount)}</span>
                  </div>
                  {discountValue > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span className="font-medium">-{formatCurrency(discountValue)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-3 mt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="text-xl font-bold text-gray-900">{formatCurrency(netAmount)}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-4 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Pay when you pickup your order
                </p>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm animate-in fade-in shake">
                  {formError}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSaving || items.length === 0}
                className="w-full h-14 text-lg gap-3 shadow-lg shadow-dough-brown-200"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    Place Order • {formatCurrency(netAmount)}
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-gray-400">
                By placing your order, you agree to our terms and conditions
              </p>
            </form>
          </aside>
        </div>
      </main>
    </div>
  );
}
