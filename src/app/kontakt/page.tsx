import type { Metadata } from 'next';
import { Mail,ArrowUpRight } from 'lucide-react';
import { getSiteSettings } from '@/lib/catalog';
export const metadata:Metadata={title:'Kontakt',alternates:{canonical:'https://wakpu.ch/kontakt'}};
export default async function Page(){const s=await getSiteSettings();return <main id="main-content" className="page-shell prose"><p className="eyebrow">WIR SIND ANSPRECHBAR</p><h1>Eine Frage?<br/>Lass uns reden.</h1><p>Fragen zum Produkt oder zu deiner Bestellung? Schreib uns. Bei einer bestehenden Bestellung hilft uns deine Bestellnummer weiter.</p><div className="panel"><Mail size={30}/><h2>Direkter Kontakt</h2>{s.support_email?<a className="button button-dark" href={`mailto:${s.support_email}`}>{s.support_email}<ArrowUpRight size={18}/></a>:<p>Die Kontaktadresse wird vor dem Verkaufsstart veröffentlicht.<br/>[E-MAIL]</p>}</div>{s.company_name&&<p>{s.company_name}<br/>{s.company_address}<br/>{s.company_postcode_city}</p>}</main>;}
