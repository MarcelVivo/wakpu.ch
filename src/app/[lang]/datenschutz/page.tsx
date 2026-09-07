import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getRawSettings,getSiteSettings } from '@/lib/catalog';
import { isLocale } from '@/i18n/locales';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({params}:{params:Promise<{lang:string}>}):Promise<Metadata>{
  const {lang}=await params;if(!isLocale(lang))return {};
  const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||'https://wakpu.ch';
  return {title:getDictionary(lang).pages.datenschutz.title,alternates:{canonical:`${siteUrl}/${lang}/datenschutz`}};
}
export default async function Page({params}:{params:Promise<{lang:string}>}){
  const {lang}=await params;if(!isLocale(lang))notFound();
  const [raw,s]=await Promise.all([getRawSettings(),getSiteSettings()]);const dict=getDictionary(lang).pages.datenschutz;
  return <main id="main-content" className="page-shell prose"><p className="eyebrow">{dict.eyebrow}</p><h1>{dict.heading}</h1>{raw?.privacy_notice?<div style={{whiteSpace:'pre-wrap'}}>{raw.privacy_notice}</div>:<><p className="panel">{dict.draftNotice}</p><h2>{dict.responsibleHeading}</h2><p>{s.company_name||'[NAME / FIRMA]'} · {s.company_address||'[ADRESSE]'} · {s.company_postcode_city||'[PLZ ORT]'}<br/>{s.support_email||'[E-MAIL]'}</p><h2>{dict.orderHeading}</h2><p>{dict.orderText}</p><h2>{dict.servicesHeading}</h2><p>{dict.servicesText}</p><h2>{dict.cookiesHeading}</h2><p>{dict.cookiesText}</p><h2>{dict.contactHeading}</h2><p>{dict.contactText}</p></>}</main>;
}
