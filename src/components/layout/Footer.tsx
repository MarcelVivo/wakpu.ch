import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Logo } from "./Logo";
import type { SiteSettings } from "@/types/catalog";
import type { Locale } from "@/i18n/locales";
import { getDictionary } from "@/i18n/get-dictionary";
import { formatPrice } from "@/components/product/price";

export function Footer({ settings, locale }: { settings: SiteSettings; locale: Locale }) {
  const dict = getDictionary(locale);
  return <footer className="site-footer">
    <div className="container">
      <div className="footer-top"><div><p className="eyebrow">{dict.footer.tagline}</p><Logo locale={locale} large /></div><Link className="footer-shop-link" href={`/${locale}#shop`}>{dict.footer.shopLink}<ArrowUpRight size={27} /></Link></div>
      <div className="footer-middle"><p>{dict.footer.blurb}</p><nav aria-label={dict.footer.shopNavLabel}><Link href={`/${locale}#shop`}>{dict.nav.shop}</Link><Link href={`/${locale}#so-funktionierts`}>{dict.nav.howItWorks}</Link><Link href={`/${locale}#faq`}>{dict.nav.faq}</Link></nav><nav aria-label={dict.footer.infoNavLabel}><Link href={`/${locale}/kontakt`}>{dict.footer.contact}</Link><Link href={`/${locale}/versand`}>{dict.footer.shipping}</Link><Link href={`/${locale}/agb`}>{dict.footer.terms}</Link><Link href={`/${locale}/datenschutz`}>{dict.footer.privacy}</Link><Link href={`/${locale}/impressum`}>{dict.footer.imprint}</Link></nav><div className="footer-transparency"><span className="footer-label">{dict.footer.goodToKnow}</span><p>{dict.footer.allPricesChf}<br />{settings.shipping_cost_cents === null ? dict.footer.shippingKnownBeforePurchase : settings.shipping_cost_cents === 0 ? dict.footer.shippingFree : dict.footer.shippingCost(formatPrice(settings.shipping_cost_cents))}<br />{settings.shipping_text || dict.footer.deliveryDefault}</p><Link href={`/${locale}/kontakt`}>{settings.support_email || dict.footer.contactFallback}<ArrowUpRight size={14} /></Link></div></div>
      <div className="footer-bottom"><span>© {new Date().getFullYear()} WAKPU</span><span>{settings.swiss_shop_verified ? dict.footer.swissShop : dict.footer.notSwissShop}</span><span>{dict.footer.tagline2}</span></div>
    </div>
  </footer>;
}
