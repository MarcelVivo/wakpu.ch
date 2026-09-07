"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "./CartProvider";
import { formatPrice } from "@/components/product/price";
import { ProductVisual } from "@/components/product/ProductVisual";
import { getDictionary } from "@/i18n/get-dictionary";
import { Lines } from "@/i18n/render-lines";

const subscribeToMount = () => () => {};
const mountedSnapshot = () => true;
const serverSnapshot = () => false;

export function CartDrawer() {
  const { lines, count, subtotal, isOpen, closeCart, setQuantity, removeItem, settings, locale, checkoutRequestId } = useCart();
  const dict = getDictionary(locale).cart;
  const mounted = useSyncExternalStore(subscribeToMount, mountedSnapshot, serverSnapshot);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(closeCart);
  const submitting = useRef(false);
  useEffect(() => { closeRef.current = closeCart; }, [closeCart]);

  useEffect(() => {
    if (!isOpen || !mounted) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const siblings = [...document.body.children].filter((element): element is HTMLElement => element instanceof HTMLElement && element.id !== "cart-portal" && element.tagName !== "SCRIPT");
    const previousInert = siblings.map((element) => ({ element, inert: element.inert }));
    siblings.forEach((element) => { element.inert = true; });
    panelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current(); }
      if (event.key !== "Tab") return;
      const targets = panelRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex="0"]');
      if (!targets?.length) { event.preventDefault(); return; }
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panelRef.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousInert.forEach(({ element, inert }) => { element.inert = inert; });
      previousFocus?.focus();
    };
  }, [isOpen, mounted]);

  const checkout = useCallback(async () => {
    if (submitting.current || !lines.length) return;
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: lines.map(({ variantId, quantity }) => ({ variantId, quantity })), requestId: checkoutRequestId(), locale }) });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || dict.genericError);
      const destination = new URL(data.url);
      if (destination.protocol !== "https:" || destination.hostname !== "checkout.stripe.com") throw new Error(dict.openError);
      window.location.assign(destination.href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : dict.genericError);
      setPending(false);
      submitting.current = false;
    }
  }, [lines, checkoutRequestId, locale, dict]);

  if (!mounted || !isOpen) return null;
  return createPortal(<div className="cart-portal" id="cart-portal"><div className="cart-backdrop" onClick={closeCart} aria-hidden="true" /><div className="cart-drawer" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="cart-heading" tabIndex={-1}>
    <div className="cart-header"><h2 id="cart-heading">{dict.heading} <span>({count})</span></h2><button className="icon-button" aria-label={dict.closeAria} onClick={closeCart}><X size={23} /></button></div>
    {lines.length ? <><div className="cart-line-list">{lines.map((line, index) => <article className="cart-line" key={line.variantId}><div className="cart-line-image"><ProductVisual compact index={index % 3} /></div><div className="cart-line-info"><div className="cart-line-name"><h3>{line.product.name}</h3><button className="icon-button remove-item" aria-label={dict.remove(line.product.name)} onClick={() => removeItem(line.variantId)}><Trash2 size={15} /></button></div><p>{line.variant.name}</p><div className="cart-line-bottom"><div className="quantity-control"><button aria-label={dict.less(line.product.name)} disabled={line.quantity <= 1} onClick={() => setQuantity(line.variantId, line.quantity - 1)}><Minus size={14} /></button><output aria-label={dict.quantity(line.product.name)}>{line.quantity}</output><button aria-label={dict.more(line.product.name)} disabled={line.quantity >= 10 || count >= 30} onClick={() => setQuantity(line.variantId, line.quantity + 1)}><Plus size={14} /></button></div><strong>{formatPrice(line.variant.price_chf_cents * line.quantity)}</strong></div></div></article>)}<p className="cart-mystery">{dict.mysteryNote}</p></div><div className="cart-summary"><div><span>{dict.subtotal}</span><strong>{formatPrice(subtotal)}</strong></div><div className="cart-shipping"><span>{dict.shippingLabel}</span><span>{settings.shipping_cost_cents === null ? dict.shippingKnownAtCheckout : settings.shipping_cost_cents === 0 ? dict.free : formatPrice(settings.shipping_cost_cents)}</span></div>{settings.shipping_cost_cents !== null && <div className="cart-total"><span>{dict.total}</span><strong>{formatPrice(subtotal + settings.shipping_cost_cents)}</strong></div>}<p className="cart-delivery">{settings.shipping_text || dict.deliveryDefault}</p>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark checkout-button" onClick={checkout} disabled={pending || settings.shop_maintenance}>{pending ? dict.checkoutPending : settings.shop_maintenance ? dict.checkoutPaused : dict.checkout}{pending ? <span className="loading-spinner" aria-hidden="true" /> : <ArrowRight size={18} />}</button><p className="checkout-secure"><LockKeyhole size={12} />{dict.secureNote}</p><p className="cart-legal">{dict.legalPrices}<br /><Link href={`/${locale}/versand`} onClick={closeCart}>{dict.shippingInfo}</Link><span> · </span><Link href={`/${locale}/kontakt`} onClick={closeCart}>{dict.contact}</Link><span> · </span><Link href={`/${locale}/agb`} onClick={closeCart}>{dict.terms}</Link></p></div></> : <div className="empty-cart"><div className="empty-cart-icon"><ShoppingBag size={35} strokeWidth={1} /></div><p className="eyebrow">{dict.emptyEyebrow}</p><h3><Lines text={dict.emptyTitle} /></h3><p><Lines text={dict.emptyText} /></p><Link href={`/${locale}#shop`} onClick={closeCart} className="button button-dark">{dict.discover}<ArrowRight size={17} /></Link></div>}
  </div></div>, document.body);
}
