alter table public.profiles
  add column if not exists profile_about text not null default '',
  add column if not exists profile_status text not null default 'Ready to study';

update public.profiles p
set profile_about=left(coalesce(u.raw_user_meta_data->>'profile_about',''),160),
    profile_status=left(coalesce(u.raw_user_meta_data->>'profile_status','Ready to study'),80)
from auth.users u
where u.id=p.id;

create or replace function public.get_public_profile(target_user_id uuid)
returns table(
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  profile_about text,
  profile_status text
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url,
    left(coalesce(p.profile_about,''),160),
    left(coalesce(p.profile_status,'Ready to study'),80)
  from public.profiles p
  where auth.uid() is not null
    and target_user_id is not null
    and p.id=target_user_id;
$$;

revoke all on function public.get_public_profile(uuid) from public, anon;
grant execute on function public.get_public_profile(uuid) to authenticated;