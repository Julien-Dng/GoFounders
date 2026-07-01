alter table public.profiles
  add column if not exists skills text[] default '{}',
  add column if not exists looking_for text[] default '{}',
  add column if not exists availability_label text;

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
