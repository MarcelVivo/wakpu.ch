import Link from 'next/link';
import { headers } from 'next/headers';
import { isLocale, defaultLocale } from '@/i18n/locales';
import { getDictionary } from '@/i18n/get-dictionary';
export default async function NotFound(){
  const headerLocale=(await headers()).get('x-locale')||'';
  const lang=isLocale(headerLocale)?headerLocale:defaultLocale;
  const dict=getDictionary(lang).notFound;
  return <main id="main-content" className="page-shell prose"><p className="eyebrow">{dict.eyebrow}</p><h1>{dict.title}</h1><p>{dict.text}</p><Link className="button button-dark" href={`/${lang}`}>{dict.back}</Link></main>;
}
