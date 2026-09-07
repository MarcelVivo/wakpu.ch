"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useCart } from "@/components/cart/CartProvider";
import { getDictionary } from "@/i18n/get-dictionary";

type Status = "idle" | "loading" | "sent" | "already" | "confirmed" | "error";

export function WaitlistForm() {
  const { locale } = useCart();
  const dict = getDictionary(locale).waitlist;
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    // Reads the confirm-redirect result after mount; the URL is unavailable during SSR.
    /* eslint-disable react-hooks/set-state-in-effect */
    const param = new URLSearchParams(window.location.search).get("waitlist");
    if (param === "confirmed") setStatus("confirmed");
    if (param === "already") setStatus("already");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const response = await fetch("/api/waitlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, locale }) });
      const data = await response.json() as { status?: string; error?: string };
      if (!response.ok) throw new Error(data.error);
      setStatus(data.status === "already_confirmed" ? "already" : "sent");
    } catch {
      setStatus("error");
    }
  }

  if (status === "confirmed") return <p className="waitlist-notice">{dict.confirmed}</p>;
  if (status === "already") return <p className="waitlist-notice">{dict.already}</p>;
  if (status === "sent") return <p className="waitlist-notice">{dict.sent}</p>;

  return (
    <form className="waitlist-form" onSubmit={submit}>
      <label className="waitlist-label" htmlFor="waitlist-email">{dict.label}</label>
      <div className="waitlist-row">
        <input id="waitlist-email" type="email" name="email" required maxLength={254} placeholder={dict.placeholder} value={email} onChange={(event) => setEmail(event.target.value)} disabled={status === "loading"} />
        <button className="button button-dark" type="submit" disabled={status === "loading"}>{status === "loading" ? dict.sending : dict.button}{status === "loading" ? <span className="loading-spinner" aria-hidden="true" /> : <ArrowUpRight size={17} aria-hidden="true" />}</button>
      </div>
      {status === "error" && <p className="form-error" role="alert">{dict.error}</p>}
    </form>
  );
}
