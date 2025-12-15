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

// Step indicator component
function StepIndicator({ currentStep, steps }: { currentStep: number; steps: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex items-center gap-2">
            <div 
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                transition-all duration-300
                ${index < currentStep 
                  ? 'bg-green-500 text-white' 
                  : index === currentStep 
                    ? 'bg-dough-brown-500 text-white ring-4 ring-dough-brown-100' 
                    : 'bg-gray-200 text-gray-500'
                }
              `}
            >
              {index < currentStep ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
            </div>
            <span className={`text-sm font-medium hidden sm:block ${
              index === currentStep ? 'text-gray-900' : 'text-gray-500'
            }`}>
              {step}
            </span>
          </div>
          {index < steps.length - 1 && (
            <ChevronRight className="w-4 h-4 text-gray-300" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// Menu item card component
function MenuItemCard({ 
  item, 
  sku, 
  onAdd 
}: { 
  item: MenuItem; 
  sku: MetaPayload['skus'][0] | undefined;
  onAdd: (selectedAddons: MenuAddon[], variation: MenuVariation | null) => void;
}) {
  const [selectedAddons, setSelectedAddons] = React.useState<MenuAddon[]>([]);
  const [selectedVariation, setSelectedVariation] = React.useState<MenuVariation | null>(null);
  const canAdd = Boolean(sku);
  
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
          disabled={!canAdd}
          className="w-full mt-4 gap-2"
          variant={canAdd ? "default" : "outline"}
        >
          {canAdd ? (
            <>
              <Plus className="w-4 h-4" />
              Add to Cart
            </>
          ) : (
            <span className="text-gray-400">Coming Soon</span>
          )}
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
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lastPlacedOrder, setLastPlacedOrder] = useState<OrderSummary | null>(null);
  const [summaryChannel, setSummaryChannel] = useState<BroadcastChannel | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const steps = ['Browse Menu', 'Your Details', 'Review & Pay'];

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
      
      // Transform API response to match component expectations
      const transformedItems: MenuItem[] = data.items.map((item: any) => ({
        code: item.code,
        name: item.name,
        category: item.category || 'Other',
        basePrice: item.basePrice,
        description: item.description || '',
        variations: item.variations || [],
        addOns: item.addons || [],
      }));

      setMenuItems(transformedItems);
      setMenuGroups(data.grouped || []);

      // Set first category as active
      if (data.grouped && data.grouped.length > 0 && !activeCategory) {
        setActiveCategory(data.grouped[0].category);
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
    setCurrentStep(0);
  };

  const addMenuItemToOrder = (
    code: string, 
    selectedAddons: MenuAddon[] = [], 
    selectedVariation: MenuVariation | null = null
  ) => {
    const menuItem = menuItems.find((item) => item.code === code);
    if (!menuItem) return;
    const sku = meta.skus.find((record) => record.code === menuItem.code);
    setFormError(null);
    if (!sku) {
      toast.error('This item is not yet available');
      return;
    }
    
    // Calculate total price with variation and addons
    let unitPrice = sku.basePrice ?? menuItem.basePrice ?? 0;
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
        skuId: sku.id,
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
      let customerId: string | undefined;
      const contactSearch = (customer.email || customer.phone)?.trim();

      if (contactSearch) {
        const params = new URLSearchParams({ search: contactSearch, limit: '1' });
        const searchResponse = await fetch(`/api/customers?${params.toString()}`);
        if (searchResponse.ok) {
          const payload = await searchResponse.json();
          if (payload.data?.length) {
            customerId = payload.data[0].id;
          }
        }
      }

      if (!customerId) {
        const customerPayload = {
          name: trimmedName,
          email: customer.email.trim() || undefined,
          phone: customer.phone.trim() || undefined,
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
              <button
                onClick={() => setCurrentStep(2)}
                className="relative flex items-center gap-2 bg-gray-900 text-white 
                           px-4 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="font-semibold">{formatCurrency(netAmount)}</span>
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full 
                                 text-xs flex items-center justify-center font-bold">
                  {items.length}
                </span>
              </button>
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

        {/* Step indicator */}
        <StepIndicator currentStep={currentStep} steps={steps} />

        {/* Step 0: Browse Menu */}
        {currentStep === 0 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
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
                <Button
                  onClick={() => window.location.reload()}
                  className="mt-4"
                  variant="outline"
                >
                  Retry
                </Button>
              </div>
            )}

            {/* Menu content */}
            {!menuLoading && !menuError && menuGroups.length > 0 && (
              <>
                {/* Category tabs */}
                <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
                  {menuGroups.map((group) => (
                    <button
                      key={group.category}
                      onClick={() => setActiveCategory(group.category)}
                      className={`
                        px-5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border
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

                {/* Menu grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {menuGroups
                    .find((g) => g.category === activeCategory)
                    ?.items.map((item) => {
                      const sku = meta.skus.find((s) => s.code === item.code);
                      return (
                        <MenuItemCard
                          key={item.code}
                          item={item}
                          sku={sku}
                          onAdd={(selectedAddons, variation) => 
                            addMenuItemToOrder(item.code, selectedAddons, variation)
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

            {/* Continue button */}
            {items.length > 0 && (
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 p-4 
                              shadow-lg md:relative md:shadow-none md:bg-transparent md:border-0 md:mt-8">
                <div className="max-w-lg mx-auto">
                  <Button
                    onClick={() => setCurrentStep(1)}
                    className="w-full h-12 gap-2 text-base bg-gray-900 hover:bg-gray-800 text-white"
                  >
                    Continue
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                      {items.length} item{items.length > 1 ? 's' : ''} • {formatCurrency(netAmount)}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 1: Customer Details */}
        {currentStep === 1 && (
          <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <button
              onClick={() => setCurrentStep(0)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to menu
            </button>

            <div className="bg-white rounded-lg border border-gray-300 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">Your Details</h2>
                  <p className="text-sm text-gray-500">We'll use this to keep you updated</p>
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
                    onChange={(e) => setCustomer((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={customer.email}
                      onChange={(e) => setCustomer((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                    <Input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={customer.phone}
                      onChange={(e) => setCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setCurrentStep(2)}
                className="w-full mt-6 h-12 gap-2"
              >
                Review Order
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Review & Pay */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
            <button
              onClick={() => setCurrentStep(1)}
              className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to details
            </button>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Cart items */}
              <div className="bg-white rounded-lg border border-gray-300 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-gray-900" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Your Cart</h2>
                      <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep(0)}
                    className="text-sm text-gray-700 hover:text-gray-900 font-medium underline"
                  >
                    + Add more
                  </button>
                </div>

                {items.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <ShoppingCart className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">Your cart is empty</p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(0)}
                      className="mt-4"
                    >
                      Browse Menu
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
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

              {/* Order summary */}
              <div className="bg-white rounded-lg border border-gray-300 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-gray-900" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Order Summary</h3>
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

              {/* Error message */}
              {formError && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-red-600 text-sm
                                animate-in fade-in shake">
                  {formError}
                </div>
              )}

              {/* Submit button */}
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
          </div>
        )}
      </main>
    </div>
  );
}
