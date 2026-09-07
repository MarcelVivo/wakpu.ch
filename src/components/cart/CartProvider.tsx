"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Product, ProductVariant, SiteSettings } from "@/types/catalog";
import type { Locale } from "@/i18n/locales";
import { isVariantAvailable } from "@/components/product/price";

export interface CartEntry { variantId: string; quantity: number }
export interface CartLine extends CartEntry { product: Product; variant: ProductVariant }

interface CartContextValue {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  settings: SiteSettings;
  locale: Locale;
  addItem: (variantId: string) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  openCart: () => void;
  closeCart: () => void;
  checkoutRequestId: () => string;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "wakpu-cart-v1";
const MAX_QUANTITY = 10;

export function CartProvider({ products, settings, locale, children }: { products: Product[]; settings: SiteSettings; locale: Locale; children: React.ReactNode }) {
  const [entries, setEntries] = useState<CartEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const request = useRef<{ fingerprint: string; id: string } | null>(null);
  const catalog = useMemo(() => {
    const map = new Map<string, { product: Product; variant: ProductVariant }>();
    products.filter((product) => product.active).forEach((product) => {
      product.variants.filter(isVariantAvailable).forEach((variant) => map.set(variant.id, { product, variant }));
    });
    return map;
  }, [products]);

  useEffect(() => {
    // Hydrate the persisted cart after mount; localStorage is unavailable during SSR.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (Array.isArray(saved)) {
        const unique = new Map<string, CartEntry>();
        saved.slice(0, 60).forEach((entry: unknown) => {
          if (!entry || typeof entry !== "object") return;
          const item = entry as Record<string, unknown>;
          if (typeof item.variantId === "string" && catalog.has(item.variantId) && typeof item.quantity === "number" && Number.isInteger(item.quantity) && item.quantity > 0) {
            unique.set(item.variantId, { variantId: item.variantId, quantity: Math.min(MAX_QUANTITY, item.quantity) });
          }
        });
        setEntries([...unique.values()]);
      }
    } catch { /* A restricted browser or invalid cart must never block shopping. */ }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [catalog]);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch { /* The in-memory cart remains usable. */ }
  }, [entries, ready]);

  const lines = useMemo(() => entries.flatMap((entry) => {
    const item = catalog.get(entry.variantId);
    return item ? [{ ...entry, ...item }] : [];
  }), [entries, catalog]);

  const addItem = useCallback((variantId: string) => {
    if (!catalog.has(variantId) || settings.shop_maintenance) return;
    setEntries((current) => {
      if (current.reduce((total, entry) => total + entry.quantity, 0) >= 30) return current;
      const existing = current.find((entry) => entry.variantId === variantId);
      return existing ? current.map((entry) => entry.variantId === variantId ? { ...entry, quantity: Math.min(MAX_QUANTITY, entry.quantity + 1) } : entry) : [...current, { variantId, quantity: 1 }];
    });
    setIsOpen(true);
  }, [catalog, settings.shop_maintenance]);

  const setQuantity = useCallback((variantId: string, quantity: number) => {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) return;
    setEntries((current) => {
      if (current.reduce((total, entry) => total + (entry.variantId === variantId ? quantity : entry.quantity), 0) > 30) return current;
      return current.map((entry) => entry.variantId === variantId ? { ...entry, quantity } : entry);
    });
  }, []);

  const clearCart = useCallback(() => {
    setEntries([]);
    request.current = null;
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* In-memory cart is still cleared. */ }
  }, []);

  const value: CartContextValue = {
    clearCart,
    lines,
    count: lines.reduce((sum, entry) => sum + entry.quantity, 0),
    subtotal: lines.reduce((sum, entry) => sum + entry.variant.price_chf_cents * entry.quantity, 0),
    isOpen, settings, locale, addItem, setQuantity,
    removeItem: (variantId) => setEntries((current) => current.filter((entry) => entry.variantId !== variantId)),
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    checkoutRequestId: () => {
      const fingerprint = JSON.stringify(entries);
      if (!request.current || request.current.fingerprint !== fingerprint) request.current = { fingerprint, id: crypto.randomUUID() };
      return request.current.id;
    },
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("Cart components must be inside CartProvider.");
  return context;
}
