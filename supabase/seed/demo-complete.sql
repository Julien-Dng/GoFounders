-- Jeu de démonstration complet : plus de comptes, de projets et d'entreprises à vendre. NE PAS exécuter en production.
-- À lancer dans le SQL Editor de Supabase, APRÈS toutes les migrations (jusqu'à 2026-11-11-titre-annonce.sql)
-- puis comptes-test.sql et annonces-demo.sql. Relançable : tout ce qu'il crée est recréé à l'identique.
-- Suppression : supabase/seed/supprimer-demo-complete.sql
--
-- Mot de passe de tous les comptes : Test-GoFounders-2026
--
-- CÉDANTS (chacun voit ses annonces, leur statut et les repreneurs qui ont ouvert son dossier dans /ma/mes-annonces)
--   cedant.boulangerie@gofounders.test  Martine, Lyon : boulangerie (en vedette + dossier vérifié), salon de thé
--   cedant.restaurant@gofounders.test   Karim, Marseille : restaurant (en vedette), food truck (en attente de relecture)
--   cedant.artisan@gofounders.test      Philippe, Nantes : menuiserie (dossier vérifié), garage (nouvelle), salon de coiffure
--
-- REPRENEURS (sur une fiche d'annonce : engagement de confidentialité, puis paiement de 50 €, puis dossier et contact)
--   repreneur.nouveau@gofounders.test   Aucune démarche : parcours complet à tester depuis le début
--   repreneur.nda@gofounders.test       Engagement accepté sur la boulangerie, paiement pas encore fait (« Payer 50 € »)
--   repreneur.dossier@gofounders.test   Dossiers ouverts : boulangerie et menuiserie (dossier complet, contact,
--                                       conversation déjà engagée avec Martine)
--
-- PORTEURS DE PROJET (demandes d'accès à la partie confidentielle : /profil/modifier, « Demandes d'accès »)
--   porteur.sante@gofounders.test       Nadia, projet Kinéo (PRO, mis en avant, engagement exigé) :
--                                       1 demande à accepter ou refuser (Antoine), 1 refusée (Camille),
--                                       1 invitation envoyée à Bruno, qui doit encore accepter l'engagement
--   porteur.food@gofounders.test        Julien, projet Panier Local (partie confidentielle sans engagement) :
--                                       accès accordé à Inès
--   porteur.industrie@gofounders.test   Hugo, projet Atelier Réparable (sans partie confidentielle)
--
-- ASSOCIÉS (profil public, recherche, demande d'accès à un projet)
--   associe.cto@gofounders.test         Antoine, CTO (profil vérifié) : demande en attente sur Kinéo
--   associe.commercial@gofounders.test  Inès, commerciale B2B : accès accordé à Panier Local
--   associe.finance@gofounders.test     Bruno, directeur financier : invité sur Kinéo, engagement à accepter
--   associe.design@gofounders.test      Camille, product designer : demande refusée sur Kinéo
--
-- AVIS : 6 ventes conclues avec témoignage publié (carrousel « Ils ont vendu leur entreprise » sur l'accueil et /ma).
--   Ce sont des avis FICTIFS : à supprimer avant le lancement avec supprimer-demo-complete.sql.
--
-- Pour voir l'annonce en attente de relecture comme un admin : supabase/seed/promouvoir-admin.sql puis /admin/annonces.

create or replace function pg_temp.create_demo_user(user_id uuid, user_email text, metadata jsonb, user_plan text)
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
  set plan = user_plan::public.plan_type,
      bio = metadata ->> 'bio',
      public_listing = true,
      updated_at = now()
  where id = user_id;
end;
$$;

-- Cédants
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000001', 'cedant.boulangerie@gofounders.test',
  '{"display_name": "Martine Bernard", "profile_type": "seller", "location": "Lyon",
    "profile_title": "Boulangère, cède sa boulangerie", "bio": "Trente ans de métier, je prépare ma retraite."}', 'FREE');
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000002', 'cedant.restaurant@gofounders.test',
  '{"display_name": "Karim Rahmani", "profile_type": "seller", "location": "Marseille",
    "profile_title": "Restaurateur", "bio": "Deux affaires dans la restauration, je me recentre sur la première."}', 'FREE');
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000003', 'cedant.artisan@gofounders.test',
  '{"display_name": "Philippe Morel", "profile_type": "seller", "location": "Nantes",
    "profile_title": "Artisan menuisier", "bio": "Artisan depuis 1998, je cherche un successeur pour mon équipe."}', 'FREE');

-- Repreneurs
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000004', 'repreneur.nouveau@gofounders.test',
  '{"display_name": "Lucas Martin", "profile_type": "buyer", "location": "Lyon",
    "profile_title": "Ancien cadre, cherche une entreprise à reprendre", "ma_sector": "Commerce",
    "ma_budget": "150 k€ - 400 k€", "ma_region": "Auvergne-Rhône-Alpes"}', 'FREE');
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000005', 'repreneur.nda@gofounders.test',
  '{"display_name": "Sarah Lefèvre", "profile_type": "buyer", "location": "Grenoble",
    "profile_title": "Repreneuse dans l''alimentaire", "ma_sector": "Commerce alimentaire",
    "ma_budget": "200 k€ - 500 k€", "ma_region": "Auvergne-Rhône-Alpes"}', 'FREE');
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000006', 'repreneur.dossier@gofounders.test',
  '{"display_name": "Thomas Girard", "profile_type": "buyer", "location": "Paris",
    "profile_title": "Repreneur, artisanat et commerce", "ma_sector": "Artisanat",
    "ma_budget": "300 k€ - 800 k€", "ma_region": "Toute la France"}', 'FREE');

-- Porteurs de projet (le trigger crée le projet à partir de project_name)
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000007', 'porteur.sante@gofounders.test',
  '{"display_name": "Nadia Kacem", "profile_type": "entrepreneur", "location": "Paris",
    "profile_title": "Kinésithérapeute, fondatrice de Kinéo", "looking_for": ["CTO", "Développeur full-stack"],
    "project_name": "Kinéo", "project_sector": "Santé", "project_stage": "mvp",
    "bio": "Kinésithérapeute depuis dix ans, je construis l''outil que j''aurais voulu avoir en cabinet."}', 'PRO');
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000008', 'porteur.food@gofounders.test',
  '{"display_name": "Julien Perrin", "profile_type": "entrepreneur", "location": "Lille",
    "profile_title": "Fondateur de Panier Local", "looking_for": ["Commercial B2B", "Logistique"],
    "project_name": "Panier Local", "project_sector": "Commerce", "project_stage": "idea",
    "bio": "Ancien acheteur en grande distribution, je veux rapprocher producteurs et épiceries."}', 'FREE');
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000009', 'porteur.industrie@gofounders.test',
  '{"display_name": "Hugo Lambert", "profile_type": "entrepreneur", "location": "Toulouse",
    "profile_title": "Fondateur d''Atelier Réparable", "looking_for": ["Directeur financier", "Levée de fonds"],
    "project_name": "Atelier Réparable", "project_sector": "Industrie", "project_stage": "growth",
    "bio": "Ingénieur, je développe un atelier de reconditionnement d''électroménager."}', 'FREE');

-- Associés
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000010', 'associe.cto@gofounders.test',
  '{"display_name": "Antoine Dubois", "profile_type": "talent", "location": "Paris",
    "profile_title": "CTO, 12 ans d''expérience en santé numérique", "skills": ["CTO", "Angular", "Node.js", "Architecture"],
    "looking_for": ["Projet entrepreneurial"], "availability_label": "Disponible rapidement",
    "bio": "Ancien CTO d''une start-up de téléconsultation, je cherche un projet santé à cofonder."}', 'FREE');
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000011', 'associe.commercial@gofounders.test',
  '{"display_name": "Inès Thomas", "profile_type": "talent", "location": "Lille",
    "profile_title": "Commerciale B2B, réseau de producteurs", "skills": ["Commercial B2B", "Négociation", "Grands comptes"],
    "looking_for": ["Projet entrepreneurial"], "availability_label": "Disponible à temps partiel",
    "bio": "Dix ans de vente auprès de la distribution alimentaire."}', 'FREE');
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000012', 'associe.finance@gofounders.test',
  '{"display_name": "Bruno Vasseur", "profile_type": "talent", "location": "Lyon",
    "profile_title": "Directeur financier en temps partagé", "skills": ["Directeur financier", "Levée de fonds", "Contrôle de gestion"],
    "looking_for": ["Projet entrepreneurial"], "availability_label": "Disponible dans 3 mois",
    "bio": "J''accompagne des PME dans leur structuration financière et leurs levées."}', 'PRO');
select pg_temp.create_demo_user('a1000000-0000-4000-8000-000000000013', 'associe.design@gofounders.test',
  '{"display_name": "Camille Roux", "profile_type": "talent", "location": "Bordeaux",
    "profile_title": "Product designer", "skills": ["UX", "Figma", "Recherche utilisateur"],
    "looking_for": ["Projet entrepreneurial"], "availability_label": "Disponible rapidement",
    "bio": "Designer produit, passée par deux applications grand public."}', 'FREE');

do $$
declare
  boulangerie uuid := 'a1000000-0000-4000-8000-000000000001';
  restaurant uuid := 'a1000000-0000-4000-8000-000000000002';
  artisan uuid := 'a1000000-0000-4000-8000-000000000003';
  buyer_nda uuid := 'a1000000-0000-4000-8000-000000000005';
  buyer_open uuid := 'a1000000-0000-4000-8000-000000000006';
  nadia uuid := 'a1000000-0000-4000-8000-000000000007';
  julien uuid := 'a1000000-0000-4000-8000-000000000008';
  antoine uuid := 'a1000000-0000-4000-8000-000000000010';
  ines uuid := 'a1000000-0000-4000-8000-000000000011';
  bruno uuid := 'a1000000-0000-4000-8000-000000000012';
  camille uuid := 'a1000000-0000-4000-8000-000000000013';
  kineo uuid;
  panier uuid;
  conversation uuid;
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ma_listings' and column_name = 'public_title') then
    raise exception 'Exécutez d''abord supabase/2026-11-11-titre-annonce.sql.';
  end if;

  -- Remise à zéro de ce que ce script crée (relançable).
  delete from public.payments where stripe_session_id like 'demo_%';
  delete from public.conversations where participant_a::text like 'a1000000-%' or participant_b::text like 'a1000000-%';
  delete from public.ma_listings where id::text like 'c1000000-0000-4000-8000-%';
  delete from public.notifications where user_id::text like 'a1000000-%';

  -- 1. Entreprises à vendre --------------------------------------------------------------------------------------
  insert into public.ma_listings (
    id, owner_id, sector, region, type, revenue, margin, age, price_min, price_max,
    public_title, public_summary, sale_reason, confidential_description, contact_info, status, created_at,
    revenue_year, revenue_history, included_assets, team_size, owner_hours_per_week, growth_notes
  )
  values
  (
    'c1000000-0000-4000-8000-000000000001', boulangerie, 'Boulangerie', 'Auvergne-Rhône-Alpes', 'fonds_commerce',
    520000, 14, 31, 380000, 450000,
    'Boulangerie-pâtisserie de quartier à Lyon',
    'Boulangerie-pâtisserie artisanale dans un quartier résidentiel de Lyon, 600 clients par jour, laboratoire équipé.',
    'Départ à la retraite de la gérante.',
    'Boulangerie « Au Pain de Martine », 7e arrondissement de Lyon. Bail commercial 3-6-9 renouvelé en 2023, loyer 2 400 € par mois. '
      || 'Four à sole de 2019, chambre de pousse, laboratoire pâtisserie. Cinq salariés (deux boulangers, un pâtissier, deux vendeuses) '
      || 'qui souhaitent rester. Trois contrats de livraison avec des restaurants du quartier.',
    'Martine Bernard, 06 12 34 56 78, martine.bernard@exemple.fr', 'active', now() - interval '4 days',
    2025, '[{"year": 2022, "revenue": 470000}, {"year": 2023, "revenue": 495000}, {"year": 2024, "revenue": 510000}]',
    '{marque,clients,equipe,contrats,stock}', 6, 50,
    'Pas de vente en ligne ni de commande à l''avance ; la pâtisserie événementielle (mariages) est demandée mais refusée faute de temps.'
  ),
  (
    'c1000000-0000-4000-8000-000000000002', boulangerie, 'Restauration', 'Auvergne-Rhône-Alpes', 'fonds_commerce',
    165000, 12, 6, 90000, 120000,
    'Salon de thé avec terrasse dans le Vieux-Lyon',
    'Salon de thé et brunch du week-end dans une rue piétonne très passante, 40 couverts et terrasse de 20 places.',
    'La gérante se concentre sur sa boulangerie avant sa retraite.',
    'Salon de thé « Les Tartines », rue Saint-Jean. Licence restaurant, terrasse autorisée toute l''année. Deux salariés à temps partiel.',
    'Martine Bernard, 06 12 34 56 78', 'active', now() - interval '15 days',
    2025, '[{"year": 2023, "revenue": 150000}, {"year": 2024, "revenue": 158000}]',
    '{marque,clients,equipe}', 2, 30, null
  ),
  (
    'c1000000-0000-4000-8000-000000000003', restaurant, 'Restauration', 'Provence-Alpes-Côte d''Azur', 'fonds_commerce',
    640000, 11, 9, 420000, 520000,
    'Restaurant de poisson sur le Vieux-Port',
    'Restaurant de 70 couverts face au Vieux-Port de Marseille, clientèle d''habitués et de touristes, ouvert midi et soir.',
    'Le gérant se recentre sur son second établissement.',
    'Restaurant « La Criée du Port », quai de Rive-Neuve. Licence IV, terrasse de 30 places. Cuisine refaite en 2022. '
      || 'Neuf salariés dont un chef présent depuis six ans. Fournisseurs de poisson locaux sous contrat.',
    'Karim Rahmani, 06 98 76 54 32, contact@lacrieeduport.fr', 'active', now() - interval '8 days',
    2025, '[{"year": 2022, "revenue": 560000}, {"year": 2023, "revenue": 600000}, {"year": 2024, "revenue": 625000}]',
    '{marque,site,clients,equipe,contrats,reseaux}', 9, 45,
    'Pas de service de vente à emporter ; la salle du haut (25 places) n''est ouverte que l''été.'
  ),
  (
    'c1000000-0000-4000-8000-000000000004', restaurant, 'Restauration', 'Provence-Alpes-Côte d''Azur', 'cession',
    95000, 20, 3, 45000, 60000,
    'Food truck de burgers avec emplacements fixes',
    'Food truck équipé avec quatre emplacements réguliers autour de Marseille et des contrats d''événements d''entreprise.',
    'Le gérant manque de temps pour ses deux affaires.',
    'Camion aménagé de 2021 (contrôle technique à jour), autorisations d''emplacement sur quatre marchés, carnet de 15 clients événementiels.',
    'Karim Rahmani, 06 98 76 54 32', 'active', now() - interval '1 day',
    2025, '[{"year": 2023, "revenue": 70000}, {"year": 2024, "revenue": 84000}]',
    '{marque,clients,reseaux,stock}', 1, 40, null
  ),
  (
    'c1000000-0000-4000-8000-000000000005', artisan, 'Artisanat', 'Pays de la Loire', 'parts_sociales',
    780000, 16, 27, 550000, 680000,
    'Menuiserie sur mesure avec atelier de 800 m²',
    'Menuiserie bois et aluminium pour particuliers et promoteurs, carnet de commandes de 8 mois, équipe qualifiée.',
    'Le dirigeant prépare sa retraite et souhaite transmettre à un repreneur qui garde l''équipe.',
    'Menuiserie Morel SARL, Rezé. Atelier de 800 m² en location (bail de 9 ans), machines à commande numérique de 2020. '
      || 'Huit salariés dont deux chefs d''équipe. Clients : 60 % particuliers, 40 % promoteurs (deux contrats-cadres). '
      || 'Qualification RGE, certification Qualibat.',
    'Philippe Morel, 02 40 12 34 56, philippe@menuiserie-morel.fr', 'active', now() - interval '10 days',
    2025, '[{"year": 2022, "revenue": 690000}, {"year": 2023, "revenue": 735000}, {"year": 2024, "revenue": 760000}]',
    '{marque,site,clients,equipe,contrats,stock}', 8, 50,
    'Le site internet ne présente pas les réalisations ; la rénovation énergétique (aides publiques) est peu démarchée.'
  ),
  (
    'c1000000-0000-4000-8000-000000000006', artisan, 'Services', 'Pays de la Loire', 'cession',
    310000, 18, 14, 230000, 290000,
    'Garage automobile indépendant près de Nantes',
    'Garage de mécanique et entretien toutes marques, clientèle fidèle de particuliers et deux flottes d''entreprise.',
    'Le dirigeant se consacre à sa menuiserie.',
    'Garage de 450 m² avec trois ponts, banc de diagnostic récent, bail commercial de 2021. Deux mécaniciens salariés.',
    'Philippe Morel, 02 40 12 34 56', 'active', now() - interval '18 hours',
    2025, '[{"year": 2023, "revenue": 280000}, {"year": 2024, "revenue": 295000}]',
    '{marque,clients,equipe,contrats,stock}', 3, 40, null
  ),
  (
    'c1000000-0000-4000-8000-000000000007', artisan, 'Services', 'Pays de la Loire', 'fonds_commerce',
    190000, 22, 11, 110000, 150000,
    'Salon de coiffure en centre-ville de Nantes',
    'Salon mixte de six postes en centre-ville, rendez-vous en ligne, 1 800 clients actifs.',
    'La gérante associée déménage.',
    'Salon « L''Atelier Coiffure », rue Crébillon. Trois coiffeuses salariées, matériel renouvelé en 2023, logiciel de réservation.',
    'Philippe Morel, 02 40 12 34 56', 'active', now() - interval '25 days',
    2025, '[{"year": 2023, "revenue": 175000}, {"year": 2024, "revenue": 184000}]',
    '{marque,site,clients,equipe}', 3, 20, null
  );

  -- Toutes relues par la modération, sauf le food truck (reste « en attente de relecture » pour le vendeur et l'admin).
  update public.ma_listings set reviewed_at = now()
  where id::text like 'c1000000-0000-4000-8000-%' and id <> 'c1000000-0000-4000-8000-000000000004';

  -- En vedette : boulangerie et restaurant. Dossier vérifié : boulangerie et menuiserie.
  update public.ma_listings set featured_until = now() + interval '25 days'
  where id in ('c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000003');
  update public.ma_listings set verified = true, verified_at = now() - interval '3 days'
  where id in ('c1000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000005');

  -- Profils vérifiés (badge sur le profil) : Martine et Antoine.
  update public.profiles set verified_at = now() - interval '5 days' where id in (boulangerie, antoine);

  -- 2. Accès aux dossiers des repreneurs -----------------------------------------------------------------------
  delete from public.ma_access_requests where buyer_id in (buyer_nda, buyer_open, 'a1000000-0000-4000-8000-000000000004');

  -- Sarah : engagement accepté sur la boulangerie, paiement de 50 € pas encore fait.
  insert into public.ma_access_requests (listing_id, buyer_id, owner_id, status, message, nda_version, nda_accepted_at, snapshot, created_at)
  values ('c1000000-0000-4000-8000-000000000001', buyer_nda, boulangerie, 'pending',
    'Bonjour, je cherche une boulangerie à reprendre en région lyonnaise, avec un apport de 120 k€.',
    'ma-v0-provisoire-2026-10-28', now() - interval '1 day',
    jsonb_build_object('listing_label', 'Boulangerie, Auvergne-Rhône-Alpes', 'buyer_name', 'Sarah Lefèvre', 'owner_name', 'Martine Bernard'),
    now() - interval '1 day');

  -- Thomas : dossiers ouverts (50 € payés) sur la boulangerie et la menuiserie.
  insert into public.ma_access_requests (listing_id, buyer_id, owner_id, status, message, nda_version, nda_accepted_at, snapshot,
    created_at, decided_at, contact_unlocked_at, unlock_reference)
  values
  ('c1000000-0000-4000-8000-000000000001', buyer_open, boulangerie, 'approved',
    'Bonjour, ancien directeur de magasin, je souhaite reprendre un commerce de bouche avec son équipe.',
    'ma-v0-provisoire-2026-10-28', now() - interval '3 days',
    jsonb_build_object('listing_label', 'Boulangerie, Auvergne-Rhône-Alpes', 'buyer_name', 'Thomas Girard', 'owner_name', 'Martine Bernard'),
    now() - interval '3 days', now() - interval '3 days', now() - interval '3 days', 'demo_unlock_1'),
  ('c1000000-0000-4000-8000-000000000005', buyer_open, artisan, 'approved', null,
    'ma-v0-provisoire-2026-10-28', now() - interval '2 days',
    jsonb_build_object('listing_label', 'Artisanat, Pays de la Loire', 'buyer_name', 'Thomas Girard', 'owner_name', 'Philippe Morel'),
    now() - interval '2 days', now() - interval '2 days', now() - interval '2 days', 'demo_unlock_2');

  insert into public.payments (user_id, product, listing_id, stripe_session_id, amount_cents, created_at)
  values
    (buyer_open, 'INTRO', 'c1000000-0000-4000-8000-000000000001', 'demo_unlock_1', 5000, now() - interval '3 days'),
    (buyer_open, 'INTRO', 'c1000000-0000-4000-8000-000000000005', 'demo_unlock_2', 5000, now() - interval '2 days');

  insert into public.notifications (user_id, title, body, link_url, created_at)
  values
    (boulangerie, 'Un repreneur a ouvert votre dossier', 'Thomas Girard a débloqué votre dossier « Boulangerie, Auvergne-Rhône-Alpes » : il a accepté l''engagement de confidentialité et peut vous contacter.', '/ma/mes-annonces', now() - interval '3 days'),
    (artisan, 'Un repreneur a ouvert votre dossier', 'Thomas Girard a débloqué votre dossier « Artisanat, Pays de la Loire » : il a accepté l''engagement de confidentialité et peut vous contacter.', '/ma/mes-annonces', now() - interval '2 days');

  -- Conversation déjà engagée entre Thomas et Martine.
  insert into public.conversations (participant_a, participant_b, created_at)
  values (buyer_open, boulangerie, now() - interval '3 days')
  returning id into conversation;

  insert into public.messages (conversation_id, sender_id, content, read_at, created_at)
  values
    (conversation, buyer_open, 'Bonjour Martine, j''ai lu votre dossier avec attention. Vos salariés seraient-ils prêts à rester après la reprise ?', now() - interval '2 days 20 hours', now() - interval '3 days'),
    (conversation, boulangerie, 'Bonjour Thomas, oui, les cinq souhaitent rester. Je peux vous présenter l''équipe lors d''une visite.', now() - interval '2 days', now() - interval '2 days 18 hours'),
    (conversation, buyer_open, 'Avec plaisir. Seriez-vous disponible mardi prochain en fin de matinée ?', null, now() - interval '1 day');

  -- 3. Projets et demandes d'accès à la partie confidentielle ----------------------------------------------------
  update public.projects
  set description = 'Application de suivi des exercices de rééducation entre deux séances de kinésithérapie.',
      looking_for = '{CTO,"Développeur full-stack"}', skills_needed = '{Angular,Node.js}',
      open_to_equity = true, nda_required = true,
      confidential_details = 'Prototype testé dans 12 cabinets parisiens, 340 patients actifs. Discussion engagée avec une mutuelle '
        || 'pour un remboursement des abonnements. Prévisionnel : 1 200 cabinets abonnés à 39 € par mois d''ici trois ans.'
  where owner_id = nadia
  returning id into kineo;

  update public.projects
  set description = 'Plateforme de commande groupée entre producteurs locaux et épiceries indépendantes.',
      looking_for = '{"Commercial B2B",Logistique}', skills_needed = '{Négociation}',
      open_to_equity = true, nda_required = false,
      confidential_details = 'Lettres d''intention signées par 18 épiceries et 9 producteurs de la métropole lilloise. '
        || 'Partenariat logistique en discussion avec une coopérative de transport.'
  where owner_id = julien
  returning id into panier;

  update public.projects
  set description = 'Atelier de reconditionnement d''électroménager vendu avec garantie de deux ans.',
      looking_for = '{"Directeur financier","Levée de fonds"}', skills_needed = '{Finance}',
      open_to_equity = true, nda_required = false, confidential_details = null
  where owner_id = 'a1000000-0000-4000-8000-000000000009';

  -- Les projets des comptes de test ne recherchent plus « Talent » (mot jamais affiché sur le site).
  update public.projects set looking_for = '{CTO,"Développeur Angular"}', skills_needed = '{Angular}'
  where owner_id = (select id from auth.users where email = 'entrepreneur.free@gofounders.test');
  update public.projects set looking_for = '{"Responsable marketing","Growth"}', skills_needed = '{SEO}'
  where owner_id = (select id from auth.users where email = 'entrepreneur.pro@gofounders.test');
  update public.profiles set looking_for = '{CTO,"Développeur Angular"}'
  where email = 'entrepreneur.free@gofounders.test';
  update public.profiles set looking_for = '{"Responsable marketing",Growth}'
  where email = 'entrepreneur.pro@gofounders.test';

  delete from public.project_access_requests where project_id in (kineo, panier);

  insert into public.project_access_requests (project_id, requester_id, owner_id, status, nda_version, nda_accepted_at,
    snapshot, created_at, decided_at, invited_at)
  values
    -- Antoine : demande en attente, Nadia accepte ou refuse.
    (kineo, antoine, nadia, 'pending', 'v0-provisoire-2026-10-19', now() - interval '6 hours',
      jsonb_build_object('project_name', 'Kinéo', 'owner_name', 'Nadia Kacem', 'requester_name', 'Antoine Dubois'),
      now() - interval '6 hours', null, null),
    -- Camille : demande refusée.
    (kineo, camille, nadia, 'refused', 'v0-provisoire-2026-10-19', now() - interval '4 days',
      jsonb_build_object('project_name', 'Kinéo', 'owner_name', 'Nadia Kacem', 'requester_name', 'Camille Roux'),
      now() - interval '4 days', now() - interval '3 days', null),
    -- Bruno : invité par Nadia, doit encore accepter l'engagement de confidentialité.
    (kineo, bruno, nadia, 'approved', null, null,
      jsonb_build_object('project_name', 'Kinéo', 'owner_name', 'Nadia Kacem', 'requester_name', 'Bruno Vasseur'),
      now() - interval '1 day', now() - interval '1 day', now() - interval '1 day'),
    -- Inès : accès accordé à Panier Local (pas d'engagement exigé).
    (panier, ines, julien, 'approved', null, null,
      jsonb_build_object('project_name', 'Panier Local', 'owner_name', 'Julien Perrin', 'requester_name', 'Inès Thomas'),
      now() - interval '2 days', now() - interval '1 day', null);

  insert into public.notifications (user_id, title, body, link_url, created_at)
  values
    (nadia, 'Nouvelle demande d''accès à votre projet', 'Antoine Dubois demande à lire la partie confidentielle de Kinéo.', '/profil/modifier', now() - interval '6 hours'),
    (bruno, 'Un porteur de projet vous ouvre son projet', 'Nadia Kacem vous donne accès à la partie confidentielle de son projet, après acceptation de l''engagement de confidentialité.', '/profil/' || kineo::text, now() - interval '1 day');

  -- 4. Ventes conclues et avis (section « Ils ont vendu leur entreprise ») ------------------------------------------
  -- AVIS FICTIFS pour visualiser le carrousel : à supprimer avant le lancement (supprimer-demo-complete.sql),
  -- seuls de vrais témoignages, avec l'accord des vendeurs, peuvent être publiés.
  insert into public.ma_listings (
    id, owner_id, sector, region, type, revenue, margin, age, price_min, price_max,
    public_title, public_summary, sale_reason, confidential_description, contact_info, status, created_at, reviewed_at
  )
  values
    ('c1000000-0000-4000-8000-000000000008', restaurant, 'Restauration', 'Provence-Alpes-Côte d''Azur', 'fonds_commerce', 520000, 12, 12, 400000, 520000,
      'Brasserie de quartier à Marseille', 'Brasserie de 60 couverts avec terrasse, clientèle d''habitués.', 'Retraite.', 'Brasserie vendue.', 'Karim Rahmani', 'sold', now() - interval '6 months', now() - interval '6 months'),
    ('c1000000-0000-4000-8000-000000000009', boulangerie, 'Boulangerie', 'Auvergne-Rhône-Alpes', 'fonds_commerce', 430000, 13, 20, 360000, 420000,
      'Boulangerie de village près de Lyon', 'Boulangerie-pâtisserie de village, seule du bourg, deux salariés.', 'Retraite.', 'Boulangerie vendue.', 'Martine Bernard', 'sold', now() - interval '9 months', now() - interval '9 months'),
    ('c1000000-0000-4000-8000-000000000010', artisan, 'Artisanat', 'Pays de la Loire', 'parts_sociales', 690000, 15, 22, 520000, 640000,
      'Atelier d''ébénisterie avec huit salariés', 'Atelier d''agencement sur mesure, clientèle de particuliers et d''architectes.', 'Retraite.', 'Atelier vendu.', 'Philippe Morel', 'sold', now() - interval '11 months', now() - interval '11 months'),
    ('c1000000-0000-4000-8000-000000000011', artisan, 'Services', 'Pays de la Loire', 'fonds_commerce', 160000, 20, 9, 100000, 130000,
      'Institut de beauté en centre-ville', 'Institut de quatre cabines, réservation en ligne, clientèle fidèle.', 'Déménagement.', 'Institut vendu.', 'Philippe Morel', 'sold', now() - interval '4 months', now() - interval '4 months'),
    ('c1000000-0000-4000-8000-000000000012', boulangerie, 'E-commerce', 'Auvergne-Rhône-Alpes', 'cession', 240000, 24, 6, 220000, 300000,
      'Épicerie fine en ligne', 'Boutique en ligne de produits régionaux, 6 000 clients, 35 % de commandes répétées.', 'Nouveau projet.', 'Boutique vendue.', 'Martine Bernard', 'sold', now() - interval '7 months', now() - interval '7 months'),
    ('c1000000-0000-4000-8000-000000000013', restaurant, 'Commerce', 'Provence-Alpes-Côte d''Azur', 'fonds_commerce', 380000, 10, 15, 180000, 240000,
      'Cave à vins et épicerie à Aix', 'Cave à vins avec épicerie fine et dégustations, emplacement passant.', 'Changement de région.', 'Cave vendue.', 'Karim Rahmani', 'sold', now() - interval '3 months', now() - interval '3 months');

  insert into public.ma_success_stories (listing_id, owner_id, sale_price, price_display, months_to_sell, quote, author_label, consent_at, status, created_at, decided_at)
  values
    ('c1000000-0000-4000-8000-000000000008', restaurant, 465000, 'range', 4,
      'Plusieurs repreneurs ont ouvert le dossier dès la première semaine. J''ai pu choisir quelqu''un qui garde mon chef et toute l''équipe.',
      'Karim, restaurateur à Marseille', now() - interval '2 months', 'approved', now() - interval '2 months', now() - interval '2 months'),
    ('c1000000-0000-4000-8000-000000000009', boulangerie, 390000, 'exact', 6,
      'Je craignais que mes clients l''apprennent trop tôt. L''annonce est restée anonyme jusqu''au bout, et la transmission s''est faite en douceur.',
      'Martine, boulangère près de Lyon', now() - interval '3 months', 'approved', now() - interval '3 months', now() - interval '3 months'),
    ('c1000000-0000-4000-8000-000000000010', artisan, 610000, 'range', 8,
      'Les chiffres vérifiés ont rassuré les repreneurs dès le premier échange. Mon successeur a repris l''atelier et mes huit salariés.',
      'Philippe, ébéniste à Nantes', now() - interval '3 months 10 days', 'approved', now() - interval '3 months 10 days', now() - interval '3 months 10 days'),
    ('c1000000-0000-4000-8000-000000000011', artisan, 118000, 'hidden', 2,
      'Un dossier clair, des repreneurs déjà décidés : la vente de mon institut s''est conclue en deux mois.',
      'Sophie, gérante d''un institut de beauté', now() - interval '1 month', 'approved', now() - interval '1 month', now() - interval '1 month'),
    ('c1000000-0000-4000-8000-000000000012', boulangerie, 265000, 'exact', 3,
      'Annonce prête en une soirée avec l''aide de l''IA, trois repreneurs sérieux en un mois. Signature chez le notaire dix semaines plus tard.',
      'Julie, fondatrice d''une épicerie en ligne', now() - interval '4 months', 'approved', now() - interval '4 months', now() - interval '4 months'),
    ('c1000000-0000-4000-8000-000000000013', restaurant, 205000, 'range', 5,
      'Je voulais rester discret vis-à-vis de mes fournisseurs. Seuls les repreneurs engagés par la confidentialité ont vu le détail de ma cave.',
      'Marc, caviste à Aix-en-Provence', now() - interval '2 weeks', 'approved', now() - interval '2 weeks', now() - interval '2 weeks');
end;
$$;

-- Récapitulatif
select listing.public_title as annonce, profile.email as cedant,
       case when listing.reviewed_at is null then 'à relire' else 'en ligne' end as statut,
       listing.featured_until is not null as en_vedette, coalesce(listing.verified, false) as dossier_verifie
from public.ma_listings listing
join public.profiles profile on profile.id = listing.owner_id
where listing.id::text like 'c1000000-0000-4000-8000-%'
order by listing.created_at desc;
