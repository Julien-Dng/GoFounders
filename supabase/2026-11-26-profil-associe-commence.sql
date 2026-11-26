-- Onglets de « Mon profil » selon les objectifs et les contenus déjà créés (novembre 2026). À exécuter APRÈS
-- 2026-11-25-apport-associe.sql.
--
-- Le profil général et le profil d'associé partagent les mêmes colonnes (title, bio, skills, looking_for,
-- availability_label), en partie préremplies à l'inscription : elles ne disent pas si le membre a commencé un profil
-- d'associé. profiles.associate_started_at le dit : posé par le site au premier enregistrement de « Mon profil
-- d'associé ». Il ne sert qu'à garder l'onglet affiché ; il n'ouvre aucun droit (le droit d'associé reste
-- associate_offered_at + compétences, voir is_associate).

begin;

alter table public.profiles add column if not exists associate_started_at timestamptz;
grant select (associate_started_at), update (associate_started_at) on public.profiles to authenticated;

-- Membres existants : profil d'associé proposé, ou question de l'apport déjà répondue (posée seulement sur
-- « Mon profil d'associé »).
update public.profiles
set associate_started_at = coalesce(associate_offered_at, updated_at, now())
where associate_started_at is null
  and role::text <> 'pro'
  and (associate_offered_at is not null or investment_readiness is not null);

commit;
