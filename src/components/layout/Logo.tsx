import Link from "next/link";
import type { Locale } from "@/i18n/locales";

export function Logo({ locale, large = false }: { locale: Locale; large?: boolean }) {
  return <Link href={`/${locale}`} aria-label="WAKPU" className={`wordmark${large ? " wordmark-large" : ""}`}>WAKPU</Link>;
}
