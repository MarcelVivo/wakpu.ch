import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
import { updatePassword } from '../actions';
import { PasswordField } from '@/components/admin/PasswordField';
export default async function ResetPasswordPage({searchParams}:{searchParams:Promise<{status?:string}>}){
  const {status}=await searchParams;
  const auth=await getServerSupabase();
  const {data:{user}}=await auth.auth.getUser();
  if(!user)redirect('/dashboard/login');
  return <div className="admin-login-shell"><div className="admin-login">
    <span className="wordmark admin-wordmark">WAKPU<span>INTERN</span></span>
    <h1>Neues Passwort.</h1>
    <p>Wähle ein neues Passwort für dein Admin-Konto.</p>
    {status==='error'&&<p role="alert" className="admin-notice is-error">Das hat nicht geklappt. Bitte versuche es nochmals.</p>}
    <form action={updatePassword} className="admin-form">
      <PasswordField label="Neues Passwort" name="password" autoComplete="new-password" minLength={8}/>
      <button type="submit">Passwort speichern</button>
    </form>
  </div></div>;
}
