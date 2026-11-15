-- Visibilité, prise de contact et accès confidentiel séparés (novembre 2026). À exécuter APRÈS 2026-11-16-favoris.sql.
-- Plan : docs/PLAN-COMPTE-MULTI-USAGES.md (« Visibilité et prise de contact »).
--
--   Consulter        : tout membre connecté voit les associés visibles et les projets publiés (visiteurs : vitrine anonyme).
--   Apparaître       : associé → case « Rendre mon profil visible » (associate_offered_at) ; projet → publié (is_active).
--   Vitrine publique : option en plus, seulement si l'on est visible (profiles.public_listing pour l'associé,
--                      projects.public_listing pour le projet).
--   Contacter        : porteur → associé visible, avec un projet présenté (titre, présentation ≥ 50 caractères, au moins
--                      une compétence recherchée), même en brouillon ; quota FREE inchangé (5 nouveaux contacts / mois).
--                      associé → porteur d'un projet publié, avec un profil d'associé complété (intitulé, au moins une
--                      compétence, présentation ≥ 50 caractères), même s'il n'est pas visible dans la recherche.
--                      Le destinataire peut toujours lire le profil (et le projet, brouillon compris) de qui lui écrit.
--   Confidentiel     : autorisation du porteur, inchangé.
--   Garde-fou        : 20 nouvelles conversations par jour et par membre, pour tous (PRO compris), contre les envois en masse.
-- Le réglage « Profil visible dans la recherche » (is_visible) ne sert plus qu'aux comptes pro (annuaire).
-- Offre et facturation : list_my_payments (historique de ses paiements).

begin;

-- 1. Minimums -------------------------------------------------------------------------------------------------------
create or replace function public.associate_profile_complete(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles profile
    where profile.id = target_user
      and profile.role::text <> 'pro'
      and length(btrim(coalesce(profile.title, ''))) > 0
      and cardinality(coalesce(profile.skills, '{}')) > 0
      and length(btrim(coalesce(profile.bio, ''))) >= 50
  );
$$;

create or replace function public.project_presented(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects project
    where project.owner_id = target_user
      and length(btrim(coalesce(project.name, ''))) > 0
      and length(btrim(coalesce(project.description, ''))) >= 50
      and cardinality(coalesce(project.skills_needed, '{}')) > 0
  );
$$;

revoke all on function public.associate_profile_complete(uuid) from public, anon;
revoke all on function public.project_presented(uuid) from public, anon;
grant execute on function public.associate_profile_complete(uuid) to authenticated;
grant execute on function public.project_presented(uuid) to authenticated;

-- Publier un projet exige le même minimum. Un membre est refusé (PROJET_INCOMPLET) ; une création côté serveur
-- (inscription) reste en brouillon tant que le projet n'est pas présenté. Les projets déjà publiés avant cette migration
-- restent en ligne ; leur porteur devra les compléter à la prochaine modification.
create or replace function public.enforce_project_minimum()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(new.is_active, false)
     and not (length(btrim(coalesce(new.name, ''))) > 0
              and length(btrim(coalesce(new.description, ''))) >= 50
              and cardinality(coalesce(new.skills_needed, '{}')) > 0) then
    if current_user in ('authenticated', 'anon') then
      raise exception 'PROJET_INCOMPLET' using detail = 'Pour publier, indiquez un titre, une présentation d''au moins 50 caractères et au moins une compétence recherchée';
    end if;
    if tg_op = 'INSERT' or not coalesce(old.is_active, false) then
      new.is_active := false;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_project_minimum on public.projects;
create trigger enforce_project_minimum
  before insert or update on public.projects
  for each row execute function public.enforce_project_minimum();

-- Proposer son profil d'associé exige un profil complété.
create or replace function public.set_associate_offer(p_offer boolean)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles%rowtype;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null then
    raise exception 'AUTH_REQUIRED';
  end if;
  if me.role::text = 'pro' then
    raise exception 'COMPTE_PRO';
  end if;

  if p_offer then
    if not public.associate_profile_complete(me.id) then
      raise exception 'PROFIL_ASSOCIE_INCOMPLET' using detail = 'Indiquez un intitulé, au moins une compétence et une présentation d''au moins 50 caractères';
    end if;
    update public.profiles set associate_offered_at = coalesce(associate_offered_at, now()) where id = me.id;
    perform public.add_profile_usage(me.id, 'associe');
  else
    update public.profiles set associate_offered_at = null, public_listing = false where id = me.id;
  end if;

  return (select associate_offered_at from public.profiles where id = me.id);
end;
$$;

-- 2. Vitrine du projet, distincte de celle du profil d'associé --------------------------------------------------------
alter table public.projects add column if not exists public_listing boolean not null default false;
grant select (public_listing), update (public_listing), insert (public_listing) on public.projects to authenticated;

update public.projects project set public_listing = true
from public.profiles owner
where owner.id = project.owner_id and owner.public_listing and project.is_active and not project.public_listing;

-- Vitrine seulement si l'on est visible : profil non proposé → pas de vitrine ; projet en brouillon → pas de vitrine.
create or replace function public.keep_listing_consistent()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_table_name = 'projects' then
    if not coalesce(new.is_active, false) then
      new.public_listing := false;
    end if;
  elsif new.associate_offered_at is null and new.role::text <> 'pro' then
    new.public_listing := false;
  end if;
  return new;
end;
$$;

drop trigger if exists keep_listing_consistent on public.projects;
create trigger keep_listing_consistent
  before insert or update on public.projects
  for each row execute function public.keep_listing_consistent();

drop trigger if exists keep_listing_consistent on public.profiles;
create trigger keep_listing_consistent
  before update of public_listing, associate_offered_at on public.profiles
  for each row execute function public.keep_listing_consistent();

-- 3. Reprise des membres qui avaient masqué leur profil : rien ne devient visible sans leur accord ---------------------
update public.profiles set associate_offered_at = null, public_listing = false
where role::text <> 'pro' and not coalesce(is_visible, true) and associate_offered_at is not null;

update public.projects project set is_active = false, public_listing = false
from public.profiles owner
where owner.id = project.owner_id and owner.role::text <> 'pro' and not coalesce(owner.is_visible, true) and project.is_active;

-- 4. Consulter ----------------------------------------------------------------------------------------------------------
create or replace function public.viewer_can_see_profile(target_id uuid, target_role profile_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then false
    when target_id = auth.uid() then true
    when target_role::text = 'pro' and public.is_listed_pro(target_id) then true
    else exists (
      select 1
      from public.profiles viewer
      where viewer.id = auth.uid()
        and (
          viewer.is_admin
          -- Qui écrit ou a écrit reste identifiable par son interlocuteur, visible dans la recherche ou non.
          or exists (
            select 1
            from public.conversations conversation
            where (conversation.participant_a = auth.uid() and conversation.participant_b = target_id)
               or (conversation.participant_b = auth.uid() and conversation.participant_a = target_id)
          )
          -- Tout membre voit les associés visibles et les porteurs d'un projet publié.
          or (target_role::text <> 'pro' and (public.is_associate(target_id) or public.has_published_project(target_id)))
        )
    )
  end;
$$;

-- Projet publié : tout membre. Brouillon : son porteur, les admins et les membres avec qui il est en conversation
-- (jamais la partie confidentielle, qui reste servie par get_project_confidential).
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
    when coalesce(project_active, false) then exists (select 1 from public.profiles where id = auth.uid())
    else public.viewer_is_admin() or exists (
      select 1 from public.conversations conversation
      where (conversation.participant_a = auth.uid() and conversation.participant_b = project_owner)
         or (conversation.participant_b = auth.uid() and conversation.participant_a = project_owner)
    )
  end;
$$;

-- 5. Contacter ----------------------------------------------------------------------------------------------------------
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
  project_ok boolean;
  listing_ok boolean;
  pro_ok boolean;
  initiator_is_owner_side boolean;
  associate_side boolean;
begin
  -- Membre connecté : il lance lui-même la conversation. Sans session (scripts, administration) : pas de contrôle,
  -- mais le contexte et l'entreprise sont tout de même renseignés.
  if auth.uid() is not null and new.participant_a is distinct from auth.uid() then
    raise exception 'Une conversation doit être lancée par l''utilisateur connecté';
  end if;

  select role::text into initiator_role from public.profiles where id = new.participant_a;
  select role::text into recipient_role from public.profiles where id = new.participant_b;

  -- Porteur → associé visible, avec un projet présenté (brouillon accepté).
  initiator_is_owner_side := initiator_role <> 'pro' and public.project_presented(new.participant_a) and public.is_associate(new.participant_b);
  -- Associé au profil complété (visible ou non) → porteur d'un projet publié.
  associate_side := public.associate_profile_complete(new.participant_a) and public.has_published_project(new.participant_b);
  project_ok := initiator_is_owner_side or associate_side;
  listing_ok := public.has_unlocked_contact(new.participant_a, new.participant_b)
    or public.has_unlocked_contact(new.participant_b, new.participant_a);
  pro_ok := (recipient_role = 'pro' and initiator_role <> 'pro' and public.is_listed_pro(new.participant_b))
    or (initiator_role = 'pro' and recipient_role <> 'pro' and public.has_active_pro_account(new.participant_a)
        and exists (select 1 from public.profiles where id = new.participant_b and 'reprise' = any(usages)));

  if new.context is null then
    new.context := case when project_ok then 'projet' when listing_ok then 'annonce' when pro_ok then 'pro' end;
  end if;

  if auth.uid() is null then
    if new.context = 'annonce' then
      select request.listing_id into new.listing_id
      from public.ma_access_requests request
      where request.contact_unlocked_at is not null
        and ((request.buyer_id = new.participant_a and request.owner_id = new.participant_b)
          or (request.buyer_id = new.participant_b and request.owner_id = new.participant_a))
      order by request.contact_unlocked_at desc
      limit 1;
    end if;
    return new;
  end if;

  -- Garde-fou contre les envois en masse, pour tous (ce n'est pas une limite d'offre).
  if (select count(*) from public.conversations
      where participant_a = auth.uid() and created_at > now() - interval '24 hours') >= 20 then
    raise exception 'LIMITE_CONTACTS_JOUR' using detail = 'Vous avez ouvert beaucoup de nouvelles conversations aujourd''hui. Réessayez demain';
  end if;

  if not coalesce(case new.context when 'projet' then project_ok when 'annonce' then listing_ok when 'pro' then pro_ok end, false) then
    if new.context = 'projet' or new.context is null then
      if public.is_associate(new.participant_b) and not public.project_presented(new.participant_a) then
        raise exception 'PROJET_INCOMPLET' using detail = 'Présentez votre projet (titre, présentation d''au moins 50 caractères, compétences recherchées) pour écrire à un associé';
      end if;
      if public.has_published_project(new.participant_b) and not public.associate_profile_complete(new.participant_a) then
        raise exception 'PROFIL_ASSOCIE_INCOMPLET' using detail = 'Complétez votre profil d''associé (intitulé, compétence, présentation) pour écrire à un porteur de projet';
      end if;
    end if;
    raise exception 'ROLE_CONTACT_INTERDIT' using detail = 'Ce membre ne peut pas être contacté : présentez un projet, complétez votre profil d''associé ou débloquez le dossier de son entreprise';
  end if;

  -- Annonce : rattache la conversation au dossier débloqué entre les deux membres (le plus récent).
  -- Toujours calculé ici : une valeur envoyée par le site est ignorée.
  new.listing_id := null;
  if new.context = 'annonce' then
    select request.listing_id into new.listing_id
    from public.ma_access_requests request
    where request.contact_unlocked_at is not null
      and ((request.buyer_id = new.participant_a and request.owner_id = new.participant_b)
        or (request.buyer_id = new.participant_b and request.owner_id = new.participant_a))
    order by request.contact_unlocked_at desc
    limit 1;
  end if;

  -- Quota FREE : nouveaux contacts ouverts par le porteur de projet (répondre reste gratuit, associés illimités).
  if new.context = 'projet' and initiator_is_owner_side and not associate_side then
    select limits.contacts_limit into contacts_limit from public.free_quota_limits(auth.uid()) limits;

    insert into public.usage_counters as counters (user_id, period, contacts)
    values (auth.uid(), public.current_quota_period(), 1)
    on conflict (user_id, period) do update set contacts = counters.contacts + 1
    returning counters.contacts into used;

    if contacts_limit is not null and used > contacts_limit then
      raise exception 'FREE_QUOTA_CONTACTS' using detail = format('Limite de %s nouveaux contacts par mois atteinte', contacts_limit);
    end if;
  end if;

  return new;
end;
$$;

create index if not exists conversations_initiator_created_idx on public.conversations (participant_a, created_at desc);

-- Demande d'accès à la partie confidentielle : profil d'associé complété, visible ou non.
do $$
declare
  def text := pg_get_functiondef('public.request_project_access'::regproc);
begin
  def := replace(def, 'not public.is_associate(requester.id)', 'not public.associate_profile_complete(requester.id)');
  def := replace(def, 'Complétez votre profil d''''associé (compétences) pour demander', 'Complétez votre profil d''''associé (intitulé, compétence, présentation) pour demander');
  execute def;
end;
$$;

-- 6. Vitrine publique : visible + case vitrine, sans le réglage is_visible -------------------------------------------
create or replace function public.list_public_marketplace()
 RETURNS TABLE(kind text, profile_id uuid, title text, skills text[], availability text, sector text, stage text, looking_for text[], nda_required boolean, open_to_equity boolean, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  (
    select 'talent'::text, profile.id, nullif(btrim(profile.title), ''), coalesce(profile.skills, '{}'),
           nullif(btrim(profile.availability_label), ''), null::text, null::text, null::text[],
           null::boolean, null::boolean, profile.updated_at
    from public.profiles profile
    where profile.associate_offered_at is not null
      and profile.role::text <> 'pro'
      and profile.public_listing
      and (nullif(btrim(profile.title), '') is not null or cardinality(coalesce(profile.skills, '{}')) > 0)
    order by profile.updated_at desc
    limit 60
  )
  union all
  (
    select 'project'::text, owner.id, null::text, coalesce(project.skills_needed, '{}'),
           null::text, nullif(btrim(project.sector), ''), nullif(btrim(project.stage), ''), coalesce(project.looking_for, '{}'),
           coalesce(project.nda_required, false), coalesce(project.open_to_equity, false), owner.updated_at
    from public.projects project
    join public.profiles owner on owner.id = project.owner_id
    where project.is_active
      and project.public_listing
      and owner.role::text <> 'pro'
    order by owner.updated_at desc
    limit 60
  );
$function$;

-- 7. Offre et facturation : historique de ses propres paiements (libellé d'entreprise anonymisé) -------------------
create or replace function public.list_my_payments()
returns table (id uuid, product text, amount_cents integer, created_at timestamptz, listing_id uuid, listing_title text)
language sql
stable
security definer
set search_path = public
as $$
  select payment.id, payment.product, payment.amount_cents, payment.created_at, payment.listing_id,
         case when listing.id is null then null
              else coalesce(nullif(listing.public_title, ''), listing.sector || ', ' || listing.region) end
  from public.payments payment
  left join public.ma_listings listing on listing.id = payment.listing_id
  where payment.user_id = auth.uid()
  order by payment.created_at desc
  limit 100;
$$;

revoke all on function public.list_my_payments() from public, anon;
grant execute on function public.list_my_payments() to authenticated;

commit;
