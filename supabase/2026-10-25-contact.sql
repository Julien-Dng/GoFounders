-- GoFounders (refonte-reprise) : formulaire de contact (visiteurs et membres) et boîte de réception admin.
-- À exécuter après 2026-10-24-paiements-stripe.sql. Rejouable.
--
-- Les messages ne sont jamais lisibles ni modifiables directement : envoi par send_contact_message
-- (ouverte aux visiteurs, avec limites anti-abus), lecture et suivi par les admins via des fonctions.
-- La page /admin/messages réunit aussi les demandes PREMIUM (premium_requests), jusqu'ici sans écran de lecture.

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text not null,
  topic text not null check (topic in ('question', 'cession', 'reprise', 'paiement', 'probleme', 'partenariat', 'autre')),
  message text not null,
  status text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_email_idx on public.contact_messages (lower(email), created_at desc);

alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from anon, authenticated;

-- Envoi d'un message. Limites : 3 messages par adresse email par heure, 300 messages par jour au total
-- (au-delà, le formulaire est suspendu jusqu'au lendemain plutôt que de laisser remplir la table).
drop function if exists public.send_contact_message(text, text, text, text);

create function public.send_contact_message(p_name text, p_email text, p_topic text, p_message text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_email text := lower(btrim(coalesce(p_email, '')));
  clean_name text := left(btrim(coalesce(p_name, '')), 120);
  clean_message text := left(btrim(coalesce(p_message, '')), 3000);
begin
  if length(clean_name) < 2 then
    raise exception 'NOM_REQUIS';
  end if;

  if clean_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(clean_email) > 200 then
    raise exception 'EMAIL_INVALIDE';
  end if;

  if p_topic not in ('question', 'cession', 'reprise', 'paiement', 'probleme', 'partenariat', 'autre') then
    raise exception 'SUJET_INVALIDE';
  end if;

  if length(clean_message) < 20 then
    raise exception 'MESSAGE_TROP_COURT';
  end if;

  if (select count(*) from public.contact_messages where lower(email) = clean_email and created_at > now() - interval '1 hour') >= 3 then
    raise exception 'TROP_DE_MESSAGES';
  end if;

  if (select count(*) from public.contact_messages where created_at > now() - interval '1 day') >= 300 then
    raise exception 'FORMULAIRE_SATURE';
  end if;

  insert into public.contact_messages (user_id, name, email, topic, message)
  values (auth.uid(), clean_name, clean_email, p_topic, clean_message);

  insert into public.notifications (user_id, title, body, link_url)
  select profile.id, 'Nouveau message de contact', left(clean_name || ' : ' || clean_message, 300), '/admin/messages'
  from public.profiles profile
  where profile.is_admin;
end;
$$;

revoke all on function public.send_contact_message(text, text, text, text) from public;
grant execute on function public.send_contact_message(text, text, text, text) to anon, authenticated;

-- Boîte de réception admin : messages de contact et demandes PREMIUM, les plus récents d'abord.
drop function if exists public.admin_list_inbox(integer);

create function public.admin_list_inbox(p_limit integer default 200)
returns table (
  kind text,
  id uuid,
  name text,
  email text,
  phone text,
  role text,
  topic text,
  message text,
  status text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.viewer_is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  return query
  select * from (
    select 'contact'::text, contact.id, contact.name, contact.email, null::text, null::text,
           contact.topic, contact.message, contact.status, contact.created_at
    from public.contact_messages contact
    union all
    select 'premium'::text, request.id, request.display_name, auth_user.email::text, request.phone, request.role,
           request.topic, request.message, request.status, request.created_at
    from public.premium_requests request
    left join auth.users auth_user on auth_user.id = request.user_id
  ) inbox
  order by inbox.created_at desc
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
end;
$$;

revoke all on function public.admin_list_inbox(integer) from public, anon;
grant execute on function public.admin_list_inbox(integer) to authenticated;

drop function if exists public.admin_set_inbox_status(text, uuid, text);

create function public.admin_set_inbox_status(p_kind text, p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.viewer_is_admin() then
    raise exception 'Accès réservé aux administrateurs';
  end if;

  if p_status not in ('new', 'contacted', 'closed') then
    raise exception 'Statut inconnu : %', p_status;
  end if;

  if p_kind = 'contact' then
    update public.contact_messages set status = p_status where id = p_id;
  elsif p_kind = 'premium' then
    update public.premium_requests set status = p_status where id = p_id;
  else
    raise exception 'Type inconnu : %', p_kind;
  end if;
end;
$$;

revoke all on function public.admin_set_inbox_status(text, uuid, text) from public, anon;
grant execute on function public.admin_set_inbox_status(text, uuid, text) to authenticated;
