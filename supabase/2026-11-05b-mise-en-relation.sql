-- Mise en relation payante (novembre 2026) : remplace l'accès repreneur à 149 €/an.
--
-- Parcours :
--   1. Le repreneur demande l'accès au dossier, gratuitement (présentation + engagement de confidentialité).
--   2. Le cédant accepte ou refuse.
--   3. S'il accepte, le repreneur paie 50 € (produit INTRO, lié à l'annonce) pour débloquer le dossier complet,
--      les coordonnées du cédant et la messagerie avec lui. Aucun paiement en cas de refus.
--
-- Les repreneurs qui ont déjà un accès 149 € en cours gardent l'accès aux dossiers acceptés jusqu'à son échéance.
-- À exécuter après 2026-10-28-lancement.sql (et 2026-11-05-associes-offres.sql). Idempotent.

-- 1. Déblocage d'une demande acceptée
-- Nouveau modèle d'e-mail : prévenir le cédant qu'un repreneur a débloqué la mise en relation.
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.email_outbox'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%template%';
  if constraint_name is not null then
    execute format('alter table public.email_outbox drop constraint %I', constraint_name);
  end if;
end;
$$;

alter table public.email_outbox add constraint email_outbox_template_check check (template in (
  'new_message', 'access_request', 'access_approved', 'access_refused', 'contact_unlocked',
  'listing_published', 'listing_rejected', 'listing_withdrawn', 'listing_restored'
));

alter table public.ma_access_requests add column if not exists contact_unlocked_at timestamptz;
alter table public.ma_access_requests add column if not exists unlock_reference text;

-- Demande acceptée ET débloquée (paiement de la mise en relation, ou ancien accès 149 € encore en cours).
create or replace function public.has_unlocked_listing_access(p_listing uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ma_access_requests request
    where request.listing_id = p_listing
      and request.buyer_id = p_user
      and request.status = 'approved'
      and (request.contact_unlocked_at is not null or public.has_active_ma_access(p_user))
  );
$$;

revoke all on function public.has_unlocked_listing_access(uuid, uuid) from public, anon, authenticated;

-- Utilisée par le back Python avant une analyse de dossier : exige désormais le déblocage.
create or replace function public.has_approved_listing_access(p_listing uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_unlocked_listing_access(p_listing, p_user);
$$;

revoke all on function public.has_approved_listing_access(uuid, uuid) from public, anon, authenticated;

-- Mise en relation débloquée entre un repreneur et un cédant (pour ouvrir une conversation).
create or replace function public.has_unlocked_contact(p_buyer uuid, p_owner uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ma_access_requests request
    where request.buyer_id = p_buyer
      and request.owner_id = p_owner
      and request.status = 'approved'
      and (request.contact_unlocked_at is not null or public.has_active_ma_access(p_buyer))
  );
$$;

revoke all on function public.has_unlocked_contact(uuid, uuid) from public, anon, authenticated;

-- 2. Demande d'accès : gratuite pour tout compte repreneur (plus besoin de l'accès 149 €).
create or replace function public.request_listing_access(p_listing_id uuid, p_message text, p_accept_nda boolean, p_nda_version text)
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
  if buyer.id is null or buyer.role::text <> 'buyer' then
    raise exception 'ACCES_REPRENEUR_REQUIS' using detail = 'La demande d''accès est réservée aux comptes repreneur';
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

-- 3. Décision du cédant : le repreneur accepté est invité à débloquer la mise en relation.
create or replace function public.decide_listing_access(p_request_id uuid, p_approve boolean, p_note text default null)
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
    case when p_approve then 'Demande acceptée par le cédant' else 'Demande d''accès non retenue' end,
    case when p_approve
      then 'Le cédant de l''annonce « ' || label || ' » accepte d''échanger avec vous. Débloquez la mise en relation pour lire son dossier et le contacter.'
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

-- Déblocage effectif (paiement Stripe confirmé ou paiement simulé). Renvoie faux si rien à débloquer.
create or replace function public.unlock_listing_contact(p_user uuid, p_listing uuid, p_reference text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  request record;
  label text;
begin
  update public.ma_access_requests
  set contact_unlocked_at = now(), unlock_reference = p_reference
  where listing_id = p_listing and buyer_id = p_user and status = 'approved' and contact_unlocked_at is null
  returning id, owner_id, snapshot into request;

  if request.id is null then
    return false;
  end if;

  label := coalesce(request.snapshot ->> 'listing_label', 'votre annonce');

  insert into public.notifications (user_id, title, body, link_url)
  values (request.owner_id, 'Un repreneur a ouvert votre dossier', left(coalesce(request.snapshot ->> 'buyer_name', 'Un repreneur') || ' a débloqué la mise en relation pour « ' || label || ' » : il peut lire votre dossier et vous écrire.', 300), '/messages');
  perform public.enqueue_email(request.owner_id, 'contact_unlocked', jsonb_build_object('listing_label', label), 'contact_unlocked:' || request.id);

  return true;
end;
$$;

revoke all on function public.unlock_listing_contact(uuid, uuid, text) from public, anon, authenticated;

-- 4. Lecture de l'état par le repreneur et par le cédant
drop function if exists public.get_my_access_request(uuid);

create function public.get_my_access_request(p_listing_id uuid)
returns table (status text, created_at timestamptz, decided_at timestamptz, unlocked boolean)
language sql
stable
security definer
set search_path = public
as $$
  select request.status, request.created_at, request.decided_at,
         public.has_unlocked_listing_access(request.listing_id, request.buyer_id)
  from public.ma_access_requests request
  where request.listing_id = p_listing_id and request.buyer_id = auth.uid();
$$;

revoke all on function public.get_my_access_request(uuid) from public, anon;
grant execute on function public.get_my_access_request(uuid) to authenticated;

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
  decided_at timestamptz,
  unlocked boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select request.id, request.listing_id, coalesce(request.snapshot ->> 'listing_label', listing.sector || ', ' || listing.region),
         request.buyer_id, coalesce(buyer.display_name, request.snapshot ->> 'buyer_name'), buyer.title, buyer.location,
         buyer.ma_budget, buyer.ma_sector, buyer.verified_at is not null,
         request.message, request.status, request.nda_accepted_at, request.created_at, request.decided_at,
         request.buyer_id is not null and public.has_unlocked_listing_access(request.listing_id, request.buyer_id)
  from public.ma_access_requests request
  left join public.ma_listings listing on listing.id = request.listing_id
  left join public.profiles buyer on buyer.id = request.buyer_id
  where request.owner_id = auth.uid()
  order by (request.status = 'pending') desc, request.created_at desc;
$$;

revoke all on function public.list_my_access_requests() from public, anon;
grant execute on function public.list_my_access_requests() to authenticated;

-- 5. Dossier complet : propriétaire, admins, ou repreneur dont la demande est acceptée ET débloquée.
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
            and public.has_unlocked_listing_access(listing.id, profile.id)
        )
      )
    );
$$;

revoke all on function public.get_ma_listing_detail(uuid) from public, anon;
grant execute on function public.get_ma_listing_detail(uuid) to authenticated;

-- 6. Conversations repreneur ↔ cédant : seulement après une mise en relation débloquée.
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
    or (initiator_role = 'buyer' and recipient_role = 'seller' and public.has_unlocked_contact(new.participant_a, new.participant_b))
    or (initiator_role = 'seller' and recipient_role = 'buyer' and public.has_unlocked_contact(new.participant_b, new.participant_a))
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

-- 7. Paiements : produit INTRO (mise en relation) dans le webhook Stripe et en paiement simulé.
create or replace function public.apply_purchase(
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

  if p_product = 'INTRO' then
    if not public.unlock_listing_contact(p_user, p_listing, p_reference) then
      -- Payé sans demande acceptée à débloquer (cas anormal) : les admins remboursent ou débloquent à la main.
      insert into public.notifications (user_id, title, body, link_url)
      select profile.id, 'Mise en relation payée à vérifier', 'Paiement ' || p_reference || ' sans demande acceptée à débloquer.', null
      from public.profiles profile
      where profile.is_admin;
    end if;
  elsif p_product in ('PRO', 'PREMIUM') then
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

revoke all on function public.apply_purchase(uuid, text, uuid, text, timestamptz, text, integer, text) from public, anon, authenticated;

-- Paiement simulé (tant que le site est en paymentMode 'simulation') ; supprimé à la mise en ligne
-- par supabase/production/supprimer-paiements-simules.sql.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'simulate_listing_purchase' and pronamespace = 'public'::regnamespace) then
    execute $f$
      create or replace function public.simulate_listing_purchase(product text, p_listing_id uuid, p_evidence text default null)
      returns void
      language plpgsql
      security definer
      set search_path = public
      as $body$
      declare
        listing public.ma_listings%rowtype;
      begin
        if auth.uid() is null then
          raise exception 'Connexion requise';
        end if;

        if product = 'INTRO' then
          if not public.unlock_listing_contact(auth.uid(), p_listing_id, 'simulation:' || gen_random_uuid()) then
            raise exception 'RIEN_A_DEBLOQUER' using detail = 'Aucune demande acceptée à débloquer pour cette annonce';
          end if;
          return;
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
      $body$;
    $f$;
    execute 'revoke all on function public.simulate_listing_purchase(text, uuid, text) from public, anon';
    execute 'grant execute on function public.simulate_listing_purchase(text, uuid, text) to authenticated';
  end if;
end;
$$;

-- 8. Droits du back Python (clé service_role)
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.has_approved_listing_access(uuid, uuid) to service_role;
    grant execute on function public.has_unlocked_listing_access(uuid, uuid) to service_role;
    grant execute on function public.apply_purchase(uuid, text, uuid, text, timestamptz, text, integer, text) to service_role;
    grant select on public.ma_access_requests to service_role;
  end if;
end;
$$;
