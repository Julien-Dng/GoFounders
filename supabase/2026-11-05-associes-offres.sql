-- Offres « Associés & équipe » (novembre 2026) : 5 nouveaux contacts par mois pour un porteur de projet
-- en formule gratuite (au lieu de 3). Le prix de PRO (29 €/mois) est défini côté back (backend/app/payments.py)
-- et côté site (src/app/core/config/offers.ts) : rien à changer ici. Les abonnements déjà souscrits gardent leur prix.
-- À exécuter après les migrations précédentes. Idempotent.

create or replace function public.free_quota_limits(target_user uuid, out contacts_limit integer, out messages_limit integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    case when limited then 5 end,
    null::integer
  from (
    select coalesce(profile.plan::text = 'FREE' and profile.role::text = 'entrepreneur', false) as limited
    from public.profiles profile
    where profile.id = target_user
  ) limits;
$$;

revoke all on function public.free_quota_limits(uuid) from public, anon, authenticated;
