import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { siteUrl } from '@/lib/env';
import { logEvent } from '@/lib/logger';
import { isLocale, defaultLocale } from '@/i18n/locales';

export const runtime = 'nodejs';

function redirectWith(status: string, locale: string): NextResponse {
  const url = new URL(`/${isLocale(locale) ? locale : defaultLocale}/`, siteUrl());
  url.searchParams.set('waitlist', status);
  return NextResponse.redirect(url, { headers: { 'Cache-Control': 'no-store' } });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get('token') || '';
  if (!/^[a-f0-9]{64}$/.test(token)) return redirectWith('invalid', defaultLocale);
  try {
    const db = getAdminSupabase();
    const { data: existing, error: lookupError } = await db.from('waitlist_signups').select('id,confirmed_at,locale').eq('confirm_token', token).maybeSingle();
    if (lookupError) throw lookupError;
    if (!existing) return redirectWith('invalid', defaultLocale);
    if (existing.confirmed_at) return redirectWith('already', existing.locale);
    const { error } = await db.from('waitlist_signups').update({ confirmed_at: new Date().toISOString() }).eq('id', existing.id);
    if (error) throw error;
    return redirectWith('confirmed', existing.locale);
  } catch {
    logEvent('waitlist.confirm_failed', {});
    return redirectWith('invalid', defaultLocale);
  }
}
