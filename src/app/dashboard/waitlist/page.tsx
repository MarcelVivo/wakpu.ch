import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/auth/admin';
import { getAdminSupabase } from '@/lib/supabase/admin';
import { AdminNav, AdminNotice } from '@/components/admin/AdminNav';
import { notifyWaitlist, sendMarketingMailing } from '@/app/dashboard/actions';
import { formatDate } from '@/lib/status';
import { Users, BadgeCheck, Send } from 'lucide-react';
import Link from 'next/link';

export default async function WaitlistPage({ searchParams }: { searchParams: Promise<{ status?: string; sent?: string; mailing?: string; page?: string }> }) {
  await requireAdmin();
  const { status, sent, mailing, page: pageParam } = await searchParams;
  const page = Math.max(1, Math.min(100000, Number.parseInt(pageParam || '1') || 1));
  const db = getAdminSupabase();
  const [{ count: total }, { count: confirmed }, { count: pending }, { data: rows, count: rowCount }] = await Promise.all([
    db.from('waitlist_signups').select('*', { count: 'exact', head: true }),
    db.from('waitlist_signups').select('*', { count: 'exact', head: true }).not('confirmed_at', 'is', null),
    db.from('waitlist_signups').select('*', { count: 'exact', head: true }).not('confirmed_at', 'is', null).is('notified_at', null),
    db.from('waitlist_signups').select('email,locale,confirmed_at,created_at', { count: 'exact' }).order('created_at', { ascending: false }).range((page - 1) * 50, page * 50 - 1),
  ]);
  const mailingId = randomUUID();
  return <>
    <AdminNav />
    <p className="eyebrow">WARTELISTE</p>
    <h1>Wer wartet auf WAKPU.</h1>
    <AdminNotice status={status} />
    {status === 'saved' && <p className="admin-notice">{sent} E-Mail(s) verschickt{mailing ? ' (Mailing)' : ' (Launch-Benachrichtigung)'}.</p>}
    <div className="admin-metrics">
      <div className="admin-metric-card"><Users size={20} aria-hidden="true" /><strong>{total ?? 0}</strong><span>Anmeldungen insgesamt</span></div>
      <div className="admin-metric-card"><BadgeCheck size={20} aria-hidden="true" /><strong>{confirmed ?? 0}</strong><span>Bestätigt</span></div>
      <div className="admin-metric-card"><Send size={20} aria-hidden="true" /><strong>{pending ?? 0}</strong><span>Noch nicht benachrichtigt</span></div>
    </div>
    <form action={notifyWaitlist} className="admin-actions">
      <button type="submit" className="button button-dark" disabled={!pending}>Alle bestätigten Personen jetzt benachrichtigen</button>
    </form>

    <h2>Anmeldungen.</h2>
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead><tr><th>E-Mail</th><th>Sprache</th><th>Angemeldet am</th><th>Status</th></tr></thead>
        <tbody>{(rows ?? []).map((row) => <tr key={row.email}>
          <td>{row.email}</td>
          <td>{row.locale.toUpperCase()}</td>
          <td>{formatDate(row.created_at)}</td>
          <td><span className="status-pill" data-status={row.confirmed_at ? 'paid' : 'pending'}>{row.confirmed_at ? 'Bestätigt' : 'Ausstehend'}</span></td>
        </tr>)}</tbody>
      </table>
      {!rows?.length && <p className="admin-card">Noch keine Anmeldungen.</p>}
    </div>
    <div className="admin-pagination">
      {page > 1 && <Link href={`/dashboard/waitlist?page=${page - 1}`}>← Zurück</Link>}
      {(rowCount || 0) > page * 50 && <Link href={`/dashboard/waitlist?page=${page + 1}`}>Weitere Anmeldungen →</Link>}
    </div>

    <h2>Marketing-Mailing.</h2>
    <p className="admin-lead">Geht nur an bereits bestätigte Adressen. Betreff und Text werden unverändert an alle ausgewählten Empfänger verschickt.</p>
    <form action={sendMarketingMailing} className="admin-form">
      <input type="hidden" name="mailing_id" value={mailingId} />
      <label>Empfänger<select name="locale_filter" defaultValue="all">
        <option value="all">Alle bestätigten ({confirmed ?? 0})</option>
        <option value="de">Nur Deutsch</option>
        <option value="en">Nur Englisch</option>
        <option value="fr">Nur Französisch</option>
        <option value="it">Nur Italienisch</option>
      </select></label>
      <label>Betreff<input name="subject" required maxLength={200} /></label>
      <label>Text<textarea name="body" required maxLength={20000} rows={8} placeholder="Ein Absatz pro Leerzeile." /></label>
      <button type="submit">Mailing jetzt verschicken</button>
    </form>
  </>;
}
