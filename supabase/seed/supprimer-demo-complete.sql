-- Supprime tout ce que crée supabase/seed/demo-complete.sql : comptes, projets, annonces, demandes d'accès,
-- paiements simulés, conversations et notifications de démonstration. Ne touche pas aux comptes de comptes-test.sql
-- (supprimer-comptes-test.sql, lui, retire tous les comptes @gofounders.test, ceux-ci compris).

do $$
declare
  demo_ids uuid[] := array(select id from auth.users where id::text like 'a1000000-0000-4000-8000-%');
begin
  delete from public.payments where stripe_session_id like 'demo_%';
  delete from public.messages
  where conversation_id in (
    select id from public.conversations
    where participant_a = any(demo_ids) or participant_b = any(demo_ids)
  );
  delete from public.conversations where participant_a = any(demo_ids) or participant_b = any(demo_ids);
  delete from public.notifications where user_id = any(demo_ids);
  delete from public.usage_counters where user_id = any(demo_ids);
  delete from public.ma_access_requests where buyer_id = any(demo_ids) or owner_id = any(demo_ids);
  delete from public.project_access_requests where requester_id = any(demo_ids) or owner_id = any(demo_ids);
  delete from public.ma_listings where owner_id = any(demo_ids);
  delete from public.projects where owner_id = any(demo_ids);
  delete from public.profiles where id = any(demo_ids);
  delete from auth.identities where user_id = any(demo_ids);
  delete from auth.users where id = any(demo_ids);
end;
$$;

select count(*) as comptes_demo_restants from auth.users where id::text like 'a1000000-0000-4000-8000-%';
