-- GoFounders (refonte-reprise) : vitrine publique « Trouver un associé » (/associes).
-- À exécuter après 2026-10-26-annonces-enrichies.sql. Rejouable.
--
-- Les profils restent illisibles par les visiteurs (2026-10-12-profils-par-role.sql). Cette vitrine passe par une
-- fonction qui ne renvoie que des champs anonymisés, et seulement pour les membres qui l'ont accepté :
--   associés : titre, compétences, disponibilité ;
--   projets  : secteur, stade, profils et compétences recherchés, NDA, ouverture au capital.
-- Jamais le nom, la photo, la localisation, le nom ni la description du projet.
-- Accord explicite (RGPD) : public_listing est faux par défaut, y compris pour les membres déjà inscrits.

alter table public.profiles add column if not exists public_listing boolean not null default false;

grant select (public_listing), update (public_listing) on public.profiles to authenticated;

-- À l'inscription, la case « Apparaître de façon anonyme sur la page publique » est transmise dans les
-- métadonnées du compte (public_listing = true) ; on la recopie dans le profil créé par handle_new_user.
create or replace function public.apply_public_listing_consent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not new.public_listing then
    select coalesce((auth_user.raw_user_meta_data ->> 'public_listing')::boolean, false)
    into new.public_listing
    from auth.users auth_user
    where auth_user.id = new.id;

    new.public_listing := coalesce(new.public_listing, false);
  end if;

  return new;
exception
  when invalid_text_representation then
    new.public_listing := false;
    return new;
end;
$$;

drop trigger if exists apply_public_listing_consent on public.profiles;

create trigger apply_public_listing_consent
before insert on public.profiles
for each row
execute function public.apply_public_listing_consent();

-- Vitrine : associés disponibles et projets qui cherchent un associé, les plus récents d'abord.
drop function if exists public.list_public_marketplace();

create function public.list_public_marketplace()
returns table (
  kind text,
  profile_id uuid,
  title text,
  skills text[],
  availability text,
  sector text,
  stage text,
  looking_for text[],
  nda_required boolean,
  open_to_equity boolean,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  (
    select 'talent'::text, profile.id, nullif(btrim(profile.title), ''), coalesce(profile.skills, '{}'),
           nullif(btrim(profile.availability_label), ''), null::text, null::text, null::text[],
           null::boolean, null::boolean, profile.updated_at
    from public.profiles profile
    where profile.role::text = 'talent'
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
      and owner.role::text = 'entrepreneur'
      and owner.public_listing
      and coalesce(owner.is_visible, true)
    order by owner.updated_at desc
    limit 60
  );
$$;

revoke all on function public.list_public_marketplace() from public;
grant execute on function public.list_public_marketplace() to anon, authenticated;
