import Link from "next/link";
import { ArrowUpRight, BadgeCheck, FileText, LockKeyhole, Mail, PackageSearch } from "lucide-react";
import type { SiteSettings } from "@/types/catalog";

export function ParentTrust({ settings }: { settings: SiteSettings }) {
  const points = [
    { icon: FileText, title: "Klare Informationen", text: "Was WAKPU ist und wie es funktioniert. Ohne grosse Versprechen.", href: "/#faq" },
    { icon: LockKeyhole, title: "Sichere Online-Zahlung", text: "Die Zahlung läuft über Stripe. Kosten siehst du vor dem Kauf.", href: "/#shop" },
    { icon: PackageSearch, title: "Deine Bestellung im Blick", text: "Dein persönlicher Bestellstatus. Tracking, sobald es verfügbar ist.", href: "/versand" },
    { icon: Mail, title: "Direkter Kontakt", text: "Eine Frage zum Produkt oder zu deiner Bestellung? Hier erreichst du uns.", href: "/kontakt" },
  ];
  return <section className="trust-section section-space" aria-labelledby="trust-heading"><div className="container"><div className="section-topline"><p className="eyebrow">GUTES GEFÜHL. KLARE INFORMATIONEN.</p><span className="section-counter">03 / GUT ZU WISSEN</span></div><div className="section-heading-row"><h2 id="trust-heading">Für den Spass.<br /><span className="muted-heading">Und fürs gute Gefühl.</span></h2><p>Für neugierige Hände.<br />Und für Eltern, die gerne<br />wissen, was sie bestellen.</p></div><div className="trust-grid">{points.map(({ icon: Icon, title, text, href }) => <Link href={href} className="trust-card" key={title}><div className="trust-card-top"><Icon size={25} strokeWidth={1.4} /><ArrowUpRight size={16} /></div><h3>{title}</h3><p>{text}</p></Link>)}</div>{settings.verified_claims.filter((claim) => claim.active).length > 0 && <div className="verified-claims">{settings.verified_claims.filter((claim) => claim.active).map((claim) => <div key={claim.id}><BadgeCheck size={20} /><p><strong>{claim.title}</strong><span>{claim.description}</span></p></div>)}</div>}</div></section>;
}
