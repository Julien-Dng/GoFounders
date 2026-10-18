-- Supprime les comptes créés par comptes-test.sql et leurs données (conversations, messages, annonces...).

do $$
declare
  test_ids uuid[] := array(select id from auth.users where email like '%@gofounders.test');
begin
  delete from public.messages
  where conversation_id in (
    select id from public.conversations
    where participant_a = any(test_ids) or participant_b = any(test_ids)
  );
  delete from public.conversations where participant_a = any(test_ids) or participant_b = any(test_ids);
  delete from public.notifications where user_id = any(test_ids);
  delete from public.usage_counters where user_id = any(test_ids);
  delete from public.ma_listings where owner_id = any(test_ids);
  delete from public.projects where owner_id = any(test_ids);
  delete from public.profiles where id = any(test_ids);
  delete from auth.identities where user_id = any(test_ids);
  delete from auth.users where id = any(test_ids);
end;
$$;
