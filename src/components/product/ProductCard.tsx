"use client";

import { useState } from "react";
import Image from "next/image";
import { AddToCartButton } from "./AddToCartButton";
import { ProductVisual } from "./ProductVisual";
import { formatPrice, isVariantAvailable } from "./price";
import type { Product } from "@/types/catalog";
import { useCart } from "@/components/cart/CartProvider";
import { getDictionary } from "@/i18n/get-dictionary";

export function ProductCard({ product, index }: { product: Product; index: number }) {
  const { locale } = useCart();
  const dict = getDictionary(locale).productCard;
  const variants = product.variants.filter(isVariantAvailable);
  const [selectedId, setSelectedId] = useState(variants[0]?.id || "");
  const variant = variants.find((entry) => entry.id === selectedId) || variants[0];
  return <article className={`product-card${product.featured ? " featured" : ""}`}>
    <div className="product-card-media"><span className="product-card-category">{dict.collectionLabel}</span>{product.featured && <span className="product-badge">{dict.recommended}</span>}{product.image_url ? <Image src={product.image_url} alt={product.name} fill sizes="(max-width: 700px) 100vw, 33vw" className="catalog-image" /> : <ProductVisual index={index} />}<span className="product-color-caption"><span className="color-dots"><i /><i /><i /><i /></span>{dict.colorSurprise}</span></div>
    <div className="product-card-details"><div className="product-name-price"><h3>{product.name}</h3>{variant && <span>{formatPrice(variant.price_chf_cents)}</span>}</div><p>{product.short_description}</p>{variants.length > 1 ? <label className="variant-label">{dict.variant}<select value={variant?.id} onChange={(event) => setSelectedId(event.target.value)}>{variants.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} · {formatPrice(entry.price_chf_cents)}</option>)}</select></label> : <span className="variant-name">{variant?.name || dict.unavailable}</span>}<AddToCartButton variantId={variant?.id || ""} disabled={!variant} /></div>
  </article>;
}
