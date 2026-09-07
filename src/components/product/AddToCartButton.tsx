"use client";

import { ArrowUpRight, Plus } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { getDictionary } from "@/i18n/get-dictionary";

export function AddToCartButton({ variantId, disabled = false, compact = false, label }: { variantId: string; disabled?: boolean; compact?: boolean; label?: string }) {
  const { addItem, settings, locale } = useCart();
  const dict = getDictionary(locale).addToCart;
  const unavailable = disabled || settings.shop_maintenance;
  return <button className={`button ${compact ? "button-dark" : "button-product"}`} disabled={unavailable} onClick={() => addItem(variantId)}>{unavailable ? dict.soon : label || dict.add}{compact ? <ArrowUpRight size={17} aria-hidden="true" /> : <Plus size={18} aria-hidden="true" />}</button>;
}
