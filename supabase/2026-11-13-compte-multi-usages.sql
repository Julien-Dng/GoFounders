-- Un compte, plusieurs usages (novembre 2026). Plan : docs/PLAN-COMPTE-MULTI-USAGES.md
--
-- Une personne a un seul compte et peut cumuler : reprendre, céder, chercher des associés, rejoindre un projet.
-- Les usages cochés personnalisent le site ; ils n'ouvrent AUCUN droit. Les droits viennent des actions et des achats :
--   - projet publié (actif)            → voir et contacter les associés, les inviter sur son projet ;
--   - profil d'associé complété        → voir et contacter les porteurs de projet, demander l'accès à un projet ;
--   - 50 € payés pour une entreprise   → dossier, coordonnées et messagerie avec ce cédant (tout membre) ;
--   - propriétaire d'une annonce       → la gérer et répondre aux repreneurs qui l'ont ouverte.
-- Les comptes pro (role = 'pro') gardent leurs règles. profiles.role reste en place (comptes pro, retour arrière).
-- À exécuter après toutes les migrations précédentes (jusqu'à 2026-11-11-titre-annonce.sql), le jour du déploiement
-- du site correspondant. Idempotent.

-- 1. Usages du membre --------------------------------------------------------------------------------------------
alter table public.profiles add column if not exists usages text[] not null default '{}';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_usages_valides') then
    alter table public.profiles add constraint profiles_usages_valides
      check (usages <@ array['reprise', 'cession', 'projet', 'associe']::text[]);
  end if;
end;
$$;

-- Le membre choisit lui-même ses usages (Paramètres) : aucun droit n'en dépend.
grant select (usages), update (usages) on public.profiles to authenticated;

-- Reprise des comptes existants (seulement ceux qui n'ont encore aucun usage).
update public.profiles
set usages = case role::text
  when 'entrepreneur' then array['projet']
  when 'talent' then array['associe']
  when 'buyer' then array['reprise']
  when 'seller' then array['cession']
  else '{}'::text[]
end
where cardinality(usages) = 0 and role::text <> 'pro';

-- 2. Droits fondés sur les actions ---------------------------------------------------------------------------------
create or replace function public.has_published_project(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects project
    where project.owner_id = target_user and coalesce(project.is_active, false)
  );
$$;

-- Profil d'associé complété : usage « Rejoindre un projet » et au moins une compétence renseignée.
create or replace function public.is_associate(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles profile
    where profile.id = target_user
      and profile.role::text <> 'pro'
      and 'associe' = any(profile.usages)
      and cardinality(coalesce(profile.skills, '{}')) > 0
  );
$$;

revoke all on function public.has_published_project(uuid) from public, anon;
revoke all on function public.is_associate(uuid) from public, anon;
grant execute on function public.has_published_project(uuid) to authenticated;
grant execute on function public.is_associate(uuid) to authenticated;

-- 3. Visibilité des profils et des projets -------------------------------------------------------------------------
-- Un porteur (projet publié) voit les associés ; un associé (profil complété) voit les porteurs. Un associé sans projet
-- ne voit toujours pas les autres associés, et les repreneurs ne se voient pas entre eux.
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
              (public.has_published_project(auth.uid()) and public.is_associate(target_id))
              or (public.is_associate(auth.uid()) and public.has_published_project(target_id))
            )
          )
        )
    )
  end;
$$;

create or replace function public.viewer_can_see_project(project_owner uuid, project_active boolean)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when project_owner = auth.uid() then true
    else public.viewer_is_admin() or (coalesce(project_active, false) and public.is_associate(auth.uid()))
  end;
$$;

-- 4. Conversations rattachées à un projet, une entreprise ou un professionnel -----------------------------------
alter table public.conversations add column if not exists context text;
alter table public.conversations add column if not exists listing_id uuid references public.ma_listings(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'conversations_context_valide') then
    alter table public.conversations add constraint conversations_context_valide
      check (context is null or context in ('projet', 'annonce', 'pro'));
  end if;
end;
$$;

-- Le site peut lire le contexte ; il ne le modifie pas après création.
grant select (context, listing_id) on public.conversations to authenticated;

-- Conversations existantes : contexte d'après les rôles des deux participants.
update public.conversations conversation
set context = case
  when a.role::text = 'pro' or b.role::text = 'pro' then 'pro'
  when a.role::text in ('buyer', 'seller') or b.role::text in ('buyer', 'seller') then 'annonce'
  else 'projet'
end
from public.profiles a, public.profiles b
where a.id = conversation.participant_a and b.id = conversation.participant_b and conversation.context is null;

-- Contact autorisé selon le contexte (indiqué par le site ou déduit), quota gratuit compté sur les seuls contacts
-- « projet » ouverts par le porteur du projet.
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
  project_ok boolean;
  listing_ok boolean;
  pro_ok boolean;
  initiator_is_owner_side boolean;
begin
  -- Membre connecté : il lance lui-même la conversation. Sans session (scripts, administration) : pas de contrôle,
  -- mais le contexte et l'entreprise sont tout de même renseignés.
  if auth.uid() is not null and new.participant_a is distinct from auth.uid() then
    raise exception 'Une conversation doit être lancée par l''utilisateur connecté';
  end if;

  select role::text into initiator_role from public.profiles where id = new.participant_a;
  select role::text into recipient_role from public.profiles where id = new.participant_b;

  initiator_is_owner_side := public.has_published_project(new.participant_a) and public.is_associate(new.participant_b);
  project_ok := initiator_is_owner_side
    or (public.is_associate(new.participant_a) and public.has_published_project(new.participant_b));
  listing_ok := public.has_unlocked_contact(new.participant_a, new.participant_b)
    or public.has_unlocked_contact(new.participant_b, new.participant_a);
  pro_ok := (recipient_role = 'pro' and initiator_role <> 'pro' and public.is_listed_pro(new.participant_b))
    or (initiator_role = 'pro' and recipient_role <> 'pro' and public.has_active_pro_account(new.participant_a)
        and exists (select 1 from public.profiles where id = new.participant_b and 'reprise' = any(usages)));

  if new.context is null then
    new.context := case when project_ok then 'projet' when listing_ok then 'annonce' when pro_ok then 'pro' end;
  end if;

  if auth.uid() is null then
    if new.context = 'annonce' then
      select request.listing_id into new.listing_id
      from public.ma_access_requests request
      where request.contact_unlocked_at is not null
        and ((request.buyer_id = new.participant_a and request.owner_id = new.participant_b)
          or (request.buyer_id = new.participant_b and request.owner_id = new.participant_a))
      order by request.contact_unlocked_at desc
      limit 1;
    end if;
    return new;
  end if;

  if not coalesce(case new.context when 'projet' then project_ok when 'annonce' then listing_ok when 'pro' then pro_ok end, false) then
    raise exception 'ROLE_CONTACT_INTERDIT' using detail = 'Ce membre ne peut pas être contacté : publiez un projet, complétez votre profil d''associé ou débloquez le dossier de son entreprise';
  end if;

  -- Annonce : rattache la conversation au dossier débloqué entre les deux membres (le plus récent).
  -- Toujours calculé ici : une valeur envoyée par le site est ignorée.
  new.listing_id := null;
  if new.context = 'annonce' then
    select request.listing_id into new.listing_id
    from public.ma_access_requests request
    where request.contact_unlocked_at is not null
      and ((request.buyer_id = new.participant_a and request.owner_id = new.participant_b)
        or (request.buyer_id = new.participant_b and request.owner_id = new.participant_a))
    order by request.contact_unlocked_at desc
    limit 1;
  end if;

  if new.context = 'projet' and initiator_is_owner_side then
    select limits.contacts_limit into contacts_limit from public.free_quota_limits(auth.uid()) limits;

    insert into public.usage_counters as counters (user_id, period, contacts)
    values (auth.uid(), public.current_quota_period(), 1)
    on conflict (user_id, period) do update set contacts = counters.contacts + 1
    returning counters.contacts into used;

    if contacts_limit is not null and used > contacts_limit then
      raise exception 'FREE_QUOTA_CONTACTS' using detail = format('Limite de %s nouveaux contacts par mois atteinte', contacts_limit);
    end if;
  end if;

  return new;
end;
$$;

-- Contexte et entreprise fixés à la création : un membre ne peut pas les changer ensuite.
-- Sans « security definer » : current_user doit rester le rôle de l'appelant.
create or replace function public.keep_conversation_context()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.context := old.context;
    new.listing_id := old.listing_id;
  end if;
  return new;
end;
$$;

drop trigger if exists keep_conversation_context on public.conversations;
create trigger keep_conversation_context
before update on public.conversations
for each row execute function public.keep_conversation_context();

-- Quota affiché : 5 nouveaux contacts par mois pour un porteur de projet en FREE.
create or replace function public.free_quota_limits(target_user uuid, out contacts_limit integer, out messages_limit integer)
returns record
language sql
stable
security definer
set search_path = public
as $$
  select
    case when limited then 5 end,
    null::integer
  from (
    select coalesce(
      profile.plan::text = 'FREE'
        and ('projet' = any(profile.usages) or public.has_published_project(profile.id)),
      false
    ) as limited
    from public.profiles profile
    where profile.id = target_user
  ) limits;
$$;

-- 5. Inscription : usages choisis (« Vous êtes plutôt… »), rôle déduit pour information -------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  role_value text := nullif(new.raw_user_meta_data ->> 'profile_type', '');
  selected_role public.profile_role;
  usages_value text[] := array(
    select distinct value
    from jsonb_array_elements_text(
      case when jsonb_typeof(new.raw_user_meta_data -> 'usages') = 'array' then new.raw_user_meta_data -> 'usages' else '[]'::jsonb end
    ) as value
    where value in ('reprise', 'cession', 'projet', 'associe')
  );
  skills_value text[] := array(
    select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'skills', '[]'::jsonb))
  );
  looking_for_value text[] := array(
    select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'looking_for', '[]'::jsonb))
  );
  project_name_value text := nullif(new.raw_user_meta_data ->> 'project_name', '');
  pro_category_value text := nullif(new.raw_user_meta_data ->> 'pro_category', '');
begin
  -- Compte pro : type de compte à part. Sinon le rôle reprend le premier usage (information seulement).
  if role_value = 'pro' then
    selected_role := 'pro';
    usages_value := '{}';
  else
    if cardinality(usages_value) = 0 then
      -- Ancien formulaire : un seul rôle envoyé.
      usages_value := case role_value
        when 'entrepreneur' then array['projet']
        when 'talent' then array['associe']
        when 'buyer' then array['reprise']
        when 'seller' then array['cession']
        else '{}'::text[]
      end;
    end if;

    if cardinality(usages_value) = 0 then
      raise exception 'usages manquants : choisissez au moins un usage à l''inscription';
    end if;

    selected_role := case usages_value[1]
      when 'projet' then 'entrepreneur'
      when 'associe' then 'talent'
      when 'reprise' then 'buyer'
      else 'seller'
    end::public.profile_role;
  end if;

  if selected_role::text <> 'pro'
     or pro_category_value not in ('expert_comptable', 'avocat', 'cabinet_cession', 'notaire', 'autre') then
    pro_category_value := null;
  end if;

  insert into public.profiles (
    id, email, display_name, role, usages, plan, ma_access, location, title, skills, looking_for,
    availability_label, ma_sector, ma_budget, ma_region, pro_category
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1)),
    selected_role,
    usages_value,
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

  if 'projet' = any(usages_value) and project_name_value is not null then
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

-- 6. Règles qui exigeaient un rôle : désormais l'action (projet publié, profil d'associé, dossier payé) ------------
-- Définitions reprises à l'identique, seule la condition de rôle change.
create or replace function public.request_listing_access(p_listing_id uuid, p_message text, p_accept_nda boolean, p_nda_version text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  -- Tout membre peut ouvrir un dossier (même un cédant ou un porteur de projet) ; les comptes pro ont leurs propres règles.
  if buyer.id is null or buyer.role::text = 'pro' then
    raise exception 'ACCES_REPRENEUR_REQUIS' using detail = 'La demande d''accès est réservée aux membres (hors comptes professionnels)';
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
$function$;

create or replace function public.request_project_access(p_project_id uuid, p_accept_nda boolean, p_nda_version text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  requester public.profiles%rowtype;
  project public.projects%rowtype;
  owner_name text;
  headers json;
  accepted boolean;
  result_status text;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;

  select * into requester from public.profiles where id = auth.uid();
  -- Il faut un profil d'associé complété (usage « Rejoindre un projet » et au moins une compétence).
  if requester.id is null or not public.is_associate(requester.id) then
    raise exception 'ACCES_RESERVE_ASSOCIES' using detail = 'Complétez votre profil d''associé (compétences) pour demander l''accès à un projet';
  end if;

  select * into project from public.projects where id = p_project_id;
  if project.id is null or not coalesce(project.is_active, false) or project.owner_id = auth.uid() then
    raise exception 'PROJET_INDISPONIBLE' using detail = 'Ce projet n''est pas disponible';
  end if;

  accepted := coalesce(p_accept_nda, false) and coalesce(btrim(p_nda_version), '') <> '';
  if project.nda_required and not accepted then
    raise exception 'NDA_REQUIS' using detail = 'Ce projet exige l''acceptation de l''engagement de confidentialité';
  end if;

  select coalesce(nullif(display_name, ''), 'Porteur de projet') into owner_name
  from public.profiles where id = project.owner_id;

  begin
    headers := current_setting('request.headers', true)::json;
  exception when others then
    headers := null;
  end;

  insert into public.project_access_requests as req (
    project_id, requester_id, owner_id, status,
    nda_version, nda_accepted_at, nda_ip, nda_user_agent, snapshot
  )
  values (
    project.id, requester.id, project.owner_id, 'pending',
    case when accepted then btrim(p_nda_version) end,
    case when accepted then now() end,
    case when accepted then btrim(split_part(coalesce(headers ->> 'x-forwarded-for', ''), ',', 1)) end,
    case when accepted then left(headers ->> 'user-agent', 300) end,
    jsonb_build_object(
      'project_name', project.name,
      'owner_name', owner_name,
      'requester_name', coalesce(nullif(requester.display_name, ''), 'Associé')
    )
  )
  on conflict (project_id, requester_id) do update
  set
    status = case when req.status = 'approved' then 'approved' else 'pending' end,
    decided_at = case when req.status = 'approved' then req.decided_at else null end,
    nda_version = coalesce(excluded.nda_version, req.nda_version),
    nda_accepted_at = coalesce(excluded.nda_accepted_at, req.nda_accepted_at),
    nda_ip = coalesce(excluded.nda_ip, req.nda_ip),
    nda_user_agent = coalesce(excluded.nda_user_agent, req.nda_user_agent),
    snapshot = excluded.snapshot,
    created_at = case when req.status = 'approved' then req.created_at else now() end
  returning req.status into result_status;

  if result_status = 'pending' then
    insert into public.notifications (user_id, title, body, link_url)
    values (
      project.owner_id,
      'Nouvelle demande d''accès à votre projet',
      left(coalesce(nullif(requester.display_name, ''), 'Un associé') || ' souhaite consulter la partie confidentielle de « ' || project.name || ' »'
        || case when accepted then ' et a accepté l''engagement de confidentialité.' else '.' end, 300),
      '/profil/modifier'
    );
  end if;

  return result_status;
end;
$function$;

create or replace function public.enforce_ma_listing_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.owner_id is distinct from auth.uid() or not exists (
      select 1
      from public.profiles profile
      where profile.id = auth.uid()
        and (profile.role::text <> 'pro' or public.has_active_pro_account(profile.id))
    ) then
      raise exception 'Publication réservée aux membres et aux comptes pro actifs';
    end if;
  elsif old.owner_id is distinct from auth.uid() or new.owner_id is distinct from old.owner_id then
    raise exception 'Seul le propriétaire peut modifier son annonce';
  end if;

  return new;
end;
$function$;

create or replace function public.list_public_marketplace()
 RETURNS TABLE(kind text, profile_id uuid, title text, skills text[], availability text, sector text, stage text, looking_for text[], nda_required boolean, open_to_equity boolean, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  (
    select 'talent'::text, profile.id, nullif(btrim(profile.title), ''), coalesce(profile.skills, '{}'),
           nullif(btrim(profile.availability_label), ''), null::text, null::text, null::text[],
           null::boolean, null::boolean, profile.updated_at
    from public.profiles profile
    where 'associe' = any(coalesce(profile.usages, '{}'))
      and profile.role::text <> 'pro'
      and profile.public_listing
      and coalesce(profile.is_visible, true)
      and (nullif(btrim(profile.title), '') is not null or cardinality(coalesce(profile.skills, '{}')) > 0)
    order by profile.updated_at desc
    limit 60
  )
  union all
  (
    select 'project'::text, owner.id, null::text, coalesce(project.skills_needed, '{}'),
           null::text, nullif(btrim(project.sector), ''), nullif(btrim(project.stage), ''), coalesce(project.looking_for, '{}'),
           coalesce(project.nda_required, false), coalesce(project.open_to_equity, false), owner.updated_at
    from public.projects project
    join public.profiles owner on owner.id = project.owner_id
    where project.is_active
      and owner.role::text <> 'pro'
      and owner.public_listing
      and coalesce(owner.is_visible, true)
    order by owner.updated_at desc
    limit 60
  );
$function$;

create or replace function public.get_ma_listing_detail(listing_id uuid)
 RETURNS SETOF ma_listings
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            and public.has_unlocked_listing_access(listing.id, profile.id)
        )
      )
    );
$function$;

create or replace function public.record_ma_listing_view(p_listing_id uuid, p_kind text DEFAULT 'page'::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    select 1 where public.has_unlocked_listing_access(p_listing_id, me)
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
$function$;

create or replace function public.invite_to_project(p_talent uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  owner public.profiles%rowtype;
  talent public.profiles%rowtype;
  project public.projects%rowtype;
  request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise';
  end if;

  select * into owner from public.profiles where id = auth.uid();
  select * into project from public.projects
  where owner_id = auth.uid() and coalesce(is_active, false)
  -- Un porteur a en pratique un seul projet ; à défaut, celui qui a une partie confidentielle.
  order by coalesce(has_confidential_details, false) desc, id
  limit 1;

  if owner.id is null or project.id is null then
    raise exception 'PROJET_REQUIS' using detail = 'Publiez d''abord votre projet pour l''ouvrir à un associé';
  end if;

  select * into talent from public.profiles where id = p_talent;
  if talent.id is null or talent.id = owner.id or not public.is_associate(talent.id) then
    raise exception 'ASSOCIE_INTROUVABLE' using detail = 'Ce profil n''est pas un associé';
  end if;

  insert into public.project_access_requests as req (project_id, requester_id, owner_id, status, decided_at, invited_at, snapshot)
  values (
    project.id, talent.id, owner.id, 'approved', now(), now(),
    jsonb_build_object(
      'project_name', project.name,
      'owner_name', coalesce(nullif(owner.display_name, ''), 'Porteur de projet'),
      'requester_name', coalesce(nullif(talent.display_name, ''), 'Associé')
    )
  )
  on conflict (project_id, requester_id) do update
  set status = 'approved',
      decided_at = now(),
      invited_at = coalesce(req.invited_at, now())
  returning id into request_id;

  insert into public.notifications (user_id, title, body, link_url)
  values (
    talent.id,
    'Un porteur de projet vous ouvre son projet',
    left(coalesce(nullif(owner.display_name, ''), 'Un porteur de projet') || ' vous donne accès à la partie confidentielle de son projet'
      || case when project.nda_required then ', après acceptation de l''engagement de confidentialité.' else '.' end, 300),
    '/profil/' || project.id::text
  );
  perform public.enqueue_email(talent.id, 'project_invite', jsonb_build_object('project_id', project.id), 'project_invite:' || request_id);

  return case when project.nda_required then 'nda_required' else 'approved' end;
end;
$function$;

create or replace function public.simulate_purchase(product text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    if user_role = 'pro' then
      raise exception 'L''accès repreneur est réservé aux membres (hors comptes professionnels)';
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
$function$;

create or replace function public.has_buyer_plus(target_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select profile.buyer_plus_until > now()
     from public.profiles profile where profile.id = target_user),
    false
  );
$function$;

-- 7. Dossiers débloqués par le membre (page Abonnement / Paiements), sans ouvrir la table payments.
create or replace function public.list_my_unlocked_listings()
returns table (listing_id uuid, title text, sector text, region text, status text, unlocked_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select listing.id, coalesce(nullif(listing.public_title, ''), listing.sector || ', ' || listing.region),
         listing.sector, listing.region, listing.status, request.contact_unlocked_at
  from public.ma_access_requests request
  join public.ma_listings listing on listing.id = request.listing_id
  where request.buyer_id = auth.uid() and request.contact_unlocked_at is not null
  order by request.contact_unlocked_at desc;
$$;

revoke all on function public.list_my_unlocked_listings() from public, anon;
grant execute on function public.list_my_unlocked_listings() to authenticated;
