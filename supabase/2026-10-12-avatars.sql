-- Photos de profil (bucket « avatars », fichiers rangés dans un dossier au nom de l'utilisateur :
-- <id utilisateur>/avatar-<date>.<ext>). À exécuter après 2026-10-12-parametres.sql.
-- Chaque utilisateur peut lister et supprimer ses propres fichiers : l'appli efface les anciennes
-- photos à chaque changement, et toutes ses photos quand il supprime son compte.
-- Les règles d'envoi et de lecture publique existantes ne sont pas modifiées.

drop policy if exists "avatars_select_own" on storage.objects;
create policy "avatars_select_own"
on storage.objects
for select
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
on storage.objects
for delete
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
