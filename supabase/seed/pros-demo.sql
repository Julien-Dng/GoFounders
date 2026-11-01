-- Professionnels de démonstration pour l'annuaire /pros. NE PAS exécuter en production.
-- À lancer dans le SQL Editor de Supabase, après toutes les migrations. Indépendant de comptes-test.sql.
-- Relançable : un compte qui existe déjà n'est pas recréé, sa fiche et son abonnement sont remis à jour.
--
-- 8 cabinets fictifs (noms, sites et textes inventés ; les liens pointent vers example.com, domaine réservé) :
-- 2 experts-comptables, 2 avocats, 2 cabinets de cession, 1 notaire, 1 conseil en financement.
-- 2 ont un « compte pro » (affichés en premier), les autres un abonnement annuaire.
--
-- Mot de passe de tous les comptes : Test-GoFounders-2026 (ex. pro.comptable1@gofounders.test,
-- pour tester la fiche pro, /ma/statistiques côté pro et le dépôt d'annonce d'un compte pro).
-- Suppression : supabase/seed/supprimer-pros-demo.sql (ou supprimer-comptes-test.sql, qui retire tous les comptes de test).

create or replace function pg_temp.create_demo_pro(
  user_id uuid,
  user_email text,
  pro_name text,
  firm text,
  category text,
  city text,
  about text,
  site text,
  has_account boolean
)
returns void
language plpgsql
as $$
begin
  if not exists (select 1 from auth.users where id = user_id or email = user_email) then
    -- Le trigger on_auth_user_created crée le profil à partir des métadonnées.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    )
    values (
      '00000000-0000-0000-0000-000000000000', user_id, 'authenticated', 'authenticated', user_email,
      extensions.crypt('Test-GoFounders-2026', extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}',
      jsonb_build_object('display_name', pro_name, 'profile_type', 'pro', 'location', city,
                         'profile_title', firm, 'pro_category', category),
      now(), now(), '', '', '', '', '', '', '', ''
    );

    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), user_id, user_id::text, 'email',
      jsonb_build_object('sub', user_id::text, 'email', user_email, 'email_verified', true),
      now(), now(), now()
    );
  end if;

  -- Exécuté en tant que postgres : autorisé par les triggers qui protègent les abonnements.
  update public.profiles
  set display_name = pro_name,
      title = firm,
      pro_category = category,
      location = city,
      bio = about,
      website_url = site,
      is_visible = true,
      pro_directory_until = now() + interval '6 months',
      pro_account_until = case when has_account then now() + interval '6 months' end,
      updated_at = now()
  where id = (select id from auth.users where email = user_email);
end;
$$;

select pg_temp.create_demo_pro(
  'd0000000-0000-4000-8000-000000000001', 'pro.comptable1@gofounders.test',
  'Isabelle Moreau (démo)', 'Moreau & Associés Expertise (démo)', 'expert_comptable', 'Lyon',
  'Expertise comptable des TPE du numérique : SaaS, e-commerce, agences. Audit d''acquisition, retraitement des comptes et préparation du dossier financier avant une cession.',
  'https://example.com/moreau-expertise', true);

select pg_temp.create_demo_pro(
  'd0000000-0000-4000-8000-000000000002', 'pro.comptable2@gofounders.test',
  'Karim Benali (démo)', 'Cabinet Benali Conseil (démo)', 'expert_comptable', 'Paris',
  'Accompagnement des repreneurs : analyse des bilans, prévisionnel de reprise, montage financier et recherche de prêt bancaire.',
  'https://example.com/benali-conseil', false);

select pg_temp.create_demo_pro(
  'd0000000-0000-4000-8000-000000000003', 'pro.avocat1@gofounders.test',
  'Maître Sophie Laurent (démo)', 'Laurent Avocats (démo)', 'avocat', 'Bordeaux',
  'Droit des affaires et cessions de PME : protocole d''accord, cession de parts sociales, garantie d''actif et de passif, clauses de non-concurrence.',
  'https://example.com/laurent-avocats', true);

select pg_temp.create_demo_pro(
  'd0000000-0000-4000-8000-000000000004', 'pro.avocat2@gofounders.test',
  'Maître Thomas Girard (démo)', 'Girard Legal Tech (démo)', 'avocat', 'Nantes',
  'Avocat des entreprises du numérique : transfert de propriété intellectuelle, noms de domaine, contrats SaaS et conformité RGPD lors d''une reprise.',
  'https://example.com/girard-legal', false);

select pg_temp.create_demo_pro(
  'd0000000-0000-4000-8000-000000000005', 'pro.cession1@gofounders.test',
  'Nicolas Fabre (démo)', 'Transmission Sud (démo)', 'cabinet_cession', 'Marseille',
  'Conseil en cession de TPE et PME : évaluation, préparation du mémorandum, recherche et qualification de repreneurs, négociation jusqu''à la signature.',
  'https://example.com/transmission-sud', false);

select pg_temp.create_demo_pro(
  'd0000000-0000-4000-8000-000000000006', 'pro.cession2@gofounders.test',
  'Émilie Rousseau (démo)', 'Digital Exit Partners (démo)', 'cabinet_cession', 'Lille',
  'Spécialiste de la vente d''entreprises numériques : valorisation par multiple, audit du trafic et des revenus récurrents, accompagnement des fondateurs.',
  'https://example.com/digital-exit', false);

select pg_temp.create_demo_pro(
  'd0000000-0000-4000-8000-000000000007', 'pro.notaire1@gofounders.test',
  'Maître Pierre Lefèvre (démo)', 'Office notarial Lefèvre (démo)', 'notaire', 'Rennes',
  'Cessions de fonds de commerce et de baux commerciaux, séquestre du prix de vente, formalités de publicité.',
  'https://example.com/office-lefevre', false);

select pg_temp.create_demo_pro(
  'd0000000-0000-4000-8000-000000000008', 'pro.autre1@gofounders.test',
  'Julie Mercier (démo)', 'Financement Reprise Conseil (démo)', 'autre', 'Toulouse',
  'Courtier en financement de reprise : prêt bancaire, prêt d''honneur, crédit vendeur et dossiers de garantie Bpifrance.',
  'https://example.com/financement-reprise', false);

select profile.display_name, profile.pro_category, profile.location,
       profile.pro_account_until is not null as compte_pro
from public.profiles profile
where profile.id::text like 'd0000000-0000-4000-8000-%'
order by compte_pro desc, profile.display_name;
