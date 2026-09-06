import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requiredEnv } from '@/lib/env';
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(requiredEnv('NEXT_PUBLIC_SUPABASE_URL'), requiredEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {cookies:{
    getAll:()=>cookieStore.getAll(),
    setAll: values => { try { values.forEach(({name,value,options})=>cookieStore.set(name,value,options)); } catch { /* Read-only Server Component; actions refresh sessions. */ } },
  }});
}
