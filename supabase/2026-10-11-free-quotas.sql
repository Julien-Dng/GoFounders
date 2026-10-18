-- Quotas du plan FREE sur la marketplace Talents & Associés, vérifiés côté base :
--   - 3 contacts par mois  = 3 nouvelles conversations lancées par l'utilisateur ;
--   - 5 messages par mois  = 5 messages envoyés.
-- S'applique aux porteurs de projet et talents en FREE. Acheteurs et vendeurs (verticale M&A,
-- accès one-shot) et plans PRO / PREMIUM ne sont pas limités.
-- Le mois est le mois civil à l'heure de Paris. À exécuter après 2026-10-11-ma-access.sql.

-- 1. Compteurs mensuels : incrémentés à chaque envoi, jamais décrémentés (supprimer un message
--    ne rend pas de quota).
create table if not exists public.usage_counters (
  user_id uuid not null references public.profiles (id) on delete cascade,
  period date not null,
  contacts integer not null default 0,
  messages integer not null default 0,
  primary key (user_id, period)
);

alter table public.usage_counters enable row level security;

revoke all on public.usage_counters from anon, authenticated;
grant select on public.usage_counters to authenticated;

drop policy if exists "usage_counters_select_own" on public.usage_counters;
create policy "usage_counters_select_own"
on public.usage_counters
for select
to authenticated
using (user_id = auth.uid());

-- 2. Limites selon le profil : null = illimité.
create or replace function public.free_quota_limits(target_user uuid, out contacts_limit integer, out messages_limit integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    case when limited then 3 end,
    case when limited then 5 end
  from (
    select coalesce(profile.plan::text = 'FREE' and profile.role::text in ('entrepreneur', 'talent'), false) as limited
    from public.profiles profile
    where profile.id = target_user
  ) limits;
$$;

create or replace function public.current_quota_period()
returns date
language sql
stable
as $$
  select date_trunc('month', now() at time zone 'Europe/Paris')::date;
$$;

-- 3. Nouvelle conversation = un contact. L'initiateur est toujours participant_a.
create or replace function public.enforce_contact_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  contacts_limit integer;
  used integer;
begin
  -- Ignoré pour les fonctions serveur et le service_role.
  if auth.uid() is null then
    return new;
  end if;

  if new.participant_a is distinct from auth.uid() then
    raise exception 'Une conversation doit être lancée par l''utilisateur connecté';
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

drop trigger if exists enforce_contact_quota on public.conversations;

create trigger enforce_contact_quota
before insert on public.conversations
for each row
execute function public.enforce_contact_quota();

-- 4. Message envoyé = un message du quota.
create or replace function public.enforce_message_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  messages_limit integer;
  used integer;
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.sender_id is distinct from auth.uid() or not exists (
    select 1
    from public.conversations conversation
    where conversation.id = new.conversation_id
      and auth.uid() in (conversation.participant_a, conversation.participant_b)
  ) then
    raise exception 'Message refusé : expéditeur invalide pour cette conversation';
  end if;

  select limits.messages_limit into messages_limit from public.free_quota_limits(auth.uid()) limits;

  insert into public.usage_counters as counters (user_id, period, messages)
  values (auth.uid(), public.current_quota_period(), 1)
  on conflict (user_id, period) do update set messages = counters.messages + 1
  returning counters.messages into used;

  if messages_limit is not null and used > messages_limit then
    raise exception 'FREE_QUOTA_MESSAGES' using detail = format('Limite de %s messages par mois atteinte', messages_limit);
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_message_quota on public.messages;

create trigger enforce_message_quota
before insert on public.messages
for each row
execute function public.enforce_message_quota();

-- 5. Consommation du mois en cours, pour les compteurs affichés dans l'appli.
drop function if exists public.get_my_quota();

create function public.get_my_quota()
returns table (
  period date,
  contacts_used integer,
  contacts_limit integer,
  messages_used integer,
  messages_limit integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    public.current_quota_period(),
    coalesce(counters.contacts, 0),
    limits.contacts_limit,
    coalesce(counters.messages, 0),
    limits.messages_limit
  from public.free_quota_limits(auth.uid()) limits
  left join public.usage_counters counters
    on counters.user_id = auth.uid()
   and counters.period = public.current_quota_period()
  where auth.uid() is not null;
$$;

revoke all on function public.free_quota_limits(uuid) from public, anon, authenticated;
revoke all on function public.get_my_quota() from public, anon;
grant execute on function public.get_my_quota() to authenticated;
