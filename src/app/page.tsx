import { Hero } from "@/components/hero/Hero";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { ProductDemo } from "@/components/sections/ProductDemo";
import { ProductGrid } from "@/components/product/ProductGrid";
import { ParentTrust } from "@/components/sections/ParentTrust";
import { FAQ } from "@/components/sections/FAQ";
import { getCatalog, getSiteSettings } from "@/lib/catalog";

export default async function HomePage() {
  const [products, settings] = await Promise.all([getCatalog(), getSiteSettings()]);
  return <main id="main-content"><Hero /><HowItWorks /><ProductDemo /><ProductGrid products={products} settings={settings} /><ParentTrust settings={settings} /><FAQ settings={settings} /></main>;
}
