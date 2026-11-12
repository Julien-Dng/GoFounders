#!/bin/bash
# Tests de sécurité du compte multi-usages (2026-11-13-compte-multi-usages.sql), sur une base de test locale
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
echo "== Visibilité des profils"
r "Associé voit un porteur de projet"            $A  "select count(*) from profiles where id='$N'" 1
r "Associé ne voit pas un autre associé"         $A  "select count(*) from profiles where id='$BR'" 0
r "Porteur voit un associé"                      $N  "select count(*) from profiles where id='$A'" 1
r "Porteur ne voit pas un cédant"                $N  "select count(*) from profiles where id='$K'" 0
r "Repreneur ne voit pas un associé"             $LU "select count(*) from profiles where id='$A'" 0
r "Repreneur ne voit pas un autre repreneur"     $LU "select count(*) from profiles where id='$SA'" 0
r "Repreneur voit le cédant avec qui il échange" $T  "select count(*) from profiles where id='$M'" 1
echo "== Cocher un usage n'ouvre rien ; l'action, oui"
r "Repreneur coche « associé » sans compétence"  $LU "update profiles set usages = array['reprise','associe'] where id='$LU'; select count(*) from projects where is_active" 0
r "… puis renseigne une compétence"              $LU "update profiles set usages = array['reprise','associe'], skills = array['Finance'] where id='$LU'; select count(*) > 0 from projects where is_active" t
r "Repreneur coche « projet » sans projet publié" $LU "update profiles set usages = array['reprise','projet'] where id='$LU'; select count(*) from profiles where id='$A'" 0
r "… puis publie un projet : voit les associés"  $LU "update profiles set usages = array['reprise','projet'] where id='$LU'; insert into projects (owner_id, name, is_active) values ('$LU','Test',true); select count(*) from profiles where id='$A'" 1
r "Usage inconnu refusé"                         $LU "update profiles set usages = array['admin'] where id='$LU'" "ERROR:  new row for relation \"profiles\" violates check"
r "Rôle toujours non modifiable par le membre"   $LU "update profiles set role='pro' where id='$LU'" ERROR
echo "== Projets"
r "Associé voit les projets actifs"              $A  "select count(*) > 0 from projects" t
r "Repreneur ne voit aucun projet"               $T  "select count(*) from projects" 0
r "Partie confidentielle toujours protégée"      $A  "select coalesce(get_project_confidential((select id from projects where owner_id='$N')),'(rien)')" "(rien)"
r "Demande d'accès : refusée sans profil associé" $T "select request_project_access((select id from projects where owner_id='$N'), true, 'v0-provisoire-2026-10-19')" "ERROR:  ACCES_RESERVE_ASSOCIES"
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
