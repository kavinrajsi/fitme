-- Per-day health metrics synced from the Google Health API by a daily cron.
-- One row per user per day; writes happen via the service role (cron, bypasses
-- RLS), users may read only their own rows.
create table if not exists public.daily_metrics (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  steps int,
  calories int,
  distance_km numeric,
  sleep_min int,
  resting_hr int,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

create index if not exists daily_metrics_user_date_idx
  on public.daily_metrics (user_id, date desc);

alter table public.daily_metrics enable row level security;

drop policy if exists "daily_metrics_select_own" on public.daily_metrics;
create policy "daily_metrics_select_own" on public.daily_metrics
  for select using (auth.uid() = user_id);
