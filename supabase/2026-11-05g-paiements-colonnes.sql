-- Réparation de la table payments (novembre 2026).
-- Si une table payments existait avant 2026-10-24-paiements-stripe.sql, « create table if not exists » l'a laissée
-- telle quelle : il lui manque alors des colonnes (listing_id...) et le webhook Stripe échoue à chaque paiement,
-- sans accorder les droits. Ce script ajoute ce qui manque, sans rien supprimer. Idempotent.

alter table public.payments add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.payments add column if not exists product text;
alter table public.payments add column if not exists listing_id uuid references public.ma_listings(id) on delete set null;
alter table public.payments add column if not exists stripe_session_id text;
alter table public.payments add column if not exists stripe_subscription_id text;
alter table public.payments add column if not exists amount_cents integer;
alter table public.payments add column if not exists created_at timestamptz not null default now();

-- Un paiement Stripe n'est appliqué qu'une fois (apply_purchase s'appuie sur cette unicité).
create unique index if not exists payments_stripe_session_id_key on public.payments (stripe_session_id);

-- Les anciennes colonnes obligatoires sans valeur par défaut bloqueraient l'enregistrement : elles deviennent facultatives.
do $$
declare
  col record;
begin
  for col in
    select column_name
    from information_schema.columns
    where table_schema = 'public' and table_name = 'payments'
      and is_nullable = 'NO' and column_default is null
      and column_name not in ('id')
  loop
    execute format('alter table public.payments alter column %I drop not null', col.column_name);
  end loop;
end;
$$;

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant all on public.payments to service_role;
  end if;
end;
$$;
