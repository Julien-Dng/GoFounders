-- Objectifs ajoutés automatiquement après une action confirmée (novembre 2026). À exécuter APRÈS
-- 2026-11-13-compte-multi-usages.sql. Plan : docs/PLAN-COMPTE-MULTI-USAGES.md (« Objectifs automatiques »).
--
-- Les objectifs (colonne technique profiles.usages) personnalisent le site ; ils n'ouvrent aucun droit.
--   - publier un projet (projects.is_active)                   → « Trouver des associés » (projet)
--   - publier une annonce (insertion dans ma_listings)          → « Vendre » (cession)
--   - débloquer un dossier (ma_access_requests.contact_unlocked_at) → « Reprendre » (reprise)
-- « Rejoindre un projet » (associe) n'est jamais ajouté par une action implicite : le membre confirme lui-même
-- « Proposer mon profil aux porteurs de projet » (set_associate_offer) ou le choisit à l'inscription.
-- Retirer un objectif (Paramètres) ne supprime ni projet, ni annonce, ni dossier acheté. Comptes pro : rien n'est ajouté.
--
-- Profil d'associé proposé (option b) : le droit d'associé ne dépend plus de l'objectif mais d'un choix explicite,
-- profiles.associate_offered_at, posé ou retiré uniquement par set_associate_offer. Retirer l'objectif
-- « Rejoindre un projet » ne masque donc pas le profil ; le retirer des propositions est une action distincte.

begin;

-- Fonction interne : ajoute un objectif s'il manque. Aucun accès direct pour les membres.
create or replace function public.add_profile_usage(target_user uuid, usage_value text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set usages = array_append(usages, usage_value)
  where id = target_user
    and role::text <> 'pro'
    and not (usage_value = any(usages));
$$;

revoke all on function public.add_profile_usage(uuid, text) from public, anon, authenticated;

-- Projet publié (création ou passage de brouillon à publié).
create or replace function public.add_usage_on_project_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.is_active, false) and (tg_op = 'INSERT' or not coalesce(old.is_active, false)) then
    perform public.add_profile_usage(new.owner_id, 'projet');
  end if;
  return new;
end;
$$;

drop trigger if exists add_usage_on_project_published on public.projects;
create trigger add_usage_on_project_published
  after insert or update of is_active on public.projects
  for each row execute function public.add_usage_on_project_published();

-- Annonce de cession déposée.
create or replace function public.add_usage_on_listing_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.add_profile_usage(new.owner_id, 'cession');
  return new;
end;
$$;

drop trigger if exists add_usage_on_listing_created on public.ma_listings;
create trigger add_usage_on_listing_created
  after insert on public.ma_listings
  for each row execute function public.add_usage_on_listing_created();

-- Dossier débloqué (paiement confirmé).
create or replace function public.add_usage_on_dossier_unlocked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.contact_unlocked_at is not null and (tg_op = 'INSERT' or old.contact_unlocked_at is null) then
    perform public.add_profile_usage(new.buyer_id, 'reprise');
  end if;
  return new;
end;
$$;

drop trigger if exists add_usage_on_dossier_unlocked on public.ma_access_requests;
create trigger add_usage_on_dossier_unlocked
  after insert or update of contact_unlocked_at on public.ma_access_requests
  for each row execute function public.add_usage_on_dossier_unlocked();

-- Profil d'associé proposé : choix explicite, distinct de l'objectif ----------------------------------------------
alter table public.profiles add column if not exists associate_offered_at timestamptz;
grant select (associate_offered_at) on public.profiles to authenticated;

-- Membres existants : ceux qui avaient l'usage « associé » restent proposés (comportement inchangé).
update public.profiles set associate_offered_at = coalesce(updated_at, now())
where associate_offered_at is null and role::text <> 'pro' and 'associe' = any(usages);

-- Inscription : choisir « Rejoindre un projet » (avec ses compétences) vaut proposition du profil.
create or replace function public.offer_associate_on_signup()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role::text <> 'pro' and 'associe' = any(coalesce(new.usages, '{}')) then
    new.associate_offered_at := coalesce(new.associate_offered_at, now());
  else
    new.associate_offered_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists offer_associate_on_signup on public.profiles;
create trigger offer_associate_on_signup
  before insert on public.profiles
  for each row execute function public.offer_associate_on_signup();

-- Le membre propose (ou retire) son profil d'associé. Proposer exige au moins une compétence et ajoute l'objectif ;
-- retirer ne touche pas aux objectifs.
create or replace function public.set_associate_offer(p_offer boolean)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles%rowtype;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if me.role::text = 'pro' then
    raise exception 'COMPTE_PRO';
  end if;

  if p_offer then
    if cardinality(coalesce(me.skills, '{}')) = 0 then
      raise exception 'COMPETENCES_REQUISES';
    end if;
    update public.profiles set associate_offered_at = coalesce(associate_offered_at, now()) where id = me.id;
    perform public.add_profile_usage(me.id, 'associe');
  else
    update public.profiles set associate_offered_at = null where id = me.id;
  end if;

  return (select associate_offered_at from public.profiles where id = me.id);
end;
$$;

revoke all on function public.set_associate_offer(boolean) from public, anon;
grant execute on function public.set_associate_offer(boolean) to authenticated;

-- Droit d'associé : profil proposé + au moins une compétence (l'objectif n'entre plus en compte).
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
      and profile.associate_offered_at is not null
      and cardinality(coalesce(profile.skills, '{}')) > 0
  );
$$;

-- Vitrine /associes : seuls les profils d'associé proposés (et la case vitrine cochée, inchangé).
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
    where profile.associate_offered_at is not null
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

-- Rattrapage : membres qui ont déjà agi.
update public.profiles profile set usages = array_append(profile.usages, 'projet')
where profile.role::text <> 'pro' and not ('projet' = any(profile.usages))
  and exists (select 1 from public.projects project where project.owner_id = profile.id and coalesce(project.is_active, false));

update public.profiles profile set usages = array_append(profile.usages, 'cession')
where profile.role::text <> 'pro' and not ('cession' = any(profile.usages))
  and exists (select 1 from public.ma_listings listing where listing.owner_id = profile.id);

update public.profiles profile set usages = array_append(profile.usages, 'reprise')
where profile.role::text <> 'pro' and not ('reprise' = any(profile.usages))
  and exists (select 1 from public.ma_access_requests request where request.buyer_id = profile.id and request.contact_unlocked_at is not null);

commit;
