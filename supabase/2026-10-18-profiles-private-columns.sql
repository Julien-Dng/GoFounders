-- Protège les champs privés et les droits des profils.
--
-- 1. Lecture : les colonnes privées (email, ma_access, is_admin) ne sont plus lisibles
--    sur les profils des autres. Son propre profil complet se lit via get_my_profile().
-- 2. Modification : un utilisateur ne peut modifier que les champs éditables de son profil.
--    plan, ma_access et is_admin ne se changent plus depuis le navigateur
--    (uniquement depuis le dashboard Supabase, un webhook ou une fonction serveur).
-- 3. Création : un profil créé depuis le navigateur démarre toujours en FREE, sans accès M&A, non admin.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 1. Lecture
revoke select on public.profiles from anon, authenticated;

grant select (
  id,
  display_name,
  role,
  plan,
  location,
  title,
  bio,
  photo_url,
  github_url,
  linkedin_url,
  website_url,
  skills,
  looking_for,
  availability_label,
  created_at,
  updated_at
) on public.profiles to authenticated;

create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select profile.*
  from public.profiles as profile
  where profile.id = auth.uid();
$$;

revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- 2. Modification
revoke update on public.profiles from anon, authenticated;

grant update (
  display_name,
  location,
  title,
  bio,
  photo_url,
  github_url,
  linkedin_url,
  website_url,
  skills,
  looking_for,
  availability_label,
  updated_at
) on public.profiles to authenticated;

-- 3. Création
create or replace function public.reset_profile_privileges_on_client_insert()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.plan := 'FREE';
    new.ma_access := false;
    new.is_admin := false;
  end if;

  return new;
end;
$$;

drop trigger if exists on_profile_insert_reset_privileges on public.profiles;

create trigger on_profile_insert_reset_privileges
before insert on public.profiles
for each row
execute function public.reset_profile_privileges_on_client_insert();
