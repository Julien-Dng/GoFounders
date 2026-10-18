-- GoFounders : modération des annonces M&A, vérification des profils et statistiques des vendeurs.
-- À exécuter après les migrations précédentes (dont 2026-10-12-offres.sql). Rejouable.
--
-- 1. Modération : une annonce reste en ligne dès sa publication, un admin la relit ensuite et peut la
--    retirer (avec un motif envoyé au vendeur) ou la remettre en ligne. Une annonce retirée n'est plus
--    lisible que par son propriétaire et les admins, et le vendeur ne peut pas la republier seul.
-- 2. Vérification des profils : l'utilisateur envoie des éléments (LinkedIn, site, SIREN…), un admin
--    les contrôle et pose le badge « Profil vérifié » (profiles.verified_at).
-- 3. Statistiques : vues des annonces (page et dossier complet) et contacts reçus, pour le vendeur.

-- 0. Admin connecté (même définition que dans les migrations de la branche refonte-reprise).
create or replace function public.viewer_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select profile.is_admin from public.profiles profile where profile.id = auth.uid()), false);
$$;

revoke all on function public.viewer_is_admin() from public;
grant execute on function public.viewer_is_admin() to anon, authenticated;

-- 1. Modération des annonces.
alter table public.ma_listings
  add column if not exists reviewed_at timestamptz,
  add column if not exists moderation_note text,
  add column if not exists withdrawn_by_admin boolean not null default false;

-- Colonnes de modération : écrites uniquement par les fonctions d'admin. Une annonce modifiée par son
-- propriétaire repasse « à relire » ; une annonce retirée par la modération ne peut pas être republiée seule.
create or replace function public.enforce_ma_listing_moderation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.reviewed_at := null;
    new.moderation_note := null;
    new.withdrawn_by_admin := false;
    return new;
  end if;

  new.reviewed_at := old.reviewed_at;
  new.moderation_note := old.moderation_note;
  new.withdrawn_by_admin := old.withdrawn_by_admin;

  if old.withdrawn_by_admin and new.status = 'active' then
    raise exception 'Annonce retirée par la modération : contactez l''équipe GoFounders pour la remettre en ligne';
  end if;

  if (new.sector, new.region, new.type, new.revenue, new.margin, new.age, new.price_min, new.price_max,
      new.public_summary, new.sale_reason, new.confidential_description, new.contact_info)
     is distinct from
     (old.sector, old.region, old.type, old.revenue, old.margin, old.age, old.price_min, old.price_max,
      old.public_summary, old.sale_reason, old.confidential_description, old.contact_info) then
    new.reviewed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_ma_listing_moderation on public.ma_listings;

create trigger enforce_ma_listing_moderation
before insert or update on public.ma_listings
for each row
execute function public.enforce_ma_listing_moderation();

-- RLS : les politiques permissives d'origine sont créées seulement si la base n'en a pas (mêmes noms que
-- dans 2026-10-20b-offres-reprise.sql), puis une politique restrictive masque les annonces non actives.
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

drop policy if exists "ma_listings_moderation" on public.ma_listings;

create policy "ma_listings_moderation"
on public.ma_listings
as restrictive
for select
to anon, authenticated
using (status = 'active' or owner_id = auth.uid() or public.viewer_is_admin());

-- Dossier complet : plus accessible aux acheteurs une fois l'annonce retirée ou vendue.
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
      or public.viewer_is_admin()
      or (
        listing.status = 'active'
        and exists (
          select 1
          from public.profiles profile
          where profile.id = auth.uid()
            and profile.role::text = 'buyer'
            and public.has_active_ma_access(profile.id)
        )
      )
    );
$$;

revoke all on function public.get_ma_listing_detail(uuid) from public, anon;
grant execute on function public.get_ma_listing_detail(uuid) to authenticated;

-- Les admins sont prévenus de chaque nouvelle annonce à relire.
create or replace function public.notify_admins_new_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, title, body, link_url)
  select admin.id, 'Annonce à relire : ' || new.sector, left(coalesce(new.public_summary, '') || ' (' || new.region || ')', 300), '/admin/annonces'
  from public.profiles admin
  where admin.is_admin and admin.id is distinct from new.owner_id;

  return new;
end;
$$;

revoke all on function public.notify_admins_new_listing() from public, anon, authenticated;

drop trigger if exists notify_admins_new_listing on public.ma_listings;

create trigger notify_admins_new_listing
after insert on public.ma_listings
for each row
execute function public.notify_admins_new_listing();

-- Liste de modération (admins) : dossier complet, nom du vendeur et état de relecture.
drop function if exists public.admin_list_ma_listings(text);

create function public.admin_list_ma_listings(p_filter text default 'to_review')
returns table (
  id uuid,
  owner_id uuid,
  owner_name text,
  sector text,
  region text,
  type text,
  revenue numeric,
  margin numeric,
  age integer,
  price_min numeric,
  price_max numeric,
  public_summary text,
  sale_reason text,
  confidential_description text,
  contact_info text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz,
  moderation_note text,
  withdrawn_by_admin boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.viewer_is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;

  return query
  select
    listing.id, listing.owner_id, owner.display_name, listing.sector, listing.region, listing.type::text,
    listing.revenue::numeric, listing.margin::numeric, listing.age::integer, listing.price_min::numeric, listing.price_max::numeric,
    listing.public_summary, listing.sale_reason, listing.confidential_description, listing.contact_info,
    listing.status::text, listing.created_at, listing.reviewed_at, listing.moderation_note, listing.withdrawn_by_admin
  from public.ma_listings listing
  left join public.profiles owner on owner.id = listing.owner_id
  where case coalesce(p_filter, 'to_review')
    when 'to_review' then listing.status = 'active' and listing.reviewed_at is null
    when 'active' then listing.status = 'active'
    when 'withdrawn' then listing.withdrawn_by_admin
    else true
  end
  order by listing.created_at desc
  limit 200;
end;
$$;

revoke all on function public.admin_list_ma_listings(text) from public, anon;
grant execute on function public.admin_list_ma_listings(text) to authenticated;

-- Décision d'un admin : approve (relue, reste en ligne), withdraw (retirée, motif obligatoire) ou restore.
drop function if exists public.moderate_ma_listing(uuid, text, text);

create function public.moderate_ma_listing(p_listing_id uuid, p_action text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  listing record;
  note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.viewer_is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;

  select ma.id, ma.owner_id, ma.sector into listing from public.ma_listings ma where ma.id = p_listing_id for update;

  if listing.id is null then
    raise exception 'Annonce introuvable';
  end if;

  if p_action = 'approve' then
    update public.ma_listings set reviewed_at = now(), moderation_note = note where id = p_listing_id;
  elsif p_action = 'withdraw' then
    if note is null or length(note) < 5 then
      raise exception 'Indiquez le motif du retrait (il est envoyé au vendeur)';
    end if;

    update public.ma_listings
    set status = 'withdrawn', withdrawn_by_admin = true, reviewed_at = now(), moderation_note = left(note, 500)
    where id = p_listing_id;

    insert into public.notifications (user_id, title, body, link_url)
    values (listing.owner_id, 'Annonce retirée par la modération', left('Votre annonce « ' || listing.sector || ' » a été retirée : ' || note, 300), '/dashboard');
  elsif p_action = 'restore' then
    update public.ma_listings
    set status = 'active', withdrawn_by_admin = false, reviewed_at = now(), moderation_note = note
    where id = p_listing_id;

    insert into public.notifications (user_id, title, body, link_url)
    values (listing.owner_id, 'Annonce remise en ligne', 'Votre annonce « ' || listing.sector || ' » est de nouveau visible.', '/ma/annonce/' || p_listing_id::text);
  else
    raise exception 'Action inconnue';
  end if;
end;
$$;

revoke all on function public.moderate_ma_listing(uuid, text, text) from public, anon;
grant execute on function public.moderate_ma_listing(uuid, text, text) to authenticated;

-- 2. Vérification des profils.
alter table public.profiles add column if not exists verified_at timestamptz;

grant select (verified_at) on public.profiles to authenticated;

-- verified_at n'est posé que par decide_profile_verification (trigger séparé d'enforce_profile_entitlements,
-- qui est redéfini par d'autres migrations).
create or replace function public.enforce_profile_verification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.verified_at := null;
  else
    new.verified_at := old.verified_at;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_profile_verification on public.profiles;

create trigger enforce_profile_verification
before insert or update on public.profiles
for each row
execute function public.enforce_profile_verification();

create table if not exists public.profile_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  evidence text not null check (char_length(evidence) between 20 and 3000),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles(id) on delete set null
);

create unique index if not exists profile_verification_requests_one_pending
on public.profile_verification_requests (user_id)
where status = 'pending';

alter table public.profile_verification_requests enable row level security;
revoke all on public.profile_verification_requests from anon, authenticated;
grant select on public.profile_verification_requests to authenticated;

drop policy if exists "profile_verification_requests_select" on public.profile_verification_requests;

create policy "profile_verification_requests_select"
on public.profile_verification_requests
for select
to authenticated
using (user_id = auth.uid() or public.viewer_is_admin());

drop function if exists public.request_profile_verification(text);

create function public.request_profile_verification(p_evidence text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  evidence text := btrim(coalesce(p_evidence, ''));
  request_id uuid;
  requester_name text;
begin
  if me is null then
    raise exception 'Connexion requise';
  end if;

  if exists (select 1 from public.profiles where id = me and verified_at is not null) then
    raise exception 'Votre profil est déjà vérifié';
  end if;

  if char_length(evidence) < 20 then
    raise exception 'Indiquez au moins un lien ou un élément vérifiable (20 caractères minimum)';
  end if;

  if exists (select 1 from public.profile_verification_requests where user_id = me and status = 'pending') then
    raise exception 'Une demande est déjà en cours d''examen';
  end if;

  insert into public.profile_verification_requests (user_id, evidence)
  values (me, left(evidence, 3000))
  returning id into request_id;

  select display_name into requester_name from public.profiles where id = me;

  insert into public.notifications (user_id, title, body, link_url)
  select admin.id, 'Profil à vérifier', coalesce(requester_name, 'Un membre') || ' demande la vérification de son profil.', '/admin/profils'
  from public.profiles admin
  where admin.is_admin;

  return request_id;
end;
$$;

revoke all on function public.request_profile_verification(text) from public, anon;
grant execute on function public.request_profile_verification(text) to authenticated;

drop function if exists public.decide_profile_verification(uuid, boolean, text);

create function public.decide_profile_verification(p_request_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request record;
  note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.viewer_is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;

  select * into request from public.profile_verification_requests where id = p_request_id for update;

  if request.id is null or request.status <> 'pending' then
    raise exception 'Demande introuvable ou déjà traitée';
  end if;

  if not p_approve and note is null then
    raise exception 'Indiquez le motif du refus (il est envoyé au membre)';
  end if;

  update public.profile_verification_requests
  set status = case when p_approve then 'approved' else 'rejected' end,
      admin_note = left(note, 500),
      decided_at = now(),
      decided_by = auth.uid()
  where id = p_request_id;

  if p_approve then
    update public.profiles set verified_at = now() where id = request.user_id;
  end if;

  insert into public.notifications (user_id, title, body, link_url)
  values (
    request.user_id,
    case when p_approve then 'Profil vérifié' else 'Vérification du profil non validée' end,
    case when p_approve then 'Votre profil affiche désormais le badge « Profil vérifié ».' else left('Motif : ' || note, 300) end,
    '/profil/modifier'
  );
end;
$$;

revoke all on function public.decide_profile_verification(uuid, boolean, text) from public, anon;
grant execute on function public.decide_profile_verification(uuid, boolean, text) to authenticated;

-- Demandes en attente avec les infos utiles du profil (admins).
drop function if exists public.admin_list_profile_verifications();

create function public.admin_list_profile_verifications()
returns table (
  id uuid,
  user_id uuid,
  evidence text,
  created_at timestamptz,
  display_name text,
  role text,
  title text,
  location text,
  linkedin_url text,
  website_url text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.viewer_is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;

  return query
  select request.id, request.user_id, request.evidence, request.created_at,
         profile.display_name, profile.role::text, profile.title, profile.location, profile.linkedin_url, profile.website_url
  from public.profile_verification_requests request
  join public.profiles profile on profile.id = request.user_id
  where request.status = 'pending'
  order by request.created_at;
end;
$$;

revoke all on function public.admin_list_profile_verifications() from public, anon;
grant execute on function public.admin_list_profile_verifications() to authenticated;

-- 3. Statistiques des annonces : vues de la page et du dossier complet, par jour.
create table if not exists public.ma_listing_daily_stats (
  listing_id uuid not null references public.ma_listings(id) on delete cascade,
  day date not null default current_date,
  page_views integer not null default 0,
  dossier_views integer not null default 0,
  primary key (listing_id, day)
);

-- Une vue par membre connecté, par jour et par type (évite de gonfler les chiffres en rechargeant la page).
create table if not exists public.ma_listing_viewers (
  listing_id uuid not null references public.ma_listings(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default current_date,
  kind text not null check (kind in ('page', 'dossier')),
  primary key (listing_id, viewer_id, day, kind)
);

alter table public.ma_listing_daily_stats enable row level security;
alter table public.ma_listing_viewers enable row level security;
revoke all on public.ma_listing_daily_stats from anon, authenticated;
revoke all on public.ma_listing_viewers from anon, authenticated;

drop function if exists public.record_ma_listing_view(uuid, text);

-- Appelée à l'ouverture d'une annonce. Ne compte ni le propriétaire ni les admins ; le dossier n'est compté
-- que pour un acheteur qui y a accès. Les visiteurs non connectés comptent pour une vue de page à chaque fois.
create function public.record_ma_listing_view(p_listing_id uuid, p_kind text default 'page')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  listing_owner uuid;
  inserted integer;
begin
  if p_kind not in ('page', 'dossier') then
    return;
  end if;

  select owner_id into listing_owner from public.ma_listings where id = p_listing_id and status = 'active';

  if listing_owner is null or listing_owner = me or public.viewer_is_admin() then
    return;
  end if;

  if p_kind = 'dossier' and (me is null or not exists (
    select 1 from public.profiles where id = me and role::text = 'buyer' and public.has_active_ma_access(id)
  )) then
    return;
  end if;

  if me is not null then
    insert into public.ma_listing_viewers (listing_id, viewer_id, kind)
    values (p_listing_id, me, p_kind)
    on conflict do nothing;

    get diagnostics inserted = row_count;

    if inserted = 0 then
      return;
    end if;
  end if;

  insert into public.ma_listing_daily_stats (listing_id, page_views, dossier_views)
  values (p_listing_id, case when p_kind = 'page' then 1 else 0 end, case when p_kind = 'dossier' then 1 else 0 end)
  on conflict (listing_id, day) do update
  set page_views = ma_listing_daily_stats.page_views + excluded.page_views,
      dossier_views = ma_listing_daily_stats.dossier_views + excluded.dossier_views;
end;
$$;

revoke all on function public.record_ma_listing_view(uuid, text) from public;
grant execute on function public.record_ma_listing_view(uuid, text) to anon, authenticated;

-- Statistiques des annonces du membre connecté, au total et sur les p_days derniers jours.
drop function if exists public.get_my_listing_stats(integer);

create function public.get_my_listing_stats(p_days integer default 30)
returns table (
  listing_id uuid,
  sector text,
  region text,
  status text,
  created_at timestamptz,
  page_views_total bigint,
  page_views_period bigint,
  dossier_views_total bigint,
  dossier_views_period bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    listing.id, listing.sector, listing.region, listing.status::text, listing.created_at,
    coalesce(sum(stats.page_views), 0)::bigint,
    coalesce(sum(stats.page_views) filter (where stats.day > current_date - greatest(p_days, 1)), 0)::bigint,
    coalesce(sum(stats.dossier_views), 0)::bigint,
    coalesce(sum(stats.dossier_views) filter (where stats.day > current_date - greatest(p_days, 1)), 0)::bigint
  from public.ma_listings listing
  left join public.ma_listing_daily_stats stats on stats.listing_id = listing.id
  where listing.owner_id = auth.uid()
  group by listing.id
  order by listing.created_at desc;
$$;

revoke all on function public.get_my_listing_stats(integer) from public, anon;
grant execute on function public.get_my_listing_stats(integer) to authenticated;

-- Vues par jour, toutes annonces du membre confondues (jours sans vue inclus).
drop function if exists public.get_my_listing_daily_views(integer);

create function public.get_my_listing_daily_views(p_days integer default 30)
returns table (day date, page_views bigint, dossier_views bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    series.day::date,
    coalesce(sum(stats.page_views), 0)::bigint,
    coalesce(sum(stats.dossier_views), 0)::bigint
  from generate_series(current_date - (least(greatest(p_days, 1), 365) - 1), current_date, interval '1 day') as series(day)
  left join public.ma_listing_daily_stats stats
    on stats.day = series.day::date
   and stats.listing_id in (select id from public.ma_listings where owner_id = auth.uid())
  group by series.day
  order by series.day;
$$;

revoke all on function public.get_my_listing_daily_views(integer) from public, anon;
grant execute on function public.get_my_listing_daily_views(integer) to authenticated;

-- Contacts reçus : conversations ouvertes par d'autres membres avec le membre connecté.
drop function if exists public.get_my_contact_stats(integer);

create function public.get_my_contact_stats(p_days integer default 30)
returns table (contacts_total bigint, contacts_period bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint,
    count(*) filter (where conversation.created_at > now() - make_interval(days => greatest(p_days, 1)))::bigint
  from public.conversations conversation
  where conversation.participant_b = auth.uid();
$$;

revoke all on function public.get_my_contact_stats(integer) from public, anon;
grant execute on function public.get_my_contact_stats(integer) to authenticated;

-- Accès du back (clé service_role) aux nouvelles tables.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.profile_verification_requests, public.ma_listing_daily_stats, public.ma_listing_viewers to service_role;
  end if;
end;
$$;
