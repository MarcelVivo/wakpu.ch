import Link from 'next/link';
import { logout } from '@/app/admin/actions';
export function AdminNav(){return <nav className="admin-nav" aria-label="Administration"><Link href="/admin">Übersicht</Link><Link href="/admin/orders">Bestellungen</Link><Link href="/admin/products">Produkte</Link><Link href="/admin/waitlist">Warteliste</Link><Link href="/admin/settings">Einstellungen</Link><form action={logout}><button type="submit">Abmelden</button></form></nav>;}
export function AdminNotice({status}:{status?:string}){return status?<p role="status" className={`admin-notice ${status==='error'?'is-error':''}`}>{status==='saved'?'Änderung gespeichert.':'Die Aktion konnte nicht abgeschlossen werden. Bitte prüfe die Eingaben und den Auftragsstatus.'}</p>:null;}
