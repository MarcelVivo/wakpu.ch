"use client";

import Link from "next/link";
import { ShoppingBag, ArrowUpRight } from "lucide-react";
import { Logo } from "./Logo";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useCart } from "@/components/cart/CartProvider";
import type { Locale } from "@/i18n/locales";
import { getDictionary } from "@/i18n/get-dictionary";

export function Header({ locale }: { locale: Locale }) {
  const { count, openCart } = useCart();
  const dict = getDictionary(locale);
  return <>
    <div className="announcement"><span>{dict.announcement.left}</span><span className="announcement-right">{dict.announcement.right} <ArrowUpRight size={12} aria-hidden="true" /></span></div>
    <header className="site-header">
      <div className="header-inner container">
        <Logo locale={locale} />
        <nav className="main-nav" aria-label={dict.nav.main}><Link href={`/${locale}#shop`}>{dict.nav.shop}</Link><Link href={`/${locale}#so-funktionierts`}>{dict.nav.howItWorks}</Link><Link href={`/${locale}#faq`}>{dict.nav.faq}</Link></nav>
        <div className="header-actions"><LanguageSwitcher locale={locale} /><span className="shipping-country"><span className="swiss-flag" aria-hidden="true" />{dict.header.shippingCountry}</span><button className="cart-trigger" onClick={openCart} aria-label={`${dict.header.cartOpen}, ${count} ${dict.header.item}`}><ShoppingBag size={21} strokeWidth={1.7} /><span className="cart-count">{count}</span></button></div>
      </div>
    </header>
  </>;
}
