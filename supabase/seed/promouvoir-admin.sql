-- Donne les droits d'administrateur à un compte GoFounders existant.
-- 1. Créez d'abord le compte normalement sur le site (/inscription), avec votre propre mot de passe.
-- 2. Remplacez l'email ci-dessous, puis exécutez ce script dans le SQL Editor de Supabase.
-- 3. Déconnectez-vous puis reconnectez-vous sur le site : les menus admin apparaissent
--    (Modération des annonces, Profils à vérifier).
--
-- Pour retirer les droits : remplacez « true » par « false » dans l'update.

do $$
declare
  target_email text := 'votre-email@exemple.fr';
  target_id uuid;
begin
  select id into target_id from auth.users where lower(email) = lower(btrim(target_email));

  if target_id is null then
    raise exception 'Aucun compte avec l''email % : créez-le d''abord sur le site', target_email;
  end if;

  -- Exécuté en tant que postgres : autorisé par le trigger enforce_profile_entitlements.
  update public.profiles set is_admin = true, updated_at = now() where id = target_id;

  if not found then
    raise exception 'Le compte existe mais n''a pas de profil (inscription incomplète ?)';
  end if;

  raise notice 'Le compte % est maintenant administrateur.', target_email;
end;
$$;
