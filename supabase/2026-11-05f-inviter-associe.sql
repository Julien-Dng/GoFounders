-- Le porteur de projet ouvre lui-même son projet à un associé (novembre 2026).
-- Jusqu'ici, seul l'associé pouvait demander l'accès à la partie confidentielle ; le porteur peut maintenant inviter.
-- Si le projet exige l'engagement de confidentialité, l'associé invité doit l'accepter avant de lire (règle aussi
-- appliquée aux accès existants). Le porteur retire un accès avec decide_project_access(..., false).
-- À exécuter après 2026-10-19-projets-confidentiels-nda.sql et 2026-11-05e-mise-en-relation-directe.sql. Idempotent.

alter table public.project_access_requests add column if not exists invited_at timestamptz;

-- Nouveau modèle d'e-mail : l'associé est prévenu de l'invitation (sans aucun détail du projet).
do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.email_outbox'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%template%';
  if constraint_name is not null then
    execute format('alter table public.email_outbox drop constraint %I', constraint_name);
  end if;
end;
$$;

alter table public.email_outbox add constraint email_outbox_template_check check (template in (
  'new_message', 'access_request', 'access_approved', 'access_refused', 'contact_unlocked', 'project_invite',
  'listing_published', 'listing_rejected', 'listing_withdrawn', 'listing_restored'
));

create or replace function public.invite_to_project(p_talent uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
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

  if owner.id is null or owner.role::text <> 'entrepreneur' or project.id is null then
    raise exception 'PROJET_REQUIS' using detail = 'Publiez d''abord votre projet pour l''ouvrir à un associé';
  end if;

  select * into talent from public.profiles where id = p_talent;
  if talent.id is null or talent.role::text <> 'talent' then
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
$$;

revoke all on function public.invite_to_project(uuid) from public, anon;
grant execute on function public.invite_to_project(uuid) to authenticated;

-- Lecture : un projet qui exige l'engagement de confidentialité ne s'ouvre qu'après son acceptation.
create or replace function public.get_project_confidential(p_project_id uuid)
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
          and (not coalesce(project.nda_required, false) or request.nda_accepted_at is not null)
      )
    );
$$;

revoke all on function public.get_project_confidential(uuid) from public, anon;
grant execute on function public.get_project_confidential(uuid) to authenticated;
