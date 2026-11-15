#!/bin/bash
# Tests de sécurité du compte multi-usages (2026-11-13-compte-multi-usages.sql, 2026-11-15-objectifs-automatiques.sql,
# 2026-11-16-favoris.sql, 2026-11-17-visibilite-contact.sql), sur une base de test locale
# avec comptes-test.sql, annonces-demo.sql et demo-complete.sql. Chaque cas est annulé (ROLLBACK).
# Usage : D=<dossier du socket> bash supabase/tests/compte-multi-usages.sh
D=${D:-/var/tmp/pgtest}
# r : exécuté en tant que membre puis annulé (ROLLBACK) ; c : validé (COMMIT)
run() { out=$(psql -h $D -p 5499 -U postgres -d tr -qtA -v ON_ERROR_STOP=1 2>&1 <<SQL
begin; set local role authenticated; set local request.jwt.claim.sub = '$2';
$3;
$4;
SQL
); res=$(echo "$out" | grep -v '^COMMIT$\|^BEGIN$\|^SET$\|^ROLLBACK$' | tr '\n' ' ' | sed 's/psql:<stdin>:[0-9]*: //;s/CONTEXT.*//;s/DETAIL.*//' | cut -c1-90); ok=KO; [[ "$res" == $5* ]] && ok=ok; printf '%-3s %-62s -> %s\n' "$ok" "$1" "$res"; }
r() { run "$1" "$2" "$3" "rollback" "$4"; }
U=a1000000-0000-4000-8000-0000000000; L=c1000000-0000-4000-8000-0000000000
N=${U}07; JU=${U}08; A=${U}10; IN=${U}11; BR=${U}12; CA=${U}13; T=${U}06; SA=${U}05; LU=${U}04; M=${U}01; K=${U}02
BIO="Ancien directeur financier, j accompagne les petites entreprises dans leur croissance"
COMPLET="update profiles set title='Directeur financier', skills=array['Finance'], bio='$BIO' where id='$LU'"
PROJET="insert into projects (owner_id, name, description, skills_needed, is_active) values ('$LU','Atelier','$BIO',array['Commerce'],false)"
echo "== Consulter : tout membre voit les associés visibles et les projets publiés"
r "Associé voit un porteur de projet"            $A  "select count(*) from profiles where id='$N'" 1
r "Associé voit un autre associé visible"        $A  "select count(*) from profiles where id='$BR'" 1
r "Repreneur voit un associé visible"            $LU "select count(*) from profiles where id='$A'" 1
r "Repreneur voit les projets publiés"           $T  "select count(*) > 0 from projects" t
r "Porteur ne voit pas un cédant"                $N  "select count(*) from profiles where id='$K'" 0
r "Repreneur ne voit pas un autre repreneur"     $LU "select count(*) from profiles where id='$SA'" 0
r "Repreneur voit le cédant avec qui il échange" $T  "select count(*) from profiles where id='$M'" 1
r "Profil retiré : plus visible des membres"     $A  "select set_associate_offer(false) is null; set local request.jwt.claim.sub = '$LU'; select count(*) from profiles where id='$A'" "t 0"
r "Visiteur : aucun profil"                      "" "select count(*) from profiles" 0
echo "== Visibilité : un seul réglage, la vitrine en option"
r "Objectif « associé » + compétence : pas visible" $LU "update profiles set usages = array['reprise','associe'], skills = array['Finance'] where id='$LU'; select is_associate('$LU')" f
r "Proposer un profil incomplet : refusé"        $LU "update profiles set skills = array['Finance'] where id='$LU'; select set_associate_offer(true)" "ERROR:  PROFIL_ASSOCIE_INCOMPLET"
r "Proposer un profil complet : visible"         $LU "$COMPLET; select set_associate_offer(true) is not null; select 'associe' = any(usages), is_associate('$LU') from profiles where id='$LU'" "t t|t"
r "Date de proposition non modifiable en direct" $LU "update profiles set associate_offered_at = now() where id='$LU'" "ERROR:  permission denied"
r "Retirer l'objectif ne retire pas le profil"   $A  "update profiles set usages = array['reprise'] where id='$A'; select is_associate('$A')" t
r "Retirer la proposition retire la vitrine"     $A  "select set_associate_offer(false) is null; select is_associate('$A'), public_listing from profiles where id='$A'" "t f|f"
r "Vitrine impossible sans profil visible"       $LU "update profiles set public_listing = true where id='$LU'; select public_listing from profiles where id='$LU'" f
r "Vitrine d'un projet en brouillon : non"       $LU "$PROJET; update projects set public_listing = true where owner_id='$LU'; select public_listing from projects where owner_id='$LU'" f
echo "== Publier un projet : minimum exigé"
r "Projet en brouillon : aucun objectif"         $LU "insert into projects (owner_id, name, is_active) values ('$LU','T',false); select usages from profiles where id='$LU'" "{reprise}"
r "Projet incomplet publié : refusé"             $LU "insert into projects (owner_id, name, is_active) values ('$LU','T',true)" "ERROR:  PROJET_INCOMPLET"
r "Projet présenté publié : « Trouver des associés »" $LU "$PROJET; update projects set is_active = true where owner_id='$LU'; select usages from profiles where id='$LU'" "{reprise,projet}"
echo "== Objectifs ajoutés après une action"
r "Annonce déposée : « Vendre »"                 $A  "insert into ma_listings (owner_id, sector, region, public_summary) values ('$A','Services','Bretagne','Test de publication par un associé'); select 'cession' = any(usages) from profiles where id='$A'" t
r "Dossier débloqué : « Reprendre »"             $A  "select request_listing_access('${L}03','',true,'ma-v0-provisoire-2026-10-28'); select simulate_listing_purchase('INTRO','${L}03',null); select 'reprise' = any(usages) from profiles where id='$A'" "pending  t"
r "Fonction d'ajout non appelable"               $A  "select add_profile_usage('$A','projet')" "ERROR:  permission denied"
r "Usage inconnu refusé"                         $LU "update profiles set usages = array['admin'] where id='$LU'" "ERROR:  new row for relation \"profiles\" violates check"
r "Rôle toujours non modifiable par le membre"   $LU "update profiles set role='pro' where id='$LU'" ERROR
echo "== Contacter"
r "Porteur sans projet présenté → associé"       $LU "insert into conversations (participant_a, participant_b) values ('$LU','$A')" "ERROR:  PROJET_INCOMPLET"
r "Porteur, brouillon présenté → associé"        $LU "$PROJET; insert into conversations (participant_a, participant_b) values ('$LU','$A') returning context" projet
r "Brouillon lisible par l'associé contacté"     $LU "$PROJET; insert into conversations (participant_a, participant_b) values ('$LU','$A'); set local request.jwt.claim.sub = '$A'; select count(*) from projects where owner_id='$LU'" 1
r "… mais pas par les autres membres"            $LU "$PROJET; insert into conversations (participant_a, participant_b) values ('$LU','$A'); set local request.jwt.claim.sub = '$T'; select count(*) from projects where owner_id='$LU'" 0
r "… ni sa partie confidentielle"                $LU "$PROJET; update projects set confidential_details = 'Secret' where owner_id='$LU'; insert into conversations (participant_a, participant_b) values ('$LU','$A'); set local request.jwt.claim.sub = '$A'; select coalesce(get_project_confidential((select id from projects where owner_id='$LU')),'(rien)')" "(rien)"
r "Profil d'associé incomplet → porteur"         $T  "insert into conversations (participant_a, participant_b) values ('$T','$N')" "ERROR:  PROFIL_ASSOCIE_INCOMPLET"
r "Associé discret (complet, non visible) → porteur" $LU "$COMPLET; insert into conversations (participant_a, participant_b) values ('$LU','$N') returning context; set local request.jwt.claim.sub = '$N'; select count(*) from profiles where id='$LU'" "projet 1"
r "Associé → porteur : pas de quota"             $LU "$COMPLET; insert into conversations (participant_a, participant_b) values ('$LU','$N'); select coalesce((select contacts from usage_counters where user_id='$LU'),0)" "0"
r "Garde-fou : 21e conversation du jour refusée" $LU "reset role; set local request.jwt.claim.sub = ''; insert into conversations (participant_a, participant_b, context) select '$LU', id, 'pro' from profiles where id <> '$LU' limit 20; set local request.jwt.claim.sub = '$LU'; set local role authenticated; $COMPLET; insert into conversations (participant_a, participant_b) values ('$LU','$JU')" "ERROR:  LIMITE_CONTACTS_JOUR"
echo "== Projets"
r "Partie confidentielle toujours protégée"      $A  "select coalesce(get_project_confidential((select id from projects where owner_id='$N')),'(rien)')" "(rien)"
r "Demande d'accès : refusée sans profil complet" $T "select request_project_access((select id from projects where owner_id='$N'), true, 'v0-provisoire-2026-10-19')" "ERROR:  ACCES_RESERVE_ASSOCIES"
r "Demande d'accès : acceptée pour un associé"   $CA "select request_project_access((select id from projects where owner_id='$N'), true, 'v0-provisoire-2026-10-19')" pending
r "Invitation d'un non-associé refusée"          $N  "select invite_to_project('$T')" "ERROR:  ASSOCIE_INTROUVABLE"
r "Invitation d'un associé acceptée"             $N  "select invite_to_project('$CA')" nda_required
echo "== Reprise : tout membre paie 50 € par entreprise"
r "Cédante ouvre le dossier d'une autre entreprise" $M "select request_listing_access('${L}03','',true,'ma-v0-provisoire-2026-10-28'); select simulate_listing_purchase('INTRO','${L}03',null); select left(contact_info,13) from get_ma_listing_detail('${L}03')" "pending  Karim Rahmani"
r "Porteur de projet sans paiement : rien"       $N  "select count(*) from get_ma_listing_detail('${L}03')" 0
r "Repreneur avec dossier payé : dossier lisible" $T "select left(contact_info,15) from get_ma_listing_detail('${L}01')" "Martine Bernard"
r "Tout membre peut publier une annonce"         $A  "insert into ma_listings (owner_id, sector, region, public_summary) values ('$A','Services','Bretagne','Test de publication par un associé'); select 'ok'" ok
echo "== Messagerie et quotas"
r "Repreneur → cédant après paiement (contexte)" $T  "insert into conversations (participant_a, participant_b) values ('$T','$K') returning context" "ERROR:  ROLE_CONTACT_INTERDIT"
r "Repreneur → cédant dossier payé"              $T  "delete from conversations where participant_a='$T' or participant_b='$T'; insert into conversations (participant_a, participant_b) values ('$T','${U}03') returning context, listing_id" "annonce|${L}05"
r "Contexte « projet » falsifié refusé"          $T  "insert into conversations (participant_a, participant_b, context) values ('$T','${U}03','projet')" "ERROR:  ROLE_CONTACT_INTERDIT"
r "Entreprise falsifiée recalculée"              $T  "delete from conversations where participant_a='$T' or participant_b='$T'; insert into conversations (participant_a, participant_b, listing_id) values ('$T','${U}03','${L}03') returning listing_id" "${L}05"
r "Contexte non modifiable après coup"           $T  "update conversations set context='projet' where participant_a='$T'; select context from conversations where participant_a='$T' and participant_b='$M'" annonce
r "Associé → porteur : contexte projet, non compté" $BR "insert into conversations (participant_a, participant_b) values ('$BR','$JU') returning context; select coalesce((select contacts from usage_counters where user_id='$BR'),0)" "projet 0"
r "Porteur FREE → associé : compté"              $JU "insert into conversations (participant_a, participant_b) values ('$JU','$CA') returning context; select contacts from usage_counters where user_id='$JU'" "projet 1"
psql -h $D -p 5499 -U postgres -d tr -qc "insert into usage_counters (user_id, period, contacts) values ('$JU', current_quota_period(), 5) on conflict (user_id, period) do update set contacts = 5" >/dev/null
r "Porteur FREE : 6e contact du mois refusé"      $JU "insert into conversations (participant_a, participant_b) values ('$JU','$BR')" "ERROR:  FREE_QUOTA_CONTACTS"
psql -h $D -p 5499 -U postgres -d tr -qc "delete from usage_counters where user_id='$JU'" >/dev/null
r "Quota affiché : porteur PRO sans limite"       $N  "select contacts_limit is null from get_my_quota()" t
r "Quota affiché : porteur FREE limité à 5"       $JU "select contacts_limit from get_my_quota()" 5
r "Quota affiché : repreneur sans limite"         $T  "select contacts_limit is null from get_my_quota()" t
r "Associé et repreneur ne peuvent pas s'écrire" $A  "insert into conversations (participant_a, participant_b) values ('$A','$LU')" "ERROR:  ROLE_CONTACT_INTERDIT"
echo "== Vitrine publique"
run "Vitrine : associés et projets listés"       "" "set local role anon" "select string_agg(kind||':'||n, ' ') from (select kind, count(*) n from list_public_marketplace() group by kind order by kind) x; rollback" "project"
echo "== Favoris d'entreprises"
r "Ajouter une annonce publique en favori"      $LU "insert into listing_favorites (user_id, listing_id) values ('$LU','${L}03'); select count(*) from list_my_favorite_listings()" 1
r "Annonce non relue : refusée"                  $LU "insert into listing_favorites (user_id, listing_id) values ('$LU','${L}04')" "ERROR:  new row violates row-level security"
r "Favori au nom d'un autre membre : refusé"     $LU "insert into listing_favorites (user_id, listing_id) values ('$A','${L}03')" "ERROR:  new row violates row-level security"
r "Les favoris d'un autre restent invisibles"    $LU "insert into listing_favorites (user_id, listing_id) values ('$LU','${L}03'); set local request.jwt.claim.sub = '$A'; select count(*) from listing_favorites" 0
r "Le cédant ne voit pas qui suit son annonce"   $LU "insert into listing_favorites (user_id, listing_id) values ('$LU','${L}03'); set local request.jwt.claim.sub = '$K'; select count(*) from listing_favorites where listing_id = '${L}03'" 0
r "Annonce retirée : disparaît de la liste"      $LU "insert into listing_favorites (user_id, listing_id) values ('$LU','${L}03'); reset role; update ma_listings set status = 'withdrawn' where id = '${L}03'; set local role authenticated; select count(*) from list_my_favorite_listings()" 0
r "Retirer un favori"                            $LU "insert into listing_favorites (user_id, listing_id) values ('$LU','${L}03'); delete from listing_favorites where listing_id = '${L}03'; select count(*) from listing_favorites" 0
r "Favori : n'ajoute aucun objectif"             $LU "insert into listing_favorites (user_id, listing_id) values ('$LU','${L}03'); select usages from profiles where id = '$LU'" "{reprise}"
