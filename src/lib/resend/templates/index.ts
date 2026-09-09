import type { Locale } from "@/i18n/locales";
import { getDictionary } from "@/i18n/get-dictionary";

export type EmailKind = "order_confirmation" | "shipping_confirmation" | "tracking_update" | "fulfillment_error" | "refund_confirmation";

export interface OrderEmailData {
  orderNumber: string;
  firstName: string;
  totalCents: number;
  shippingCents: number;
  statusUrl: string;
  supportEmail: string;
  shippingText: string;
  locale: Locale;
  items: { name: string; quantity: number; totalCents: number }[];
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  carrier?: string | null;
  refundAmountCents?: number;
  mock?: boolean;
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && url.hostname === "localhost") ? url.toString() : null;
  } catch { return null; }
}

const money = (cents: number): string => `CHF ${(cents / 100).toFixed(2)}`;

/** Values from customers, settings and providers are escaped; URLs allow only HTTP(S). */
export function renderOrderEmail(kind: EmailKind, data: OrderEmailData): { subject: string; html: string; text: string } {
  const dict = getDictionary(data.locale).emails.order;
  const subjects: Record<EmailKind, string> = {
    order_confirmation: dict.subjects.order_confirmation,
    shipping_confirmation: dict.subjects.shipping_confirmation,
    tracking_update: dict.subjects.tracking_update,
    fulfillment_error: dict.subjects.fulfillment_error(data.orderNumber),
    refund_confirmation: dict.subjects.refund_confirmation,
  };
  const descriptions: Record<EmailKind, string> = {
    order_confirmation: dict.descriptions.order_confirmation,
    shipping_confirmation: dict.descriptions.shipping_confirmation,
    tracking_update: dict.descriptions.tracking_update,
    fulfillment_error: dict.descriptions.fulfillment_error,
    refund_confirmation: dict.descriptions.refund_confirmation(data.refundAmountCents ? dict.descriptions.refund(money(data.refundAmountCents)) : ""),
  };
  const statusUrl = safeHttpUrl(data.statusUrl);
  const trackingUrl = safeHttpUrl(data.trackingUrl);
  const isAdmin = kind === "fulfillment_error";
  const introduction = isAdmin ? dict.greetingAdmin : data.firstName ? dict.greeting(data.firstName) : dict.greetingGeneric;
  const mockText = data.mock ? dict.mockOrder : "";
  const itemText = kind === "order_confirmation"
    ? data.items.map((item) => `${item.quantity} × ${item.name}: ${money(item.totalCents)}`).join("\n") + `\n${dict.shippingLabel}: ${money(data.shippingCents)}\n${dict.totalLabel}: ${money(data.totalCents)}` : "";
  const trackingText = data.trackingNumber ? dict.trackingNumber(data.trackingNumber, data.carrier || "") : "";
  const text = [introduction, descriptions[kind], data.orderNumber, mockText, itemText,
    kind === "order_confirmation" ? data.shippingText : "", trackingText, trackingUrl,
    statusUrl ? `${isAdmin ? dict.openAdmin : dict.viewOrder}: ${statusUrl}` : "",
    data.supportEmail ? getDictionary(data.locale).emails.doNotReply(data.supportEmail) : "", "WAKPU"].filter(Boolean).join("\n\n");
  const e = escapeHtml;
  const html = `<!doctype html><html lang="${data.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f7f7f5;color:#171719;font-family:Arial,Helvetica,sans-serif"><main style="max-width:560px;margin:32px auto;background:#fff;padding:32px;border-radius:16px"><div style="font-size:28px;font-weight:900;letter-spacing:-1px">WAKPU</div><p style="margin-top:32px">${e(introduction)}</p><h1 style="font-size:24px;line-height:1.2">${e(subjects[kind])}</h1><p style="line-height:1.6">${e(descriptions[kind])}</p><p><strong>${e(data.orderNumber)}</strong></p>${mockText ? `<p style="padding:16px;background:#f4f0ff;border-radius:8px">${e(mockText)}</p>` : ""}${itemText ? `<div style="border-top:1px solid #e8e8e8;border-bottom:1px solid #e8e8e8;padding:16px 0;line-height:1.7">${e(itemText).replace(/\n/g, "<br>")}</div>` : ""}${kind === "order_confirmation" && data.shippingText ? `<p>${e(data.shippingText)}</p>` : ""}${trackingText ? `<p>${e(trackingText)}</p>` : ""}${trackingUrl ? `<p><a href="${e(trackingUrl)}" style="color:#171719">${e(dict.trackShipment)}</a></p>` : ""}${statusUrl ? `<p style="margin:28px 0"><a href="${e(statusUrl)}" style="display:inline-block;background:#171719;color:#fff;padding:16px 24px;border-radius:10px;text-decoration:none;font-weight:bold">${isAdmin ? e(dict.openAdmin) : e(dict.viewOrder)}</a></p>` : ""}${data.supportEmail ? `<p style="font-size:14px;color:#52525b">${e(getDictionary(data.locale).emails.doNotReply(data.supportEmail))}</p>` : ""}<p style="font-size:12px;color:#71717a">${e(dict.footer)}</p></main></body></html>`;
  return { subject: subjects[kind], html, text };
}

/** Double opt-in: the confirm link is the only action requested, no order or account is involved. */
export function renderWaitlistConfirmEmail(confirmUrl: string, locale: Locale): { subject: string; html: string; text: string } {
  const dict = getDictionary(locale).emails.waitlist;
  const e = escapeHtml;
  const url = safeHttpUrl(confirmUrl);
  const text = [dict.confirmGreeting, dict.confirmText, url, dict.confirmIgnore, dict.footer].filter(Boolean).join("\n\n");
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f7f7f5;color:#171719;font-family:Arial,Helvetica,sans-serif"><main style="max-width:560px;margin:32px auto;background:#fff;padding:32px;border-radius:16px"><div style="font-size:28px;font-weight:900;letter-spacing:-1px">WAKPU</div><p style="margin-top:32px">${e(dict.confirmGreeting)}</p><h1 style="font-size:24px;line-height:1.2">${e(dict.confirmTitle)}</h1><p style="line-height:1.6">${e(dict.confirmText)}</p>${url ? `<p style="margin:28px 0"><a href="${e(url)}" style="display:inline-block;background:#171719;color:#fff;padding:16px 24px;border-radius:10px;text-decoration:none;font-weight:bold">${e(dict.confirmButton)}</a></p>` : ""}<p style="font-size:14px;color:#52525b">${e(dict.confirmIgnore)}</p><p style="font-size:12px;color:#71717a">${e(dict.footer)}</p></main></body></html>`;
  return { subject: dict.confirmSubject, html, text };
}

/** Free-text admin-authored marketing mailing; subject/body are escaped, no merge fields. */
export function renderMarketingEmail(subject: string, bodyText: string): { subject: string; html: string; text: string } {
  const e = escapeHtml;
  const paragraphs = bodyText.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const text = [...paragraphs, "WAKPU"].join("\n\n");
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f7f7f5;color:#171719;font-family:Arial,Helvetica,sans-serif"><main style="max-width:560px;margin:32px auto;background:#fff;padding:32px;border-radius:16px"><div style="font-size:28px;font-weight:900;letter-spacing:-1px">WAKPU</div><h1 style="font-size:24px;line-height:1.2;margin-top:32px">${e(subject)}</h1>${paragraphs.map((p) => `<p style="line-height:1.6">${e(p).replace(/\n/g, "<br>")}</p>`).join("")}<p style="font-size:12px;color:#71717a;margin-top:32px">WAKPU</p></main></body></html>`;
  return { subject, html, text };
}

/** Sent once per confirmed signup when the shop actually opens for orders. */
export function renderWaitlistLaunchEmail(shopUrl: string, locale: Locale): { subject: string; html: string; text: string } {
  const dict = getDictionary(locale).emails.waitlist;
  const e = escapeHtml;
  const url = safeHttpUrl(shopUrl);
  const text = [dict.launchGreeting, dict.launchText, url, dict.footer].filter(Boolean).join("\n\n");
  const html = `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f7f7f5;color:#171719;font-family:Arial,Helvetica,sans-serif"><main style="max-width:560px;margin:32px auto;background:#fff;padding:32px;border-radius:16px"><div style="font-size:28px;font-weight:900;letter-spacing:-1px">WAKPU</div><p style="margin-top:32px">${e(dict.launchGreeting)}</p><h1 style="font-size:24px;line-height:1.2">${e(dict.launchTitle)}</h1><p style="line-height:1.6">${e(dict.launchText)}</p>${url ? `<p style="margin:28px 0"><a href="${e(url)}" style="display:inline-block;background:#171719;color:#fff;padding:16px 24px;border-radius:10px;text-decoration:none;font-weight:bold">${e(dict.launchButton)}</a></p>` : ""}<p style="font-size:12px;color:#71717a">${e(dict.footer)}</p></main></body></html>`;
  return { subject: dict.launchSubject, html, text };
}
