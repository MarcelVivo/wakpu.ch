import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { headers } from 'next/headers';
import { isLocale, defaultLocale } from '@/i18n/locales';
import './globals.css';
const geist=localFont({src:'../../public/fonts/geist-latin.woff2',variable:'--font-geist',display:'swap'});
export const metadata:Metadata={
  metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://wakpu.ch'),
  openGraph:{images:[{url:'/images/wakpu-hero.png',width:1254,height:1254,alt:'Pink-violetter WAKPU Wax-Cracking-Ball – Produktvisualisierung'}]},
  twitter:{card:'summary_large_image'},
};
export default async function RootLayout({children}:{children:React.ReactNode}) {
  const headerLocale=(await headers()).get('x-locale')||'';
  const lang=isLocale(headerLocale)?headerLocale:defaultLocale;
  return <html lang={lang} className={geist.variable}><body>{children}</body></html>;
}
