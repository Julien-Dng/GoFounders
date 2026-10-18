-- Branche refonte-reprise. Offres « reprise ». À exécuter après 2026-10-20a-role-pro.sql et toutes les
-- migrations de V6 (dont 2026-10-19-projets-confidentiels-nda.sql).
--
--   Repreneurs : accès 149 €/an (V6) et accès Plus 390 €/an (buyer_plus_until) : analyses IA illimitées,
--                alertes sur les nouvelles annonces, accès anticipé de 48 h aux nouvelles annonces.
--   Cédants    : mise en avant d'une annonce (featured_until), dossier vérifié (vérification manuelle par
--                un admin, badge verified).
--   Pros       : annuaire (pro_directory_until) et compte pro (pro_account_until) : publication de
--                plusieurs annonces et contact des repreneurs.
--   PREMIUM    : demandes d'accompagnement sur devis (premium_requests).
--
-- Tous ces droits ne s'accordent que côté serveur : fonctions de paiement (simulation tant que Stripe
-- n'est pas branché), décisions d'admin ou service_role. AVANT LA MISE EN PRODUCTION : supprimer
-- simulate_purchase et simulate_listing_purchase.

-- 1. Profils : nouveaux droits et catégorie des pros.
alter table public.profiles
  add column if not exists buyer_plus_until timestamptz,
  add column if not exists pro_directory_until timestamptz,
  add column if not exists pro_account_until timestamptz,
  add column if not exists pro_category text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_pro_category_check') then
    alter table public.profiles
      add constraint profiles_pro_category_check
      check (pro_category is null or pro_category in ('expert_comptable', 'avocat', 'cabinet_cession', 'notaire', 'autre'));
  end if;
end;
$$;

grant select (buyer_plus_until, pro_directory_until, pro_account_until, pro_category) on public.profiles to authenticated;
grant update (pro_category) on public.profiles to authenticated;

-- Droits non modifiables depuis le navigateur (reprend 2026-10-12-offres.sql + nouvelles colonnes).
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
      new.buyer_plus_until := null;
      new.pro_directory_until := null;
      new.pro_account_until := null;
    else
      new.plan := old.plan;
      new.ma_access := old.ma_access;
      new.ma_access_expires_at := old.ma_access_expires_at;
      new.is_admin := old.is_admin;
      new.role := old.role;
      new.buyer_plus_until := old.buyer_plus_until;
      new.pro_directory_until := old.pro_directory_until;
      new.pro_account_until := old.pro_account_until;
    end if;
  end if;

  return new;
end;
$$;

-- Inscription : reprend 2026-10-11-single-role.sql et enregistre la catégorie d'un pro.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_value text := nullif(new.raw_user_meta_data ->> 'profile_type', '');
  selected_role public.profile_role;
  skills_value text[] := array(
    select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'skills', '[]'::jsonb))
  );
  looking_for_value text[] := array(
    select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'looking_for', '[]'::jsonb))
  );
  project_name_value text := nullif(new.raw_user_meta_data ->> 'project_name', '');
  pro_category_value text := nullif(new.raw_user_meta_data ->> 'pro_category', '');
begin
  if role_value is null then
    raise exception 'profile_type manquant : un rôle est obligatoire à l''inscription';
  end if;

  selected_role := role_value::public.profile_role;

  if selected_role::text <> 'pro'
     or pro_category_value not in ('expert_comptable', 'avocat', 'cabinet_cession', 'notaire', 'autre') then
    pro_category_value := null;
  end if;

  insert into public.profiles (
    id, email, display_name, role, plan, ma_access, location, title, skills, looking_for,
    availability_label, ma_sector, ma_budget, ma_region, pro_category
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    selected_role,
    'FREE',
    false,
    nullif(new.raw_user_meta_data ->> 'location', ''),
    nullif(new.raw_user_meta_data ->> 'profile_title', ''),
    skills_value,
    looking_for_value,
    nullif(new.raw_user_meta_data ->> 'availability_label', ''),
    nullif(new.raw_user_meta_data ->> 'ma_sector', ''),
    nullif(new.raw_user_meta_data ->> 'ma_budget', ''),
    nullif(new.raw_user_meta_data ->> 'ma_region', ''),
    pro_category_value
  )
  on conflict (id) do nothing;

  if selected_role = 'entrepreneur'::public.profile_role and project_name_value is not null then
    insert into public.projects (owner_id, name, sector, stage, looking_for, skills_needed, location, is_active)
    values (
      new.id,
      project_name_value,
      nullif(new.raw_user_meta_data ->> 'project_sector', ''),
      coalesce(nullif(new.raw_user_meta_data ->> 'project_stage', ''), 'mvp'),
      looking_for_value,
      '{}',
      nullif(new.raw_user_meta_data ->> 'location', ''),
      true
    );
  end if;

  return new;
end;
$$;

-- 2. Droits en cours (utilisés par les règles ci-dessous).
create or replace function public.has_buyer_plus(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select profile.role::text = 'buyer' and profile.buyer_plus_until > now()
     from public.profiles profile where profile.id = target_user),
    false
  );
$$;

create or replace function public.has_active_pro_account(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select profile.role::text = 'pro' and profile.pro_account_until > now()
     from public.profiles profile where profile.id = target_user),
    false
  );
$$;

-- Fiche dans l'annuaire : abonnement annuaire ou compte pro en cours, et profil visible.
create or replace function public.is_listed_pro(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select profile.role::text = 'pro'
        and coalesce(profile.is_visible, true)
        and (profile.pro_directory_until > now() or profile.pro_account_until > now())
     from public.profiles profile where profile.id = target_user),
    false
  );
$$;

-- Version sans argument, utilisable dans les règles RLS (ne révèle que le statut de l'utilisateur connecté).
create or replace function public.viewer_has_buyer_plus()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and public.has_buyer_plus(auth.uid());
$$;

create or replace function public.viewer_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select profile.is_admin from public.profiles profile where profile.id = auth.uid()), false);
$$;

revoke all on function public.has_buyer_plus(uuid) from public, anon, authenticated;
revoke all on function public.has_active_pro_account(uuid) from public, anon;
-- Appelée par enforce_ma_listing_owner, qui s'exécute avec les droits de l'utilisateur. Elle ne révèle que
-- si un pro a un compte actif, information déjà publique dans l'annuaire.
grant execute on function public.has_active_pro_account(uuid) to authenticated;
revoke all on function public.is_listed_pro(uuid) from public, anon, authenticated;
revoke all on function public.viewer_has_buyer_plus() from public;
revoke all on function public.viewer_is_admin() from public;
grant execute on function public.viewer_has_buyer_plus() to anon, authenticated;
grant execute on function public.viewer_is_admin() to anon, authenticated;

-- 3. Annonces : mise en avant et badge « dossier vérifié ».
alter table public.ma_listings
  add column if not exists featured_until timestamptz,
  add column if not exists verified boolean not null default false,
  add column if not exists verified_at timestamptz;

grant select (featured_until, verified, verified_at) on public.ma_listings to anon, authenticated;

-- Ces colonnes ne se modifient que côté serveur (paiement, décision d'admin).
create or replace function public.enforce_ma_listing_entitlements()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      new.featured_until := null;
      new.verified := false;
      new.verified_at := null;
    else
      new.featured_until := old.featured_until;
      new.verified := old.verified;
      new.verified_at := old.verified_at;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_ma_listing_entitlements on public.ma_listings;

create trigger enforce_ma_listing_entitlements
before insert or update on public.ma_listings
for each row
execute function public.enforce_ma_listing_entitlements();

-- Publication : vendeurs, et pros avec un compte pro en cours (reprend 2026-10-12-offres.sql).
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
        and (profile.role::text = 'seller' or public.has_active_pro_account(profile.id))
    ) then
      raise exception 'Publication réservée aux vendeurs et aux comptes pro';
    end if;
  elsif old.owner_id is distinct from auth.uid() or new.owner_id is distinct from old.owner_id then
    raise exception 'Seul le propriétaire peut modifier son annonce';
  end if;

  return new;
end;
$$;

-- 4. Accès anticipé : une annonce publiée depuis moins de 48 h n'est visible que par les repreneurs Plus,
--    son propriétaire et les admins. Règle RESTRICTIVE, qui s'ajoute aux règles existantes.
--    Si la table n'avait pas encore de RLS, on recrée d'abord le comportement actuel (lecture ouverte,
--    écriture par le propriétaire, déjà contrôlée par enforce_ma_listing_owner).
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ma_listings' and cmd in ('SELECT', 'ALL') and permissive = 'PERMISSIVE') then
    create policy "ma_listings_select_all" on public.ma_listings for select to anon, authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ma_listings' and cmd in ('INSERT', 'ALL') and permissive = 'PERMISSIVE') then
    create policy "ma_listings_insert_own" on public.ma_listings for insert to authenticated with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ma_listings' and cmd in ('UPDATE', 'ALL') and permissive = 'PERMISSIVE') then
    create policy "ma_listings_update_own" on public.ma_listings for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'ma_listings' and cmd in ('DELETE', 'ALL') and permissive = 'PERMISSIVE') then
    create policy "ma_listings_delete_own" on public.ma_listings for delete to authenticated using (owner_id = auth.uid());
  end if;
end;
$$;

alter table public.ma_listings enable row level security;

drop policy if exists "ma_listings_acces_anticipe" on public.ma_listings;

create policy "ma_listings_acces_anticipe"
on public.ma_listings
as restrictive
for select
to anon, authenticated
using (
  created_at <= now() - interval '48 hours'
  or owner_id = auth.uid()
  or public.viewer_has_buyer_plus()
  or public.viewer_is_admin()
);

-- Dossier complet : même règle d'accès anticipé (reprend 2026-10-12-offres.sql).
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
            profile.is_admin
            or (
              profile.role::text = 'buyer'
              and public.has_active_ma_access(profile.id)
              and (listing.created_at <= now() - interval '48 hours' or public.has_buyer_plus(profile.id))
            )
          )
      )
    );
$$;

-- 5. Alertes Plus : notification à chaque nouvelle annonce correspondant aux critères du repreneur
--    (secteur et région renseignés dans son profil ; un critère vide accepte tout).
create or replace function public.notify_plus_buyers_new_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from 'active' then
    return new;
  end if;

  insert into public.notifications (user_id, title, body, link_url)
  select
    profile.id,
    'Nouvelle annonce : ' || new.sector,
    left(coalesce(new.public_summary, '') || ' (' || new.region || '). Accès anticipé de 48 h réservé à l''accès Plus.', 300),
    '/ma/annonce/' || new.id::text
  from public.profiles profile
  where public.has_buyer_plus(profile.id)
    and (coalesce(btrim(profile.ma_sector), '') = '' or new.sector ilike '%' || btrim(profile.ma_sector) || '%')
    and (coalesce(btrim(profile.ma_region), '') = '' or new.region ilike '%' || btrim(profile.ma_region) || '%');

  return new;
end;
$$;

revoke all on function public.notify_plus_buyers_new_listing() from public, anon, authenticated;

drop trigger if exists notify_plus_buyers_new_listing on public.ma_listings;

create trigger notify_plus_buyers_new_listing
after insert on public.ma_listings
for each row
execute function public.notify_plus_buyers_new_listing();

-- 6. Dossier vérifié : demandes de vérification manuelle, traitées par un admin.
create table if not exists public.ma_verification_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.ma_listings(id) on delete cascade,
  owner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  evidence text not null,
  admin_note text,
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create unique index if not exists ma_verification_requests_one_pending
on public.ma_verification_requests (listing_id)
where status = 'pending';

alter table public.ma_verification_requests enable row level security;
revoke all on public.ma_verification_requests from anon, authenticated;
grant select on public.ma_verification_requests to authenticated;

drop policy if exists "ma_verification_requests_select" on public.ma_verification_requests;

create policy "ma_verification_requests_select"
on public.ma_verification_requests
for select
to authenticated
using (owner_id = auth.uid() or public.viewer_is_admin());

-- 7. Achats liés à une annonce (paiement simulé). Mise en avant 7 ou 30 jours, vérification.
drop function if exists public.simulate_listing_purchase(text, uuid, text);

create function public.simulate_listing_purchase(product text, p_listing_id uuid, p_evidence text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  listing public.ma_listings%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;

  select * into listing from public.ma_listings where id = p_listing_id;
  if listing.id is null or listing.owner_id is distinct from auth.uid() then
    raise exception 'ANNONCE_INTROUVABLE' using detail = 'Annonce introuvable ou qui ne vous appartient pas';
  end if;

  if product in ('FEATURE_7D', 'FEATURE_30D') then
    update public.ma_listings
    set featured_until = greatest(coalesce(featured_until, now()), now())
      + case when product = 'FEATURE_7D' then interval '7 days' else interval '30 days' end
    where id = p_listing_id;
  elsif product = 'VERIFICATION' then
    if coalesce(length(btrim(p_evidence)), 0) < 20 then
      raise exception 'JUSTIFICATIFS_REQUIS' using detail = 'Décrivez vos justificatifs (au moins 20 caractères)';
    end if;
    if listing.verified then
      raise exception 'DEJA_VERIFIEE' using detail = 'Cette annonce est déjà vérifiée';
    end if;

    insert into public.ma_verification_requests (listing_id, owner_id, evidence)
    values (p_listing_id, auth.uid(), left(btrim(p_evidence), 3000))
    on conflict (listing_id) where status = 'pending'
    do update set evidence = excluded.evidence;

    insert into public.notifications (user_id, title, body, link_url)
    select profile.id, 'Dossier à vérifier', 'Nouvelle demande de vérification pour une annonce ' || listing.sector || '.', '/admin/verifications'
    from public.profiles profile
    where profile.is_admin;
  else
    raise exception 'Produit inconnu : %', product;
  end if;
end;
$$;

-- Décision d'un admin : pose ou refuse le badge « dossier vérifié ».
drop function if exists public.decide_listing_verification(uuid, boolean, text);

create function public.decide_listing_verification(p_request_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request public.ma_verification_requests%rowtype;
begin
  if not public.viewer_is_admin() then
    raise exception 'RESERVE_ADMIN';
  end if;

  select * into request from public.ma_verification_requests where id = p_request_id;
  if request.id is null or request.status <> 'pending' then
    raise exception 'DEMANDE_INTROUVABLE';
  end if;

  update public.ma_verification_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      admin_note = nullif(btrim(coalesce(p_note, '')), ''),
      decided_at = now()
  where id = p_request_id;

  if p_approve then
    update public.ma_listings set verified = true, verified_at = now() where id = request.listing_id;
  end if;

  if request.owner_id is not null then
    insert into public.notifications (user_id, title, body, link_url)
    values (
      request.owner_id,
      case when p_approve then 'Dossier vérifié' else 'Vérification non validée' end,
      case
        when p_approve then 'Votre annonce affiche maintenant le badge « Dossier vérifié ».'
        else 'Votre dossier n''a pas pu être vérifié' || coalesce(' : ' || nullif(btrim(coalesce(p_note, '')), ''), '.')
      end,
      '/ma/mes-annonces'
    );
  end if;
end;
$$;

-- 8. Paiement simulé : reprend 2026-10-12-offres.sql et ajoute Plus et les offres pros.
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
  elsif product in ('MA_ACCESS', 'MA_PLUS') then
    if user_role is distinct from 'buyer' then
      raise exception 'L''accès repreneur est réservé aux comptes acheteur (la publication est gratuite pour les vendeurs)';
    end if;

    update public.profiles
    set ma_access = true,
        ma_access_expires_at = greatest(coalesce(ma_access_expires_at, now()), now()) + interval '12 months',
        buyer_plus_until = case
          when product = 'MA_PLUS' then greatest(coalesce(buyer_plus_until, now()), now()) + interval '12 months'
          else buyer_plus_until
        end,
        updated_at = now()
    where id = auth.uid();
  elsif product in ('PRO_DIRECTORY', 'PRO_ACCOUNT') then
    if user_role is distinct from 'pro' then
      raise exception 'Ces offres sont réservées aux comptes professionnels';
    end if;

    update public.profiles
    set pro_directory_until = case
          when product = 'PRO_DIRECTORY' then greatest(coalesce(pro_directory_until, now()), now()) + interval '1 month'
          else pro_directory_until
        end,
        pro_account_until = case
          when product = 'PRO_ACCOUNT' then greatest(coalesce(pro_account_until, now()), now()) + interval '1 month'
          else pro_account_until
        end,
        updated_at = now()
    where id = auth.uid();
  else
    raise exception 'Produit inconnu : %', product;
  end if;
end;
$$;

revoke all on function public.simulate_listing_purchase(text, uuid, text) from public, anon;
revoke all on function public.decide_listing_verification(uuid, boolean, text) from public, anon;
grant execute on function public.simulate_listing_purchase(text, uuid, text) to authenticated;
grant execute on function public.decide_listing_verification(uuid, boolean, text) to authenticated;

-- 9. Annuaire des pros : fiches publiques, lisibles sans compte.
drop function if exists public.list_pro_directory(text);

create function public.list_pro_directory(p_category text default null)
returns table (
  id uuid,
  display_name text,
  title text,
  pro_category text,
  location text,
  bio text,
  website_url text,
  linkedin_url text,
  photo_url text,
  has_pro_account boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select profile.id, profile.display_name, profile.title, profile.pro_category, profile.location, profile.bio,
         profile.website_url, profile.linkedin_url, profile.photo_url, coalesce(profile.pro_account_until > now(), false)
  from public.profiles profile
  where public.is_listed_pro(profile.id)
    and (p_category is null or profile.pro_category = p_category)
  order by coalesce(profile.pro_account_until > now(), false) desc, profile.display_name;
$$;

revoke all on function public.list_pro_directory(text) from public;
grant execute on function public.list_pro_directory(text) to anon, authenticated;

-- Profils visibles : reprend 2026-10-12-parametres.sql ; une fiche pro de l'annuaire est visible par tout
-- utilisateur connecté (pour pouvoir lui écrire).
create or replace function public.viewer_can_see_profile(target_id uuid, target_role public.profile_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when target_id = auth.uid() then true
    when target_role::text = 'pro' and public.is_listed_pro(target_id) then true
    else exists (
      select 1
      from public.profiles viewer
      where viewer.id = auth.uid()
        and (
          viewer.is_admin
          or exists (
            select 1
            from public.conversations conversation
            where (conversation.participant_a = auth.uid() and conversation.participant_b = target_id)
               or (conversation.participant_b = auth.uid() and conversation.participant_a = target_id)
          )
          or (
            coalesce((select target.is_visible from public.profiles target where target.id = target_id), true)
            and (
              (viewer.role::text = 'entrepreneur' and target_role::text = 'talent')
              or (viewer.role::text = 'talent' and target_role::text = 'entrepreneur')
            )
          )
        )
    )
  end;
$$;

-- 10. Contacts : reprend 2026-10-12-profils-par-role.sql. En plus : tout utilisateur peut écrire à un pro
--     de l'annuaire, et un pro avec un compte pro peut écrire à un repreneur.
create or replace function public.enforce_contact_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  contacts_limit integer;
  used integer;
  initiator_role text;
  recipient_role text;
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.participant_a is distinct from auth.uid() then
    raise exception 'Une conversation doit être lancée par l''utilisateur connecté';
  end if;

  select role::text into initiator_role from public.profiles where id = new.participant_a;
  select role::text into recipient_role from public.profiles where id = new.participant_b;

  if not (
    (initiator_role = 'entrepreneur' and recipient_role = 'talent')
    or (initiator_role = 'talent' and recipient_role = 'entrepreneur')
    or (initiator_role = 'buyer' and recipient_role = 'seller')
    or (initiator_role = 'seller' and recipient_role = 'buyer')
    or (recipient_role = 'pro' and initiator_role <> 'pro' and public.is_listed_pro(new.participant_b))
    or (initiator_role = 'pro' and recipient_role = 'buyer' and public.has_active_pro_account(new.participant_a))
  ) then
    raise exception 'ROLE_CONTACT_INTERDIT' using detail = 'Ce profil ne peut pas être contacté avec votre type de compte';
  end if;

  select limits.contacts_limit into contacts_limit from public.free_quota_limits(auth.uid()) limits;

  insert into public.usage_counters as counters (user_id, period, contacts)
  values (auth.uid(), public.current_quota_period(), 1)
  on conflict (user_id, period) do update set contacts = counters.contacts + 1
  returning counters.contacts into used;

  if contacts_limit is not null and used > contacts_limit then
    raise exception 'FREE_QUOTA_CONTACTS' using detail = format('Limite de %s nouveaux contacts par mois atteinte', contacts_limit);
  end if;

  return new;
end;
$$;

-- 11. Analyses IA de dossier : 3 par mois avec l'accès 149 €, illimitées avec l'accès Plus.
--     Appelée uniquement par le back Python (service_role).
create table if not exists public.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  period text not null,
  analyses integer not null default 0,
  primary key (user_id, period)
);

alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon, authenticated;

drop function if exists public.consume_ai_analysis(uuid, integer);

create function public.consume_ai_analysis(target_user uuid, free_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  used integer;
begin
  if public.has_buyer_plus(target_user) then
    return true;
  end if;

  insert into public.ai_usage as usage (user_id, period, analyses)
  values (target_user, to_char(now(), 'YYYY-MM'), 1)
  on conflict (user_id, period) do update set analyses = usage.analyses + 1
  where usage.analyses < free_limit
  returning usage.analyses into used;

  return used is not null;
end;
$$;

revoke all on function public.consume_ai_analysis(uuid, integer) from public, anon, authenticated;

-- 12. Accompagnement PREMIUM : demandes de devis, transmises aux admins.
create table if not exists public.premium_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  role text,
  display_name text,
  topic text not null check (topic in ('cession', 'reprise', 'associes', 'autre')),
  message text not null,
  phone text,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

alter table public.premium_requests enable row level security;
revoke all on public.premium_requests from anon, authenticated;
grant select on public.premium_requests to authenticated;

drop policy if exists "premium_requests_select" on public.premium_requests;

create policy "premium_requests_select"
on public.premium_requests
for select
to authenticated
using (user_id = auth.uid() or public.viewer_is_admin());

drop function if exists public.request_premium(text, text, text);

create function public.request_premium(p_topic text, p_message text, p_phone text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  requester public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;
  if coalesce(length(btrim(p_message)), 0) < 20 then
    raise exception 'MESSAGE_TROP_COURT' using detail = 'Décrivez votre besoin en quelques phrases (au moins 20 caractères)';
  end if;

  select * into requester from public.profiles where id = auth.uid();

  insert into public.premium_requests (user_id, role, display_name, topic, message, phone)
  values (auth.uid(), requester.role::text, requester.display_name, p_topic, left(btrim(p_message), 3000), nullif(left(btrim(coalesce(p_phone, '')), 30), ''));

  insert into public.notifications (user_id, title, body, link_url)
  select profile.id, 'Demande PREMIUM', left(coalesce(requester.display_name, 'Un membre') || ' : ' || btrim(p_message), 300), null
  from public.profiles profile
  where profile.is_admin;
end;
$$;

revoke all on function public.request_premium(text, text, text) from public, anon;
grant execute on function public.request_premium(text, text, text) to authenticated;

-- Le back Python appelle consume_ai_analysis avec la clé service_role.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.consume_ai_analysis(uuid, integer) to service_role;
    grant select, insert, update on public.ai_usage to service_role;
  end if;
end;
$$;
