"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, LockKeyhole, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { useCart } from "./CartProvider";
import { formatPrice } from "@/components/product/price";
import { ProductVisual } from "@/components/product/ProductVisual";

const subscribeToMount = () => () => {};
const mountedSnapshot = () => true;
const serverSnapshot = () => false;

export function CartDrawer() {
  const { lines, count, subtotal, isOpen, closeCart, setQuantity, removeItem, settings, checkoutRequestId } = useCart();
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
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: lines.map(({ variantId, quantity }) => ({ variantId, quantity })), requestId: checkoutRequestId() }) });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Bei deiner Bestellung ist etwas schiefgelaufen. Bitte versuche es nochmals.");
      const destination = new URL(data.url);
      if (destination.protocol !== "https:" || destination.hostname !== "checkout.stripe.com") throw new Error("Die Zahlung konnte nicht geöffnet werden. Bitte versuche es nochmals.");
      window.location.assign(destination.href);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Bei deiner Bestellung ist etwas schiefgelaufen. Bitte versuche es nochmals.");
      setPending(false);
      submitting.current = false;
    }
  }, [lines, checkoutRequestId]);

  if (!mounted || !isOpen) return null;
  return createPortal(<div className="cart-portal" id="cart-portal"><div className="cart-backdrop" onClick={closeCart} aria-hidden="true" /><div className="cart-drawer" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="cart-heading" tabIndex={-1}>
    <div className="cart-header"><h2 id="cart-heading">Dein Warenkorb <span>({count})</span></h2><button className="icon-button" aria-label="Warenkorb schliessen" onClick={closeCart}><X size={23} /></button></div>
    {lines.length ? <><div className="cart-line-list">{lines.map((line, index) => <article className="cart-line" key={line.variantId}><div className="cart-line-image"><ProductVisual compact index={index % 3} /></div><div className="cart-line-info"><div className="cart-line-name"><h3>{line.product.name}</h3><button className="icon-button remove-item" aria-label={`${line.product.name} entfernen`} onClick={() => removeItem(line.variantId)}><Trash2 size={15} /></button></div><p>{line.variant.name}</p><div className="cart-line-bottom"><div className="quantity-control"><button aria-label={`Weniger ${line.product.name}`} disabled={line.quantity <= 1} onClick={() => setQuantity(line.variantId, line.quantity - 1)}><Minus size={14} /></button><output aria-label={`Anzahl ${line.product.name}`}>{line.quantity}</output><button aria-label={`Mehr ${line.product.name}`} disabled={line.quantity >= 10 || count >= 30} onClick={() => setQuantity(line.variantId, line.quantity + 1)}><Plus size={14} /></button></div><strong>{formatPrice(line.variant.price_chf_cents * line.quantity)}</strong></div></div></article>)}<p className="cart-mystery">Welche Farbe? Dein WAKPU bleibt eine Überraschung.</p></div><div className="cart-summary"><div><span>Zwischensumme</span><strong>{formatPrice(subtotal)}</strong></div><div className="cart-shipping"><span>Versand</span><span>{settings.shipping_cost_cents === null ? "Wird vor dem Kauf angezeigt" : settings.shipping_cost_cents === 0 ? "Kostenlos" : formatPrice(settings.shipping_cost_cents)}</span></div>{settings.shipping_cost_cents !== null && <div className="cart-total"><span>Total</span><strong>{formatPrice(subtotal + settings.shipping_cost_cents)}</strong></div>}<p className="cart-delivery">{settings.shipping_text || "Lieferzeit wird vor Verkaufsstart bestätigt."}</p>{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-dark checkout-button" onClick={checkout} disabled={pending || settings.shop_maintenance}>{pending ? "ZUR ZAHLUNG …" : settings.shop_maintenance ? "BESTELLUNGEN PAUSIERT" : "SICHER ZUR KASSE"}{pending ? <span className="loading-spinner" aria-hidden="true" /> : <ArrowRight size={18} />}</button><p className="checkout-secure"><LockKeyhole size={12} />Verschlüsselte Zahlung über Stripe</p><p className="cart-legal">Alle Preise in CHF. Lieferung nur in die Schweiz.<br /><Link href="/versand" onClick={closeCart}>Versandinformationen</Link><span> · </span><Link href="/kontakt" onClick={closeCart}>Kontakt</Link><span> · </span><Link href="/agb" onClick={closeCart}>AGB</Link></p></div></> : <div className="empty-cart"><div className="empty-cart-icon"><ShoppingBag size={35} strokeWidth={1} /></div><p className="eyebrow">DEIN MOMENT WARTET.</p><h3>Noch kein Crack<br />im Warenkorb.</h3><p>Entdecke die WAKPU-Kollektion<br />und finde deinen ersten Crack.</p><Link href="/#shop" onClick={closeCart} className="button button-dark">WAKPU ENTDECKEN<ArrowRight size={17} /></Link></div>}
  </div></div>, document.body);
}
