import type { Metadata } from 'next';
import { Mail,ArrowUpRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { getSiteSettings } from '@/lib/catalog';
import { isLocale } from '@/i18n/locales';
import { getDictionary } from '@/i18n/get-dictionary';
import { Lines } from '@/i18n/render-lines';
export async function generateMetadata({params}:{params:Promise<{lang:string}>}):Promise<Metadata>{
  const {lang}=await params;if(!isLocale(lang))return {};
  const siteUrl=process.env.NEXT_PUBLIC_SITE_URL||'https://wakpu.ch';
  return {title:getDictionary(lang).pages.kontakt.title,alternates:{canonical:`${siteUrl}/${lang}/kontakt`}};
}
export default async function Page({params}:{params:Promise<{lang:string}>}){
  const {lang}=await params;if(!isLocale(lang))notFound();
  const s=await getSiteSettings();const dict=getDictionary(lang).pages.kontakt;
  return <main id="main-content" className="page-shell prose"><p className="eyebrow">{dict.eyebrow}</p><h1><Lines text={dict.heading}/></h1><p>{dict.intro}</p><div className="panel"><Mail size={30}/><h2>{dict.panelTitle}</h2>{s.support_email?<a className="button button-dark" href={`mailto:${s.support_email}`}>{s.support_email}<ArrowUpRight size={18}/></a>:<p>{dict.noEmail}</p>}</div>{s.company_name&&<p>{s.company_name}<br/>{s.company_address}<br/>{s.company_postcode_city}</p>}</main>;
}
