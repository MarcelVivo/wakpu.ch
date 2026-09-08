import 'server-only';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
}
export async function requireAdmin() {
  const allowed=adminEmails();
  if(!allowed.length||!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)redirect('/dashboard/login?status=setup');
  const supabase=await getServerSupabase();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user?.email_confirmed_at||!allowed.includes(user.email?.toLowerCase()??''))redirect('/dashboard/login');
  return user;
}
