-- Retire les annonces créées par annonces-demo.sql (vues, demandes de vérification et témoignages liés
-- sont supprimés en cascade) et sort les comptes de test de la vitrine /associes.

delete from public.ma_listings where id::text like 'c0000000-0000-4000-8000-%';

update public.profiles set public_listing = false
where id in (select id from auth.users where email like '%@gofounders.test');
