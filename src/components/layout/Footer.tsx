import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "./Logo";
import type { SiteSettings } from "@/types/catalog";
import { formatPrice } from "@/components/product/price";

export function Footer({ settings }: { settings: SiteSettings }) {
  return <footer className="site-footer">
    <div className="container">
      <div className="footer-top"><div><p className="eyebrow">EIN KURZER DRUCK. EIN GUTER MOMENT.</p><Logo large /></div><Link className="footer-shop-link" href="/#shop">Finde deinen Crack.<ArrowUpRight size={27} /></Link></div>
      <div className="footer-middle"><p>Ein bisschen Farbe.<br />Ein bisschen Crack.<br />Ziemlich viel Gefühl.</p><nav aria-label="Footer Shop"><Link href="/#shop">Shop</Link><Link href="/#so-funktionierts">So funktionierts</Link><Link href="/#faq">FAQ</Link></nav><nav aria-label="Footer Informationen"><Link href="/kontakt">Kontakt</Link><Link href="/versand">Versand</Link><Link href="/agb">AGB</Link><Link href="/datenschutz">Datenschutz</Link><Link href="/impressum">Impressum</Link></nav><div className="footer-transparency"><span className="footer-label">GUT ZU WISSEN</span><p>Alle Preise in CHF.<br />{settings.shipping_cost_cents === null ? "Versandkosten vor dem Kauf ersichtlich." : settings.shipping_cost_cents === 0 ? "Versand kostenlos." : `Versand: ${formatPrice(settings.shipping_cost_cents)}.`}<br />{settings.shipping_text || "Lieferinformationen werden vor Verkaufsstart ergänzt."}</p><Link href="/kontakt">{settings.support_email || "Kontaktinformationen"}<ArrowUpRight size={14} /></Link></div></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} WAKPU</span><span>{settings.swiss_shop_verified ? "Schweizer Shop" : "Für deine kleinen Wow-Momente."}</span><span>CRACK IT. FEEL IT.</span></div>
    </div>
  </footer>;
}
