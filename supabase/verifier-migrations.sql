-- Indique quelles migrations récentes (V6 depuis le 18 octobre, puis refonte-reprise) sont déjà passées dans cette base.
-- À lancer dans le SQL Editor de Supabase : lecture seule, ne modifie rien.
-- Ensuite, exécuter dans l'ordre toutes les migrations à partir de la première marquée « à exécuter ».

select migration, case when passee then 'déjà passée' else 'À EXÉCUTER' end as etat
from (values
  (-1, '2026-10-18-projets-entree-capital.sql',       exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'projects' and column_name = 'open_to_equity')),
  (0, '2026-10-19-projets-confidentiels-nda.sql',     exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'projects' and column_name = 'nda_required')),
  (1, '2026-10-20a-role-pro.sql',                     exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'profile_role' and e.enumlabel = 'pro')),
  (2, '2026-10-20b-offres-reprise.sql',               exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'buyer_plus_until')),
  (3, '2026-10-21-moderation-verification-stats.sql', exists (select 1 from pg_proc where proname = 'moderate_ma_listing')),
  (4, '2026-10-22-reprise-moderation-stats-pros.sql', exists (select 1 from pg_proc where proname = 'get_my_pro_stats')),
  (5, '2026-10-23-ventes-reussies.sql',               to_regclass('public.ma_success_stories') is not null),
  (6, '2026-10-24-paiements-stripe.sql',              to_regclass('public.payments') is not null),
  (7, '2026-10-25-contact.sql',                       to_regclass('public.contact_messages') is not null),
  (8, '2026-10-26-annonces-enrichies.sql',            exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'ma_listings' and column_name = 'revenue_history')),
  (9, '2026-10-27-vitrine-associes.sql',              exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name = 'public_listing')),
  (10, '2026-10-28-lancement.sql',                    to_regclass('public.ma_access_requests') is not null)
) as check_list(ordre, migration, passee)
order by ordre;
