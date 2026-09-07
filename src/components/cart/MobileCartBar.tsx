"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Product } from "@/types/catalog";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { formatPrice, isVariantAvailable } from "@/components/product/price";
import { useCart } from "./CartProvider";
import { getDictionary } from "@/i18n/get-dictionary";

export function MobileCartBar({ products }: { products: Product[] }) {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const { isOpen, settings, locale } = useCart();
  const dict = getDictionary(locale).mobileCartBar;
  const product = products.find((entry) => entry.featured && entry.variants.some(isVariantAvailable)) || products.find((entry) => entry.variants.some(isVariantAvailable));
  const variant = product?.variants.find(isVariantAvailable);

  useEffect(() => {
    const hero = document.getElementById("hero");
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0), { threshold: 0 });
    observer.observe(hero);
    return () => observer.disconnect();
  }, [pathname]);

  if (pathname !== `/${locale}` || !product || !variant || !visible || isOpen || settings.shop_maintenance) return null;
  return <div className="mobile-cart-bar"><div><strong>{product.name}</strong><span>{formatPrice(variant.price_chf_cents)}</span></div><AddToCartButton variantId={variant.id} compact label={dict.orderNow} /></div>;
}
