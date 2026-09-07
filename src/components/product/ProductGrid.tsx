import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "./ProductCard";
import { ProductVisual } from "./ProductVisual";
import { WaitlistForm } from "./WaitlistForm";
import type { Product, SiteSettings } from "@/types/catalog";
import type { Locale } from "@/i18n/locales";
import { getDictionary } from "@/i18n/get-dictionary";
import { Lines } from "@/i18n/render-lines";
import { formatPrice } from "./price";

export function ProductGrid({ products, settings, locale }: { products: Product[]; settings: SiteSettings; locale: Locale }) {
  const dict = getDictionary(locale).productGrid;
  return <section className="shop-section section-space" id="shop" aria-labelledby="shop-heading"><div className="container"><div className="section-topline"><p className="eyebrow">{dict.eyebrow}</p><span className="section-counter">{dict.counter}</span></div><div className="section-heading-row"><h2 id="shop-heading">{dict.heading1}<br /><span className="muted-heading">{dict.heading2}</span></h2><p><Lines text={dict.intro} /></p></div>
    {products.length && !settings.shop_maintenance ? <div className="product-grid">{products.slice(0, 3).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="launch-preview"><div className="launch-visual"><ProductVisual index={1} /></div><div className="launch-copy"><span className="trend-label"><Sparkles size={13} />{dict.launchLabel}</span><h3><Lines text={dict.launchTitle} /></h3><p>{settings.shop_maintenance ? dict.launchTextMaintenance : dict.launchTextPrelaunch}</p><WaitlistForm /><Link href={`/${locale}/kontakt`} className="text-link">{dict.contactLink}<ArrowUpRight size={17} /></Link></div></div>}
    <div className="mystery-strip"><div className="color-dots"><i /><i /><i /><i /></div><p><strong>{dict.mysteryTitle}</strong> {dict.mysteryText}</p><span>{dict.mysteryTag}</span></div><p className="shop-price-note">{dict.allPricesChf} {settings.shipping_cost_cents === null ? dict.shippingKnownAtCheckout : settings.shipping_cost_cents === 0 ? dict.shippingFree : dict.shippingCost(formatPrice(settings.shipping_cost_cents))}</p>
  </div></section>;
}
