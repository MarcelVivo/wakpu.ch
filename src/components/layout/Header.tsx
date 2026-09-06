"use client";

import Link from "next/link";
import { ShoppingBag, ArrowUpRight } from "lucide-react";
import { Logo } from "./Logo";
import { useCart } from "@/components/cart/CartProvider";

export function Header() {
  const { count, openCart } = useCart();
  return <>
    <div className="announcement"><span>KLEINER BALL. GROSSES GEFÜHL.</span><span className="announcement-right">ENTDECKE DEINEN CRACK-MOMENT <ArrowUpRight size={12} aria-hidden="true" /></span></div>
    <header className="site-header">
      <div className="header-inner container">
        <Logo />
        <nav className="main-nav" aria-label="Hauptnavigation"><Link href="/#shop">Shop</Link><Link href="/#so-funktionierts">So funktionierts</Link><Link href="/#faq">FAQ</Link></nav>
        <div className="header-actions"><span className="shipping-country"><span className="swiss-flag" aria-hidden="true" />Lieferung in die Schweiz</span><button className="cart-trigger" onClick={openCart} aria-label={`Warenkorb öffnen, ${count} ${count === 1 ? "Artikel" : "Artikel"}`}><ShoppingBag size={21} strokeWidth={1.7} /><span className="cart-count">{count}</span></button></div>
      </div>
    </header>
  </>;
}
