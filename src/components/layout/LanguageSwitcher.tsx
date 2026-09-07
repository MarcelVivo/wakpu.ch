"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, type Locale } from "@/i18n/locales";

const labels: Record<Locale, string> = { de: "DE", en: "EN", fr: "FR", it: "IT" };

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const rest = pathname.split("/").slice(2).join("/");
  return <div className="language-switcher" aria-label="Sprache · Language · Langue · Lingua">
    {locales.map((code) => <Link key={code} href={`/${code}${rest ? `/${rest}` : ""}`} aria-current={code === locale ? "true" : undefined} lang={code}>{labels[code]}</Link>)}
  </div>;
}
