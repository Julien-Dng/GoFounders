create or replace function public.handle_new_message_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient_id uuid;
  sender_name text;
begin
  select
    case
      when conversations.participant_a = new.sender_id then conversations.participant_b
      when conversations.participant_b = new.sender_id then conversations.participant_a
      else null
    end
  into recipient_id
  from public.conversations
  where conversations.id = new.conversation_id;

  if recipient_id is null or recipient_id = new.sender_id then
    return new;
  end if;

  select coalesce(nullif(profiles.display_name, ''), 'Un membre')
  into sender_name
  from public.profiles
  where profiles.id = new.sender_id;

  insert into public.notifications (user_id, title, body, link_url)
  values (
    recipient_id,
    'Nouveau message de ' || coalesce(sender_name, 'un membre'),
    left(new.content, 160),
    '/messages?conversation=' || new.conversation_id::text
  );

  return new;
end;
$$;

revoke all on function public.handle_new_message_notification() from public, anon, authenticated;

drop trigger if exists on_message_created_notify_recipient on public.messages;

create trigger on_message_created_notify_recipient
after insert on public.messages
for each row
execute function public.handle_new_message_notification();

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.conversations;
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end;
$$;
