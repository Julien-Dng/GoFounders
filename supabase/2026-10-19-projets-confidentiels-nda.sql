-- Projets : partie confidentielle, demandes d'accès et engagement de confidentialité (NDA).
-- À exécuter après 2026-10-18-projets-entree-capital.sql.
--
-- Règles :
--   - La fiche d'un projet a une partie publique (teaser) et une partie confidentielle (confidential_details).
--   - La partie confidentielle n'est jamais lisible directement : elle passe par get_project_confidential(),
--     qui ne la renvoie qu'au propriétaire, aux admins et aux associés dont la demande d'accès est acceptée.
--   - Un associé demande l'accès avec request_project_access(). Si le porteur a activé nda_required,
--     l'associé doit accepter l'engagement de confidentialité : la preuve (version du texte, date, IP,
--     navigateur, noms au moment de l'acceptation) est enregistrée et conservée.
--   - Le porteur accepte, refuse ou retire l'accès avec decide_project_access().
--   - Les demandes ne s'écrivent que par ces fonctions : aucune écriture directe depuis le navigateur.

-- 1. Colonnes du projet.
alter table public.projects
  add column if not exists confidential_details text,
  add column if not exists nda_required boolean not null default false;

-- Indique s'il existe une partie confidentielle, sans en dévoiler le contenu.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'projects' and column_name = 'has_confidential_details'
  ) then
    alter table public.projects
      add column has_confidential_details boolean
      generated always as (coalesce(length(btrim(confidential_details)), 0) > 0) stored;
  end if;
end;
$$;

-- 2. Lecture : toutes les colonnes sauf la partie confidentielle.
revoke select on public.projects from anon, authenticated;

do $$
declare
  readable_columns text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
  into readable_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = 'projects' and column_name <> 'confidential_details';

  execute format('grant select (%s) on public.projects to authenticated', readable_columns);
end;
$$;

-- 3. Demandes d'accès et preuve d'acceptation du NDA.
--    requester_id / owner_id passent à null si un compte est supprimé : la preuve reste conservée
--    (intérêt légitime des parties), avec les noms figés au moment de l'acceptation (snapshot).
create table if not exists public.project_access_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  requester_id uuid references public.profiles(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'refused')),
  nda_version text,
  nda_accepted_at timestamptz,
  nda_ip text,
  nda_user_agent text,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (project_id, requester_id)
);

alter table public.project_access_requests enable row level security;

revoke all on public.project_access_requests from anon, authenticated;
grant select on public.project_access_requests to authenticated;

drop policy if exists "project_access_requests_select" on public.project_access_requests;

create policy "project_access_requests_select"
on public.project_access_requests
for select
to authenticated
using (
  requester_id = auth.uid()
  or owner_id = auth.uid()
  or exists (select 1 from public.profiles viewer where viewer.id = auth.uid() and viewer.is_admin)
);

-- 4. Demande d'accès (associé).
drop function if exists public.request_project_access(uuid, boolean, text);

create function public.request_project_access(p_project_id uuid, p_accept_nda boolean, p_nda_version text)
returns text
language plpgsql
security definer
set search_path = public
as $$
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
  if requester.id is null or requester.role::text <> 'talent' then
    raise exception 'ACCES_RESERVE_ASSOCIES' using detail = 'Seuls les associés peuvent demander l''accès à un projet';
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
$$;

-- 5. Décision du porteur (accepter, refuser, retirer un accès déjà accordé).
drop function if exists public.decide_project_access(uuid, boolean);

create function public.decide_project_access(p_request_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request public.project_access_requests%rowtype;
  project_name text;
begin
  select * into request from public.project_access_requests where id = p_request_id;

  if request.id is null or request.owner_id is distinct from auth.uid() then
    raise exception 'DEMANDE_INTROUVABLE';
  end if;

  update public.project_access_requests
  set status = case when p_approve then 'approved' else 'refused' end, decided_at = now()
  where id = p_request_id;

  select name into project_name from public.projects where id = request.project_id;

  if request.requester_id is not null then
    insert into public.notifications (user_id, title, body, link_url)
    values (
      request.requester_id,
      case when p_approve then 'Accès accordé' else 'Accès non accordé' end,
      case
        when p_approve then 'Vous pouvez consulter la partie confidentielle de « ' || coalesce(project_name, 'ce projet') || ' ».'
        else 'Le porteur de « ' || coalesce(project_name, 'ce projet') || ' » n''a pas donné suite à votre demande d''accès.'
      end,
      '/profil/' || request.project_id::text
    );
  end if;
end;
$$;

-- 6. Lecture de la partie confidentielle.
drop function if exists public.get_project_confidential(uuid);

create function public.get_project_confidential(p_project_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select project.confidential_details
  from public.projects project
  where project.id = p_project_id
    and (
      project.owner_id = auth.uid()
      or exists (select 1 from public.profiles viewer where viewer.id = auth.uid() and viewer.is_admin)
      or exists (
        select 1
        from public.project_access_requests request
        where request.project_id = project.id
          and request.requester_id = auth.uid()
          and request.status = 'approved'
      )
    );
$$;

revoke all on function public.request_project_access(uuid, boolean, text) from public, anon;
revoke all on function public.decide_project_access(uuid, boolean) from public, anon;
revoke all on function public.get_project_confidential(uuid) from public, anon;
grant execute on function public.request_project_access(uuid, boolean, text) to authenticated;
grant execute on function public.decide_project_access(uuid, boolean) to authenticated;
grant execute on function public.get_project_confidential(uuid) to authenticated;
