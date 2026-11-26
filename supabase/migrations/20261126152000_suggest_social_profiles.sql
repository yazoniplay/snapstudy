create or replace function public.suggest_social_profiles(limit_count integer default 8)
returns table(id uuid, username text, display_name text, avatar_url text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id,p.username,p.display_name,p.avatar_url
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and not exists (
      select 1 from public.friendships f
      where (f.user_a=auth.uid() and f.user_b=p.id)
         or (f.user_b=auth.uid() and f.user_a=p.id)
    )
  order by p.display_name nulls last, p.username
  limit greatest(1,least(coalesce(limit_count,8),20));
$$;
revoke all on function public.suggest_social_profiles(integer) from public, anon;
grant execute on function public.suggest_social_profiles(integer) to authenticated;