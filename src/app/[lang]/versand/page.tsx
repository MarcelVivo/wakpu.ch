import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSiteSettings } from '@/lib/catalog';
import { formatCHF } from '@/lib/status';
import { isLocale } from '@/i18n/locales';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({params}:{params:Promise<{lang:string}>}):Promise<Metadata>{
  const {lang}=await params;if(!isLocale(lang))return {};
  const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||'https://wakpu.ch';
  return {title:getDictionary(lang).pages.versand.title,alternates:{canonical:`${siteUrl}/${lang}/versand`}};
}
export default async function Page({params}:{params:Promise<{lang:string}>}){
  const {lang}=await params;if(!isLocale(lang))notFound();
  const s=await getSiteSettings();const dict=getDictionary(lang).pages.versand;
  return <main id="main-content" className="page-shell prose"><p className="eyebrow">{dict.eyebrow}</p><h1>{dict.heading}</h1><h2>{dict.areaHeading}</h2><p>{dict.areaText}</p><h2>{dict.timeHeading}</h2><p>{s.shipping_text||dict.timeDefault}</p><h2>{dict.costHeading}</h2><p>{s.shipping_cost_cents===null?dict.costUnknown:dict.costKnown(formatCHF(s.shipping_cost_cents))}</p><h2>{dict.originHeading}</h2><p>{s.shipping_origin||dict.originDefault}</p><h2>{dict.trackingHeading}</h2><p>{dict.trackingText}</p><h2>{dict.damagedHeading}</h2><p>{dict.damagedText}</p><Link className="button button-dark" href={`/${lang}/kontakt`}>{dict.contactCta}</Link></main>;
}
