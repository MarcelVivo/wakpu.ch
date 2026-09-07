import assert from 'node:assert/strict';
import test from 'node:test';
import { waitlistSchema } from '../src/lib/validation/waitlist';
import { renderWaitlistConfirmEmail, renderWaitlistLaunchEmail } from '../src/lib/resend/templates';

test('waitlist signup only accepts a bare, bounded email address and a supported locale', () => {
  assert.equal(waitlistSchema.safeParse({ email: 'test@example.com', locale: 'de' }).success, true);
  assert.equal(waitlistSchema.safeParse({ email: 'not-an-email', locale: 'de' }).success, false);
  assert.equal(waitlistSchema.safeParse({ email: `${'a'.repeat(250)}@x.com`, locale: 'de' }).success, false);
  assert.equal(waitlistSchema.safeParse({ email: 'test@example.com', locale: 'xx' }).success, false);
  assert.equal(waitlistSchema.safeParse({ email: 'test@example.com', locale: 'de', extra: 'x' }).success, false);
});

test('waitlist emails escape untrusted URLs and never fabricate a link for an unsafe scheme', () => {
  const confirm = renderWaitlistConfirmEmail('javascript:alert(1)', 'de');
  assert.equal(confirm.html.includes('<a href='), false);
  const safeConfirm = renderWaitlistConfirmEmail('https://wakpu.ch/api/waitlist/confirm?token=abc', 'fr');
  assert.match(safeConfirm.html, /https:\/\/wakpu\.ch\/api\/waitlist\/confirm\?token=abc/);
  const launch = renderWaitlistLaunchEmail('https://wakpu.ch', 'en');
  assert.match(launch.subject, /WAKPU/);
  assert.match(launch.text, /https:\/\/wakpu\.ch/);
});
