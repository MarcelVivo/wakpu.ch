import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "./ProductCard";
import { ProductVisual } from "./ProductVisual";
import type { Product, SiteSettings } from "@/types/catalog";
import { formatPrice } from "./price";

export function ProductGrid({ products, settings }: { products: Product[]; settings: SiteSettings }) {
  return <section className="shop-section section-space" id="shop" aria-labelledby="shop-heading"><div className="container"><div className="section-topline"><p className="eyebrow">DEIN MOMENT. DEIN WAKPU.</p><span className="section-counter">02 / DIE KOLLEKTION</span></div><div className="section-heading-row"><h2 id="shop-heading">Bereit für deinen<br /><span className="muted-heading">ersten Crack?</span></h2><p>Einzeln entdecken. Zusammen cracken.<br />Finde den WAKPU, der zu dir passt.</p></div>
    {products.length && !settings.shop_maintenance ? <div className="product-grid">{products.slice(0, 3).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div> : <div className="launch-preview"><div className="launch-visual"><ProductVisual index={1} /></div><div className="launch-copy"><span className="trend-label"><Sparkles size={13} />VORFREUDE FÜHLT SICH GUT AN.</span><h3>Der nächste Crack<br />kommt bald.</h3><p>{settings.shop_maintenance ? "Wir machen WAKPU bereit für deinen nächsten guten Moment. Bestellungen sind gerade pausiert." : "Unsere WAKPU-Kollektion ist in Vorbereitung. Sobald alles bereit ist, findest du hier die verfügbaren Sets und ihre Preise."}</p><Link href="/kontakt" className="text-link">Kontakt zu WAKPU<ArrowUpRight size={17} /></Link></div></div>}
    <div className="mystery-strip"><div className="color-dots"><i /><i /><i /><i /></div><p><strong>Welche Farbe du bekommst?</strong> Lass dich überraschen.</p><span>MYSTERY COLOR</span></div><p className="shop-price-note">Alle Preise in CHF. Lieferung ausschliesslich in die Schweiz. {settings.shipping_cost_cents === null ? "Versandkosten werden vor Bestellabschluss ausgewiesen." : settings.shipping_cost_cents === 0 ? "Kostenloser Versand." : `Versandkosten: ${formatPrice(settings.shipping_cost_cents)}.`}</p>
  </div></section>;
}
