-- Droits du rôle service_role (clé secrète, utilisée uniquement côté serveur : back Python,
-- futur webhook Stripe). Rétablit la configuration par défaut de Supabase, absente sur ce projet
-- (erreur « permission denied for table profiles » côté back).
-- service_role contourne déjà les règles RLS ; ces droits ne concernent pas anon / authenticated.

grant usage on schema public to service_role;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Tables, séquences et fonctions créées plus tard par les prochaines migrations.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
