import Link from "next/link";
import { ArrowUpRight, BadgeCheck, FileText, LockKeyhole, Mail, PackageSearch } from "lucide-react";
import type { SiteSettings } from "@/types/catalog";
import type { Locale } from "@/i18n/locales";
import { getDictionary } from "@/i18n/get-dictionary";
import { Lines } from "@/i18n/render-lines";

export function ParentTrust({ settings, locale }: { settings: SiteSettings; locale: Locale }) {
  const dict = getDictionary(locale).parentTrust;
  const icons = [FileText, LockKeyhole, PackageSearch, Mail];
  const hrefs = [`/${locale}#faq`, `/${locale}#shop`, `/${locale}/versand`, `/${locale}/kontakt`];
  const points = dict.points.map((point, index) => ({ ...point, icon: icons[index], href: hrefs[index] }));
  return <section className="trust-section section-space" aria-labelledby="trust-heading"><div className="container"><div className="section-topline"><p className="eyebrow">{dict.eyebrow}</p><span className="section-counter">{dict.counter}</span></div><div className="section-heading-row"><h2 id="trust-heading">{dict.heading1}<br /><span className="muted-heading">{dict.heading2}</span></h2><p><Lines text={dict.intro} /></p></div><div className="trust-grid">{points.map(({ icon: Icon, title, text, href }) => <Link href={href} className="trust-card" key={title}><div className="trust-card-top"><Icon size={25} strokeWidth={1.4} /><ArrowUpRight size={16} /></div><h3>{title}</h3><p>{text}</p></Link>)}</div>{settings.verified_claims.filter((claim) => claim.active).length > 0 && <div className="verified-claims">{settings.verified_claims.filter((claim) => claim.active).map((claim) => <div key={claim.id}><BadgeCheck size={20} /><p><strong>{claim.title}</strong><span>{claim.description}</span></p></div>)}</div>}</div></section>;
}
