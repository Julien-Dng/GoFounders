-- Annonces de démonstration pour tester le parcours repreneur et cédant. NE PAS exécuter en production.
-- À lancer dans le SQL Editor de Supabase, APRÈS comptes-test.sql et toutes les migrations (jusqu'à 2026-10-27).
-- Relançable : les annonces sont recréées à l'identique (mêmes identifiants c0000000-…).
-- Suppression : supabase/seed/supprimer-annonces-demo.sql (ou supprimer-comptes-test.sql, qui retire tout).
--
-- Contenu :
--   10 annonces fictives du compte vendeur.ma@gofounders.test (secteurs, prix et tailles variés), dont
--   2 en vedette, 2 « dossier vérifié », 1 publiée il y a moins de 48 h, toutes déjà relues par la modération,
--   avec historique de chiffre d'affaires, ce qui est inclus, équipe, trafic et pistes de croissance ;
--   les comptes de test porteurs de projet et associés rendus visibles sur /associes.
--
-- Parcours conseillés (mot de passe des comptes : Test-GoFounders-2026) :
--   visiteur (navigation privée)    /ma puis une fiche : chiffres visibles, dossier flouté
--   acheteur@gofounders.test        fiche : « Prendre l'accès repreneur »
--   acheteur.ma@gofounders.test     fiche : « Demander l'accès au dossier » (présentation + NDA)
--   vendeur.ma@gofounders.test      /ma/mes-annonces : accepter la demande ; le repreneur voit alors le dossier complet
--   vendeur.ma@gofounders.test      /ma/mes-annonces et /ma/statistiques, puis sa propre fiche

do $$
declare
  seller uuid := (select id from auth.users where email = 'vendeur.ma@gofounders.test');
begin
  if seller is null then
    raise exception 'Exécutez d''abord supabase/seed/comptes-test.sql (compte vendeur.ma@gofounders.test introuvable).';
  end if;

  delete from public.ma_listings where id::text like 'c0000000-0000-4000-8000-%';

  insert into public.ma_listings (
    id, owner_id, sector, region, type, revenue, margin, age, price_min, price_max,
    public_summary, sale_reason, confidential_description, contact_info, status, created_at,
    revenue_year, revenue_history, included_assets, monthly_visitors, acquisition_channels,
    team_size, owner_hours_per_week, growth_notes
  )
  values
  (
    'c0000000-0000-4000-8000-000000000001', seller, 'SaaS', 'Auvergne-Rhône-Alpes', 'parts_sociales',
    450000, 35, 4, 800000, 1200000,
    'Logiciel B2B de gestion des plannings pour cabinets paramédicaux, 120 clients sur abonnement.',
    'Le fondateur se consacre à un nouveau projet dans la santé.',
    'Logiciel en ligne de prise de rendez-vous et de planning pour kinésithérapeutes et ostéopathes. 120 cabinets abonnés '
      || '(29 à 89 € par mois), résiliation mensuelle inférieure à 1,5 %. Code maintenu par un développeur salarié et un prestataire. '
      || 'Support assuré par une personne à mi-temps.',
    'vendeur.ma@gofounders.test', 'active', now() - interval '6 days',
    2025, '[{"year": 2022, "revenue": 210000}, {"year": 2023, "revenue": 290000}, {"year": 2024, "revenue": 370000}]',
    '{site,domaine,marque,code,clients,contrats}', 18000, '{seo,email,partenariats}',
    3, 25, 'Le produit n''est vendu qu''en France ; une version anglaise ouvrirait la Belgique et la Suisse. Aucune publicité payante testée.'
  ),
  (
    'c0000000-0000-4000-8000-000000000002', seller, 'E-commerce', 'Île-de-France', 'cession',
    280000, 22, 7, 350000, 420000,
    'Boutique en ligne de cosmétiques bio, marque installée et clientèle fidèle.',
    'Départ à la retraite de la dirigeante.',
    'Marque de soins bio vendue sur son propre site (Shopify) et sur deux marketplaces. 9 000 clients, 38 % de commandes répétées. '
      || 'Fabrication sous-traitée à un laboratoire français sous contrat, logistique externalisée.',
    'vendeur.ma@gofounders.test', 'active', now() - interval '12 days',
    2025, '[{"year": 2023, "revenue": 300000}, {"year": 2024, "revenue": 295000}]',
    '{site,domaine,marque,stock,clients,reseaux,contrats}', 25000, '{seo,reseaux,email,marketplaces}',
    1, 30, 'Le catalogue n''a pas évolué depuis deux ans ; une gamme homme est prête mais jamais lancée.'
  ),
  (
    'c0000000-0000-4000-8000-000000000003', seller, 'Agence', 'Nouvelle-Aquitaine', 'cession',
    180000, 28, 5, 200000, 280000,
    'Agence de création de sites pour artisans, contrats de maintenance récurrents.',
    'Le gérant rejoint une entreprise cliente.',
    'Agence de deux personnes : création et maintenance de sites vitrines pour artisans du bâtiment. 140 contrats de maintenance '
      || 'à 39 € par mois (environ 65 k€ récurrents par an). Les deux salariés souhaitent rester.',
    'vendeur.ma@gofounders.test', 'active', now() - interval '20 days',
    2025, '[{"year": 2023, "revenue": 150000}, {"year": 2024, "revenue": 165000}]',
    '{site,domaine,marque,clients,contrats,equipe}', null, '{bouche_a_oreille,partenariats,commercial}',
    2, 35, null
  ),
  (
    'c0000000-0000-4000-8000-000000000004', seller, 'Site de contenu', 'France entière', 'cession',
    95000, 70, 6, 180000, 240000,
    'Site d''actualité et de comparatifs sur le vélo électrique, revenus publicitaires et affiliation.',
    'Le créateur manque de temps pour l''entretenir.',
    'Site éditorial de 1 200 articles, revenus : affiliation (65 %) et publicité (35 %). Rédaction assurée par deux pigistes. '
      || 'Une lettre d''information de 14 000 abonnés.',
    'vendeur.ma@gofounders.test', 'active', now() - interval '9 days',
    2025, '[{"year": 2022, "revenue": 60000}, {"year": 2023, "revenue": 78000}, {"year": 2024, "revenue": 88000}]',
    '{site,domaine,marque,reseaux}', 160000, '{seo,email,reseaux}',
    0, 8, 'Aucune vidéo produite à ce jour ; la chaîne associée compte 3 000 abonnés sans publication régulière.'
  ),
  (
    'c0000000-0000-4000-8000-000000000005', seller, 'Application mobile', 'Occitanie', 'cession',
    120000, 40, 3, 220000, 300000,
    'Application de suivi d''entraînement course à pied, abonnements dans les stores.',
    'Les deux fondateurs veulent se consacrer à leur activité principale.',
    'Application iOS et Android, 4 800 abonnés payants (2,99 € par mois), note moyenne 4,6. Développée en Flutter, '
      || 'hébergement et outils pour 600 € par mois.',
    'vendeur.ma@gofounders.test', 'active', now() - interval '15 days',
    2025, '[{"year": 2023, "revenue": 70000}, {"year": 2024, "revenue": 98000}]',
    '{site,domaine,marque,code,clients,reseaux}', 40000, '{seo,reseaux,publicite}',
    0, 15, 'Pas de version montre connectée ; demande fréquente des utilisateurs.'
  ),
  (
    'c0000000-0000-4000-8000-000000000006', seller, 'Restauration', 'Provence-Alpes-Côte d''Azur', 'fonds_commerce',
    320000, 18, 12, 280000, 350000,
    'Restaurant de cuisine provençale en centre-ville, terrasse et clientèle régulière.',
    'Le couple de gérants part en retraite.',
    'Restaurant de 45 couverts plus 30 en terrasse, ouvert midi et soir du mardi au samedi. Bail commercial de 9 ans renouvelé en 2023. '
      || 'Équipe de 4 salariés en cuisine et en salle.',
    'vendeur.ma@gofounders.test', 'active', now() - interval '30 days',
    2025, '[{"year": 2023, "revenue": 305000}, {"year": 2024, "revenue": 315000}]',
    '{marque,equipe,locaux,materiel,clients}', null, '{bouche_a_oreille,reseaux}',
    4, 50, null
  ),
  (
    'c0000000-0000-4000-8000-000000000007', seller, 'SaaS', 'Île-de-France', 'parts_sociales',
    620000, 30, 8, 1300000, 1800000,
    'Outil de signature et d''archivage de documents pour agences immobilières, 300 agences clientes.',
    'Les associés souhaitent passer la main à un acteur capable d''accélérer.',
    'Logiciel utilisé par 300 agences immobilières (abonnement annuel). Équipe de 6 personnes dont 3 développeurs. '
      || 'Intégrations avec les principaux logiciels de transaction du marché.',
    'vendeur.ma@gofounders.test', 'active', now() - interval '4 days',
    2025, '[{"year": 2022, "revenue": 380000}, {"year": 2023, "revenue": 470000}, {"year": 2024, "revenue": 560000}]',
    '{site,domaine,marque,code,clients,contrats,equipe}', 9000, '{commercial,partenariats,seo}',
    6, 20, 'Aucune offre pour les syndics de copropriété, pourtant demandeurs.'
  ),
  (
    'c0000000-0000-4000-8000-000000000008', seller, 'E-commerce', 'Hauts-de-France', 'cession',
    520000, 12, 9, 300000, 400000,
    'Vente en ligne de pièces détachées pour électroménager, fort trafic naturel.',
    'Le dirigeant souhaite se recentrer sur son activité de réparation.',
    'Catalogue de 25 000 références, expédition depuis un entrepôt de 200 m² en location. 2 salariés à la préparation des commandes.',
    'vendeur.ma@gofounders.test', 'active', now() - interval '25 days',
    2025, '[{"year": 2023, "revenue": 560000}, {"year": 2024, "revenue": 540000}]',
    '{site,domaine,marque,stock,clients,locaux,materiel}', 70000, '{seo,publicite,marketplaces}',
    2, 40, null
  ),
  (
    'c0000000-0000-4000-8000-000000000009', seller, 'Formation en ligne', 'France entière', 'cession',
    150000, 55, 4, 250000, 330000,
    'Formations vidéo en comptabilité pour indépendants, 2 600 élèves.',
    'La formatrice veut revenir au conseil.',
    'Trois parcours vidéo (comptabilité, TVA, déclaration de revenus) vendus 190 à 390 €. Plateforme hébergée, aucun salarié.',
    'vendeur.ma@gofounders.test', 'active', now() - interval '11 days',
    2025, '[{"year": 2023, "revenue": 110000}, {"year": 2024, "revenue": 135000}]',
    '{site,domaine,marque,clients,reseaux}', 30000, '{seo,email,reseaux}',
    0, 12, 'Pas d''offre pour les entreprises, alors que plusieurs ont demandé des licences pour leurs salariés.'
  ),
  (
    'c0000000-0000-4000-8000-000000000010', seller, 'SaaS', 'Bretagne', 'cession',
    85000, 45, 3, 150000, 210000,
    'Petit logiciel de facturation pour photographes indépendants, 400 abonnés.',
    'Le développeur fondateur part à l''étranger.',
    'Logiciel de devis et factures pensé pour les photographes : 400 abonnés à 15 € par mois. Code simple, maintenu par le fondateur seul.',
    'vendeur.ma@gofounders.test', 'active', now() - interval '20 hours',
    2025, '[{"year": 2024, "revenue": 60000}]',
    '{site,domaine,marque,code,clients}', 6000, '{seo,partenariats}',
    0, 10, null
  );

  -- Annonces relues par la modération (sinon invisibles depuis 2026-10-28-lancement.sql).
  update public.ma_listings set reviewed_at = now() where id::text like 'c0000000-0000-4000-8000-%';

  -- Mise en avant et badge « dossier vérifié » (posés comme le ferait un paiement confirmé).
  update public.ma_listings set featured_until = now() + interval '20 days'
  where id in ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000007');

  update public.ma_listings set verified = true, verified_at = now() - interval '2 days'
  where id in ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002');

  -- Vitrine /associes : les comptes de test porteurs de projet et associés y apparaissent.
  update public.profiles set public_listing = true
  where id in (select id from auth.users where email in (
    'entrepreneur.free@gofounders.test', 'entrepreneur.pro@gofounders.test',
    'talent.free@gofounders.test', 'talent.pro@gofounders.test'
  ));
end;
$$;

select sector, region, revenue, price_min, price_max, featured_until is not null as en_vedette, verified
from public.ma_listings
where id::text like 'c0000000-0000-4000-8000-%'
order by created_at;
