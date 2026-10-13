-- SnapStudy friends, private chat, images, and free virtual gifts.
-- All social reads/writes are restricted to authenticated users and friend pairs.

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_distinct_users check (user_a <> user_b),
  constraint friendships_ordered_users check (user_a < user_b),
  constraint friendships_requester_is_member check (requested_by = user_a or requested_by = user_b),
  unique (user_a,user_b)
);
create index if not exists friendships_user_a_status_idx on public.friendships(user_a,status);
create index if not exists friendships_user_b_status_idx on public.friendships(user_b,status);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  friendship_id uuid not null references public.friendships(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  message_type text not null default 'text' check (message_type in ('text','image','gift')),
  body text,
  media_path text,
  gift_code text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint messages_body_length check (body is null or char_length(body) <= 2000),
  constraint messages_payload_valid check (
    (message_type = 'text' and body is not null and char_length(trim(body)) > 0 and media_path is null and gift_code is null)
    or (message_type = 'image' and media_path is not null and gift_code is null and body is null)
    or (message_type = 'gift' and gift_code in ('heart','star','book','trophy','sparkles') and media_path is null and body is null)
  )
);
create index if not exists messages_friendship_created_idx on public.messages(friendship_id,created_at desc);

alter table public.friendships enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Friendships visible to participants" on public.friendships;
create policy "Friendships visible to participants" on public.friendships for select to authenticated
using ((select auth.uid()) = user_a or (select auth.uid()) = user_b);
drop policy if exists "Participants can remove friendships" on public.friendships;
create policy "Participants can remove friendships" on public.friendships for delete to authenticated
using ((select auth.uid()) = user_a or (select auth.uid()) = user_b);

drop policy if exists "Accepted friends can read messages" on public.messages;
create policy "Accepted friends can read messages" on public.messages for select to authenticated
using (exists (select 1 from public.friendships f where f.id = friendship_id and f.status = 'accepted' and (select auth.uid()) in (f.user_a,f.user_b)));
drop policy if exists "Accepted friends can send messages" on public.messages;
create policy "Accepted friends can send messages" on public.messages for insert to authenticated
with check (sender_id = (select auth.uid()) and exists (select 1 from public.friendships f where f.id = friendship_id and f.status = 'accepted' and (select auth.uid()) in (f.user_a,f.user_b)));
drop policy if exists "Recipients can mark messages read" on public.messages;
create policy "Recipients can mark messages read" on public.messages for update to authenticated
using (sender_id <> (select auth.uid()) and exists (select 1 from public.friendships f where f.id = friendship_id and f.status = 'accepted' and (select auth.uid()) in (f.user_a,f.user_b)))
with check (sender_id <> (select auth.uid()) and exists (select 1 from public.friendships f where f.id = friendship_id and f.status = 'accepted' and (select auth.uid()) in (f.user_a,f.user_b)));
-- Read receipts are the only field clients may update.
revoke update on table public.messages from anon, authenticated;
grant update (read_at) on table public.messages to authenticated;

create or replace function public.search_social_profiles(search_term text)
returns table(id uuid, username text, display_name text, avatar_url text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Sign in to find friends.'; end if;
  if length(trim(coalesce(search_term,''))) < 2 then return; end if;
  return query
    select p.id, p.username, p.display_name, p.avatar_url
    from public.profiles p
    where p.id <> auth.uid()
      and (
        coalesce(p.username,'') ilike '%' || trim(search_term) || '%'
        or coalesce(p.display_name,'') ilike '%' || trim(search_term) || '%'
      )
    order by case when lower(coalesce(p.username,'')) = lower(trim(search_term)) then 0 else 1 end, p.display_name
    limit 20;
end;
$$;

create or replace function public.get_social_profiles(target_ids uuid[])
returns table(id uuid, username text, display_name text, avatar_url text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.avatar_url
  from public.profiles p
  where auth.uid() is not null
    and p.id = any(coalesce(target_ids, array[]::uuid[]))
    and (
      p.id = auth.uid()
      or exists (
        select 1 from public.friendships f
        where (f.user_a = auth.uid() and f.user_b = p.id)
           or (f.user_b = auth.uid() and f.user_a = p.id)
      )
    );
$$;

create or replace function public.send_friend_request(target_user_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare current_user_id uuid := auth.uid(); result_id uuid;
begin
  if current_user_id is null then raise exception 'Sign in to add friends.'; end if;
  if target_user_id is null or target_user_id = current_user_id then raise exception 'Choose another account.'; end if;
  if not exists (select 1 from public.profiles p where p.id = target_user_id) then raise exception 'That profile could not be found.'; end if;
  insert into public.friendships(user_a,user_b,requested_by,status)
  values (least(current_user_id,target_user_id),greatest(current_user_id,target_user_id),current_user_id,'pending')
  on conflict (user_a,user_b) do update set requested_by=excluded.requested_by,status='pending',updated_at=now()
  where public.friendships.status='declined'
  returning id into result_id;
  if result_id is null then raise exception 'A request or friendship already exists.'; end if;
  return result_id;
end;
$$;

create or replace function public.respond_friend_request(target_user_id uuid, accept_request boolean)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare current_user_id uuid := auth.uid(); affected integer;
begin
  if current_user_id is null then raise exception 'Sign in to respond to requests.'; end if;
  update public.friendships
    set status = case when accept_request then 'accepted' else 'declined' end, updated_at=now()
    where user_a=least(current_user_id,target_user_id)
      and user_b=greatest(current_user_id,target_user_id)
      and requested_by=target_user_id
      and status='pending';
  get diagnostics affected = row_count;
  if affected = 0 then raise exception 'That incoming request is no longer available.'; end if;
  return true;
end;
$$;

revoke all on function public.search_social_profiles(text) from public;
revoke all on function public.get_social_profiles(uuid[]) from public;
revoke all on function public.send_friend_request(uuid) from public;
revoke all on function public.respond_friend_request(uuid,boolean) from public;
grant execute on function public.search_social_profiles(text) to authenticated;
grant execute on function public.get_social_profiles(uuid[]) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid,boolean) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('chat-images','chat-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "Friend chat members can read chat images" on storage.objects;
create policy "Friend chat members can read chat images" on storage.objects for select to authenticated
using (
  bucket_id='chat-images'
  and exists (select 1 from public.friendships f
    where f.id = (storage.foldername(name))[1]::uuid and f.status='accepted'
      and (select auth.uid()) in (f.user_a,f.user_b))
);
drop policy if exists "Friend chat members can upload their images" on storage.objects;
create policy "Friend chat members can upload their images" on storage.objects for insert to authenticated
with check (
  bucket_id='chat-images'
  and (storage.foldername(name))[2] = (select auth.uid())::text
  and exists (select 1 from public.friendships f
    where f.id = (storage.foldername(name))[1]::uuid and f.status='accepted'
      and (select auth.uid()) in (f.user_a,f.user_b))
);
drop policy if exists "Owners can delete their chat images" on storage.objects;
create policy "Owners can delete their chat images" on storage.objects for delete to authenticated
using (bucket_id='chat-images' and (storage.foldername(name))[2] = (select auth.uid())::text);

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;
