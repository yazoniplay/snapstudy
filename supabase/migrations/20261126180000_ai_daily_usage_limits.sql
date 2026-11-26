-- Daily SnapStudy AI quotas. All usage is counted in Sweden local time.
create table if not exists public.ai_daily_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  chat_requests integer not null default 0 check (chat_requests >= 0),
  study_generations integer not null default 0 check (study_generations >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);
alter table public.ai_daily_usage enable row level security;
revoke all on table public.ai_daily_usage from public, anon, authenticated;

create or replace function public.consume_ai_quota(p_kind text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_day date := (now() at time zone 'Europe/Stockholm')::date;
  v_plus boolean; v_chat integer; v_study integer; v_limit integer; v_used integer;
  v_reset timestamptz := ((now() at time zone 'Europe/Stockholm')::date + 1)::timestamp at time zone 'Europe/Stockholm';
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  if p_kind not in ('chat', 'study') then raise exception 'Invalid quota type'; end if;
  select exists(select 1 from public.user_subscriptions s where s.user_id=v_user_id and s.status='active' and (s.current_period_end is null or s.current_period_end>now())) into v_plus;
  insert into public.ai_daily_usage(user_id,usage_date) values(v_user_id,v_day) on conflict do nothing;
  select u.chat_requests,u.study_generations into v_chat,v_study from public.ai_daily_usage u where u.user_id=v_user_id and u.usage_date=v_day for update;
  v_limit := case when v_plus then (case when p_kind='chat' then 100 else 30 end) else (case when p_kind='chat' then 10 else 5 end) end;
  v_used := case when p_kind='chat' then v_chat else v_study end;
  if v_used>=v_limit then return jsonb_build_object('allowed',false,'kind',p_kind,'used',v_used,'limit',v_limit,'plan',case when v_plus then 'plus' else 'free' end,'resetsAt',v_reset); end if;
  if p_kind='chat' then update public.ai_daily_usage set chat_requests=chat_requests+1,updated_at=now() where user_id=v_user_id and usage_date=v_day;
  else update public.ai_daily_usage set study_generations=study_generations+1,updated_at=now() where user_id=v_user_id and usage_date=v_day; end if;
  return jsonb_build_object('allowed',true,'kind',p_kind,'used',v_used+1,'limit',v_limit,'plan',case when v_plus then 'plus' else 'free' end,'resetsAt',v_reset);
end;
$$;

create or replace function public.release_ai_quota(p_kind text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_user_id uuid := auth.uid(); v_day date := (now() at time zone 'Europe/Stockholm')::date;
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  if p_kind='chat' then update public.ai_daily_usage set chat_requests=greatest(0,chat_requests-1),updated_at=now() where user_id=v_user_id and usage_date=v_day;
  elsif p_kind='study' then update public.ai_daily_usage set study_generations=greatest(0,study_generations-1),updated_at=now() where user_id=v_user_id and usage_date=v_day;
  else raise exception 'Invalid quota type'; end if;
end;
$$;

create or replace function public.get_ai_usage()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid(); v_day date := (now() at time zone 'Europe/Stockholm')::date;
  v_chat integer := 0; v_study integer := 0; v_plus boolean;
  v_reset timestamptz := ((now() at time zone 'Europe/Stockholm')::date + 1)::timestamp at time zone 'Europe/Stockholm';
begin
  if v_user_id is null then raise exception 'Sign in required'; end if;
  select exists(select 1 from public.user_subscriptions s where s.user_id=v_user_id and s.status='active' and (s.current_period_end is null or s.current_period_end>now())) into v_plus;
  select u.chat_requests,u.study_generations into v_chat,v_study from public.ai_daily_usage u where u.user_id=v_user_id and u.usage_date=v_day;
  return jsonb_build_object('plan',case when v_plus then 'plus' else 'free' end,'chatUsed',coalesce(v_chat,0),'chatLimit',case when v_plus then 100 else 10 end,'studyUsed',coalesce(v_study,0),'studyLimit',case when v_plus then 30 else 5 end,'resetsAt',v_reset);
end;
$$;
revoke all on function public.consume_ai_quota(text) from public, anon;
revoke all on function public.release_ai_quota(text) from public, anon;
revoke all on function public.get_ai_usage() from public, anon;
grant execute on function public.consume_ai_quota(text) to authenticated;
grant execute on function public.release_ai_quota(text) to authenticated;
grant execute on function public.get_ai_usage() to authenticated;
