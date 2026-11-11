-- Titre court des annonces (novembre 2026) : affiché dans les aperçus (accueil, /ma, fiche) à la place du résumé
-- coupé. 80 caractères au plus, public comme le résumé. Facultatif : sans titre, le site affiche le résumé.
-- À exécuter après 2026-10-26-annonces-enrichies.sql. Idempotent.

alter table public.ma_listings add column if not exists public_title text;

alter table public.ma_listings drop constraint if exists ma_listings_public_title_check;
alter table public.ma_listings add constraint ma_listings_public_title_check
  check (public_title is null or length(btrim(public_title)) between 1 and 80);

grant select (public_title) on public.ma_listings to anon, authenticated;
