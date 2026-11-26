-- Refunds are only callable by trusted Edge Functions, never by app clients.
create or replace function public.release_ai_quota(p_user_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_day date := (now() at time zone 'Europe/Stockholm')::date;
begin
  if p_user_id is null then raise exception 'User id required'; end if;
  if p_kind = 'chat' then
    update public.ai_daily_usage set chat_requests = greatest(0, chat_requests - 1), updated_at = now()
    where user_id = p_user_id and usage_date = v_day;
  elsif p_kind = 'study' then
    update public.ai_daily_usage set study_generations = greatest(0, study_generations - 1), updated_at = now()
    where user_id = p_user_id and usage_date = v_day;
  else
    raise exception 'Invalid quota type';
  end if;
end;
$$;
revoke all on function public.release_ai_quota(uuid,text) from public, anon, authenticated;
grant execute on function public.release_ai_quota(uuid,text) to service_role;
drop function if exists public.release_ai_quota(text);