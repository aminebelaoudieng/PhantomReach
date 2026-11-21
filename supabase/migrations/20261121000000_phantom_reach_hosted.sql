create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.phantom_runtime_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into private.phantom_runtime_config (key, value)
values ('db_access_token_sha256', '__SET_DURING_PROVISIONING__')
on conflict (key) do nothing;

create or replace function private.phantom_request_is_authorized()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    pg_catalog.encode(
      extensions.digest(
        coalesce(
          pg_catalog.current_setting('request.headers', true)::jsonb ->> 'x-phantom-db-token',
          ''
        ),
        'sha256'
      ),
      'hex'
    ) = (
      select value
      from private.phantom_runtime_config
      where key = 'db_access_token_sha256'
    ),
    false
  );
$$;

revoke all on function private.phantom_request_is_authorized() from public;
grant usage on schema private to anon;
grant execute on function private.phantom_request_is_authorized() to anon;

create table if not exists public.users (
  id uuid primary key,
  auth_user_id text,
  email text unique not null,
  name text,
  plan text not null default 'agency' check (plan in ('free', 'starter', 'pro', 'agency')),
  stripe_customer_id text,
  audit_credits_remaining integer not null default 999999,
  scout_credits_remaining integer not null default 999999,
  widget_api_key text,
  white_label_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('audit', 'scout')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'completed', 'failed', 'partial')),
  input jsonb not null,
  result jsonb,
  scores jsonb,
  pdf_storage_path text,
  email_sent_at timestamptz,
  expires_at timestamptz,
  is_widget_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_usage (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  action text not null check (action in ('audit', 'scout', 'pdf_export', 'widget_audit')),
  credits_consumed integer not null default 1,
  stripe_metered_event_id text,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.widget_leads (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  visitor_email text not null,
  visitor_name text,
  business_audited text not null,
  report_id uuid references public.reports(id) on delete set null,
  created_at timestamptz not null default now(),
  delivered_at timestamptz
);

create index if not exists idx_reports_user_id on public.reports(user_id);
create index if not exists idx_reports_created_at on public.reports(created_at desc);
create index if not exists idx_usage_user_action_created on public.api_usage(user_id, action, created_at desc);
create index if not exists idx_widget_leads_user_id on public.widget_leads(user_id);

alter table public.users enable row level security;
alter table public.reports enable row level security;
alter table public.api_usage enable row level security;
alter table public.widget_leads enable row level security;

grant select, insert, update, delete on public.users, public.reports, public.api_usage, public.widget_leads to anon;

drop policy if exists phantom_server_access on public.users;
create policy phantom_server_access on public.users
  for all to anon
  using (private.phantom_request_is_authorized())
  with check (private.phantom_request_is_authorized());

drop policy if exists phantom_server_access on public.reports;
create policy phantom_server_access on public.reports
  for all to anon
  using (private.phantom_request_is_authorized())
  with check (private.phantom_request_is_authorized());

drop policy if exists phantom_server_access on public.api_usage;
create policy phantom_server_access on public.api_usage
  for all to anon
  using (private.phantom_request_is_authorized())
  with check (private.phantom_request_is_authorized());

drop policy if exists phantom_server_access on public.widget_leads;
create policy phantom_server_access on public.widget_leads
  for all to anon
  using (private.phantom_request_is_authorized())
  with check (private.phantom_request_is_authorized());

insert into public.users (
  id,
  email,
  name,
  plan,
  audit_credits_remaining,
  scout_credits_remaining
)
values (
  '00000000-0000-4000-8000-000000000001',
  'hosted@phantomreach.local',
  'Hosted Workspace',
  'agency',
  999999,
  999999
)
on conflict (id) do nothing;

