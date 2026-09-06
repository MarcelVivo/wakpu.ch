import 'server-only';
import { redirect } from 'next/navigation';
import { getServerSupabase } from '@/lib/supabase/server';
export async function requireAdmin() {
  const expected=process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if(!expected||!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)redirect('/admin/login?status=setup');
  const supabase=await getServerSupabase();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error||!user?.email_confirmed_at||user.email?.toLowerCase()!==expected)redirect('/admin/login');
  return user;
}
