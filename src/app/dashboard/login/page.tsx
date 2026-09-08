import Link from 'next/link';
import { login } from '../actions';
import { PasswordField } from '@/components/admin/PasswordField';
export default async function LoginPage({searchParams}:{searchParams:Promise<{status?:string}>}){
  const {status}=await searchParams;const configured=Boolean(process.env.ADMIN_EMAIL&&process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return <div className="admin-login-shell"><div className="admin-login"><span className="wordmark admin-wordmark">WAKPU<span>INTERN</span></span><h1>Anmelden.</h1>{!configured?<p>Der Admin-Zugang ist noch nicht eingerichtet. Konfiguriere Supabase und ADMIN_EMAIL gemäss README.</p>:<><p>Nur für freigeschaltete Administrationskonten.</p>{status==='error'&&<p role="alert" className="admin-notice is-error">Die Anmeldung ist fehlgeschlagen. Bitte prüfe deine Zugangsdaten.</p>}<form action={login} className="admin-form"><label>E-Mail<input type="email" name="email" autoComplete="username" required /></label><PasswordField label="Passwort" name="password" autoComplete="current-password" /><button type="submit">Anmelden</button></form><p><Link href="/dashboard/forgot-password" className="text-link">Passwort vergessen?</Link></p></>}</div></div>;
}
