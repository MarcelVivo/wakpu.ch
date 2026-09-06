export type EmailKind = "order_confirmation" | "shipping_confirmation" | "tracking_update" | "fulfillment_error" | "refund_confirmation";

export interface OrderEmailData {
  orderNumber: string;
  firstName: string;
  totalCents: number;
  shippingCents: number;
  statusUrl: string;
  supportEmail: string;
  shippingText: string;
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
  const subjects: Record<EmailKind, string> = {
    order_confirmation: "Dein WAKPU ist bestellt 💥",
    shipping_confirmation: "Dein WAKPU ist unterwegs 📦",
    tracking_update: "Neuigkeiten zu deiner WAKPU-Lieferung",
    fulfillment_error: `WAKPU: Bestellung ${data.orderNumber} prüfen`,
    refund_confirmation: "Deine WAKPU-Rückerstattung",
  };
  const descriptions: Record<EmailKind, string> = {
    order_confirmation: "Danke für deine Bestellung. Deine Zahlung ist eingegangen. Hier findest du deine Bestellübersicht.",
    shipping_confirmation: "Deine Bestellung wurde versendet. Den aktuellen Stand findest du in deiner Bestellübersicht.",
    tracking_update: "Die Sendungsinformationen deiner Bestellung wurden aktualisiert. In deiner Bestellübersicht siehst du den aktuellen Stand.",
    fulfillment_error: "Diese Bestellung benötigt eine manuelle Prüfung. Bitte prüfe Status und Fehlerdetails im geschützten Admin-Bereich, bevor du erneut Fulfillment auslöst.",
    refund_confirmation: `Für deine Bestellung wurde eine Rückerstattung${data.refundAmountCents ? ` über ${money(data.refundAmountCents)}` : ""} veranlasst. Die Gutschrift erfolgt über das ursprüngliche Zahlungsmittel.`,
  };
  const statusUrl = safeHttpUrl(data.statusUrl);
  const trackingUrl = safeHttpUrl(data.trackingUrl);
  const isAdmin = kind === "fulfillment_error";
  const introduction = isAdmin ? "Hallo WAKPU-Team" : data.firstName ? `Hallo ${data.firstName}` : "Hallo";
  const mockText = data.mock ? "Testmodus: Dies ist eine simulierte Bestellung. Es wird kein echtes Paket versendet." : "";
  const itemText = kind === "order_confirmation"
    ? data.items.map((item) => `${item.quantity} × ${item.name}: ${money(item.totalCents)}`).join("\n") + `\nVersand: ${money(data.shippingCents)}\nTotal: ${money(data.totalCents)}` : "";
  const trackingText = data.trackingNumber ? `Sendungsnummer: ${data.trackingNumber}${data.carrier ? ` (${data.carrier})` : ""}` : "";
  const text = [introduction, descriptions[kind], `Bestellung ${data.orderNumber}`, mockText, itemText,
    kind === "order_confirmation" ? data.shippingText : "", trackingText, trackingUrl,
    statusUrl ? `${isAdmin ? "Admin" : "Bestellung ansehen"}: ${statusUrl}` : "",
    data.supportEmail ? `Fragen? ${data.supportEmail}` : "", "WAKPU"].filter(Boolean).join("\n\n");
  const e = escapeHtml;
  const html = `<!doctype html><html lang="de-CH"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f7f7f5;color:#171719;font-family:Arial,Helvetica,sans-serif"><main style="max-width:560px;margin:32px auto;background:#fff;padding:32px;border-radius:16px"><div style="font-size:28px;font-weight:900;letter-spacing:-1px">WAKPU</div><p style="margin-top:32px">${e(introduction)}</p><h1 style="font-size:24px;line-height:1.2">${e(subjects[kind])}</h1><p style="line-height:1.6">${e(descriptions[kind])}</p><p><strong>${e(data.orderNumber)}</strong></p>${mockText ? `<p style="padding:16px;background:#f4f0ff;border-radius:8px">${e(mockText)}</p>` : ""}${itemText ? `<div style="border-top:1px solid #e8e8e8;border-bottom:1px solid #e8e8e8;padding:16px 0;line-height:1.7">${e(itemText).replace(/\n/g, "<br>")}</div>` : ""}${kind === "order_confirmation" && data.shippingText ? `<p>${e(data.shippingText)}</p>` : ""}${trackingText ? `<p>${e(trackingText)}</p>` : ""}${trackingUrl ? `<p><a href="${e(trackingUrl)}" style="color:#171719">Sendung verfolgen</a></p>` : ""}${statusUrl ? `<p style="margin:28px 0"><a href="${e(statusUrl)}" style="display:inline-block;background:#171719;color:#fff;padding:16px 24px;border-radius:10px;text-decoration:none;font-weight:bold">${isAdmin ? "Admin öffnen" : "Bestellung ansehen"}</a></p>` : ""}${data.supportEmail ? `<p style="font-size:14px;color:#52525b">Fragen? ${e(data.supportEmail)}</p>` : ""}<p style="font-size:12px;color:#71717a">WAKPU · Preise in CHF</p></main></body></html>`;
  return { subject: subjects[kind], html, text };
}
