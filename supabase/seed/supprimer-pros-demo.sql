-- Supprime les professionnels créés par pros-demo.sql et leurs données (statistiques, conversations, annonces).

do $$
declare
  demo_ids uuid[] := array(select id from auth.users where id::text like 'd0000000-0000-4000-8000-%');
begin
  delete from public.messages
  where conversation_id in (
    select id from public.conversations
    where participant_a = any(demo_ids) or participant_b = any(demo_ids)
  );
  delete from public.conversations where participant_a = any(demo_ids) or participant_b = any(demo_ids);
  delete from public.notifications where user_id = any(demo_ids);
  delete from public.ma_listings where owner_id = any(demo_ids);
  delete from public.profiles where id = any(demo_ids);
  delete from auth.identities where user_id = any(demo_ids);
  delete from auth.users where id = any(demo_ids);
end;
$$;
