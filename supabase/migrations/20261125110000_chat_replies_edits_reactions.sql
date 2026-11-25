alter table public.messages
  add column if not exists reply_to uuid references public.messages(id) on delete set null,
  add column if not exists edited_at timestamptz,
  add column if not exists deleted_at timestamptz;
create index if not exists messages_reply_to_idx on public.messages(reply_to) where reply_to is not null;
drop policy if exists "Participants can edit own text messages" on public.messages;
create policy "Participants can edit own text messages" on public.messages for update to authenticated
using (sender_id=(select auth.uid()) and message_type='text' and exists(select 1 from public.friendships f where f.id=friendship_id and f.status='accepted' and (select auth.uid()) in (f.user_a,f.user_b)))
with check (sender_id=(select auth.uid()) and message_type='text' and body is not null and char_length(trim(body))>0 and exists(select 1 from public.friendships f where f.id=friendship_id and f.status='accepted' and (select auth.uid()) in (f.user_a,f.user_b)));
revoke update on public.messages from anon,authenticated;
grant update (read_at,body,edited_at,deleted_at) on public.messages to authenticated;
create table if not exists public.message_reactions(id uuid primary key default gen_random_uuid(),message_id uuid not null references public.messages(id) on delete cascade,user_id uuid not null references auth.users(id) on delete cascade,emoji text not null check(emoji in ('👍','❤️','😂','🎉','🤔','🔥')),created_at timestamptz not null default now(),unique(message_id,user_id,emoji));
create index if not exists message_reactions_message_idx on public.message_reactions(message_id);
alter table public.message_reactions enable row level security;
drop policy if exists "Accepted friends can read message reactions" on public.message_reactions;
create policy "Accepted friends can read message reactions" on public.message_reactions for select to authenticated using(exists(select 1 from public.messages m join public.friendships f on f.id=m.friendship_id where m.id=message_id and f.status='accepted' and (select auth.uid()) in (f.user_a,f.user_b)));
drop policy if exists "Friends can add own message reactions" on public.message_reactions;
create policy "Friends can add own message reactions" on public.message_reactions for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.messages m join public.friendships f on f.id=m.friendship_id where m.id=message_id and f.status='accepted' and (select auth.uid()) in (f.user_a,f.user_b)));
drop policy if exists "Users can remove own message reactions" on public.message_reactions;
create policy "Users can remove own message reactions" on public.message_reactions for delete to authenticated using(user_id=(select auth.uid()));
do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='message_reactions') then alter publication supabase_realtime add table public.message_reactions; end if; end $$;