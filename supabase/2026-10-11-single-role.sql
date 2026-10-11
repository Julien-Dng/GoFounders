-- Un utilisateur a un seul rôle (entrepreneur, talent, buyer ou seller), choisi à l'inscription.

alter type public.profile_role add value if not exists 'buyer';
alter type public.profile_role add value if not exists 'seller';

-- Le rôle n'est pas modifiable par l'utilisateur : la colonne reste hors du grant update de 2026-06-30.
revoke update (role) on public.profiles from authenticated;

-- Le trigger d'inscription refuse un compte sans rôle au lieu de basculer silencieusement sur 'talent'.
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
begin
  if role_value is null then
    raise exception 'profile_type manquant : un rôle est obligatoire à l''inscription';
  end if;

  selected_role := role_value::public.profile_role;

  insert into public.profiles (
    id,
    email,
    display_name,
    role,
    plan,
    ma_access,
    location,
    title,
    skills,
    looking_for,
    availability_label
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
    nullif(new.raw_user_meta_data ->> 'availability_label', '')
  )
  on conflict (id) do nothing;

  if selected_role = 'entrepreneur'::public.profile_role and project_name_value is not null then
    insert into public.projects (
      owner_id,
      name,
      sector,
      stage,
      looking_for,
      skills_needed,
      location,
      is_active
    )
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
