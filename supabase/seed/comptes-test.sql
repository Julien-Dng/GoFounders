-- Comptes de test, un par rôle et par cas à tester. NE PAS exécuter en production.
-- À lancer dans le SQL Editor de Supabase, après toutes les migrations du dossier supabase/.
-- Relançable : un compte qui existe déjà n'est pas recréé, son plan et son accès M&A sont remis à jour.
--
-- Mot de passe de tous les comptes : Test-GoFounders-2026
--
--   entrepreneur.free@gofounders.test   Porteur de projet, FREE (quotas 3 contacts / 5 messages)
--   entrepreneur.pro@gofounders.test    Porteur de projet, PRO (assistant IA, illimité)
--   talent.free@gofounders.test         Talent, FREE
--   talent.pro@gofounders.test          Talent, PRO
--   acheteur@gofounders.test            Acheteur sans accès M&A (dossiers verrouillés)
--   acheteur.ma@gofounders.test         Acheteur avec accès M&A (dossiers complets)
--   vendeur@gofounders.test             Vendeur sans accès M&A (publication bloquée)
--   vendeur.ma@gofounders.test          Vendeur avec accès M&A + une annonce publiée
--
-- Suppression : supabase/seed/supprimer-comptes-test.sql

create or replace function pg_temp.create_test_user(
  user_id uuid,
  user_email text,
  metadata jsonb,
  user_plan text,
  user_ma_access boolean
)
returns void
language plpgsql
as $$
begin
  if not exists (select 1 from auth.users where id = user_id or email = user_email) then
    -- Le trigger on_auth_user_created crée le profil (et le projet d'un porteur de projet).
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    )
    values (
      '00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated', user_email,
      extensions.crypt('Test-GoFounders-2026', extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}', metadata, now(), now(),
      '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), user_id, user_id::text, 'email',
      jsonb_build_object('sub', user_id::text, 'email', user_email, 'email_verified', true),
      now(), now(), now()
    );
  end if;

  -- Exécuté en tant que postgres : autorisé par le trigger enforce_profile_entitlements.
  update public.profiles
  set plan = user_plan::public.plan_type, ma_access = user_ma_access, updated_at = now()
  where id = (select id from auth.users where email = user_email);
end;
$$;

select pg_temp.create_test_user(
  'a0000000-0000-4000-8000-000000000001', 'entrepreneur.free@gofounders.test',
  '{"display_name": "Emma Fondatrice (FREE)", "profile_type": "entrepreneur", "location": "Lyon",
    "profile_title": "LogiFlow", "looking_for": ["Talent", "SaaS"],
    "project_name": "LogiFlow", "project_sector": "SaaS", "project_stage": "mvp"}',
  'FREE', false);

select pg_temp.create_test_user(
  'a0000000-0000-4000-8000-000000000002', 'entrepreneur.pro@gofounders.test',
  '{"display_name": "Paul Fondateur (PRO)", "profile_type": "entrepreneur", "location": "Paris",
    "profile_title": "GreenCart", "looking_for": ["Talent", "E-commerce"],
    "project_name": "GreenCart", "project_sector": "E-commerce", "project_stage": "growth"}',
  'PRO', false);

select pg_temp.create_test_user(
  'a0000000-0000-4000-8000-000000000003', 'talent.free@gofounders.test',
  '{"display_name": "Tom Développeur (FREE)", "profile_type": "talent", "location": "Bordeaux",
    "profile_title": "Développeur full-stack", "skills": ["Angular", "Node.js"],
    "looking_for": ["Projet entrepreneurial"], "availability_label": "Disponible rapidement"}',
  'FREE', false);

select pg_temp.create_test_user(
  'a0000000-0000-4000-8000-000000000004', 'talent.pro@gofounders.test',
  '{"display_name": "Léa Growth (PRO)", "profile_type": "talent", "location": "Nantes",
    "profile_title": "Growth marketer", "skills": ["SEO", "Acquisition"],
    "looking_for": ["Projet entrepreneurial"], "availability_label": "Disponible rapidement"}',
  'PRO', false);

select pg_temp.create_test_user(
  'a0000000-0000-4000-8000-000000000005', 'acheteur@gofounders.test',
  '{"display_name": "Marc Repreneur (sans accès)", "profile_type": "buyer", "location": "Lille",
    "profile_title": "Recherche M&A - Commerce", "ma_sector": "Commerce", "ma_budget": "150 k€ - 400 k€",
    "ma_region": "Hauts-de-France"}',
  'FREE', false);

select pg_temp.create_test_user(
  'a0000000-0000-4000-8000-000000000006', 'acheteur.ma@gofounders.test',
  '{"display_name": "Sophie Repreneuse (accès M&A)", "profile_type": "buyer", "location": "Toulouse",
    "profile_title": "Recherche M&A - SaaS", "ma_sector": "SaaS", "ma_budget": "300 k€ - 1 M€",
    "ma_region": "Toute la France"}',
  'FREE', true);

select pg_temp.create_test_user(
  'a0000000-0000-4000-8000-000000000007', 'vendeur@gofounders.test',
  '{"display_name": "Jean Cédant (sans accès)", "profile_type": "seller", "location": "Marseille",
    "profile_title": "Cession M&A - Restauration", "ma_sector": "Restauration", "ma_budget": "CA 600 k€",
    "ma_region": "Provence-Alpes-Côte d''Azur"}',
  'FREE', false);

select pg_temp.create_test_user(
  'a0000000-0000-4000-8000-000000000008', 'vendeur.ma@gofounders.test',
  '{"display_name": "Claire Cédante (accès M&A)", "profile_type": "seller", "location": "Rennes",
    "profile_title": "Cession M&A - SaaS", "ma_sector": "SaaS", "ma_budget": "CA 450 k€",
    "ma_region": "Bretagne"}',
  'FREE', true);

-- Annonce du vendeur avec accès, pour tester la consultation du dossier côté acheteur.
insert into public.ma_listings (
  id, owner_id, sector, region, type, revenue, margin, age, price_min, price_max,
  public_summary, sale_reason, confidential_description, contact_info, status
)
select
  'b0000000-0000-4000-8000-000000000001', id, 'SaaS', 'Bretagne', 'cession', 450000, 22, 6, 600000, 850000,
  'Éditeur SaaS B2B de gestion de plannings, 120 clients PME, revenus récurrents.',
  'Départ du fondateur vers un nouveau projet.',
  'Atelier Planning SAS : logiciel de planification pour PME de services. MRR 37 k€, churn mensuel 1,2 %, '
    || 'équipe de 4 personnes reprise possible. Données financières détaillées sur demande.',
  'vendeur.ma@gofounders.test',
  'active'
from auth.users
where email = 'vendeur.ma@gofounders.test'
on conflict (id) do nothing;

select profile.email, profile.role, profile.plan, profile.ma_access
from public.profiles profile
where profile.email like '%@gofounders.test'
order by profile.email;
