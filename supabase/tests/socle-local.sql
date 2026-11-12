-- Socle d'une base de test locale imitant Supabase (rôles, schéma auth, tables d'origine), à charger AVANT
-- toutes les migrations du dossier supabase/. Tests uniquement, jamais sur Supabase. Mode d'emploi : supabase/tests/README.md
-- Socle minimal imitant Supabase + tables d'origine (avant les migrations du dépôt).
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
grant anon, authenticated, service_role to postgres;
create schema extensions; create extension pgcrypto schema extensions;
create schema auth;
create table auth.users (
  instance_id uuid, id uuid primary key, aud text, role text, email text unique, encrypted_password text,
  email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  confirmation_token text, recovery_token text, email_change_token_new text, email_change text,
  email_change_token_current text, phone_change text, phone_change_token text, reauthentication_token text,
  last_sign_in_at timestamptz);
create table auth.identities (id uuid primary key, user_id uuid references auth.users on delete cascade, provider_id text,
  provider text, identity_data jsonb, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select current_user::text $$;
create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('sub', current_setting('request.jwt.claim.sub', true), 'role', current_user) $$;
grant usage on schema auth, extensions to anon, authenticated, service_role;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean default false, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, created_at timestamptz default now());
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema storage to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

create type public.profile_role as enum ('entrepreneur', 'talent');
create type public.plan_type as enum ('FREE', 'PRO', 'PREMIUM');

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text, display_name text not null, role public.profile_role not null default 'talent',
  plan public.plan_type not null default 'FREE', ma_access boolean not null default false,
  location text, title text, bio text, photo_url text, github_url text, linkedin_url text, website_url text,
  ma_sector text, ma_budget text, ma_region text, is_admin boolean default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.projects (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles on delete cascade,
  name text not null, sector text, stage text, description text, looking_for text[] default '{}', skills_needed text[] default '{}',
  location text, is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles on delete cascade,
  participant_b uuid not null references public.profiles on delete cascade,
  created_at timestamptz not null default now());
create table public.messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations on delete cascade,
  sender_id uuid not null references public.profiles on delete cascade, content text not null, read_at timestamptz,
  created_at timestamptz not null default now());
create table public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles on delete cascade,
  title text not null, body text not null, link_url text, read_at timestamptz, created_at timestamptz not null default now());
create table public.ma_listings (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles on delete cascade,
  sector text not null, region text not null, type text not null default 'cession',
  revenue numeric, margin numeric, age integer, price_min numeric, price_max numeric,
  public_summary text not null, sale_reason text, confidential_description text, contact_info text,
  status text not null default 'active',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now());
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.ma_listings enable row level security;
grant select, insert, update, delete on all tables in schema public to service_role;
create publication supabase_realtime;
grant select, insert, update, delete on public.conversations, public.messages, public.notifications to authenticated;
create policy conv_participants on public.conversations for select to authenticated using (auth.uid() in (participant_a, participant_b));
create policy msg_participants on public.messages for select to authenticated using (exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.participant_a, c.participant_b)));
-- Droits de base de Supabase absents des migrations du dépôt (base de test locale uniquement).
grant insert, update, delete on public.projects, public.ma_listings to authenticated;
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy conv_insert_own on public.conversations for insert to authenticated with check (participant_a = auth.uid());
create policy conv_update_own on public.conversations for update to authenticated using (auth.uid() in (participant_a, participant_b));
