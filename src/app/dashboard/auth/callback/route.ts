import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase/server';
import { siteUrl } from '@/lib/env';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/dashboard/reset-password';
  if (code) {
    const auth = await getServerSupabase();
    const { error } = await auth.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, siteUrl()));
  }
  return NextResponse.redirect(new URL('/dashboard/forgot-password?status=error', siteUrl()));
}
