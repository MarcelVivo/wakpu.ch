import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSiteSettings } from '@/lib/catalog';
import { isLocale } from '@/i18n/locales';
import { getDictionary } from '@/i18n/get-dictionary';
export async function generateMetadata({params}:{params:Promise<{lang:string}>}):Promise<Metadata>{
  const {lang}=await params;if(!isLocale(lang))return {};
  const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||'https://wakpu.ch';
  return {title:getDictionary(lang).pages.impressum.title,alternates:{canonical:`${siteUrl}/${lang}/impressum`}};
}
export default async function Page({params}:{params:Promise<{lang:string}>}){
  const {lang}=await params;if(!isLocale(lang))notFound();
  const s=await getSiteSettings();const dict=getDictionary(lang).pages.impressum;
  return <main id="main-content" className="page-shell prose"><p className="eyebrow">{dict.eyebrow}</p><h1>{dict.heading}</h1>{!s.company_name&&<p className="panel">{dict.draftNotice}</p>}<h2>{dict.responsibleHeading}</h2><p>{s.company_name||'[NAME / FIRMA]'}<br/>{s.company_address||'[ADRESSE]'}<br/>{s.company_postcode_city||'[PLZ ORT]'}</p><h2>{dict.contactHeading}</h2>{s.support_email?<a href={`mailto:${s.support_email}`}>{s.support_email}</a>:<p>[E-MAIL]</p>}<h2>{dict.productHeading}</h2><p>{dict.productText}</p></main>;
}
