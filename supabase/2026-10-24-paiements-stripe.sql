-- GoFounders (refonte-reprise) : paiements réels par Stripe.
-- À exécuter après 2026-10-23-ventes-reussies.sql. Rejouable.
--
-- Le back Python crée la session Stripe Checkout, Stripe confirme le paiement par webhook, et le back
-- (clé service_role) appelle apply_purchase. Les droits ne sont donc plus jamais accordés depuis le navigateur.
-- Mise en ligne : exécuter ensuite supabase/production/supprimer-paiements-simules.sql.

-- Client Stripe de chaque membre (portail de facturation). Lisible et modifiable par le serveur seulement.
alter table public.profiles add column if not exists stripe_customer_id text;

create or replace function public.enforce_stripe_customer()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.stripe_customer_id := null;
  else
    new.stripe_customer_id := old.stripe_customer_id;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_stripe_customer on public.profiles;

create trigger enforce_stripe_customer
before insert or update on public.profiles
for each row
execute function public.enforce_stripe_customer();

-- Historique des paiements (une ligne par session Stripe payée).
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  product text not null,
  listing_id uuid references public.ma_listings(id) on delete set null,
  stripe_session_id text not null unique,
  stripe_subscription_id text,
  amount_cents integer,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;
grant select on public.payments to authenticated;

drop policy if exists "payments_select_own" on public.payments;

create policy "payments_select_own"
on public.payments
for select
to authenticated
using (user_id = auth.uid() or public.viewer_is_admin());

-- Accorde les droits d'un paiement confirmé par Stripe. Idempotent : un même identifiant de session
-- n'est appliqué qu'une fois, même si Stripe renvoie l'événement.
drop function if exists public.apply_purchase(uuid, text, uuid, text, timestamptz, text, integer, text);

create function public.apply_purchase(
  p_user uuid,
  p_product text,
  p_listing uuid,
  p_evidence text,
  p_period_end timestamptz,
  p_reference text,
  p_amount_cents integer,
  p_subscription text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  listing_sector text;
  until timestamptz := coalesce(p_period_end, now() + interval '1 month');
begin
  insert into public.payments (user_id, product, listing_id, stripe_session_id, stripe_subscription_id, amount_cents)
  values (p_user, p_product, p_listing, p_reference, p_subscription, p_amount_cents)
  on conflict (stripe_session_id) do nothing;

  if not found then
    return false;
  end if;

  if p_product in ('PRO', 'PREMIUM') then
    update public.profiles set plan = p_product::public.plan_type, updated_at = now() where id = p_user;
  elsif p_product in ('MA_ACCESS', 'MA_PLUS') then
    update public.profiles
    set ma_access = true,
        ma_access_expires_at = greatest(coalesce(ma_access_expires_at, now()), now()) + interval '12 months',
        buyer_plus_until = case
          when p_product = 'MA_PLUS' then greatest(coalesce(buyer_plus_until, now()), now()) + interval '12 months'
          else buyer_plus_until
        end,
        updated_at = now()
    where id = p_user;
  elsif p_product = 'PRO_DIRECTORY' then
    update public.profiles set pro_directory_until = greatest(coalesce(pro_directory_until, now()), until), updated_at = now() where id = p_user;
  elsif p_product = 'PRO_ACCOUNT' then
    update public.profiles set pro_account_until = greatest(coalesce(pro_account_until, now()), until), updated_at = now() where id = p_user;
  elsif p_product in ('FEATURE_7D', 'FEATURE_30D') then
    update public.ma_listings
    set featured_until = greatest(coalesce(featured_until, now()), now())
      + case when p_product = 'FEATURE_7D' then interval '7 days' else interval '30 days' end
    where id = p_listing and owner_id = p_user;
  elsif p_product = 'VERIFICATION' then
    select sector into listing_sector from public.ma_listings where id = p_listing and owner_id = p_user;

    if listing_sector is not null then
      insert into public.ma_verification_requests (listing_id, owner_id, evidence)
      values (p_listing, p_user, left(coalesce(nullif(btrim(p_evidence), ''), 'Justificatifs à demander au vendeur (paiement Stripe).'), 3000))
      on conflict (listing_id) where status = 'pending'
      do update set evidence = excluded.evidence;

      insert into public.notifications (user_id, title, body, link_url)
      select profile.id, 'Dossier à vérifier', 'Nouvelle demande de vérification payée pour une annonce ' || listing_sector || '.', '/admin/verifications'
      from public.profiles profile
      where profile.is_admin;
    end if;
  else
    raise exception 'Produit inconnu : %', p_product;
  end if;

  return true;
end;
$$;

-- Renouvellement d'un abonnement (facture payée) : prolonge jusqu'à la fin de la nouvelle période.
drop function if exists public.extend_subscription(uuid, text, timestamptz);

create function public.extend_subscription(p_user uuid, p_product text, p_period_end timestamptz)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_product = 'PRO_DIRECTORY' then
    update public.profiles set pro_directory_until = greatest(coalesce(pro_directory_until, now()), p_period_end), updated_at = now() where id = p_user;
  elsif p_product = 'PRO_ACCOUNT' then
    update public.profiles set pro_account_until = greatest(coalesce(pro_account_until, now()), p_period_end), updated_at = now() where id = p_user;
  elsif p_product in ('PRO', 'PREMIUM') then
    update public.profiles set plan = p_product::public.plan_type, updated_at = now() where id = p_user;
  end if;
end;
$$;

-- Fin d'un abonnement (résiliation ou impayé) : retire les droits immédiatement.
drop function if exists public.end_subscription(uuid, text);

create function public.end_subscription(p_user uuid, p_product text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_product in ('PRO', 'PREMIUM') then
    update public.profiles set plan = 'FREE', updated_at = now() where id = p_user and plan::text = p_product;
  elsif p_product = 'PRO_DIRECTORY' then
    update public.profiles set pro_directory_until = least(coalesce(pro_directory_until, now()), now()), updated_at = now() where id = p_user;
  elsif p_product = 'PRO_ACCOUNT' then
    update public.profiles set pro_account_until = least(coalesce(pro_account_until, now()), now()), updated_at = now() where id = p_user;
  end if;
end;
$$;

-- Réservées au back (clé service_role) : jamais appelables depuis le navigateur.
revoke all on function public.apply_purchase(uuid, text, uuid, text, timestamptz, text, integer, text) from public, anon, authenticated;
revoke all on function public.extend_subscription(uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function public.end_subscription(uuid, text) from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.apply_purchase(uuid, text, uuid, text, timestamptz, text, integer, text) to service_role;
    grant execute on function public.extend_subscription(uuid, text, timestamptz) to service_role;
    grant execute on function public.end_subscription(uuid, text) to service_role;
    grant all on public.payments to service_role;
    grant select (id, role, stripe_customer_id) on public.profiles to service_role;
    grant update (stripe_customer_id) on public.profiles to service_role;
  end if;
end;
$$;
