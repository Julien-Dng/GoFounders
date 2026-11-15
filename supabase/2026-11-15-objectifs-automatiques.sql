-- Objectifs ajoutés automatiquement après une action confirmée (novembre 2026). À exécuter APRÈS
-- 2026-11-13-compte-multi-usages.sql. Plan : docs/PLAN-COMPTE-MULTI-USAGES.md (« Objectifs automatiques »).
--
-- Les objectifs (colonne technique profiles.usages) personnalisent le site ; ils n'ouvrent aucun droit.
--   - publier un projet (projects.is_active)                   → « Trouver des associés » (projet)
--   - publier une annonce (insertion dans ma_listings)          → « Vendre » (cession)
--   - débloquer un dossier (ma_access_requests.contact_unlocked_at) → « Reprendre » (reprise)
-- « Rejoindre un projet » (associe) n'est jamais ajouté ici : le membre le confirme lui-même sur son profil d'associé.
-- Retirer un objectif (Paramètres) ne supprime ni projet, ni annonce, ni dossier acheté. Comptes pro : rien n'est ajouté.

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
