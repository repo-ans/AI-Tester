-- AI Bot Tester dashboard: run once in Supabase → SQL Editor.
-- Safe to re-run. Lets signed-in dashboard users read tests, stop tests and
-- manage scenarios. n8n connects with the Postgres credential (table owner),
-- so row-level security does not affect the workflows.

-- 1. Saved scenarios -------------------------------------------------------

create table if not exists public.ai_test_scenarios (
  id          bigint generated always as identity primary key,
  channel     text    not null default 'any' check (channel in ('any', 'sms', 'voice', 'chat')),
  name        text    not null,
  persona     text    not null default '',
  goal        text    not null default '',
  checks      jsonb   not null default '[]'::jsonb,
  max_turns   int     not null default 10 check (max_turns between 2 and 30),
  bot_starts  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create or replace function public.ai_test_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists ai_test_scenarios_touch on public.ai_test_scenarios;
create trigger ai_test_scenarios_touch
  before update on public.ai_test_scenarios
  for each row execute function public.ai_test_touch_updated_at();

-- 2. Row-level security: signed-in users only ------------------------------

alter table public.ai_test_sessions  enable row level security;
alter table public.ai_test_messages  enable row level security;
alter table public.ai_test_scenarios enable row level security;

drop policy if exists "dashboard read sessions" on public.ai_test_sessions;
create policy "dashboard read sessions" on public.ai_test_sessions
  for select to authenticated using (true);

drop policy if exists "dashboard read messages" on public.ai_test_messages;
create policy "dashboard read messages" on public.ai_test_messages
  for select to authenticated using (true);

drop policy if exists "dashboard manage scenarios" on public.ai_test_scenarios;
create policy "dashboard manage scenarios" on public.ai_test_scenarios
  for all to authenticated using (true) with check (true);

-- Signed-out visitors (anon key only) get nothing.
revoke all on public.ai_test_sessions, public.ai_test_messages, public.ai_test_scenarios from anon;
grant select on public.ai_test_sessions, public.ai_test_messages to authenticated;
grant select, insert, update, delete on public.ai_test_scenarios to authenticated;

-- 3. Results list: one row per test with its message count -----------------

create or replace view public.ai_test_session_list
with (security_invoker = on) as
select
  s.id,
  s.channel,
  s.scenario ->> 'name'                 as name,
  s.status,
  s.turns,
  (s.result ->> 'score')::numeric       as score,
  s.bot_number,
  s.created_at,
  s.finished_at,
  (select count(*) from public.ai_test_messages m where m.session_id = s.id)::int as messages
from public.ai_test_sessions s;

revoke all on public.ai_test_session_list from anon;
grant select on public.ai_test_session_list to authenticated;

-- 4. Stop a running test ---------------------------------------------------
-- Users can't update sessions directly (so they can't edit results);
-- this function only flips a running test to 'aborted'.

create or replace function public.abort_test_session(p_id bigint)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if auth.role() is distinct from 'authenticated' then
    raise exception 'unauthorized';
  end if;
  update public.ai_test_sessions
     set status = 'aborted', finished_at = now()
   where id = p_id and status = 'running';
  get diagnostics n = row_count;
  return n;
end $$;

revoke all on function public.abort_test_session(bigint) from public, anon;
grant execute on function public.abort_test_session(bigint) to authenticated;

-- 5. Team-wide test defaults (one shared row) ------------------------------
-- Our own numbers/IDs, set once in the dashboard's Settings page and used to
-- pre-fill every Run test form for every user.

create table if not exists public.ai_test_settings (
  id                     int  primary key default 1 check (id = 1),
  sms_tester_number      text not null default '',
  voice_from_number      text not null default '',
  voice_tester_agent_id  text not null default '',
  chat_location_id       text not null default '',
  updated_at             timestamptz not null default now(),
  updated_by             text
);

insert into public.ai_test_settings (id, sms_tester_number, voice_from_number)
values (1, '+14375293053', '+14389059929')
on conflict (id) do nothing;

alter table public.ai_test_settings enable row level security;

drop policy if exists "dashboard read settings" on public.ai_test_settings;
create policy "dashboard read settings" on public.ai_test_settings
  for select to authenticated using (true);

drop policy if exists "dashboard update settings" on public.ai_test_settings;
create policy "dashboard update settings" on public.ai_test_settings
  for update to authenticated using (true) with check (true);

revoke all on public.ai_test_settings from anon;
grant select, update on public.ai_test_settings to authenticated;

drop trigger if exists ai_test_settings_touch on public.ai_test_settings;
create trigger ai_test_settings_touch
  before update on public.ai_test_settings
  for each row execute function public.ai_test_touch_updated_at();
