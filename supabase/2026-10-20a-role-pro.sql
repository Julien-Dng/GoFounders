-- Branche refonte-reprise. Nouveau rôle « pro » : experts-comptables, avocats, cabinets de cession.
-- À exécuter seul, avant 2026-10-20b-offres-reprise.sql : une nouvelle valeur d'énumération doit être
-- validée (commit) avant de pouvoir être utilisée.

alter type public.profile_role add value if not exists 'pro';
