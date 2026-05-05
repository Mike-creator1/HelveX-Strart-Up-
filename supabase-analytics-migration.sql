-- ──────────────────────────────────────────────────────────────────
-- CreateX · Analytics events table
-- Run this once in the Supabase SQL editor of your project.
-- Schema is RLS-secured: each user can only read & write their own
-- events. The Analytics dashboard queries this table directly.
-- ──────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

create table if not exists public.analytics_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid,
  event_type   text not null,           -- page_view | sign_in | ai_generation | export_csv | export_report | error
  module       text,                    -- agent-builder | website-builder | …
  model        text,                    -- nexus-4.7 | prometheus-4.9 | …
  tokens       int,
  latency_ms   int,
  success      boolean,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);

alter table public.analytics_events enable row level security;

drop policy if exists "users_read_own_events"   on public.analytics_events;
drop policy if exists "users_insert_own_events" on public.analytics_events;

create policy "users_read_own_events"
  on public.analytics_events
  for select
  using (auth.uid() = user_id);

create policy "users_insert_own_events"
  on public.analytics_events
  for insert
  with check (auth.uid() = user_id);

create index if not exists analytics_events_user_time_idx
  on public.analytics_events (user_id, created_at desc);

create index if not exists analytics_events_type_idx
  on public.analytics_events (event_type, created_at desc);

create index if not exists analytics_events_module_idx
  on public.analytics_events (module, created_at desc);
