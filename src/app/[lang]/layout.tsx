import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CartProvider } from '@/components/cart/CartProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { MobileCartBar } from '@/components/cart/MobileCartBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getCatalog,getSiteSettings } from '@/lib/catalog';
import { locales,isLocale,type Locale } from '@/i18n/locales';
import { getDictionary } from '@/i18n/get-dictionary';
export const dynamic='force-dynamic';
export function generateStaticParams() {
  return locales.map(lang=>({lang}));
}
export async function generateMetadata({params}:{params:Promise<{lang:string}>}):Promise<Metadata> {
  const {lang}=await params;
  if(!isLocale(lang))return {};
  const dict=getDictionary(lang);
  const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||'https://wakpu.ch';
  return {
    title:{default:dict.meta.title,template:'%s | WAKPU'},
    description:dict.meta.description,
    alternates:{canonical:`${siteUrl}/${lang}`,languages:Object.fromEntries(locales.map(l=>[l,`${siteUrl}/${l}`]))},
    openGraph:{title:dict.meta.ogTitle,description:dict.meta.ogDescription,url:`${siteUrl}/${lang}`,locale:localeTag(lang),type:'website'},
  };
}
function localeTag(lang:Locale):string {
  return {de:'de_CH',en:'en_US',fr:'fr_CH',it:'it_CH'}[lang];
}
export default async function LangLayout({children,params}:{children:React.ReactNode;params:Promise<{lang:string}>}) {
  const {lang}=await params;
  if(!isLocale(lang))notFound();
  const [products,settings]=await Promise.all([getCatalog(),getSiteSettings()]);
  const dict=getDictionary(lang);
  return <><a className="skip-link" href="#main-content">{dict.skipLink}</a><CartProvider products={products} settings={settings} locale={lang}><Header locale={lang}/>{children}<Footer settings={settings} locale={lang}/><CartDrawer/><MobileCartBar products={products}/></CartProvider></>;
}
