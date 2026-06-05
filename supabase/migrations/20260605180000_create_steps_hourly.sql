-- Intraday (hourly) step buckets per user, from the Google Health `steps` list data.
create table if not exists public.steps_hourly (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  hour int not null,
  steps int not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, day, hour)
);

create index if not exists steps_hourly_user_day_idx
  on public.steps_hourly (user_id, day desc);

alter table public.steps_hourly enable row level security;

drop policy if exists "steps_hourly_select_own" on public.steps_hourly;
create policy "steps_hourly_select_own" on public.steps_hourly
  for select using (auth.uid() = user_id);
