-- GoFounders (refonte-reprise) : annonces plus complètes.
-- À exécuter après 2026-10-25-contact.sql. Rejouable.
--
-- Nouvelles informations, toutes facultatives :
--   publiques (anonymisées, comme le CA et la marge) : année du dernier exercice, chiffre d'affaires des années
--   précédentes, ce qui est inclus dans la vente, visiteurs mensuels, canaux d'acquisition, taille de l'équipe,
--   temps consacré par le dirigeant ;
--   dossier (repreneurs avec accès, propriétaire, admins, via get_ma_listing_detail) : pistes de croissance.

alter table public.ma_listings add column if not exists revenue_year smallint;
alter table public.ma_listings add column if not exists revenue_history jsonb not null default '[]'::jsonb;
alter table public.ma_listings add column if not exists included_assets text[] not null default '{}';
alter table public.ma_listings add column if not exists monthly_visitors integer;
alter table public.ma_listings add column if not exists acquisition_channels text[] not null default '{}';
alter table public.ma_listings add column if not exists team_size smallint;
alter table public.ma_listings add column if not exists owner_hours_per_week smallint;
alter table public.ma_listings add column if not exists growth_notes text;

-- Contraintes (recréées pour rester rejouables).
alter table public.ma_listings drop constraint if exists ma_listings_enrichment_check;

alter table public.ma_listings add constraint ma_listings_enrichment_check check (
  (revenue_year is null or revenue_year between 2000 and 2100)
  and (monthly_visitors is null or monthly_visitors between 0 and 100000000)
  and (team_size is null or team_size between 0 and 10000)
  and (owner_hours_per_week is null or owner_hours_per_week between 0 and 100)
  and (growth_notes is null or length(growth_notes) <= 1500)
  and included_assets <@ array['site', 'domaine', 'marque', 'code', 'clients', 'stock', 'contrats', 'reseaux', 'publicite', 'equipe', 'locaux', 'materiel']::text[]
  and acquisition_channels <@ array['seo', 'publicite', 'reseaux', 'email', 'marketplaces', 'bouche_a_oreille', 'partenariats', 'commercial']::text[]
);

-- Historique : au plus 4 années précédentes, chacune {year, revenue}, année < année du dernier exercice.
create or replace function public.valid_revenue_history(history jsonb, last_year smallint)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(history) = 'array'
    and jsonb_array_length(history) <= 4
    and not exists (
      select 1
      from jsonb_array_elements(history) entry
      where jsonb_typeof(entry) <> 'object'
         or jsonb_typeof(entry -> 'year') <> 'number'
         or jsonb_typeof(entry -> 'revenue') <> 'number'
         or (entry ->> 'year')::numeric not between 2000 and 2100
         or (entry ->> 'revenue')::numeric not between 0 and 1000000000
         or (last_year is not null and (entry ->> 'year')::numeric >= last_year)
         or (select count(*) from jsonb_array_elements(history) other where other -> 'year' = entry -> 'year') > 1
    );
$$;

alter table public.ma_listings drop constraint if exists ma_listings_revenue_history_check;

alter table public.ma_listings add constraint ma_listings_revenue_history_check
check (public.valid_revenue_history(revenue_history, revenue_year));

-- Colonnes publiques lisibles directement (growth_notes reste dans le dossier).
grant select (revenue_year, revenue_history, included_assets, monthly_visitors, acquisition_channels, team_size, owner_hours_per_week)
on public.ma_listings to anon, authenticated;
