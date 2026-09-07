import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import type { SiteSettings } from "@/types/catalog";
import type { Locale } from "@/i18n/locales";
import { getDictionary } from "@/i18n/get-dictionary";
import { Lines } from "@/i18n/render-lines";

export function FAQ({ settings, locale }: { settings: SiteSettings; locale: Locale }) {
  const dict = getDictionary(locale).faq;
  const overrides: Record<number, string | undefined> = {
    2: settings.product_reuse_text,
    4: settings.shipping_text,
    5: settings.shipping_origin,
    9: settings.product_safety_text,
  };
  const questions = dict.items.map((item, index) => [item.q, overrides[index] || item.a] as const);
  return <section className="faq-section section-space" id="faq" aria-labelledby="faq-heading"><div className="container faq-layout"><div className="faq-intro"><p className="eyebrow">{dict.eyebrow}</p><h2 id="faq-heading">{dict.heading1}<br /><span className="muted-heading">{dict.heading2}</span></h2><p><Lines text={dict.intro} /></p><Link href={`/${locale}/kontakt`} className="text-link">{dict.cta}<ArrowUpRight size={16} /></Link><span className="faq-asterisk" aria-hidden="true">✳</span></div><div className="faq-list">{questions.map(([question, answer], index) => <details className="faq-item" key={question}><summary><span className="faq-number">{String(index + 1).padStart(2, "0")}</span><span>{question}</span><Plus size={19} strokeWidth={1.5} aria-hidden="true" /></summary><p>{answer}</p></details>)}</div></div></section>;
}
