-- Keep delivery/read receipts from becoming a way to edit another user's messages.
create or replace function public.guard_message_receipt_updates()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    return new;
  end if;

  if current_user_id = old.sender_id then
    if new.read_at is distinct from old.read_at
       or new.delivered_at is distinct from old.delivered_at then
      raise exception 'Only the recipient can update message receipts.';
    end if;
  else
    if new.friendship_id is distinct from old.friendship_id
       or new.sender_id is distinct from old.sender_id
       or new.message_type is distinct from old.message_type
       or new.body is distinct from old.body
       or new.media_path is distinct from old.media_path
       or new.gift_code is distinct from old.gift_code
       or new.created_at is distinct from old.created_at
       or new.reply_to is distinct from old.reply_to
       or new.edited_at is distinct from old.edited_at
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'Recipients can only update delivery/read receipts.';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_message_receipt_updates() from public, anon, authenticated;
drop trigger if exists guard_message_receipt_updates on public.messages;
create trigger guard_message_receipt_updates
before update on public.messages
for each row execute function public.guard_message_receipt_updates();