-- GoFounders (refonte-reprise) : règles du premier lancement.
-- À exécuter après 2026-10-27-vitrine-associes.sql. Rejouable.
--
-- 1. Accès anticipé de 48 h désactivé : une annonce relue est visible de tous tout de suite.
-- 2. Relecture avant publication : une nouvelle annonce (ou une annonce modifiée) n'est publique qu'après
--    validation d'un admin (reviewed_at). Les annonces déjà en ligne restent en ligne.
-- 3. Validation du repreneur et engagement de confidentialité : l'accès repreneur permet de DEMANDER l'accès
--    à un dossier ; le dossier complet et le contact ne s'ouvrent qu'après acceptation du cédant.
--    Le repreneur accepte un NDA au moment de sa demande (preuve conservée, comme pour les projets).
-- 4. File d'e-mails : les événements importants sont mis en file (email_outbox) ; le back Python les envoie
--    avec Resend quand la clé est configurée. Les e-mails ne contiennent jamais d'information confidentielle.

-- 1. Accès anticipé ------------------------------------------------------------------------------------
drop policy if exists "ma_listings_acces_anticipe" on public.ma_listings;

-- 4 (d'abord, utilisée par la suite). File d'e-mails ----------------------------------------------------
alter table public.profiles add column if not exists email_notifications boolean not null default true;
grant select (email_notifications), update (email_notifications) on public.profiles to authenticated;

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template text not null check (template in (
    'new_message', 'access_request', 'access_approved', 'access_refused',
    'listing_published', 'listing_rejected', 'listing_withdrawn', 'listing_restored'
  )),
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  attempts integer not null default 0,
  last_error text
);

create index if not exists email_outbox_pending_idx on public.email_outbox (created_at) where sent_at is null;

alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from anon, authenticated;

-- Mise en file (fonctions internes uniquement). Les e-mails de messagerie respectent le réglage du membre.
create or replace function public.enqueue_email(p_user uuid, p_template text, p_payload jsonb default '{}'::jsonb, p_dedupe text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then
    return;
  end if;

  if p_template = 'new_message'
     and not coalesce((select email_notifications from public.profiles where id = p_user), true) then
    return;
  end if;

  insert into public.email_outbox (user_id, template, payload, dedupe_key)
  values (p_user, p_template, coalesce(p_payload, '{}'::jsonb), p_dedupe)
  on conflict (dedupe_key) do nothing;
end;
$$;

revoke all on function public.enqueue_email(uuid, text, jsonb, text) from public, anon, authenticated;

-- Nouveau message : au plus un e-mail par conversation et par destinataire toutes les 3 heures.
create or replace function public.enqueue_new_message_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient uuid;
begin
  select case when conversation.participant_a = new.sender_id then conversation.participant_b else conversation.participant_a end
  into recipient
  from public.conversations conversation
  where conversation.id = new.conversation_id;

  if recipient is not null and recipient <> new.sender_id then
    perform public.enqueue_email(
      recipient, 'new_message', '{}'::jsonb,
      'message:' || new.conversation_id || ':' || recipient || ':' || floor(extract(epoch from now()) / 10800)::bigint
    );
  end if;

  return new;
end;
$$;

revoke all on function public.enqueue_new_message_email() from public, anon, authenticated;

do $$
begin
  if to_regclass('public.messages') is not null and to_regclass('public.conversations') is not null then
    execute 'drop trigger if exists enqueue_new_message_email on public.messages';
    execute 'create trigger enqueue_new_message_email after insert on public.messages for each row execute function public.enqueue_new_message_email()';
  end if;
end;
$$;

-- 2. Relecture avant publication -------------------------------------------------------------------------
-- Les annonces déjà publiques ne disparaissent pas : elles sont considérées comme relues.
update public.ma_listings
set reviewed_at = now()
where status = 'active' and reviewed_at is null and not withdrawn_by_admin;

-- Une annonce modifiée par son propriétaire (y compris les informations enrichies) repasse en relecture.
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
      new.public_summary, new.sale_reason, new.confidential_description, new.contact_info,
      new.revenue_year, new.revenue_history, new.included_assets, new.monthly_visitors, new.acquisition_channels,
      new.team_size, new.owner_hours_per_week, new.growth_notes)
     is distinct from
     (old.sector, old.region, old.type, old.revenue, old.margin, old.age, old.price_min, old.price_max,
      old.public_summary, old.sale_reason, old.confidential_description, old.contact_info,
      old.revenue_year, old.revenue_history, old.included_assets, old.monthly_visitors, old.acquisition_channels,
      old.team_size, old.owner_hours_per_week, old.growth_notes) then
    new.reviewed_at := null;
  end if;

  return new;
end;
$$;

-- Visible du public : annonce active ET relue. Le propriétaire et les admins voient tout.
drop policy if exists "ma_listings_moderation" on public.ma_listings;

create policy "ma_listings_moderation"
on public.ma_listings
as restrictive
for select
to anon, authenticated
using ((status = 'active' and reviewed_at is not null) or owner_id = auth.uid() or public.viewer_is_admin());

-- Modération : « approve » publie (et prévient le vendeur si l'annonce attendait), « reject » refuse une
-- annonce en attente, « withdraw » retire une annonce publiée, « restore » la remet en ligne.
create or replace function public.moderate_ma_listing(p_listing_id uuid, p_action text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  listing record;
  note text := nullif(btrim(coalesce(p_note, '')), '');
  label text;
begin
  if not public.viewer_is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;

  select ma.id, ma.owner_id, ma.sector, ma.region, ma.reviewed_at into listing
  from public.ma_listings ma where ma.id = p_listing_id for update;

  if listing.id is null then
    raise exception 'Annonce introuvable';
  end if;

  label := listing.sector || ', ' || listing.region;

  if p_action = 'approve' then
    update public.ma_listings set reviewed_at = now(), moderation_note = note where id = p_listing_id;

    if listing.reviewed_at is null then
      insert into public.notifications (user_id, title, body, link_url)
      values (listing.owner_id, 'Annonce en ligne', 'Votre annonce « ' || label || ' » a été relue et elle est maintenant visible.', '/ma/annonce/' || p_listing_id::text);
      perform public.enqueue_email(listing.owner_id, 'listing_published', jsonb_build_object('listing_label', label, 'listing_id', p_listing_id),
        'listing_published:' || p_listing_id || ':' || floor(extract(epoch from now()) / 60)::bigint);
    end if;
  elsif p_action in ('withdraw', 'reject') then
    if note is null or length(note) < 5 then
      raise exception 'Indiquez le motif (il est envoyé au vendeur)';
    end if;

    update public.ma_listings
    set status = 'withdrawn', withdrawn_by_admin = true, reviewed_at = now(), moderation_note = left(note, 500)
    where id = p_listing_id;

    insert into public.notifications (user_id, title, body, link_url)
    values (
      listing.owner_id,
      case when p_action = 'reject' then 'Annonce non publiée' else 'Annonce retirée par la modération' end,
      left('Votre annonce « ' || label || ' » ' || case when p_action = 'reject' then 'n''a pas été publiée' else 'a été retirée' end || ' : ' || note, 300),
      '/ma/mes-annonces'
    );
    perform public.enqueue_email(
      listing.owner_id,
      case when p_action = 'reject' then 'listing_rejected' else 'listing_withdrawn' end,
      jsonb_build_object('listing_label', label, 'reason', left(note, 500)),
      p_action || ':' || p_listing_id || ':' || floor(extract(epoch from now()) / 60)::bigint
    );
  elsif p_action = 'restore' then
    update public.ma_listings
    set status = 'active', withdrawn_by_admin = false, reviewed_at = now(), moderation_note = note
    where id = p_listing_id;

    insert into public.notifications (user_id, title, body, link_url)
    values (listing.owner_id, 'Annonce remise en ligne', 'Votre annonce « ' || label || ' » est de nouveau visible.', '/ma/annonce/' || p_listing_id::text);
    perform public.enqueue_email(listing.owner_id, 'listing_restored', jsonb_build_object('listing_label', label, 'listing_id', p_listing_id),
      'listing_restored:' || p_listing_id || ':' || floor(extract(epoch from now()) / 60)::bigint);
  else
    raise exception 'Action inconnue';
  end if;
end;
$$;

-- Le vendeur voit le statut de relecture de ses annonces (en attente, en ligne, refusée avec le motif).
drop function if exists public.get_my_listing_review();

create function public.get_my_listing_review()
returns table (listing_id uuid, reviewed_at timestamptz, withdrawn_by_admin boolean, moderation_note text)
language sql
stable
security definer
set search_path = public
as $$
  select listing.id, listing.reviewed_at, listing.withdrawn_by_admin, listing.moderation_note
  from public.ma_listings listing
  where listing.owner_id = auth.uid();
$$;

revoke all on function public.get_my_listing_review() from public, anon;
grant execute on function public.get_my_listing_review() to authenticated;

-- 3. Demandes d'accès aux dossiers ------------------------------------------------------------------------
create table if not exists public.ma_access_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.ma_listings(id) on delete set null,
  buyer_id uuid references public.profiles(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'refused')),
  message text,
  decision_note text,
  -- Preuve de l'engagement de confidentialité, conservée même si un compte ou l'annonce est supprimé.
  nda_version text not null,
  nda_accepted_at timestamptz not null,
  nda_ip text,
  nda_user_agent text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (listing_id, buyer_id)
);

alter table public.ma_access_requests enable row level security;
revoke all on public.ma_access_requests from anon, authenticated;

create or replace function public.has_approved_listing_access(p_listing uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ma_access_requests request
    where request.listing_id = p_listing and request.buyer_id = p_user and request.status = 'approved'
  );
$$;

revoke all on function public.has_approved_listing_access(uuid, uuid) from public, anon, authenticated;

drop function if exists public.request_listing_access(uuid, text, boolean, text);

create function public.request_listing_access(p_listing_id uuid, p_message text, p_accept_nda boolean, p_nda_version text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  buyer public.profiles%rowtype;
  listing record;
  clean_message text := left(btrim(coalesce(p_message, '')), 1500);
  headers json;
  existing record;
  label text;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;

  select * into buyer from public.profiles where id = auth.uid();
  if buyer.id is null or buyer.role::text <> 'buyer' or not public.has_active_ma_access(buyer.id) then
    raise exception 'ACCES_REPRENEUR_REQUIS' using detail = 'La demande d''accès est réservée aux repreneurs avec un accès en cours';
  end if;

  select ma.id, ma.owner_id, ma.sector, ma.region into listing
  from public.ma_listings ma
  where ma.id = p_listing_id and ma.status = 'active' and ma.reviewed_at is not null;

  if listing.id is null or listing.owner_id = buyer.id then
    raise exception 'ANNONCE_INDISPONIBLE' using detail = 'Cette annonce n''est pas disponible';
  end if;

  if not coalesce(p_accept_nda, false) or coalesce(btrim(p_nda_version), '') = '' then
    raise exception 'NDA_REQUIS' using detail = 'L''engagement de confidentialité doit être accepté';
  end if;

  if length(clean_message) < 20 then
    raise exception 'PRESENTATION_REQUISE' using detail = 'Présentez-vous en quelques phrases (au moins 20 caractères)';
  end if;

  select status into existing from public.ma_access_requests where listing_id = listing.id and buyer_id = buyer.id;

  if existing.status = 'approved' then
    return 'approved';
  elsif existing.status = 'refused' then
    raise exception 'DEMANDE_REFUSEE' using detail = 'Le cédant n''a pas donné suite à votre demande';
  end if;

  begin
    headers := current_setting('request.headers', true)::json;
  exception when others then
    headers := null;
  end;

  label := listing.sector || ', ' || listing.region;

  insert into public.ma_access_requests as req (
    listing_id, buyer_id, owner_id, status, message,
    nda_version, nda_accepted_at, nda_ip, nda_user_agent, snapshot
  )
  values (
    listing.id, buyer.id, listing.owner_id, 'pending', clean_message,
    btrim(p_nda_version), now(),
    nullif(btrim(split_part(coalesce(headers ->> 'x-forwarded-for', ''), ',', 1)), ''),
    left(headers ->> 'user-agent', 300),
    jsonb_build_object(
      'listing_label', label,
      'buyer_name', coalesce(nullif(buyer.display_name, ''), 'Repreneur'),
      'owner_name', coalesce((select nullif(display_name, '') from public.profiles where id = listing.owner_id), 'Cédant')
    )
  )
  on conflict (listing_id, buyer_id) do update
  set message = excluded.message,
      nda_version = excluded.nda_version,
      nda_accepted_at = excluded.nda_accepted_at,
      nda_ip = excluded.nda_ip,
      nda_user_agent = excluded.nda_user_agent,
      snapshot = excluded.snapshot;

  if existing.status is null then
    insert into public.notifications (user_id, title, body, link_url)
    values (listing.owner_id, 'Nouvelle demande d''accès', left(coalesce(nullif(buyer.display_name, ''), 'Un repreneur') || ' demande l''accès au dossier de votre annonce « ' || label || ' » et a accepté l''engagement de confidentialité.', 300), '/ma/mes-annonces');
    perform public.enqueue_email(listing.owner_id, 'access_request', jsonb_build_object('listing_label', label), 'access_request:' || listing.id || ':' || buyer.id);
  end if;

  return 'pending';
end;
$$;

revoke all on function public.request_listing_access(uuid, text, boolean, text) from public, anon;
grant execute on function public.request_listing_access(uuid, text, boolean, text) to authenticated;

drop function if exists public.decide_listing_access(uuid, boolean, text);

create function public.decide_listing_access(p_request_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request record;
  label text;
begin
  select req.id, req.owner_id, req.buyer_id, req.listing_id, req.status, req.snapshot into request
  from public.ma_access_requests req where req.id = p_request_id for update;

  if request.id is null or (request.owner_id is distinct from auth.uid() and not public.viewer_is_admin()) then
    raise exception 'DEMANDE_INTROUVABLE' using detail = 'Demande introuvable';
  end if;

  if request.status <> 'pending' then
    raise exception 'DEMANDE_DEJA_TRAITEE' using detail = 'Cette demande a déjà été traitée';
  end if;

  update public.ma_access_requests
  set status = case when p_approve then 'approved' else 'refused' end,
      decided_at = now(),
      decision_note = nullif(left(btrim(coalesce(p_note, '')), 500), '')
  where id = p_request_id;

  label := coalesce(request.snapshot ->> 'listing_label', 'une annonce');

  insert into public.notifications (user_id, title, body, link_url)
  values (
    request.buyer_id,
    case when p_approve then 'Accès au dossier accepté' else 'Demande d''accès non retenue' end,
    case when p_approve
      then 'Le cédant de l''annonce « ' || label || ' » vous ouvre son dossier complet.'
      else 'Le cédant de l''annonce « ' || label || ' » n''a pas donné suite à votre demande.' end,
    '/ma/annonce/' || request.listing_id::text
  );
  perform public.enqueue_email(
    request.buyer_id,
    case when p_approve then 'access_approved' else 'access_refused' end,
    jsonb_build_object('listing_label', label, 'listing_id', request.listing_id),
    'access_decision:' || request.id
  );
end;
$$;

revoke all on function public.decide_listing_access(uuid, boolean, text) from public, anon;
grant execute on function public.decide_listing_access(uuid, boolean, text) to authenticated;

-- Repreneur : état de sa demande pour une annonce.
drop function if exists public.get_my_access_request(uuid);

create function public.get_my_access_request(p_listing_id uuid)
returns table (status text, created_at timestamptz, decided_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select request.status, request.created_at, request.decided_at
  from public.ma_access_requests request
  where request.listing_id = p_listing_id and request.buyer_id = auth.uid();
$$;

revoke all on function public.get_my_access_request(uuid) from public, anon;
grant execute on function public.get_my_access_request(uuid) to authenticated;

-- Cédant : demandes reçues sur ses annonces, avec le profil du repreneur (ce qu'il a choisi de montrer).
drop function if exists public.list_my_access_requests();

create function public.list_my_access_requests()
returns table (
  id uuid,
  listing_id uuid,
  listing_label text,
  buyer_id uuid,
  buyer_name text,
  buyer_title text,
  buyer_location text,
  buyer_budget text,
  buyer_sector text,
  buyer_verified boolean,
  message text,
  status text,
  nda_accepted_at timestamptz,
  created_at timestamptz,
  decided_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select request.id, request.listing_id, coalesce(request.snapshot ->> 'listing_label', listing.sector || ', ' || listing.region),
         request.buyer_id, coalesce(buyer.display_name, request.snapshot ->> 'buyer_name'), buyer.title, buyer.location,
         buyer.ma_budget, buyer.ma_sector, buyer.verified_at is not null,
         request.message, request.status, request.nda_accepted_at, request.created_at, request.decided_at
  from public.ma_access_requests request
  left join public.ma_listings listing on listing.id = request.listing_id
  left join public.profiles buyer on buyer.id = request.buyer_id
  where request.owner_id = auth.uid()
  order by (request.status = 'pending') desc, request.created_at desc;
$$;

revoke all on function public.list_my_access_requests() from public, anon;
grant execute on function public.list_my_access_requests() to authenticated;

-- Dossier complet : propriétaire, admins, ou repreneur avec accès en cours ET demande acceptée.
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
        and listing.reviewed_at is not null
        and exists (
          select 1
          from public.profiles profile
          where profile.id = auth.uid()
            and profile.role::text = 'buyer'
            and public.has_active_ma_access(profile.id)
            and public.has_approved_listing_access(listing.id, profile.id)
        )
      )
    );
$$;

revoke all on function public.get_ma_listing_detail(uuid) from public, anon;
grant execute on function public.get_ma_listing_detail(uuid) to authenticated;

-- Le back Python (clé service_role) envoie la file d'e-mails et vérifie l'accès avant une analyse IA.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, update on public.email_outbox to service_role;
    grant select on public.ma_access_requests to service_role;
    grant select (email, display_name, email_notifications) on public.profiles to service_role;
    grant execute on function public.has_approved_listing_access(uuid, uuid) to service_role;
  end if;
end;
$$;
