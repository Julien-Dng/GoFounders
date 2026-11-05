-- Mise en relation directe (novembre 2026) : le repreneur n'attend plus l'accord du cédant.
--
-- Parcours :
--   1. Le repreneur accepte l'engagement de confidentialité (preuve conservée) ; un message au cédant est facultatif.
--   2. Il paie 50 € (produit INTRO) : le dossier complet, les coordonnées du cédant et la messagerie s'ouvrent aussitôt.
--   3. Le cédant est prévenu (notification et e-mail) avec le nom du repreneur.
-- Le cédant ne valide plus les demandes : il indique dans son annonce les coordonnées qu'il souhaite transmettre.
-- Remplace les règles de 2026-11-05b-mise-en-relation.sql (à exécuter après elle). Idempotent.

-- 1. Engagement de confidentialité avant paiement : présentation facultative, plus de notification au cédant
--    à ce stade (il est prévenu au paiement), une ancienne demande refusée peut être reprise.
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

  select status into existing from public.ma_access_requests where listing_id = listing.id and buyer_id = buyer.id;

  if existing.status = 'approved' then
    return 'approved';
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
    listing.id, buyer.id, listing.owner_id, 'pending', nullif(clean_message, ''),
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
  set status = case when req.status = 'refused' then 'pending' else req.status end,
      message = coalesce(excluded.message, req.message),
      nda_version = excluded.nda_version,
      nda_accepted_at = excluded.nda_accepted_at,
      nda_ip = excluded.nda_ip,
      nda_user_agent = excluded.nda_user_agent,
      snapshot = excluded.snapshot;

  return 'pending';
end;
$$;

revoke all on function public.request_listing_access(uuid, text, boolean, text) from public, anon;
grant execute on function public.request_listing_access(uuid, text, boolean, text) to authenticated;

-- 2. Paiement : la demande (engagement accepté) est ouverte immédiatement, sans décision du cédant.
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
  set status = 'approved',
      decided_at = coalesce(decided_at, now()),
      contact_unlocked_at = now(),
      unlock_reference = p_reference
  where listing_id = p_listing and buyer_id = p_user and status in ('pending', 'approved') and contact_unlocked_at is null
  returning id, owner_id, snapshot into request;

  if request.id is null then
    return false;
  end if;

  label := coalesce(request.snapshot ->> 'listing_label', 'votre annonce');

  insert into public.notifications (user_id, title, body, link_url)
  values (request.owner_id, 'Un repreneur a ouvert votre dossier', left(coalesce(request.snapshot ->> 'buyer_name', 'Un repreneur') || ' a débloqué votre dossier « ' || label || ' » : il a accepté l''engagement de confidentialité et peut vous contacter.', 300), '/ma/mes-annonces');
  perform public.enqueue_email(request.owner_id, 'contact_unlocked', jsonb_build_object('listing_label', label), 'contact_unlocked:' || request.id);

  return true;
end;
$$;

revoke all on function public.unlock_listing_contact(uuid, uuid, text) from public, anon, authenticated;
