'use client';
import { createBrowserClient } from '@supabase/ssr';
import { WAKPU_SCHEMA } from './schema';
export function getBrowserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Supabase ist noch nicht eingerichtet.');
  return createBrowserClient(url,key,{db:{schema:WAKPU_SCHEMA}});
}
