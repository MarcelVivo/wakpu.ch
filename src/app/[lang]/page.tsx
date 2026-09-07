import { Hero } from "@/components/hero/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { ProductDemo } from "@/components/sections/ProductDemo";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ParentTrust } from "@/components/sections/ParentTrust";
import { FAQ } from "@/components/sections/FAQ";
import { getCatalog, getSiteSettings } from "@/lib/catalog";
import { isLocale } from "@/i18n/locales";
import { notFound } from "next/navigation";

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const [products, settings] = await Promise.all([getCatalog(), getSiteSettings()]);
  return <main id="main-content"><Hero locale={lang} /><HowItWorks locale={lang} /><ProductDemo locale={lang} /><ProductGrid products={products} settings={settings} locale={lang} /><ParentTrust settings={settings} locale={lang} /><FAQ settings={settings} locale={lang} /></main>;
}
