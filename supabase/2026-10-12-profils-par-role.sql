-- Séparation stricte des rôles sur les profils. À exécuter après 2026-10-12-offres.sql.
--
-- Qui voit quel profil (lecture directe, API comprise) :
--   - son propre profil ;
--   - porteur de projet <-> talent (la marketplace Talents & Associés) ;
--   - les personnes avec qui on a déjà une conversation ;
--   - un admin voit tout.
-- Un talent ne voit donc jamais les autres talents, un porteur de projet jamais les autres porteurs
-- de projet, et acheteurs / vendeurs ne voient que leurs interlocuteurs.
-- L'email n'est plus lisible dans profiles (seul l'utilisateur connaît le sien, via sa session).
-- Le back Python (service_role) n'est pas concerné.

-- 1. Règle de visibilité. security definer : lit profiles et conversations sans repasser par les
--    règles RLS (sinon la règle sur profiles s'appellerait elle-même).
create or replace function public.viewer_can_see_profile(target_id uuid, target_role public.profile_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when target_id = auth.uid() then true
    else exists (
      select 1
      from public.profiles viewer
      where viewer.id = auth.uid()
        and (
          viewer.is_admin
          or (viewer.role::text = 'entrepreneur' and target_role::text = 'talent')
          or (viewer.role::text = 'talent' and target_role::text = 'entrepreneur')
          or exists (
            select 1
            from public.conversations conversation
            where (conversation.participant_a = auth.uid() and conversation.participant_b = target_id)
               or (conversation.participant_b = auth.uid() and conversation.participant_a = target_id)
          )
        )
    )
  end;
$$;

revoke all on function public.viewer_can_see_profile(uuid, public.profile_role) from public, anon;
grant execute on function public.viewer_can_see_profile(uuid, public.profile_role) to authenticated;

-- 2. Une seule règle de lecture. Les règles « true » existantes (lecture de tous les profils) sont
--    supprimées (ainsi que les règles « ALL », qui incluent la lecture) : les règles RLS se cumulent,
--    la plus permissive l'emportait.
alter table public.profiles enable row level security;

do $$
declare
  policy record;
begin
  for policy in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd in ('SELECT', 'ALL')
  loop
    execute format('drop policy %I on public.profiles', policy.policyname);
  end loop;
end;
$$;

create policy "profiles_select_selon_role"
on public.profiles
for select
to authenticated
using (public.viewer_can_see_profile(id, role));

-- 3. Colonnes lisibles : toutes sauf l'email (sinon un compte gratuit récupérerait les emails de
--    tous les profils visibles et contournerait la mise en relation). Les visiteurs non connectés
--    ne lisent plus aucun profil.
revoke select on public.profiles from anon, authenticated;

do $$
declare
  readable_columns text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
  into readable_columns
  from information_schema.columns
  where table_schema = 'public' and table_name = 'profiles' and column_name <> 'email';

  execute format('grant select (%s) on public.profiles to authenticated', readable_columns);
end;
$$;

-- 4. Nouvelle conversation : uniquement entre rôles complémentaires
--    (porteur de projet <-> talent, acheteur <-> vendeur). Reprend 2026-10-11-free-quotas.sql.
create or replace function public.enforce_contact_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  contacts_limit integer;
  used integer;
  initiator_role text;
  recipient_role text;
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.participant_a is distinct from auth.uid() then
    raise exception 'Une conversation doit être lancée par l''utilisateur connecté';
  end if;

  select role::text into initiator_role from public.profiles where id = new.participant_a;
  select role::text into recipient_role from public.profiles where id = new.participant_b;

  if not (
    (initiator_role = 'entrepreneur' and recipient_role = 'talent')
    or (initiator_role = 'talent' and recipient_role = 'entrepreneur')
    or (initiator_role = 'buyer' and recipient_role = 'seller')
    or (initiator_role = 'seller' and recipient_role = 'buyer')
  ) then
    raise exception 'ROLE_CONTACT_INTERDIT' using detail = 'Ce profil ne peut pas être contacté avec votre type de compte';
  end if;

  select limits.contacts_limit into contacts_limit from public.free_quota_limits(auth.uid()) limits;

  insert into public.usage_counters as counters (user_id, period, contacts)
  values (auth.uid(), public.current_quota_period(), 1)
  on conflict (user_id, period) do update set contacts = counters.contacts + 1
  returning counters.contacts into used;

  if contacts_limit is not null and used > contacts_limit then
    raise exception 'FREE_QUOTA_CONTACTS' using detail = format('Limite de %s nouveaux contacts par mois atteinte', contacts_limit);
  end if;

  return new;
end;
$$;

-- 5. Projets : visibles par leur propriétaire, par les talents (projets publiés) et par les admins.
--    Un porteur de projet ne voit pas les projets des autres porteurs de projet.
create or replace function public.viewer_can_see_project(project_owner uuid, project_active boolean)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when project_owner = auth.uid() then true
    else exists (
      select 1
      from public.profiles viewer
      where viewer.id = auth.uid()
        and (viewer.is_admin or (viewer.role::text = 'talent' and coalesce(project_active, false)))
    )
  end;
$$;

revoke all on function public.viewer_can_see_project(uuid, boolean) from public, anon;
grant execute on function public.viewer_can_see_project(uuid, boolean) to authenticated;

alter table public.projects enable row level security;

do $$
declare
  policy record;
begin
  for policy in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'projects' and cmd in ('SELECT', 'ALL')
  loop
    execute format('drop policy %I on public.projects', policy.policyname);
  end loop;
end;
$$;

create policy "projects_select_selon_role"
on public.projects
for select
to authenticated
using (public.viewer_can_see_project(owner_id, is_active));

revoke select on public.projects from anon;

-- Écriture des projets : si aucune règle n'existe encore (table sans RLS jusqu'ici), le propriétaire
-- garde le droit de créer, modifier et supprimer ses projets.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and cmd in ('INSERT', 'ALL')) then
    create policy "projects_insert_own" on public.projects for insert to authenticated with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and cmd in ('UPDATE', 'ALL')) then
    create policy "projects_update_own" on public.projects for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'projects' and cmd in ('DELETE', 'ALL')) then
    create policy "projects_delete_own" on public.projects for delete to authenticated using (owner_id = auth.uid());
  end if;
end;
$$;
