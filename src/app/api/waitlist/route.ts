import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { getResend, isEmailConfigured } from '@/lib/resend/client';
import { renderWaitlistConfirmEmail } from '@/lib/resend/templates';
import { waitlistSchema } from '@/lib/validation/waitlist';
import { assertSameOrigin, readJson, apiError } from '@/lib/http';
import { siteUrl } from '@/lib/env';
import { logEvent } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const parsed = waitlistSchema.safeParse(await readJson(request));
    if (!parsed.success) return apiError('Bitte gib eine gültige E-Mail-Adresse ein.', 400);
    const email = parsed.data.email.trim().toLowerCase();
    const locale = parsed.data.locale;
    const db = getAdminSupabase();
    const { data: existing, error: lookupError } = await db.from('waitlist_signups').select('id,confirmed_at').eq('email', email).maybeSingle();
    if (lookupError) throw lookupError;
    if (existing?.confirmed_at) return NextResponse.json({ status: 'already_confirmed' }, { headers: { 'Cache-Control': 'no-store' } });
    const token = randomBytes(32).toString('hex');
    if (existing) {
      const { error } = await db.from('waitlist_signups').update({ confirm_token: token, locale }).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await db.from('waitlist_signups').insert({ email, confirm_token: token, locale });
      if (error) throw error;
    }
    if (isEmailConfigured()) {
      const confirmUrl = new URL('/api/waitlist/confirm', siteUrl());
      confirmUrl.searchParams.set('token', token);
      const message = renderWaitlistConfirmEmail(confirmUrl.toString(), locale);
      const response = await getResend().emails.send(
        { from: process.env.RESEND_FROM_EMAIL!, to: email, ...message },
        { idempotencyKey: `wakpu-waitlist/${token}` },
      );
      if (response.error) logEvent('waitlist.email_failed', {});
    }
    return NextResponse.json({ status: 'pending' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'ORIGIN') return apiError('Diese Anfrage ist nicht erlaubt.', 403);
    if (['CONTENT_TYPE', 'BODY_SIZE'].includes(code) || error instanceof SyntaxError) return apiError('Ungültige Anfrage.', 400);
    logEvent('waitlist.failed', {});
    return apiError('Die Anmeldung hat nicht geklappt. Bitte versuche es nochmals.');
  }
}
