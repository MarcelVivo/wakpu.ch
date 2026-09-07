import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRawSettings } from '@/lib/catalog';
import { isLocale } from '@/i18n/locales';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({params}:{params:Promise<{lang:string}>}):Promise<Metadata>{
  const {lang}=await params;if(!isLocale(lang))return {};
  const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||'https://wakpu.ch';
  return {title:getDictionary(lang).pages.agb.title,alternates:{canonical:`${siteUrl}/${lang}/agb`}};
}
export default async function Page({params}:{params:Promise<{lang:string}>}){
  const {lang}=await params;if(!isLocale(lang))notFound();
  const s=await getRawSettings();const dict=getDictionary(lang).pages.agb;
  return <main id="main-content" className="page-shell prose"><p className="eyebrow">{dict.eyebrow}</p><h1>{dict.heading}</h1>{s?.legal_terms?<div style={{whiteSpace:'pre-wrap'}}>{s.legal_terms}</div>:<><p className="panel">{dict.draftNotice}</p><h2>{dict.providerHeading}</h2><p>{s?.business_name||'[NAME / FIRMA]'}<br/>{s?.business_address||'[ADRESSE]'}<br/>{s?.business_postal_city||'[PLZ ORT]'}<br/>{s?.support_email||'[E-MAIL]'}</p><h2>{dict.todoHeading}</h2><p>{dict.todoText}</p><h2>{dict.pricingHeading}</h2><p>{dict.pricingText}</p></>}<p><Link href={`/${lang}/versand`}>{getDictionary(lang).footer.shipping}</Link> · <Link href={`/${lang}/kontakt`}>{getDictionary(lang).footer.contact}</Link></p></main>;
}
