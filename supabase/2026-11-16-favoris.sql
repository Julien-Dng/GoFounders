-- Favoris d'entreprises (novembre 2026). À exécuter APRÈS 2026-11-15-objectifs-automatiques.sql.
-- Plan : docs/PLAN-COMPTE-MULTI-USAGES.md (« Mes entreprises » : annonces publiées, favoris, dossiers débloqués).
--
-- Un membre met de côté les annonces qui l'intéressent. Ses favoris ne sont lisibles que par lui : le cédant n'est
-- pas prévenu et ne voit pas qui suit son annonce. On ne peut ajouter qu'une annonce qu'on a le droit de voir
-- (annonce publique relue, ou la sienne) ; une annonce retirée ou vendue disparaît de la liste tant qu'elle n'est
-- plus visible. Un favori n'ouvre aucun droit et n'ajoute aucun objectif.

begin;

create table if not exists public.listing_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.ma_listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists listing_favorites_listing_idx on public.listing_favorites (listing_id);

alter table public.listing_favorites enable row level security;

drop policy if exists listing_favorites_select_own on public.listing_favorites;
create policy listing_favorites_select_own on public.listing_favorites
  for select to authenticated using (user_id = auth.uid());

-- La sous-requête sur ma_listings applique ses propres règles : seules les annonces visibles par le membre passent.
drop policy if exists listing_favorites_insert_own on public.listing_favorites;
create policy listing_favorites_insert_own on public.listing_favorites
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.ma_listings listing where listing.id = listing_id));

drop policy if exists listing_favorites_delete_own on public.listing_favorites;
create policy listing_favorites_delete_own on public.listing_favorites
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.listing_favorites from anon, authenticated;
grant select (user_id, listing_id, created_at), insert (user_id, listing_id), delete on public.listing_favorites to authenticated;

-- 200 favoris au plus par membre (évite les listes sans fin et l'aspiration des annonces).
create or replace function public.limit_listing_favorites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.listing_favorites where user_id = new.user_id) >= 200 then
    raise exception 'FAVORIS_LIMITE';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_listing_favorites on public.listing_favorites;
create trigger limit_listing_favorites
  before insert on public.listing_favorites
  for each row execute function public.limit_listing_favorites();

-- Mes favoris, du plus récent au plus ancien, avec les seules colonnes publiques des annonces encore visibles.
create or replace function public.list_my_favorite_listings()
returns table (listing_id uuid, title text, sector text, region text, price_min numeric, price_max numeric, status text, favorited_at timestamptz)
language sql
stable
security invoker
set search_path = public
as $$
  select listing.id, coalesce(nullif(listing.public_title, ''), listing.sector || ', ' || listing.region),
         listing.sector, listing.region, listing.price_min::numeric, listing.price_max::numeric, listing.status, favorite.created_at
  from public.listing_favorites favorite
  join public.ma_listings listing on listing.id = favorite.listing_id
  where favorite.user_id = auth.uid()
  order by favorite.created_at desc;
$$;

revoke all on function public.list_my_favorite_listings() from public, anon;
grant execute on function public.list_my_favorite_listings() to authenticated;

commit;
