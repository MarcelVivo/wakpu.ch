import type { MetadataRoute } from 'next';
export default function sitemap():MetadataRoute.Sitemap{return ['','/versand','/kontakt','/agb','/datenschutz','/impressum'].map(p=>({url:`https://wakpu.ch${p}`,changeFrequency:'monthly',priority:p?0.4:1}));}
