import type { MetadataRoute } from 'next';
import { locales } from '@/i18n/locales';
export default function sitemap():MetadataRoute.Sitemap{
  return locales.flatMap(lang=>['','/versand','/kontakt','/agb','/datenschutz','/impressum'].map(p=>({url:`https://wakpu.ch/${lang}${p}`,changeFrequency:'monthly' as const,priority:p?0.4:1})));
}
