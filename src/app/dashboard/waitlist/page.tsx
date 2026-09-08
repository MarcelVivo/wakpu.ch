import { requireAdmin } from '@/lib/auth/admin';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { AdminNav, AdminNotice } from '@/components/admin/AdminNav';
import { notifyWaitlist } from '@/app/dashboard/actions';
import { Users, BadgeCheck, Send } from 'lucide-react';

export default async function WaitlistPage({ searchParams }: { searchParams: Promise<{ status?: string; sent?: string }> }) {
  await requireAdmin();
  const { status, sent } = await searchParams;
  const db = getAdminSupabase();
  const [{ count: total }, { count: confirmed }, { count: pending }] = await Promise.all([
    db.from('waitlist_signups').select('*', { count: 'exact', head: true }),
    db.from('waitlist_signups').select('*', { count: 'exact', head: true }).not('confirmed_at', 'is', null),
    db.from('waitlist_signups').select('*', { count: 'exact', head: true }).not('confirmed_at', 'is', null).is('notified_at', null),
  ]);
  return <>
    <AdminNav />
    <p className="eyebrow">WARTELISTE</p>
    <h1>Wer wartet auf WAKPU.</h1>
    <AdminNotice status={status} />
    {status === 'saved' && <p className="admin-notice">{sent} E-Mail(s) verschickt.</p>}
    <div className="admin-metrics">
      <div className="admin-metric-card"><Users size={20} aria-hidden="true" /><strong>{total ?? 0}</strong><span>Anmeldungen insgesamt</span></div>
      <div className="admin-metric-card"><BadgeCheck size={20} aria-hidden="true" /><strong>{confirmed ?? 0}</strong><span>Bestätigt</span></div>
      <div className="admin-metric-card"><Send size={20} aria-hidden="true" /><strong>{pending ?? 0}</strong><span>Noch nicht benachrichtigt</span></div>
    </div>
    <form action={notifyWaitlist} className="admin-actions">
      <button type="submit" className="button button-dark" disabled={!pending}>Alle bestätigten Personen jetzt benachrichtigen</button>
    </form>
  </>;
}
