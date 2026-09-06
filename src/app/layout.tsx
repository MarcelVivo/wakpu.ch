import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { CartProvider } from '@/components/cart/CartProvider';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { MobileCartBar } from '@/components/cart/MobileCartBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { getCatalog,getSiteSettings } from '@/lib/catalog';
import './globals.css';
const geist=localFont({src:'../../public/fonts/geist-latin.woff2',variable:'--font-geist',display:'swap'});
export const metadata:Metadata={
  metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'https://wakpu.ch'),
  title:{default:'WAKPU – Der Wax Cracking Trend in der Schweiz',template:'%s | WAKPU'},
  description:'Entdecke WAKPU – den farbigen Wax-Cracking-Ball für den einzigartigen Crack-Moment. Direkt online in der Schweiz bestellen.',
  alternates:{canonical:'https://wakpu.ch'},
  openGraph:{title:'WAKPU. CRACK IT. FEEL IT.',description:'Ein kurzer Druck. Ein ziemlich guter Moment.',url:'https://wakpu.ch',locale:'de_CH',type:'website',images:[{url:'/images/wakpu-hero.png',width:1254,height:1254,alt:'Pink-violetter WAKPU Wax-Cracking-Ball – Produktvisualisierung'}]},
  twitter:{card:'summary_large_image'},
};
export const dynamic='force-dynamic';
export default async function RootLayout({children}:{children:React.ReactNode}) {
  const [products,settings]=await Promise.all([getCatalog(),getSiteSettings()]);
  return <html lang="de-CH" className={geist.variable}><body><a className="skip-link" href="#main-content">Zum Inhalt springen</a><CartProvider products={products} settings={settings}><Header/>{children}<Footer settings={settings}/><CartDrawer/><MobileCartBar products={products}/></CartProvider></body></html>;
}
