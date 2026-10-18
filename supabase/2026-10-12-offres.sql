-- Nouvelles offres (octobre 2026). À exécuter après 2026-10-12-service-role-grants.sql.
--   - FREE : plus de limite de messages (les réponses sont illimitées) ; seuls les porteurs de projet
--     en FREE gardent la limite de 3 nouveaux contacts par mois. Les talents sont illimités.
--   - M&A : publication gratuite pour les vendeurs (offre de lancement) ; l'accès acheteur à 149 €
--     dure 12 mois (colonne ma_access_expires_at).

-- 1. Durée de l'accès M&A acheteur.
alter table public.profiles add column if not exists ma_access_expires_at timestamptz;

-- Les accès déjà accordés avant cette migration courent 12 mois à partir d'aujourd'hui.
update public.profiles
set ma_access_expires_at = now() + interval '12 months'
where ma_access and ma_access_expires_at is null;

-- 2. Droits non modifiables depuis le navigateur : on ajoute la date d'expiration.
create or replace function public.enforce_profile_entitlements()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.plan := 'FREE';
      new.ma_access := false;
      new.ma_access_expires_at := null;
      new.is_admin := false;
    else
      new.plan := old.plan;
      new.ma_access := old.ma_access;
      new.ma_access_expires_at := old.ma_access_expires_at;
      new.is_admin := old.is_admin;
      new.role := old.role;
    end if;
  end if;

  return new;
end;
$$;

-- Accès M&A acheteur en cours de validité.
create or replace function public.has_active_ma_access(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select profile.ma_access and (profile.ma_access_expires_at is null or profile.ma_access_expires_at > now())
     from public.profiles profile
     where profile.id = target_user),
    false
  );
$$;

revoke all on function public.has_active_ma_access(uuid) from public, anon, authenticated;

-- 3. Paiement simulé : l'accès M&A ne concerne plus que les acheteurs, pour 12 mois.
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
    if user_role is distinct from 'buyer' then
      raise exception 'L''accès M&A est réservé aux comptes acheteur (la publication est gratuite pour les vendeurs)';
    end if;

    update public.profiles
    set ma_access = true, ma_access_expires_at = now() + interval '12 months', updated_at = now()
    where id = auth.uid();
  else
    raise exception 'Produit inconnu : %', product;
  end if;
end;
$$;

-- 4. Dossier complet : acheteur avec accès en cours, propriétaire de l'annonce ou admin.
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
          and (
            (profile.role::text = 'buyer' and public.has_active_ma_access(profile.id))
            or profile.is_admin
          )
      )
    );
$$;

-- 5. Publication : tout vendeur, pour son propre compte, sans paiement.
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
    ) then
      raise exception 'Publication réservée aux comptes vendeur';
    end if;
  elsif old.owner_id is distinct from auth.uid() or new.owner_id is distinct from old.owner_id then
    raise exception 'Seul le propriétaire peut modifier son annonce';
  end if;

  return new;
end;
$$;

-- 6. Quotas : 3 nouveaux contacts par mois pour les porteurs de projet en FREE, messages illimités.
create or replace function public.free_quota_limits(target_user uuid, out contacts_limit integer, out messages_limit integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    case when limited then 3 end,
    null::integer
  from (
    select coalesce(profile.plan::text = 'FREE' and profile.role::text = 'entrepreneur', false) as limited
    from public.profiles profile
    where profile.id = target_user
  ) limits;
$$;
