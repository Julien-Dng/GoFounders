-- Les colonnes sensibles des annonces M&A (sale_reason, confidential_description, contact_info)
-- ne doivent jamais être lisibles directement depuis le client.
-- On retire le SELECT global sur la table et on ne réaccorde que les colonnes publiques (teaser).
-- Le dossier complet passe par la fonction get_ma_listing_detail(), qui vérifie l'accès côté base.

revoke select on public.ma_listings from anon, authenticated;

grant select (
  id,
  owner_id,
  sector,
  region,
  type,
  revenue,
  margin,
  age,
  price_min,
  price_max,
  public_summary,
  status,
  created_at,
  updated_at
) on public.ma_listings to anon, authenticated;

create or replace function public.get_ma_listing_detail(listing_id uuid)
returns setof public.ma_listings
language sql
stable
security definer
set search_path = public
as $$
  select listing.*
  from public.ma_listings as listing
  where listing.id = listing_id
    and (
      listing.owner_id = auth.uid()
      or exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and (profiles.ma_access = true or coalesce(profiles.is_admin, false) = true)
      )
    );
$$;

revoke all on function public.get_ma_listing_detail(uuid) from public, anon;
grant execute on function public.get_ma_listing_detail(uuid) to authenticated;
