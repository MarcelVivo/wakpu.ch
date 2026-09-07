-- WAKPU: pre-launch waitlist for the "notify me" flow. Double opt-in; only the
-- server (service_role) ever reads or writes this table, never the browser.
begin;

create table wakpu.waitlist_signups (
  id uuid primary key default pg_catalog.gen_random_uuid(),
  email text not null unique check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  confirm_token text not null unique check (length(confirm_token) = 64),
  confirmed_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on wakpu.waitlist_signups
  for each row execute function wakpu.set_updated_at();

alter table wakpu.waitlist_signups enable row level security;
revoke all on wakpu.waitlist_signups from public, anon, authenticated;
grant all on wakpu.waitlist_signups to service_role;

commit;
