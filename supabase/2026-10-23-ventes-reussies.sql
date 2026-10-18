-- GoFounders : ventes réussies affichées en témoignages (prix de vente compris, si le vendeur l'accepte).
-- À exécuter après 2026-10-21-moderation-verification-stats.sql. Rejouable.
--
-- Le vendeur déclare la vente de son annonce (« J'ai vendu ») : prix, affichage du prix (exact, fourchette
-- ou masqué), témoignage, signature et consentement explicite. L'annonce passe en « vendue ».
-- Rien n'est public avant la validation d'un admin. Le prix exact n'est jamais renvoyé au public s'il a
-- choisi la fourchette ou le masquage. Le vendeur peut retirer son témoignage à tout moment.

create table if not exists public.ma_success_stories (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null unique references public.ma_listings(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  sale_price numeric not null check (sale_price > 0),
  price_display text not null default 'range' check (price_display in ('exact', 'range', 'hidden')),
  months_to_sell integer check (months_to_sell >= 0),
  quote text not null check (char_length(quote) between 20 and 600),
  author_label text not null check (char_length(author_label) between 2 and 60),
  consent_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

alter table public.ma_success_stories enable row level security;
revoke all on public.ma_success_stories from anon, authenticated;
grant select on public.ma_success_stories to authenticated;

drop policy if exists "ma_success_stories_select" on public.ma_success_stories;

create policy "ma_success_stories_select"
on public.ma_success_stories
for select
to authenticated
using (owner_id = auth.uid() or public.viewer_is_admin());

-- Fourchette affichée à la place du prix exact.
create or replace function public.sale_price_range(price numeric)
returns text
language sql
immutable
as $$
  select case
    when price < 50000 then 'Moins de 50 k€'
    when price < 100000 then '50 à 100 k€'
    when price < 250000 then '100 à 250 k€'
    when price < 500000 then '250 à 500 k€'
    when price < 1000000 then '500 k€ à 1 M€'
    else 'Plus de 1 M€'
  end;
$$;

drop function if exists public.submit_success_story(uuid, numeric, text, text, text, boolean);

create function public.submit_success_story(
  p_listing_id uuid,
  p_sale_price numeric,
  p_price_display text,
  p_quote text,
  p_author_label text,
  p_consent boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  listing record;
  story_id uuid;
  quote text := btrim(coalesce(p_quote, ''));
  label text := btrim(coalesce(p_author_label, ''));
begin
  if me is null then
    raise exception 'Connexion requise';
  end if;

  select ma.id, ma.owner_id, ma.sector, ma.created_at, ma.withdrawn_by_admin
  into listing
  from public.ma_listings ma
  where ma.id = p_listing_id
  for update;

  if listing.id is null or listing.owner_id is distinct from me then
    raise exception 'Annonce introuvable';
  end if;

  if listing.withdrawn_by_admin then
    raise exception 'Annonce retirée par la modération : contactez l''équipe GoFounders';
  end if;

  if not coalesce(p_consent, false) then
    raise exception 'Votre accord est nécessaire pour publier ce témoignage';
  end if;

  if p_sale_price is null or p_sale_price <= 0 then
    raise exception 'Indiquez le prix de vente';
  end if;

  if p_price_display not in ('exact', 'range', 'hidden') then
    raise exception 'Choix d''affichage du prix inconnu';
  end if;

  if char_length(quote) < 20 then
    raise exception 'Votre témoignage doit faire au moins 20 caractères';
  end if;

  if char_length(label) < 2 then
    raise exception 'Indiquez comment signer le témoignage (ex. « Julie, fondatrice »)';
  end if;

  if exists (select 1 from public.ma_success_stories where listing_id = p_listing_id) then
    raise exception 'Un témoignage existe déjà pour cette annonce';
  end if;

  update public.ma_listings set status = 'sold' where id = p_listing_id;

  insert into public.ma_success_stories (listing_id, owner_id, sale_price, price_display, months_to_sell, quote, author_label, consent_at)
  values (
    p_listing_id, me, p_sale_price, p_price_display,
    greatest(0, (extract(year from age(now(), listing.created_at)) * 12 + extract(month from age(now(), listing.created_at)))::integer),
    left(quote, 600), left(label, 60), now()
  )
  returning id into story_id;

  insert into public.notifications (user_id, title, body, link_url)
  select admin.id, 'Vente à valider : ' || listing.sector, 'Un vendeur a déclaré la vente de son annonce et propose un témoignage.', '/admin/temoignages'
  from public.profiles admin
  where admin.is_admin;

  return story_id;
end;
$$;

revoke all on function public.submit_success_story(uuid, numeric, text, text, text, boolean) from public, anon;
grant execute on function public.submit_success_story(uuid, numeric, text, text, text, boolean) to authenticated;

-- Retrait du témoignage par son auteur (l'annonce reste « vendue »).
drop function if exists public.delete_my_success_story(uuid);

create function public.delete_my_success_story(p_story_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.ma_success_stories where id = p_story_id and owner_id = auth.uid();

  if not found then
    raise exception 'Témoignage introuvable';
  end if;
end;
$$;

revoke all on function public.delete_my_success_story(uuid) from public, anon;
grant execute on function public.delete_my_success_story(uuid) to authenticated;

-- Liste publique : uniquement les témoignages validés, prix selon le choix du vendeur.
drop function if exists public.list_success_stories(integer);

create function public.list_success_stories(p_limit integer default 6)
returns table (
  id uuid,
  sector text,
  region text,
  type text,
  price_exact numeric,
  price_range text,
  months_to_sell integer,
  quote text,
  author_label text,
  sold_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    story.id, listing.sector, listing.region, listing.type::text,
    case when story.price_display = 'exact' then story.sale_price end,
    case when story.price_display = 'range' then public.sale_price_range(story.sale_price) end,
    story.months_to_sell, story.quote, story.author_label, story.created_at
  from public.ma_success_stories story
  join public.ma_listings listing on listing.id = story.listing_id
  where story.status = 'approved'
  order by story.decided_at desc nulls last
  limit least(greatest(coalesce(p_limit, 6), 1), 24);
$$;

revoke all on function public.list_success_stories(integer) from public;
grant execute on function public.list_success_stories(integer) to anon, authenticated;

-- Compteur public des ventes conclues (annonces passées en « vendue »).
drop function if exists public.count_completed_sales();

create function public.count_completed_sales()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint from public.ma_listings where status = 'sold';
$$;

revoke all on function public.count_completed_sales() from public;
grant execute on function public.count_completed_sales() to anon, authenticated;

-- Validation par un admin.
drop function if exists public.admin_list_success_stories();

create function public.admin_list_success_stories()
returns table (
  id uuid,
  listing_id uuid,
  owner_name text,
  sector text,
  region text,
  price_min numeric,
  price_max numeric,
  sale_price numeric,
  price_display text,
  months_to_sell integer,
  quote text,
  author_label text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.viewer_is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;

  return query
  select story.id, story.listing_id, owner.display_name, listing.sector, listing.region,
         listing.price_min::numeric, listing.price_max::numeric, story.sale_price, story.price_display,
         story.months_to_sell, story.quote, story.author_label, story.created_at
  from public.ma_success_stories story
  join public.ma_listings listing on listing.id = story.listing_id
  left join public.profiles owner on owner.id = story.owner_id
  where story.status = 'pending'
  order by story.created_at;
end;
$$;

revoke all on function public.admin_list_success_stories() from public, anon;
grant execute on function public.admin_list_success_stories() to authenticated;

drop function if exists public.decide_success_story(uuid, boolean, text);

create function public.decide_success_story(p_story_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  story record;
  note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.viewer_is_admin() then
    raise exception 'Réservé aux administrateurs';
  end if;

  select * into story from public.ma_success_stories where id = p_story_id for update;

  if story.id is null or story.status <> 'pending' then
    raise exception 'Témoignage introuvable ou déjà traité';
  end if;

  if not p_approve and note is null then
    raise exception 'Indiquez le motif du refus (il est envoyé au vendeur)';
  end if;

  update public.ma_success_stories
  set status = case when p_approve then 'approved' else 'rejected' end,
      admin_note = left(note, 500),
      decided_at = now()
  where id = p_story_id;

  insert into public.notifications (user_id, title, body, link_url)
  values (
    story.owner_id,
    case when p_approve then 'Votre vente est publiée' else 'Témoignage non publié' end,
    case when p_approve then 'Merci ! Votre témoignage apparaît dans les ventes réussies.' else left('Motif : ' || note, 300) end,
    '/ma'
  );
end;
$$;

revoke all on function public.decide_success_story(uuid, boolean, text) from public, anon;
grant execute on function public.decide_success_story(uuid, boolean, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.ma_success_stories to service_role;
  end if;
end;
$$;
