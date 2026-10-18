-- GoFounders (branche refonte-reprise) : à exécuter après 2026-10-20b-offres-reprise.sql et
-- 2026-10-21-moderation-verification-stats.sql (venue de V6). Rejouable.
--
-- 1. Dossier complet : 2026-10-21 redéfinit get_ma_listing_detail sans l'accès anticipé de 48 h des
--    repreneurs Plus. On réunit ici les deux règles (annonce active + accès anticipé).
-- 2. Statistiques des professionnels : vues de leur fiche et clics vers leur site depuis l'annuaire.

-- 1. Dossier complet.
create or replace function public.get_ma_listing_detail(listing_id uuid)
returns setof public.ma_listings
language sql
stable
security definer
set search_path = public
as $$
  select listing.*
  from public.ma_listings listing
  where listing.id = listing_id
    and (
      listing.owner_id = auth.uid()
      or public.viewer_is_admin()
      or (
        listing.status = 'active'
        and exists (
          select 1
          from public.profiles profile
          where profile.id = auth.uid()
            and profile.role::text = 'buyer'
            and public.has_active_ma_access(profile.id)
            and (listing.created_at <= now() - interval '48 hours' or public.has_buyer_plus(profile.id))
        )
      )
    );
$$;

revoke all on function public.get_ma_listing_detail(uuid) from public, anon;
grant execute on function public.get_ma_listing_detail(uuid) to authenticated;

-- 2. Statistiques des professionnels.
create table if not exists public.pro_profile_daily_stats (
  pro_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default current_date,
  profile_views integer not null default 0,
  website_clicks integer not null default 0,
  primary key (pro_id, day)
);

-- Un événement par membre connecté, par jour et par type.
create table if not exists public.pro_profile_viewers (
  pro_id uuid not null references public.profiles(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  day date not null default current_date,
  kind text not null check (kind in ('profile', 'website')),
  primary key (pro_id, viewer_id, day, kind)
);

alter table public.pro_profile_daily_stats enable row level security;
alter table public.pro_profile_viewers enable row level security;
revoke all on public.pro_profile_daily_stats from anon, authenticated;
revoke all on public.pro_profile_viewers from anon, authenticated;

drop function if exists public.record_pro_profile_event(uuid, text);

-- 'profile' : ouverture de la fiche (/profil/:id) ; 'website' : clic vers le site depuis l'annuaire (public).
-- Seuls les pros présents dans l'annuaire sont comptés ; le pro lui-même et les admins ne le sont pas.
create function public.record_pro_profile_event(p_pro_id uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  inserted integer;
begin
  if p_kind not in ('profile', 'website') or p_pro_id is null or p_pro_id = me then
    return;
  end if;

  if not public.is_listed_pro(p_pro_id) or public.viewer_is_admin() then
    return;
  end if;

  if me is null and p_kind = 'profile' then
    return;
  end if;

  if me is not null then
    insert into public.pro_profile_viewers (pro_id, viewer_id, kind)
    values (p_pro_id, me, p_kind)
    on conflict do nothing;

    get diagnostics inserted = row_count;

    if inserted = 0 then
      return;
    end if;
  end if;

  insert into public.pro_profile_daily_stats (pro_id, profile_views, website_clicks)
  values (p_pro_id, case when p_kind = 'profile' then 1 else 0 end, case when p_kind = 'website' then 1 else 0 end)
  on conflict (pro_id, day) do update
  set profile_views = pro_profile_daily_stats.profile_views + excluded.profile_views,
      website_clicks = pro_profile_daily_stats.website_clicks + excluded.website_clicks;
end;
$$;

revoke all on function public.record_pro_profile_event(uuid, text) from public;
grant execute on function public.record_pro_profile_event(uuid, text) to anon, authenticated;

drop function if exists public.get_my_pro_stats(integer);

create function public.get_my_pro_stats(p_days integer default 30)
returns table (
  is_listed boolean,
  profile_views_total bigint,
  profile_views_period bigint,
  website_clicks_total bigint,
  website_clicks_period bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_listed_pro(auth.uid()),
    coalesce(sum(stats.profile_views), 0)::bigint,
    coalesce(sum(stats.profile_views) filter (where stats.day > current_date - greatest(p_days, 1)), 0)::bigint,
    coalesce(sum(stats.website_clicks), 0)::bigint,
    coalesce(sum(stats.website_clicks) filter (where stats.day > current_date - greatest(p_days, 1)), 0)::bigint
  from public.pro_profile_daily_stats stats
  where stats.pro_id = auth.uid();
$$;

revoke all on function public.get_my_pro_stats(integer) from public, anon;
grant execute on function public.get_my_pro_stats(integer) to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.pro_profile_daily_stats, public.pro_profile_viewers to service_role;
  end if;
end;
$$;
