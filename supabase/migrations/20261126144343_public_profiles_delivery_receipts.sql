-- SnapStudy public student profiles and delivery receipts.
-- Exposes only profile fields intentionally used by the social profile screen.
alter table public.messages add column if not exists delivered_at timestamptz;
create index if not exists messages_delivery_idx on public.messages(friendship_id, delivered_at) where delivered_at is not null;
revoke update on public.messages from anon, authenticated;
grant update (read_at, delivered_at, body, edited_at, deleted_at) on public.messages to authenticated;

create or replace function public.get_public_profile(target_user_id uuid)
returns table(
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  profile_about text,
  profile_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in to view student profiles.'; end if;
  if target_user_id is null or not exists(select 1 from public.profiles p where p.id=target_user_id) then
    raise exception 'That student profile could not be found.';
  end if;
  return query
    select p.id, p.username, p.display_name, p.avatar_url,
      left(coalesce(u.raw_user_meta_data->>'profile_about',''),160),
      left(coalesce(u.raw_user_meta_data->>'profile_status','Ready to study'),80)
    from public.profiles p
    join auth.users u on u.id=p.id
    where p.id=target_user_id;
end;
$$;

revoke all on function public.get_public_profile(uuid) from public, anon;
grant execute on function public.get_public_profile(uuid) to authenticated;
