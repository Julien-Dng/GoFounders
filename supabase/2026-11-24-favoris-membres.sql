-- Favoris de projets et d'associés (novembre 2026). À exécuter APRÈS 2026-11-17-visibilite-contact.sql.
-- Avec listing_favorites (entreprises, 2026-11-16-favoris.sql), ils forment la page « Mes favoris ».
--
-- Un membre enregistre un projet publié ou un associé visible. Ses favoris ne sont lisibles que par lui : la personne
-- enregistrée n'en sait rien. Un favori n'ouvre aucun droit (lire un profil ou écrire suit les règles habituelles) et
-- disparaît de la liste quand le projet repasse en brouillon ou que l'associé n'est plus visible.

begin;

create table if not exists public.member_favorites (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('project', 'associate')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, target_id)
);

alter table public.member_favorites enable row level security;

drop policy if exists member_favorites_select_own on public.member_favorites;
create policy member_favorites_select_own on public.member_favorites
  for select to authenticated using (user_id = auth.uid());

-- On n'enregistre que ce qu'on peut voir : projet publié, associé visible (jamais soi-même).
drop policy if exists member_favorites_insert_own on public.member_favorites;
create policy member_favorites_insert_own on public.member_favorites
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and case kind
      when 'project' then exists (select 1 from public.projects project where project.id = target_id and project.is_active and project.owner_id <> auth.uid())
      when 'associate' then target_id <> auth.uid() and public.is_associate(target_id)
      else false
    end
  );

drop policy if exists member_favorites_delete_own on public.member_favorites;
create policy member_favorites_delete_own on public.member_favorites
  for delete to authenticated using (user_id = auth.uid());

revoke all on public.member_favorites from anon, authenticated;
grant select (user_id, kind, target_id, created_at), insert (user_id, kind, target_id), delete on public.member_favorites to authenticated;

-- 200 au plus par membre et par type.
create or replace function public.limit_member_favorites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select count(*) from public.member_favorites where user_id = new.user_id and kind = new.kind) >= 200 then
    raise exception 'FAVORIS_LIMITE';
  end if;
  return new;
end;
$$;

drop trigger if exists limit_member_favorites on public.member_favorites;
create trigger limit_member_favorites
  before insert on public.member_favorites
  for each row execute function public.limit_member_favorites();

-- Mes favoris encore visibles (projet publié, associé visible), du plus récent au plus ancien.
create or replace function public.list_my_member_favorites()
returns table (kind text, target_id uuid, favorited_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select favorite.kind, favorite.target_id, favorite.created_at
  from public.member_favorites favorite
  where favorite.user_id = auth.uid()
    and case favorite.kind
      when 'project' then exists (select 1 from public.projects project where project.id = favorite.target_id and project.is_active)
      else public.is_associate(favorite.target_id)
    end
  order by favorite.created_at desc;
$$;

revoke all on function public.list_my_member_favorites() from public, anon;
grant execute on function public.list_my_member_favorites() to authenticated;

commit;
