# Tests SQL locaux

Base PostgreSQL 16 locale qui imite Supabase, pour vérifier les règles d'accès avant de toucher à la vraie base.

```bash
D=/var/tmp/pgtest
mkdir -p $D && chown postgres $D
su postgres -c "/usr/lib/postgresql/16/bin/initdb -D $D/data -A trust"
su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D $D/data -o '-p 5499 -k $D' -l $D/log start"
su postgres -c "createdb -h $D -p 5499 tr"
P="psql -h $D -p 5499 -U postgres -d tr -v ON_ERROR_STOP=1 -q"
$P -f supabase/tests/socle-local.sql
for f in supabase/2026-*.sql; do $P -f "$f" || break; done
for f in comptes-test annonces-demo pros-demo demo-complete; do $P -f supabase/seed/$f.sql; done
bash supabase/tests/compte-multi-usages.sh   # chaque ligne doit commencer par « ok »
```

`socle-local.sql` ajoute aussi les droits par défaut que Supabase accorde et qui ne figurent pas dans les migrations
(mise à jour de son profil, création d'une conversation, d'un projet ou d'une annonce).
