-- Anti-abus de l'essai gratuit des offres professionnelles (novembre 2026).
-- Un essai déjà accordé est mémorisé par l'empreinte de l'adresse e-mail (SHA-256, jamais l'adresse en clair) et
-- par l'empreinte de la carte bancaire fournie par Stripe (identique pour une même carte, sans donnée de carte).
-- La table n'est pas liée au compte : elle survit à la suppression du compte, pour qu'un nouveau compte n'obtienne
-- pas un second essai. Aucun accès depuis l'appli ; seul le back Python (clé service_role) la lit et l'écrit.
-- À exécuter après 2026-10-24-paiements-stripe.sql. Idempotent.

create table if not exists public.pro_trial_claims (
  id uuid primary key default gen_random_uuid(),
  email_hash text,
  card_fingerprint text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

create index if not exists pro_trial_claims_email_idx on public.pro_trial_claims (email_hash);
create index if not exists pro_trial_claims_card_idx on public.pro_trial_claims (card_fingerprint);

alter table public.pro_trial_claims enable row level security;
revoke all on public.pro_trial_claims from anon, authenticated;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant select, insert on public.pro_trial_claims to service_role;
  end if;
end;
$$;
