"use client";

import { ArrowUpRight, Plus } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";

export function AddToCartButton({ variantId, disabled = false, compact = false, label }: { variantId: string; disabled?: boolean; compact?: boolean; label?: string }) {
  const { addItem, settings } = useCart();
  const unavailable = disabled || settings.shop_maintenance;
  return <button className={`button ${compact ? "button-dark" : "button-product"}`} disabled={unavailable} onClick={() => addItem(variantId)}>{unavailable ? "BALD VERFÜGBAR" : label || "IN DEN WARENKORB"}{compact ? <ArrowUpRight size={17} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}</button>;
}
