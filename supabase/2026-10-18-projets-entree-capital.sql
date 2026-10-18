-- Projets : le porteur peut indiquer qu'il est ouvert à un associé qui entrerait au capital avec un apport.
-- À exécuter après 2026-10-12-profils-par-role.sql.
--
-- Simple indication (oui / non) : aucun montant, pourcentage ni valorisation n'est stocké ou affiché.
-- Les conditions se négocient en privé entre les parties. GoFounders ne propose pas d'investissement :
-- afficher des offres chiffrées relèverait du financement participatif, soumis à agrément AMF.

alter table public.projects
  add column if not exists open_to_equity boolean not null default false;
