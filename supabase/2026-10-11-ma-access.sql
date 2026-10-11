-- Accès M&A par rôle et protection des droits payants.
-- À exécuter après 2026-10-11-single-role.sql.
--
-- Règles :
--   - acheteur (buyer) avec ma_access : consulte les dossiers complets (description, motif, contact) ;
--   - vendeur (seller) avec ma_access : publie ses annonces et consulte uniquement les siennes ;
--   - autres rôles et visiteurs : annonces anonymisées uniquement.

-- 1. Droits du profil (plan, ma_access, role, is_admin) jamais modifiables depuis le navigateur.
alter table public.profiles add column if not exists is_admin boolean not null default false;

create or replace function public.enforce_profile_entitlements()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Les fonctions security definer (paiement simulé, trigger d'inscription) et le service_role
  -- (webhook Stripe) ne passent pas sous les rôles authenticated / anon.
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.plan := 'FREE';
      new.ma_access := false;
      new.is_admin := false;
    else
      new.plan := old.plan;
      new.ma_access := old.ma_access;
      new.is_admin := old.is_admin;
      new.role := old.role;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_profile_entitlements on public.profiles;

create trigger enforce_profile_entitlements
before insert or update on public.profiles
for each row
execute function public.enforce_profile_entitlements();

-- 2. Paiement simulé tant que Stripe n'est pas branché.
--    AVANT LA MISE EN PRODUCTION : drop function public.simulate_purchase(text);
create or replace function public.simulate_purchase(product text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;

  select role::text into user_role from public.profiles where id = auth.uid();

  if product in ('PRO', 'PREMIUM') then
    update public.profiles
    set plan = product::public.plan_type, updated_at = now()
    where id = auth.uid();
  elsif product = 'MA_ACCESS' then
    if user_role is null or user_role not in ('buyer', 'seller') then
      raise exception 'L''accès M&A est réservé aux comptes acheteur et vendeur';
    end if;

    update public.profiles
    set ma_access = true, updated_at = now()
    where id = auth.uid();
  else
    raise exception 'Produit inconnu : %', product;
  end if;
end;
$$;

revoke all on function public.simulate_purchase(text) from public, anon;
grant execute on function public.simulate_purchase(text) to authenticated;

-- 3. Annonces : seules les colonnes anonymisées sont lisibles directement.
--    owner_id, sale_reason, confidential_description et contact_info passent par les fonctions ci-dessous.
revoke select on public.ma_listings from anon, authenticated;

grant select (
  id,
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

-- Dossier complet : acheteur avec accès M&A, propriétaire de l'annonce ou admin.
create or replace function public.get_ma_listing_detail(listing_id uuid)
returns setof public.ma_listings
language sql
stable
security definer
set search_path = public
as $$
  select listing.*
  from public.ma_listings listing
  where listing.id = listing_id
    and (
      listing.owner_id = auth.uid()
      or exists (
        select 1
        from public.profiles profile
        where profile.id = auth.uid()
          and ((profile.role::text = 'buyer' and profile.ma_access) or profile.is_admin)
      )
    );
$$;

-- Annonces du vendeur connecté.
create or replace function public.get_my_ma_listings()
returns setof public.ma_listings
language sql
stable
security definer
set search_path = public
as $$
  select listing.*
  from public.ma_listings listing
  where listing.owner_id = auth.uid()
  order by listing.created_at desc;
$$;

revoke all on function public.get_ma_listing_detail(uuid) from public, anon;
revoke all on function public.get_my_ma_listings() from public, anon;
grant execute on function public.get_ma_listing_detail(uuid) to authenticated;
grant execute on function public.get_my_ma_listings() to authenticated;

-- 4. Publication réservée aux vendeurs avec accès M&A, pour leur propre compte.
create or replace function public.enforce_ma_listing_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.owner_id is distinct from auth.uid() or not exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and profile.role::text = 'seller'
        and profile.ma_access
    ) then
      raise exception 'Publication réservée aux vendeurs avec accès M&A';
    end if;
  elsif old.owner_id is distinct from auth.uid() or new.owner_id is distinct from old.owner_id then
    raise exception 'Seul le propriétaire peut modifier son annonce';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_ma_listing_owner on public.ma_listings;

create trigger enforce_ma_listing_owner
before insert or update on public.ma_listings
for each row
execute function public.enforce_ma_listing_owner();
