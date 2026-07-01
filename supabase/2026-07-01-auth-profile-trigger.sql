create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role public.profile_role := coalesce(
    nullif(new.raw_user_meta_data ->> 'profile_type', '')::public.profile_role,
    'talent'::public.profile_role
  );
  skills_value text[] := array(
    select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'skills', '[]'::jsonb))
  );
  looking_for_value text[] := array(
    select jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'looking_for', '[]'::jsonb))
  );
  project_name_value text := nullif(new.raw_user_meta_data ->> 'project_name', '');
begin
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

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();
