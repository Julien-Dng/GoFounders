-- Toutes les entreprises, pas seulement numériques (novembre 2026) : nouvelles options des annonces enrichies.
-- Inclus dans la vente : véhicules, licences / agréments. Canaux : emplacement et clientèle de passage, appels d'offres.
-- Listes à garder identiques à src/app/core/ma/listing-options.ts et backend/app/ma_ai.py.
-- À exécuter après 2026-10-26-annonces-enrichies.sql. Idempotent.

alter table public.ma_listings drop constraint if exists ma_listings_enrichment_check;

alter table public.ma_listings add constraint ma_listings_enrichment_check check (
  (revenue_year is null or revenue_year between 2000 and 2100)
  and (monthly_visitors is null or monthly_visitors between 0 and 100000000)
  and (team_size is null or team_size between 0 and 10000)
  and (owner_hours_per_week is null or owner_hours_per_week between 0 and 100)
  and (growth_notes is null or length(growth_notes) <= 1500)
  and included_assets <@ array['site', 'domaine', 'marque', 'code', 'clients', 'stock', 'contrats', 'reseaux', 'publicite', 'equipe', 'locaux', 'materiel', 'vehicules', 'licences']::text[]
  and acquisition_channels <@ array['seo', 'publicite', 'reseaux', 'email', 'marketplaces', 'bouche_a_oreille', 'partenariats', 'commercial', 'emplacement', 'appels_offres']::text[]
);
