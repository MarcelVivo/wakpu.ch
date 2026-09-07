import { requireAdmin } from '@/lib/auth/admin';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { AdminNav, AdminNotice } from '@/components/admin/AdminNav';
import { notifyWaitlist } from '@/app/admin/actions';

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
    <h1>Warteliste.</h1>
    <AdminNotice status={status} />
    {status === 'saved' && <p className="admin-notice">{sent} E-Mail(s) verschickt.</p>}
    <div className="admin-card">
      <p>{total ?? 0} Anmeldungen insgesamt, davon {confirmed ?? 0} bestätigt.</p>
      <p>{pending ?? 0} bestätigte Person(en) wurden noch nicht benachrichtigt.</p>
    </div>
    <form action={notifyWaitlist}>
      <button type="submit" disabled={!pending}>Alle bestätigten Personen jetzt benachrichtigen</button>
    </form>
  </>;
}
