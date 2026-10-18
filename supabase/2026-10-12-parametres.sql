-- Paramètres du compte. À exécuter après 2026-10-12-profils-par-role.sql.
--   - Visibilité du profil : un profil masqué n'apparaît plus dans la recherche ; il reste visible
--     par lui-même, par ses interlocuteurs de conversation et par les admins.
--   - Suppression du compte (RGPD, droit à l'effacement) : supprime toutes les données de
--     l'utilisateur, puis son compte de connexion.

-- 1. Visibilité.
alter table public.profiles add column if not exists is_visible boolean not null default true;

grant select (is_visible), update (is_visible) on public.profiles to authenticated;

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
          or exists (
            select 1
            from public.conversations conversation
            where (conversation.participant_a = auth.uid() and conversation.participant_b = target_id)
               or (conversation.participant_b = auth.uid() and conversation.participant_a = target_id)
          )
          or (
            -- Rôle complémentaire, uniquement si le profil est visible.
            coalesce((select target.is_visible from public.profiles target where target.id = target_id), true)
            and (
              (viewer.role::text = 'entrepreneur' and target_role::text = 'talent')
              or (viewer.role::text = 'talent' and target_role::text = 'entrepreneur')
            )
          )
        )
    )
  end;
$$;

-- 2. Suppression du compte par l'utilisateur lui-même.
--    Les conversations (et leurs messages) sont supprimées aussi pour l'interlocuteur.
--    Les photos de profil stockées dans Supabase Storage ne sont pas supprimées par cette fonction.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Connexion requise';
  end if;

  delete from public.messages
  where sender_id = me
     or conversation_id in (
       select id from public.conversations where participant_a = me or participant_b = me
     );
  delete from public.conversations where participant_a = me or participant_b = me;
  delete from public.notifications where user_id = me;
  delete from public.usage_counters where user_id = me;
  delete from public.ma_listings where owner_id = me;
  delete from public.projects where owner_id = me;
  delete from public.profiles where id = me;
  delete from auth.users where id = me;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
