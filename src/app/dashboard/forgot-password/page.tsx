import Link from 'next/link';
import { requestPasswordReset } from '../actions';
export default async function ForgotPasswordPage({searchParams}:{searchParams:Promise<{status?:string}>}){
  const {status}=await searchParams;
  return <div className="admin-login-shell"><div className="admin-login">
    <span className="wordmark admin-wordmark">WAKPU<span>INTERN</span></span>
    <h1>Passwort vergessen?</h1>
    {status==='sent'?<p>Falls diese E-Mail-Adresse zu einem Admin-Konto gehört, haben wir dir einen Link zum Zurücksetzen geschickt. Prüfe dein Postfach.</p>:<>
      <p>Gib deine Admin-E-Mail-Adresse ein. Wir schicken dir einen Link zum Zurücksetzen.</p>
      {status==='error'&&<p role="alert" className="admin-notice is-error">Das hat nicht geklappt. Bitte versuche es nochmals.</p>}
      <form action={requestPasswordReset} className="admin-form">
        <label>E-Mail<input type="email" name="email" autoComplete="username" required/></label>
        <button type="submit">Link anfordern</button>
      </form>
    </>}
    <p><Link href="/dashboard/login" className="text-link">Zurück zur Anmeldung</Link></p>
  </div></div>;
}
