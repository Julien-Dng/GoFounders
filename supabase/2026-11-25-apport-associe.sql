-- Apport de l'associé (novembre 2026). À exécuter APRÈS 2026-11-24-favoris-membres.sql.
--
-- Miroir de projects.open_to_equity côté associé : « Êtes-vous prêt à entrer au capital avec un apport ? ».
-- yes = prêt à investir, discuss = à discuter, no = non ; null = non précisé. Aucun montant n'est demandé.
-- Visible des membres qui peuvent lire le profil (règles habituelles), jamais sur la vitrine publique
-- (list_public_marketplace ne renvoie pas cette colonne). Modifiable seulement par le membre lui-même.

begin;

alter table public.profiles add column if not exists investment_readiness text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_investment_readiness_valide') then
    alter table public.profiles add constraint profiles_investment_readiness_valide
      check (investment_readiness is null or investment_readiness in ('yes', 'discuss', 'no'));
  end if;
end;
$$;

grant select (investment_readiness), update (investment_readiness) on public.profiles to authenticated;

commit;
