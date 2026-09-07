'use client';
import { usePathname } from 'next/navigation';
import { isLocale, defaultLocale } from '@/i18n/locales';
import { getDictionary } from '@/i18n/get-dictionary';
export default function ErrorPage({reset}:{reset:()=>void}){
  const segment=usePathname().split('/')[1]||'';
  const dict=getDictionary(isLocale(segment)?segment:defaultLocale).errors;
  return <main id="main-content" className="page-shell prose"><h1>{dict.title}</h1><p>{dict.text}</p><button className="button button-dark" onClick={reset}>{dict.retry}</button></main>;
}
