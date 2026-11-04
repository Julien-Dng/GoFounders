# Premier lancement « vendre ou reprendre une société » — plan de développement

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal :** rendre public un parcours complet et réel : un vendeur publie une annonce relue, un repreneur paie 149 €, signe un NDA, est accepté par le vendeur, lit le dossier et échange avec lui.

**Architecture :** on garde Angular 17, Supabase (règles et fonctions SQL) et le back FastAPI. Les modules hors périmètre sont masqués par une configuration unique, pas supprimés. Toute règle d'accès est appliquée côté Supabase ou back, jamais seulement dans l'interface.

**Tech Stack :** Angular 17 (standalone, signals), Supabase/PostgreSQL, Python 3.11/FastAPI, Stripe Checkout, Brevo (API e-mail), Playwright, pytest.

**Spec :** pas de spec séparée. Ce plan s'appuie sur la section « Décisions » ci-dessous et sur `docs/REFONTE-REPRISE.md`.

## Global Constraints

- Branche de travail : `lancement-reprise`, créée depuis `refonte-reprise`.
- Pas de `any`, composants standalone, `OnPush`, `inject()`, `@if`/`@for`, `ReactiveFormsModule` pour les nouveaux formulaires (`CLAUDE.md`).
- Jamais de `select('*')` sur `profiles` ou `projects`. Les colonnes confidentielles de `ma_listings` ne se lisent que par `get_ma_listing_detail`.
- Droits accordés uniquement côté serveur. En mode Stripe, seul le webhook signé accorde un accès.
- Migrations rejouables, dans `supabase/AAAA-MM-JJ-sujet.sql`, avec `revoke`/`grant` explicites sur chaque fonction.
- Textes en français. Pas de conseil juridique promis. GoFounders n'est pas partie au NDA. Le NDA reste marqué provisoire tant qu'un avocat ne l'a pas validé. Une modification du texte impose une nouvelle version.
- Aucune commission sur les ventes (loi Hoguet).
- Prix : accès repreneur **149 € pour 12 mois**. Publication vendeur **gratuite**.
- Toute tâche qui change une règle, une route ou une offre met à jour `CLAUDE.md` et `docs/REFONTE-REPRISE.md` dans le même commit.

## Review Focus

1. **Accès expiré après une acceptation** : le repreneur accepté dont les 12 mois sont finis perd l'accès au dossier (test : tâche 5).
2. **Anonymat avant acceptation** : ni le nom du vendeur, ni `owner_id`, ni ses coordonnées ne parviennent au repreneur, même dans le NDA ou le statut de sa demande (test : tâche 5).
3. **Annonce modifiée après validation** : elle repasse en relecture, y compris quand seul un champ enrichi change, et le vendeur ne peut pas la republier seul (test : tâche 3).
4. **Suppression d'un compte lié à une demande** : la suppression aboutit et la preuve du NDA reste conservée (test : tâche 5).
5. **Confidentialité des e-mails** : un e-mail de notification ne contient jamais le contenu d'un message ni un détail du dossier (test : tâche 7).

---

## Décisions prises avec vous (1er novembre 2026)

| Sujet | Décision | Conséquence |
|---|---|---|
| Marché | Discours numérique, annonces ouvertes aux autres sociétés | Ajouter le secteur « Autre activité », aligner les textes |
| Modules visibles | **Reprise seule** : annonces et accès 149 € | Masqués : associés, PRO, pros, assistant, Plus, Mise en avant, Dossier vérifié, PREMIUM |
| Délai de 48 h | Supprimé au lancement | Retirer la règle `ma_listings_acces_anticipe` |
| NDA avant dossier | **Indispensable** | À créer pour les annonces |
| Validation du repreneur par le vendeur | **Indispensable** | Payer ne suffit plus à ouvrir un dossier : les textes de vente changent |
| Documents sécurisés, favoris, alertes | Après lancement | Pas considérés comme des manques |
| E-mails | Messages, modération, demandes d'accès | À créer |
| Modération | **Relecture avant publication** | Nouveau statut `pending_review` |
| État de l'entreprise | Société immatriculée. Pas encore de compte Stripe activé, d'avocat, de domaine ni d'hébergeur | Voir « Ce qui dépend de vous » |

**Hypothèses à confirmer pendant votre relecture :** l'estimation gratuite `/estimation`, l'aide IA au dépôt et les 3 analyses IA par mois incluses dans les 149 € restent visibles, car ils servent directement la vente et la reprise. Les statistiques vendeur et « J'ai vendu » restent aussi.

---

## Audit de l'existant

**Comment lire les preuves**
- **Exécuté** : vérifié en lançant la commande ou la requête.
- **Lu** : constaté dans le code, sans exécution.

**Vérifications lancées le 1er novembre 2026 :**
- `ng build` réussit, avec un avertissement de taille (733 kB pour un budget de 500 kB).
- `pytest` : 52 tests réussis, sans vraie base ni vrai Stripe.
- Requêtes en lecture seule sur le projet Supabase configuré, avec la clé publique.

**Non vérifié :** aucun parcours connecté n'a été joué de bout en bout, car cela aurait écrit dans votre base. Il n'existe aucun test front (0 fichier `.spec.ts`, aucun lanceur de tests).

### Terminé

Le code est écrit. Sauf mention « Exécuté », il reste à confirmer par la répétition de la tâche 12.

| Fonction | Preuve |
|---|---|
| Colonnes confidentielles des annonces illisibles par un visiteur | **Exécuté** : `contact_info`, `confidential_description`, `sale_reason`, `owner_id` renvoient 42501 |
| Profils illisibles par un visiteur | **Exécuté** : 42501 |
| Confirmation d'e-mail activée à l'inscription | **Exécuté** : `mailer_autoconfirm: false` |
| Webhook Stripe signé et idempotent, portail client | **Exécuté** en tests simulés ; `backend/app/payments.py:74`, `supabase/2026-10-24-paiements-stripe.sql:85` |
| Dépôt d'annonce en 5 étapes, aide IA, anonymisation | **Lu** : `ma-deposer.component.ts` ; back testé |
| Vitrine `/ma`, filtres, fiche publique | **Lu** : `ma-home.component.ts`, `ma-detail.component.ts` |
| Messagerie en temps réel, notifications dans le site | **Lu** : `messaging.service.ts:338`, `supabase/2026-08-17-message-notifications.sql` |
| Modération après publication, retrait avec motif | **Lu** : `supabase/2026-10-21-moderation-verification-stats.sql:224` |
| Pages admin réservées côté serveur | **Lu** : `viewer_is_admin()` dans les fonctions, en plus du contrôle dans chaque page |
| Statistiques vendeur, « J'ai vendu », estimation, contact, FAQ, 404 | **Lu** |
| Suppression du compte | **Lu** : `supabase/2026-10-12-parametres.sql:50` |

### Partiellement développé

| Fonction | Ce qui manque | Preuve |
|---|---|---|
| Paiement réel | Jamais lancé avec Stripe ; aucune clé `STRIPE_*` dans `.env` ; `paymentMode: 'simulation'` | **Exécuté** |
| Gestion des annonces par le vendeur | Ni modification ni retrait ; la seule écriture est l'insertion ; le statut et le motif de retrait ne s'affichent pas dans `/ma/mes-annonces` | **Lu** : `ma.service.ts:292`, `ma-mes-annonces.component.ts:51-70` |
| NDA | Existe pour les projets d'associés, pas pour les annonces | **Lu** : `2026-10-19-projets-confidentiels-nda.sql` |
| Pages légales | Bandeau « Version provisoire », aucun éditeur ni hébergeur, conditions de remboursement « à finaliser » | **Lu** : `features/legal/*` |
| Signalement | Bouton sans action sur les profils ; rien sur les annonces, sauf un sujet du formulaire de contact | **Lu** : `profil.component.ts:400`, `contact.service.ts:12` |
| Référencement | Un seul `<title>` ; ni description, ni titre par page, ni `robots.txt`, ni sitemap | **Lu** : `src/index.html` |

### Manquant, à la lumière de vos décisions

| Élément | Preuve |
|---|---|
| Relecture avant publication : le client envoie `status: 'active'` | **Lu** : `ma-deposer.component.ts:508` |
| Validation du repreneur : 149 € ouvrent tous les dossiers et les coordonnées | **Lu** : `2026-10-22-reprise-moderation-stats-pros.sql:20-31`, `ma-detail.component.ts:435` |
| E-mails métier : aucun envoi ni fournisseur dans le back ou les migrations | **Exécuté** par recherche |
| Acceptation des CGU à l'inscription : aucune mention | **Exécuté** par recherche dans `inscription.component.ts` |
| Base reproductible : aucune migration ne crée `profiles`, `ma_listings`, `conversations`, `messages` ni `notifications`. Impossible de recréer la base depuis le dépôt | **Exécuté** par recherche |
| Déploiement : aucun fichier d'hébergement ni de CI ; `environment.ts` n'est pas versionné et aucun remplacement n'existe pour la production, donc un build depuis Git échoue | **Exécuté** : `git ls-files`, `angular.json` |
| Suivi des erreurs et mesure d'audience | **Exécuté** par recherche |

### Bugs et points à vérifier

| # | Priorité | Constat | Preuve |
|---|---|---|---|
| 1 | **Bloquant** | La base configurée est désynchronisée du code : `2026-10-23`, `-25`, `-26`, `-27` absentes, alors que `-24` (`payments`) est présente. Publier une annonce devrait échouer, car l'insertion envoie des colonnes absentes (déduit, non lancé), et l'erreur exacte est masquée | **Exécuté** : `revenue_history` 42703, `contact_messages` et `ma_success_stories` PGRST205, `list_public_marketplace` PGRST202 ; **Lu** : `ma.service.ts:292-296` |
| 2 | **Bloquant** | Tant que `simulate_purchase` existe, tout compte connecté peut se donner un accès sans payer. Présence non testée sur la base, pour ne pas appeler une fonction qui écrit | **Lu** : `2026-10-20b-offres-reprise.sql:511`, `supprimer-paiements-simules.sql` |
| 3 | **Bloquant** | Sans clé d'IA, le back ne démarre pas, et le webhook Stripe tombe avec lui | **Lu** : `config.py` (`ai_provider`), `main.py:51` |
| 4 | Élevé | Règle des 48 h : le visiteur voit « n'existe pas » et le vendeur n'est pas prévenu | **Lu** : `2026-10-20b-offres-reprise.sql:308`, `ma-detail.component.ts:310` |
| 5 | Élevé | L'e-mail du compte devient automatiquement les coordonnées du vendeur, sans choix ni édition | **Lu** : `ma-deposer.component.ts:507` |
| 6 | Élevé | Le contact acheteur-vendeur n'exige pas d'accès en cours côté base (`enforce_contact_quota`). Seule la non-divulgation de `owner_id` protège le vendeur | **Lu** : `2026-10-20b-offres-reprise.sql:668` |
| 7 | Moyen | Faux affichages : toujours « En ligne », pièce jointe qui ne fait qu'un `console.log`, « Sauvegarder » non conservé | **Lu** : `messages.component.ts:49`, `:407-410`, `messaging.service.ts:171`, `profil.component.ts:723`, `recherche.component.ts:298` |
| 8 | Moyen | Texte visible : « Compte cree. Confirmez votre email si Supabase vous l'envoie » | **Lu** : `connexion.component.ts:146`, `auth.service.ts:477` |
| 9 | Moyen | Un admin voit des annonces fictives quand la liste est vide ou qu'un dossier est introuvable | **Lu** : `ma.service.ts:204`, `:217` |
| 10 | Moyen | Google Fonts est appelé depuis le navigateur (transfert d'adresse IP, à examiner au regard du RGPD). La police réelle est Plus Jakarta Sans, alors que l'historique indique Geist | **Lu** : `src/index.html:10`, `styles.scss:31`, `modif.md` |
| 11 | Faible | Firebase reste embarqué pour le seul type `Timestamp` (au moins 80 kB dans le build) ; sa part dans le dépassement de budget reste à mesurer | **Exécuté** : build avec statistiques, recherche des imports |
| 12 | À vérifier | L'envoi d'e-mails de compte passe-t-il par le serveur SMTP par défaut de Supabase, limité en volume ? À contrôler dans le tableau de bord | Non vérifiable avec la clé publique |
| 13 | À vérifier | Le modèle par défaut `gpt-6.1-sol` et la boîte `support@gofounders.fr` existent-ils ? | **Lu** : `config.py`, `offers.ts` |

**Sans effet tant que les modules restent masqués, à corriger avant de les rouvrir :**
- La suppression d'un compte ne résilie pas ses abonnements Stripe (`2026-10-12-parametres.sql:50`).
- Les justificatifs du Dossier vérifié sont coupés à 500 caractères alors que le champ en accepte 3 000 (`payments.py:118`, `ma-mes-annonces.component.ts:101`).
- La mise en avant reste achetable sur une annonce vendue ou retirée (`ma-mes-annonces.component.ts:78`, `supabase.py:161`).
- Rien n'empêche deux abonnements au même produit (`main.py:307`).
- `/api/coaching-ia/contexte` lève une erreur pour le rôle `pro` (`main.py:148`).

### Indispensable ou facultatif

**Indispensable au lancement :** les tâches 1 à 12 ci-dessous.

**Facultatif, après lancement :**
- documents sécurisés sur la plateforme ;
- favoris et alertes pour tous les repreneurs ;
- réouverture de Plus, Mise en avant, Dossier vérifié, associés, pros et assistant ;
- connexion Stripe ou Shopify pour prouver le chiffre d'affaires ;
- rappel avant la fin des 12 mois ;
- rendu côté serveur pour le référencement des annonces ;
- traitement automatique des remboursements ;
- retrait de Firebase (bug 11) ;
- lien entre une conversation et une annonce.

---

## Ce qui dépend de vous

| Action | Nécessaire pour | Tâche |
|---|---|---|
| Créer un projet Supabase de recette et fournir le mot de passe de la base actuelle | Base de référence et tests | 1 |
| Créer un compte Brevo et authentifier le domaine d'envoi | E-mails | 7, 11 |
| Activer le compte Stripe | Encaissement réel (le mode test suffit pour développer) | 9 |
| Faire relire par un avocat CGU, CGV, NDA, rétractation, RGPD et loi Hoguet | Retrait des mentions « provisoire » | 10 |
| Fournir les informations de la société (dénomination, SIREN, siège, responsable de publication) | Mentions légales, NDA, factures | 10 |
| Acheter le domaine, ouvrir `support@`, confirmer l'hébergeur (Render recommandé : un seul fichier de configuration, région Francfort) | Mise en ligne | 11 |

---

# Phase A — Socle

## Tâche 1 : Base reproductible, recette et tests d'intégration

**Priorité :** P0. Toutes les autres tâches en dépendent.

**Files :**
- Create : `supabase/000-schema-de-base.sql`, `supabase/README.md`
- Create : `backend/tests/integration/__init__.py`, `backend/tests/integration/conftest.py`, `backend/tests/integration/test_securite_annonces.py`
- Modify : `backend/requirements-dev.txt`, `backend/.env.example`

**Interfaces :**
- Produit : marqueur pytest `integration` ; fixtures `visitor`, `as_user(email) -> httpx.Client` et `service`, lues depuis `STAGING_SUPABASE_URL`, `STAGING_ANON_KEY`, `STAGING_SERVICE_ROLE_KEY`.

- [ ] **Étape 1 : Exporter le schéma actuel**

Installer le CLI Supabase, puis lancer `supabase db dump --db-url "$DB_URL" --schema public -f supabase/000-schema-de-base.sql` sur la base actuelle (structure seule, sans données). Ce fichier représente l'état complet à la date de l'export. Contrôler ce qui s'y trouve déjà : les migrations déjà appliquées deviennent de l'historique, seules celles qui manquent (au moins `2026-10-23`, `-25`, `-26`, `-27`, et `-22` si son contenu est absent) se jouent après lui. Reprendre aussi à la main les déclencheurs sur `auth.users` (dont `handle_new_auth_user`), que l'export du schéma `public` n'inclut pas.

- [ ] **Étape 2 : Noter le type de `ma_listings.status`**

Lire le résultat de l'export et l'indiquer dans `supabase/README.md` : la tâche 3 en dépend (énumération ou texte).

- [ ] **Étape 3 : Documenter l'ordre d'exécution**

`supabase/README.md` indique les fichiers à jouer après `000-schema-de-base.sql`, dans l'ordre, et rappelle `supprimer-paiements-simules.sql` et l'interdiction de jouer `seed/comptes-test.sql` en production.

- [ ] **Étape 4 : Monter la recette**

Jouer le schéma, toutes les migrations puis `seed/comptes-test.sql` sur le projet de recette.
Attendu : aucune erreur ; `select count(*) from auth.users` renvoie le nombre de comptes du seed.

- [ ] **Étape 5 : Écrire le test d'intégration**

```python
pytestmark = pytest.mark.integration

@pytest.mark.parametrize("col", ["contact_info", "confidential_description", "sale_reason", "owner_id", "growth_notes"])
def test_colonne_confidentielle_refusee_au_visiteur(visitor, col):
    assert visitor.get(f"/rest/v1/ma_listings?select={col}&limit=1").json()["code"] == "42501"

def test_profils_refuses_au_visiteur(visitor):
    assert visitor.get("/rest/v1/profiles?select=id&limit=1").status_code == 401
```

La fixture échoue avec un message clair si une variable `STAGING_*` manque : elle ne passe pas le test en silence. `pytest` sans option exclut ce marqueur (`addopts = -m "not integration"`).

- [ ] **Étape 6 : Lancer le test**

Run : `cd backend && pytest -m integration -v`
Expected : PASS.

- [ ] **Étape 7 : Commit**

```bash
git add supabase/000-schema-de-base.sql supabase/README.md backend/tests/integration backend/requirements-dev.txt backend/.env.example
git commit -m "Base reproductible et tests d'intégration sur la recette"
```

## Tâche 2 : Périmètre « reprise seule »

**Priorité :** P0.

**Files :**
- Create : `src/app/core/config/launch.ts`, `src/app/core/guards/feature.guard.ts`
- Create : `playwright.config.ts`, `e2e/perimetre.spec.ts`
- Modify : `app.routes.ts`, `navbar.component.ts`, `footer.component.ts`, `inscription.component.ts`, `landing.component.ts`, `faq.component.ts`, `tarifs.component.ts`, `abonnement.component.ts`, `dashboard.component.ts`, `ma-mes-annonces.component.ts`, `ma-deposer.component.ts`, `package.json`
- Modify : `backend/app/config.py`, `backend/app/main.py`, `backend/tests/test_payments.py`

**Interfaces :**
- Produit : `LAUNCH_FEATURES: Readonly<Record<'associates' | 'pros' | 'assistant' | 'buyerPlus' | 'listingOffers' | 'premium', boolean>>`, toutes à `false`.
- Produit : `featureGuard(feature)` : `CanActivateFn` qui redirige vers `/ma`.
- Produit : `Settings.enabled_products: str = "MA_ACCESS"` et sa propriété `products`.

- [ ] **Étape 1 : Écrire le test back en échec**

```python
def test_offre_masquee_refusee(client):
    r = client.post("/api/paiements/session", json={"product": "FEATURE_7D", "listing_id": LISTING_ID}, headers=AUTH)
    assert r.status_code == 400
```

Les tests existants sur les autres offres passent `enabled_products` à toutes les offres dans leur fixture.

- [ ] **Étape 2 : Vérifier l'échec, puis implémenter**

Run : `pytest tests/test_payments.py::test_offre_masquee_refusee -v`. Expected : FAIL. Dans `create_checkout`, refuser avec 400 un produit absent de `settings.products`, puis relancer. Expected : PASS.

- [ ] **Étape 3 : Écrire le test Playwright en échec**

Installer `@playwright/test`, ajouter le script `"e2e": "playwright test"`.

```ts
test('les modules masqués redirigent vers /ma', async ({ page }) => {
  for (const path of ['/associes', '/pros']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/ma$/);
  }
});
test('la navigation ne propose que la reprise', async ({ page }) => {
  await page.goto('/');
  const nav = page.getByRole('navigation').first();
  await expect(nav.getByText('Trouver un associé')).toHaveCount(0);
});
test("l'inscription ne propose qu'acheteur et vendeur", async ({ page }) => {
  await page.goto('/inscription');
  await expect(page.getByText('Je suis un professionnel')).toHaveCount(0);
  await expect(page.getByText('Je veux devenir associé')).toHaveCount(0);
});
test('tarifs : uniquement la publication gratuite et le 149 €', async ({ page }) => {
  await page.goto('/tarifs');
  await expect(page.getByText('149 €').first()).toBeVisible();
  for (const prix of ['390 €', '199 €', '79 €', 'Sur devis']) await expect(page.getByText(prix)).toHaveCount(0);
});
```

- [ ] **Étape 4 : Vérifier l'échec**

Run : `npm run e2e -- perimetre`. Expected : FAIL.

- [ ] **Étape 5 : Appliquer le masquage**

Protéger par `featureGuard` : `/recherche`, `/associes`, `/pros`, `/coaching-ia`. Filtrer selon `LAUNCH_FEATURES` la navigation, le pied de page, les cartes d'inscription, les offres de `/tarifs` et de `/abonnement`, les blocs Mise en avant et Dossier vérifié de `/ma/mes-annonces`, les sections et questions correspondantes de l'accueil et de la FAQ, et les liens du tableau de bord. `/profil/modifier` reste accessible. `/admin/verifications` sort du menu.

- [ ] **Étape 6 : Aligner le discours (décision marché)**

Ajouter « Autre activité » aux secteurs de `/ma/deposer`. Accroche inchangée, centrée sur le numérique ; ajouter sur l'accueil et la FAQ une phrase indiquant que les autres sociétés peuvent aussi déposer une annonce.

- [ ] **Étape 7 : Vérifier**

Run : `npm run e2e -- perimetre && npx ng build && cd backend && pytest`. Expected : tout PASS.

- [ ] **Étape 8 : Commit**

```bash
git add -A src e2e playwright.config.ts package.json package-lock.json backend
git commit -m "Périmètre de lancement : reprise seule, autres modules masqués"
```

# Phase B — Parcours de vente et de reprise

## Tâche 3 : Relecture avant publication et fin du délai de 48 h

**Priorité :** P0.

**Files :**
- Create : `supabase/2026-11-02-moderation-a-priori.sql` (et `2026-11-02a-statut-relecture.sql`, à exécuter seul, si `status` est une énumération)
- Modify : `supabase-database.model.ts`, `ma-listing.model.ts`, `ma.service.ts`, `moderation.service.ts`, `admin-annonces.component.ts`, `ma-deposer.component.ts`, `ma-detail.component.ts`
- Test : `backend/tests/integration/test_moderation.py`

**Interfaces :**
- Produit : statut `pending_review` pour `MaListingStatus`.
- Produit : `moderate_ma_listing(p_listing_id uuid, p_action text, p_note text)` : `approve` passe l'annonce à `active`, `withdraw` exige un motif.

- [ ] **Étape 1 : Écrire les tests d'intégration en échec**

```python
def test_annonce_deposee_invisible_tant_que_non_relue(service, vendeur, visitor, listing_payload):
    id_ = cree_annonce(vendeur, {**listing_payload, "status": "active"})   # le client tente de forcer
    assert statut(service, id_) == "pending_review"
    assert visitor.get(f"/rest/v1/ma_listings?id=eq.{id_}&select=id").json() == []

def test_annonce_approuvee_visible_immediatement(admin, visitor, annonce_en_attente):
    admin.post("/rest/v1/rpc/moderate_ma_listing", json={"p_listing_id": annonce_en_attente, "p_action": "approve", "p_note": None})
    assert visitor.get(f"/rest/v1/ma_listings?id=eq.{annonce_en_attente}&select=id").json() != []

def test_annonce_modifiee_repasse_en_relecture(service, vendeur, annonce_active):
    vendeur.patch(f"/rest/v1/ma_listings?id=eq.{annonce_active}", json={"team_size": 4})   # champ enrichi
    assert statut(service, annonce_active) == "pending_review"

def test_vendeur_ne_peut_pas_republier_seul(vendeur, annonce_en_attente):
    r = vendeur.patch(f"/rest/v1/ma_listings?id=eq.{annonce_en_attente}", json={"status": "active"})
    assert r.status_code >= 400
```

- [ ] **Étape 2 : Vérifier l'échec sur la recette**

Run : `pytest -m integration tests/integration/test_moderation.py -v`. Expected : FAIL.

- [ ] **Étape 3 : Écrire la migration**

- `drop policy "ma_listings_acces_anticipe"`.
- Redéfinir `get_ma_listing_detail` sans condition de 48 h (la tâche 5 la complétera).
- Retirer le déclencheur `notify_plus_buyers_new_listing`.
- Étendre `enforce_ma_listing_moderation` :
  - à l'insertion par un membre, forcer `status := 'pending_review'` ;
  - à la modification, ajouter à la comparaison `revenue_year, revenue_history, included_assets, monthly_visitors, acquisition_channels, team_size, owner_hours_per_week, growth_notes` ;
  - toute différence fait passer une annonce `active` à `pending_review` ;
  - un membre ne peut passer qu'à `withdrawn` ou `sold`, ou de `withdrawn` (si `withdrawn_by_admin` est faux) à `pending_review`.
- `moderate_ma_listing('approve')` pose `status = 'active'` et notifie le vendeur avec le lien `/ma/mes-annonces`.
- `admin_list_ma_listings('to_review')` inclut `pending_review`.

- [ ] **Étape 4 : Vérifier**

Jouer la migration sur la recette. Run : `pytest -m integration tests/integration/test_moderation.py -v`. Expected : PASS.

- [ ] **Étape 5 : Adapter l'interface**

`createListing` n'envoie plus `status`. Écran final du dépôt : « Votre annonce est envoyée en relecture ». `/admin/annonces` : « Publier » pour une annonce en attente. Retirer de `ma-detail.component.ts:311` la phrase sur les 48 h. Le badge « Nouveau » reste, il indique seulement une annonce récente.

- [ ] **Étape 6 : Corriger l'erreur masquée**

`createListing(...)` renvoie `{ id: string } | { error: string }` au lieu d'une chaîne vide, et l'écran de dépôt affiche le message reçu.

- [ ] **Étape 7 : Vérifier et commit**

Run : `npx ng build`. Expected : succès.

```bash
git add supabase src backend/tests/integration
git commit -m "Relecture des annonces avant publication, fin de l'accès anticipé de 48 h"
```

## Tâche 4 : Le vendeur gère ses annonces

**Priorité :** P0.

**Files :**
- Modify : `ma.service.ts`, `app.routes.ts`, `ma-deposer.component.ts`, `ma-mes-annonces.component.ts`
- Test : `e2e/vendeur.spec.ts`

**Interfaces :**
- Consomme : règles de la tâche 3.
- Produit : `MaService.updateListing(id: string, data: ListingFormValue): Promise<{ ok: true } | { error: string }>` ; `MaService.setListingStatus(id: string, status: 'withdrawn' | 'pending_review'): Promise<{ ok: true } | { error: string }>`.
- Produit : route `/ma/modifier/:id` (`authGuard`, `roleGuard` vendeur), qui réutilise `MaDeposerComponent`.

- [ ] **Étape 1 : Écrire le test Playwright en échec**

```ts
test('le vendeur modifie son annonce, qui repart en relecture', async ({ page }) => {
  await connexion(page, VENDEUR);
  await page.goto('/ma/mes-annonces');
  await page.getByRole('link', { name: 'Modifier' }).first().click();
  await page.getByLabel('Accroche').fill('Accroche corrigée pour le test');
  await allerAuBoutEtEnregistrer(page);
  await expect(page.getByText('En relecture').first()).toBeVisible();
});
test('le vendeur retire son annonce', async ({ page }) => {
  await connexion(page, VENDEUR);
  await page.goto('/ma/mes-annonces');
  await page.getByRole('button', { name: 'Retirer' }).first().click();
  await page.getByRole('button', { name: 'Confirmer le retrait' }).click();
  await expect(page.getByText('Retirée').first()).toBeVisible();
});
test('le motif de retrait par la modération est affiché', async ({ page }) => {
  await connexion(page, VENDEUR_ANNONCE_RETIREE);
  await page.goto('/ma/mes-annonces');
  await expect(page.getByText(MOTIF_DE_TEST)).toBeVisible();
});
```

Le seed de recette gagne les annonces nécessaires, dans un fichier `supabase/seed/annonces-test.sql`.

- [ ] **Étape 2 : Vérifier l'échec**

Run : `npm run e2e -- vendeur`. Expected : FAIL.

- [ ] **Étape 3 : Implémenter**

`MaDeposerComponent` lit un `id` facultatif et se préremplit par `getMyListings`. `/ma/mes-annonces` affiche pour chaque annonce : statut (`En relecture`, `En ligne`, `Retirée`, `Vendue`), motif de modération, liens `Modifier` et `Retirer`. `get_my_ma_listings` doit renvoyer `moderation_note` ; l'ajouter à `MaListing` si besoin.

- [ ] **Étape 4 : Corriger le bug 5**

Le dépôt affiche un champ « Coordonnées communiquées aux repreneurs acceptés », prérempli avec l'e-mail du compte et modifiable.

- [ ] **Étape 5 : Vérifier et commit**

Run : `npm run e2e -- vendeur`. Expected : PASS.

```bash
git add src e2e supabase/seed
git commit -m "Le vendeur modifie et retire ses annonces, voit leur statut et le motif"
```

## Tâche 5 : NDA et validation du repreneur (serveur)

**Priorité :** P0. Règle commerciale centrale.

**Files :**
- Create : `supabase/2026-11-03-acces-dossier-nda.sql`, `backend/tests/integration/test_acces_dossier.py`
- Modify : `backend/app/supabase.py`, `backend/app/main.py`, `backend/tests/test_ma_ai.py`

**Interfaces — produit :**
- Table `ma_access_requests(id, listing_id, requester_id, owner_id, status, nda_version, nda_accepted_at, nda_ip, nda_user_agent, snapshot jsonb, created_at, decided_at, unique(listing_id, requester_id))`, aucune écriture ni lecture directe. `listing_id`, `requester_id` et `owner_id` : `on delete set null`.
- `request_ma_access(p_listing_id uuid, p_accept_nda boolean, p_nda_version text) returns text`. Erreurs : `ACCES_REPRENEUR_REQUIS`, `NDA_REQUIS`, `ANNONCE_INDISPONIBLE`. Une demande refusée reste refusée.
- `decide_ma_access(p_request_id uuid, p_approve boolean) returns void` : le vendeur peut aussi retirer un accès accordé. Erreur : `DEMANDE_INTROUVABLE`.
- `get_my_ma_access(p_listing_id uuid) returns text` : statut seul, ou `null`.
- `list_ma_access_requests_for_owner() returns table(id, listing_id, listing_sector, status, buyer_name, buyer_title, buyer_location, buyer_budget, nda_version, nda_accepted_at, created_at, decided_at)`.
- `get_my_ma_nda_proof(p_request_id uuid) returns jsonb` : au vendeur et au repreneur (`snapshot`, version, date) ; le nom du vendeur n'apparaît pour le repreneur qu'une fois la demande acceptée.
- `SupabaseClient.has_approved_ma_access(user_id: str, listing_id: str) -> bool`.

- [ ] **Étape 1 : Écrire les tests d'intégration en échec**

```python
def test_acces_paye_sans_acceptation_ne_donne_pas_le_dossier(acheteur_ma, annonce_active):
    assert rpc(acheteur_ma, "get_ma_listing_detail", listing_id=annonce_active) == []

def test_nda_obligatoire(acheteur_ma, annonce_active):
    r = rpc_brut(acheteur_ma, "request_ma_access", p_listing_id=annonce_active, p_accept_nda=False, p_nda_version="v0")
    assert "NDA_REQUIS" in r.text

def test_acheteur_sans_acces_ne_peut_pas_demander(acheteur, annonce_active):
    r = rpc_brut(acheteur, "request_ma_access", p_listing_id=annonce_active, p_accept_nda=True, p_nda_version="v0")
    assert "ACCES_REPRENEUR_REQUIS" in r.text

def test_acceptation_ouvre_le_dossier(acheteur_ma, vendeur, demande):
    rpc(vendeur, "decide_ma_access", p_request_id=demande.id, p_approve=True)
    assert rpc(acheteur_ma, "get_ma_listing_detail", listing_id=demande.listing)[0]["contact_info"]

def test_aucune_identite_avant_acceptation(acheteur_ma, demande_en_attente):
    corps = rpc_brut(acheteur_ma, "get_my_ma_nda_proof", p_request_id=demande_en_attente.id).text
    assert NOM_VENDEUR not in corps and demande_en_attente.owner not in corps

def test_acces_expire_ferme_le_dossier(service, acheteur_ma, demande_acceptee):
    expire_acces(service, acheteur_ma.user_id)
    assert rpc(acheteur_ma, "get_ma_listing_detail", listing_id=demande_acceptee.listing) == []

def test_contact_interdit_sans_acceptation(acheteur_ma, vendeur_id):
    r = acheteur_ma.post("/rest/v1/conversations", json={"participant_a": acheteur_ma.user_id, "participant_b": vendeur_id})
    assert r.status_code >= 400

def test_suppression_de_compte_conserve_la_preuve(service, vendeur_jetable, demande_du_jetable):
    rpc(vendeur_jetable, "delete_my_account")
    ligne = service.get(f"/rest/v1/ma_access_requests?id=eq.{demande_du_jetable}&select=nda_version,owner_id").json()[0]
    assert ligne["nda_version"] and ligne["owner_id"] is None

def test_le_vendeur_ne_decide_que_ses_demandes(autre_vendeur, demande_en_attente):
    r = rpc_brut(autre_vendeur, "decide_ma_access", p_request_id=demande_en_attente.id, p_approve=True)
    assert "DEMANDE_INTROUVABLE" in r.text
```

- [ ] **Étape 2 : Vérifier l'échec**

Run : `pytest -m integration tests/integration/test_acces_dossier.py -v`. Expected : FAIL.

- [ ] **Étape 3 : Écrire la migration**

S'inspirer de `2026-10-19-projets-confidentiels-nda.sql`. Dans `get_ma_listing_detail`, la branche repreneur exige : annonce `active`, `has_active_ma_access` et demande `approved`. Dans `enforce_contact_quota`, les paires acheteur-vendeur exigent une demande `approved` entre eux, quel que soit celui qui écrit. Notifier le vendeur avec le lien `/ma/mes-annonces` et le repreneur avec `/ma/annonce/<id>`. La notification au repreneur ne nomme pas le vendeur.

- [ ] **Étape 4 : Écrire le test back en échec**

```python
def test_analyse_refusee_sans_demande_acceptee(client_acheteur_avec_acces_sans_acceptation):
    r = client_acheteur_avec_acces_sans_acceptation.post(f"/api/ma/annonces/{LISTING_ID}/analyse", headers=AUTH)
    assert r.status_code == 403
```

- [ ] **Étape 5 : Implémenter le contrôle dans le back**

La clé `service_role` contourne les règles de la base : `ma_listing_analysis` doit appeler `has_approved_ma_access` juste après le contrôle d'accès, avant de consommer le quota.

- [ ] **Étape 6 : Vérifier et commit**

Run : `pytest && pytest -m integration`. Expected : PASS.

```bash
git add supabase backend
git commit -m "Accès au dossier : NDA du repreneur et acceptation par le vendeur"
```

## Tâche 6 : NDA et validation du repreneur (interface et textes)

**Priorité :** P0.

**Files :**
- Create : `src/app/core/legal/ma-nda.ts`, `src/app/core/services/ma-access.service.ts`, `src/app/shared/components/ma-nda-dialog/ma-nda-dialog.component.ts`, `src/app/features/ma/ma-mes-annonces/ma-access-requests.component.ts`
- Modify : `ma-detail.component.ts`, `ma-mes-annonces.component.ts`, `landing.component.ts`, `faq.component.ts`, `tarifs.component.ts`, `abonnement.component.ts`
- Test : `e2e/reprise.spec.ts`

**Interfaces :**
- Consomme : fonctions SQL de la tâche 5.
- Produit : `MA_NDA_VERSION = 'v0-provisoire-2026-11-03'` ; `maNdaArticles({ buyerName, listingRef }): NdaArticle[]`, où le vendeur est désigné « le Cédant de l'annonce <listingRef> », sans nom.
- Produit : `MaAccessService` avec `status(listingId)`, `request(listingId)`, `listForOwner()`, `decide(requestId, approve)`, `proof(requestId)`.

- [ ] **Étape 1 : Écrire le test Playwright en échec**

```ts
test('parcours : demande, NDA, acceptation, dossier', async ({ browser }) => {
  const repreneur = await nouvellePage(browser, ACHETEUR_MA);
  await repreneur.goto(`/ma/annonce/${ANNONCE}`);
  await expect(repreneur.getByText(COORDONNEES_VENDEUR)).toHaveCount(0);
  await repreneur.getByRole('button', { name: "Demander l'accès au dossier" }).click();
  await expect(repreneur.getByRole('dialog')).toContainText("Cédant de l'annonce");
  await repreneur.getByRole('checkbox', { name: /J'accepte/ }).check();
  await repreneur.getByRole('button', { name: 'Envoyer ma demande' }).click();
  await expect(repreneur.getByText('Demande envoyée')).toBeVisible();

  const vendeur = await nouvellePage(browser, VENDEUR);
  await vendeur.goto('/ma/mes-annonces');
  await vendeur.getByRole('button', { name: 'Accepter' }).first().click();

  await repreneur.reload();
  await expect(repreneur.getByText(COORDONNEES_VENDEUR)).toBeVisible();
  await repreneur.getByRole('link', { name: 'Contacter le cédant' }).first().click();
  await expect(repreneur).toHaveURL(/\/messages\?conversation=/);
});
```

- [ ] **Étape 2 : Vérifier l'échec**

Run : `npm run e2e -- reprise`. Expected : FAIL.

- [ ] **Étape 3 : Implémenter l'interface**

Bloc d'action de `ma-detail.component.ts` selon l'état :
| État | Affichage |
|---|---|
| Visiteur | Créer un compte repreneur |
| Acheteur sans accès | Prendre l'accès |
| Accès en cours, pas de demande | Demander l'accès au dossier (ouvre le NDA) |
| Demande en attente | En attente de la réponse du cédant |
| Demande refusée | Le cédant n'a pas donné suite |
| Demande acceptée | Dossier, coordonnées, messagerie, analyse |

`/ma/mes-annonces` : section « Demandes d'accès » (repreneur, budget, date, NDA), boutons Accepter, Refuser, Retirer l'accès, et téléchargement de la preuve.

- [ ] **Étape 4 : Corriger les textes de vente**

Remplacer toute promesse d'ouverture automatique (`landing.component.ts:262`, `:402`, `:420`, `ma-detail.component.ts:435`, `tarifs.component.ts:251`, `:259`, `faq.component.ts:39`, `abonnement.component.ts:112`) par : « Pendant 12 mois, demandez l'accès aux dossiers qui vous intéressent. Le cédant accepte votre demande après la signature d'un engagement de confidentialité. » Préciser que le paiement ne garantit ni l'acceptation par un cédant ni une transaction.

- [ ] **Étape 5 : Vérifier et commit**

Run : `npm run e2e -- reprise && npx ng build`. Expected : PASS.

```bash
git add src e2e
git commit -m "Parcours repreneur : NDA, demande d'accès, décision du cédant"
```

## Tâche 7 : E-mails métier

**Priorité :** P0.

**Files :**
- Create : `supabase/2026-11-04-emails.sql`, `backend/app/emails.py`, `backend/tests/test_emails.py`, `backend/tests/integration/test_emails_file.py`
- Modify : `backend/app/config.py`, `backend/app/main.py`, `backend/app/supabase.py`, `backend/.env.example`, `backend/README.md`

**Interfaces — produit :**
- Table `email_outbox(id, user_id, subject, link_url, status, attempts, created_at, sent_at)`, service_role uniquement, suppression en cascade avec le profil.
- `queue_notification_email()` : déclencheur après insertion dans `notifications`. Il ne met en file que les liens `/messages`, `/ma/mes-annonces`, `/ma/annonce/`, `/admin/annonces`. Il choisit un sujet générique par préfixe, jamais le `title` ni le `body`. Pour `/messages`, il ignore si le même destinataire a déjà une ligne pour le même lien depuis moins de 15 minutes.
- `claim_email_batch(p_limit int) returns table(id uuid, email text, subject text, link_url text)` avec `for update skip locked`.
- `mark_email_result(p_id uuid, p_ok boolean)` : abandon (`failed`) après 5 tentatives.
- `Settings.email_api_key: str | None`, `email_from: str`.
- `class BrevoClient: async def send(self, to: str, subject: str, text: str) -> None` (lève `EmailError`).
- `async def process_outbox(supabase, mailer, site_url: str) -> int`, boucle de 60 s lancée dans `lifespan` si une clé existe, journalise un avertissement sinon.

- [ ] **Étape 1 : Écrire les tests en échec**

```python
async def test_le_corps_ne_contient_que_le_lien():
    mailer = FakeMailer()
    await process_outbox(FakeSupabase(batch=[ligne(link="/messages?conversation=abc", subject="Nouveau message sur GoFounders")]), mailer, "https://gofounders.fr")
    assert "https://gofounders.fr/messages?conversation=abc" in mailer.sent[0].text
    assert "CONTENU_CONFIDENTIEL" not in mailer.sent[0].text + mailer.sent[0].subject

async def test_echec_envoi_marque_nok():
    sb = FakeSupabase(batch=[ligne()])
    await process_outbox(sb, FailingMailer(), "https://x")
    assert sb.results == [(ID, False)]
```

```python
# Intégration
def test_message_met_en_file_sans_contenu(service, conversation):
    envoie_message(conversation, "CONTENU_CONFIDENTIEL")
    ligne = derniere_ligne_outbox(service)
    assert "CONTENU_CONFIDENTIEL" not in json.dumps(ligne)

def test_rafale_un_seul_email(service, conversation):
    for _ in range(3): envoie_message(conversation, "x")
    assert compte_outbox(service, conversation) == 1
```

- [ ] **Étape 2 : Vérifier l'échec**

Run : `pytest tests/test_emails.py -v && pytest -m integration tests/integration/test_emails_file.py -v`. Expected : FAIL.

- [ ] **Étape 3 : Implémenter**

Migration, puis `emails.py`, avec `httpx` vers `https://api.brevo.com/v3/smtp/email` (en-tête `api-key`). E-mail en texte seul : une phrase, le lien, et une ligne d'identification de l'expéditeur.

- [ ] **Étape 4 : Vérifier et commit**

Run : `pytest && pytest -m integration`. Expected : PASS. Puis un envoi réel vers votre boîte depuis la recette une fois le compte Brevo disponible.

```bash
git add supabase backend
git commit -m "E-mails : messages, modération et demandes d'accès, sans contenu confidentiel"
```

## Tâche 8 : Corrections de la liste de bugs

**Priorité :** P0 pour le démarrage du back ; P1 pour le reste.

**Files :**
- Modify : `backend/app/config.py`, `backend/app/main.py`, `backend/tests/test_api.py`
- Modify : `messages.component.ts`, `messaging.service.ts`, `profil.component.ts`, `ma-detail.component.ts`, `ma.service.ts`, `connexion.component.ts`, `auth.service.ts`
- Test : `e2e/corrections.spec.ts`

- [ ] **Étape 1 : Écrire le test back en échec (bug 3)**

```python
def test_le_back_demarre_sans_cle_ia(monkeypatch):
    monkeypatch.delenv("openAIkey", raising=False)
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    app.dependency_overrides[get_settings] = lambda: Settings(_env_file=None, supabase_url="https://x", supabase_service_role_key="k")
    with TestClient(app) as client:
        assert client.get("/health").status_code == 200
```

Ajouter : sans clé, les routes IA répondent 503. `Settings.ai_provider` renvoie `None` au lieu de lever une erreur. Le `lifespan` lit ses réglages par la même dépendance surchargeable.

- [ ] **Étape 2 : Implémenter et vérifier**

Run : `pytest tests/test_api.py -v`. Expected : PASS.

- [ ] **Étape 3 : Écrire les tests Playwright en échec**

```ts
test('messagerie : ni faux statut ni fausse pièce jointe', async ({ page }) => {
  await connexion(page, VENDEUR); await page.goto('/messages');
  await expect(page.getByText('En ligne')).toHaveCount(0);
  await expect(page.getByLabel('Joindre un fichier')).toHaveCount(0);
});
test('une annonce peut être signalée', async ({ page }) => {
  await page.goto(`/ma/annonce/${ANNONCE}`);
  await page.getByRole('link', { name: 'Signaler cette annonce' }).click();
  await expect(page).toHaveURL(/\/contact\?.*sujet=probleme/);
});
test('le message après inscription est correct', async ({ page }) => {
  await page.goto('/connexion?confirmation=1');
  await expect(page.getByText('Compte créé. Confirmez votre e-mail, puis connectez-vous.')).toBeVisible();
});
```

- [ ] **Étape 4 : Corriger**

- Retirer « En ligne » (`messages.component.ts:49`, `isOnline`) et le bouton de pièce jointe (`:88-98`, `:407`).
- Retirer le faux bouton « Sauvegarder » de `/profil/:id`, ainsi que le bouton « Signaler ce profil » sans action.
- Ajouter le lien de signalement sur `ma-detail.component.ts`, avec l'identifiant de l'annonce dans le formulaire de contact.
- Afficher date et heure quand un message date d'un autre jour (`messaging.service.ts:401`).
- Retirer `MA_LISTINGS` et `findMaListingById` des branches Supabase de `ma.service.ts:204` et `:217`.
- Corriger les textes `connexion.component.ts:146` et `auth.service.ts:477`.

- [ ] **Étape 5 : Vérifier et commit**

Run : `npm run e2e -- corrections && npx ng build && cd backend && pytest`. Expected : PASS.

```bash
git add src e2e backend
git commit -m "Corrections : démarrage sans IA, faux affichages, signalement d'annonce, textes"
```

# Phase C — Mise en ligne

## Tâche 9 : Paiement réel de l'accès repreneur

**Priorité :** P0. Dépend d'un compte Stripe, le mode test suffit pour développer.

**Files :**
- Modify : `backend/app/payments.py`, `backend/tests/test_payments.py`, `src/app/core/services/payment.service.ts`, `backend/README.md`
- Create : `docs/MISE-EN-LIGNE.md`

- [ ] **Étape 1 : Écrire le test en échec**

```python
def test_checkout_exige_acceptation_des_cgv():
    params = checkout_params("MA_ACCESS", user_id="u", customer_id="c", site_url="https://x", listing_id=None, evidence=None)
    assert params["consent_collection"] == {"terms_of_service": "required"}
```

- [ ] **Étape 2 : Implémenter et vérifier**

Ajouter `consent_collection` et un texte de renoncement au délai de rétractation dans `custom_text`, à faire valider par l'avocat. Dans `PaymentService`, si `environment.production` est vrai et le mode vaut `simulation`, refuser l'achat avec un message clair. Run : `pytest tests/test_payments.py -v`. Expected : PASS.

- [ ] **Étape 3 : Essai réel en mode test**

Sur la recette, `paymentMode: 'stripe'`, `stripe listen --forward-to localhost:8000/api/stripe/webhook`, payer avec `4242 4242 4242 4242`.
Attendu :
- `ma_access_expires_at` à +12 mois ;
- une ligne dans `payments` ;
- `/paiement/merci` confirme ;
- un événement rejoué par `stripe events resend` ne prolonge rien.

Consigner le résultat dans `docs/MISE-EN-LIGNE.md`.

- [ ] **Étape 4 : Écrire la procédure de remboursement**

`docs/MISE-EN-LIGNE.md` : remboursement dans Stripe, puis retrait manuel de l'accès par une requête SQL fournie. Le traitement automatique reste facultatif.

- [ ] **Étape 5 : Commit**

```bash
git add backend src docs/MISE-EN-LIGNE.md
git commit -m "Paiement de l'accès repreneur : consentement CGV et essai Stripe de bout en bout"
```

## Tâche 10 : Conformité légale

**Priorité :** P0. Dépend des informations de la société et de l'avocat.

**Files :**
- Create : `src/app/core/config/company.ts`, `src/app/features/legal/cgv.component.ts`, `supabase/2026-11-05-acceptation-cgu.sql`
- Modify : `features/legal/*`, `app.routes.ts`, `footer.component.ts`, `inscription.component.ts`, `auth.service.ts`, `core/legal/ma-nda.ts`, `src/index.html`, `src/styles.scss`, `package.json`
- Test : `e2e/legal.spec.ts`, `backend/tests/integration/test_cgu.py`

**Interfaces :**
- Produit : `COMPANY: { name, legalForm, capital, siren, address, publicationDirector, host }`, `LEGAL_VERSION: string`.
- Produit : colonnes `profiles.terms_accepted_at`, `profiles.terms_version`, remplies par `handle_new_auth_user` depuis les métadonnées du compte.

- [ ] **Étape 1 : Écrire les tests en échec**

```ts
test("l'inscription exige les CGU", async ({ page }) => {
  await remplirInscriptionVendeur(page);
  await expect(page.getByRole('button', { name: 'Créer mon compte' })).toBeDisabled();
  await page.getByRole('checkbox', { name: /conditions générales/ }).check();
  await expect(page.getByRole('button', { name: 'Créer mon compte' })).toBeEnabled();
});
test('aucune page légale ne reste provisoire', async ({ page }) => {
  for (const p of ['/mentions-legales', '/conditions-generales', '/conditions-de-vente', '/confidentialite']) {
    await page.goto(p);
    await expect(page.getByText(/provisoire|à compléter/i)).toHaveCount(0);
  }
});
test('aucun appel à Google Fonts', async ({ page }) => {
  const urls: string[] = []; page.on('request', r => urls.push(r.url()));
  await page.goto('/'); await page.waitForLoadState('networkidle');
  expect(urls.filter(u => u.includes('fonts.g'))).toEqual([]);
});
```

```python
def test_inscription_enregistre_la_version_des_cgu(service, compte_cree_avec_cgu):
    ligne = profil(service, compte_cree_avec_cgu)
    assert ligne["terms_version"] and ligne["terms_accepted_at"]
```

- [ ] **Étape 2 : Vérifier l'échec**

Run : `npm run e2e -- legal`. Expected : FAIL.

- [ ] **Étape 3 : Implémenter**

- Case à cocher d'inscription et transmission par les métadonnées du compte.
- Pages alimentées par `COMPANY` : éditeur, hébergeur, sous-traitants réels (Supabase, Stripe, Brevo, fournisseur d'IA, hébergeur), durées de conservation, droit de rétractation, droits RGPD.
- Remplacement du lien Google Fonts par `@fontsource/plus-jakarta-sans`.
- Pas de bandeau cookies tant qu'aucun traceur n'est ajouté.

- [ ] **Étape 4 : Faire relire**

Transmettre CGU, CGV, confidentialité, NDA et le schéma du parcours à l'avocat. Le test « aucune page provisoire » et le passage du NDA en version finale n'ont lieu **qu'après cette validation**. Jusque-là, l'étape reste ouverte et bloque la mise en ligne.

- [ ] **Étape 5 : Vérifier et commit**

Run : `npm run e2e -- legal && pytest -m integration tests/integration/test_cgu.py`. Expected : PASS.

```bash
git add src supabase e2e backend package.json package-lock.json
git commit -m "Conformité : CGU et CGV acceptées, pages légales complètes, polices hébergées"
```

## Tâche 11 : Déploiement, intégration continue et référencement de base

**Priorité :** P0. Dépend du domaine et de l'hébergeur.

**Files :**
- Create : `scripts/write-environment.mjs`, `render.yaml`, `.github/workflows/ci.yml`, `src/robots.txt`, `src/sitemap.xml`
- Modify : `angular.json`, `package.json`, `src/index.html`, `src/app/app.routes.ts`, `docs/MISE-EN-LIGNE.md`, `backend/README.md`

- [ ] **Étape 1 : Écrire le test Playwright en échec**

```ts
test('chaque page publique a son titre et une description', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.+/);
  await page.goto('/tarifs');
  await expect(page).toHaveTitle(/Tarifs/);
});
test('robots.txt interdit les pages privées', async ({ request }) => {
  const texte = await (await request.get('/robots.txt')).text();
  expect(texte).toContain('Disallow: /admin');
});
```

- [ ] **Étape 2 : Implémenter**

- `write-environment.mjs` écrit `environment.ts` depuis `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `API_URL`, `PAYMENT_MODE`, `APP_ENV`. Il **s'arrête en erreur** si une variable manque, ou si `APP_ENV=production` avec un `PAYMENT_MODE` autre que `stripe`.
- Script `"build:ci": "node scripts/write-environment.mjs && ng build"`.
- `render.yaml` : site statique avec réécriture de toutes les routes vers `index.html`, service web `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, région Francfort, contrôle de santé `/health`.
- CI à chaque push : `build:ci` avec valeurs factices et `pytest`.
- `title` par route publique, description dans `index.html`, `robots.txt`, `sitemap.xml`.

- [ ] **Étape 3 : Vérifier localement**

Run : `APP_ENV=production PAYMENT_MODE=simulation node scripts/write-environment.mjs; echo $?`. Expected : code différent de 0. Run : `npm run e2e`. Expected : PASS.

- [ ] **Étape 4 : Configurer les services**

Consigner dans `docs/MISE-EN-LIGNE.md` chaque réglage, à cocher à la mise en ligne :
- Supabase : Site URL et URL de redirection, serveur SMTP personnalisé (bug 12), règle de mot de passe identique à l'application.
- Stripe : webhook de production, portail, conditions générales.
- Back : `ALLOWED_ORIGINS`, `SITE_URL`, clés, `ENABLED_PRODUCTS=MA_ACCESS`.
- Supervision : sonde externe sur `/health`, alerte à une adresse suivie.
- Boîte `support@` : réception testée (bug 13).
- Modèle d'IA par défaut : un appel réel réussi (bug 13).

- [ ] **Étape 5 : Commit**

```bash
git add scripts render.yaml .github src angular.json package.json docs backend/README.md
git commit -m "Déploiement reproductible, intégration continue et référencement de base"
```

## Tâche 12 : Répétition générale et mise en ligne

**Priorité :** P0. Dernière étape.

**Files :**
- Create : `e2e/parcours-complet.spec.ts`
- Modify : `docs/MISE-EN-LIGNE.md`

- [ ] **Étape 1 : Écrire le parcours complet**

Sur le site de recette déployé, en mode Stripe test, avec des comptes créés pendant le test :
1. Un vendeur s'inscrit, confirme son e-mail, dépose une annonce.
2. Un visiteur ne la voit pas. Un admin la publie. Le visiteur la voit, sans coordonnées.
3. Un acheteur s'inscrit et paie.
4. Il signe le NDA et envoie sa demande. Le vendeur reçoit l'e-mail, accepte.
5. L'acheteur lit le dossier, écrit. Le vendeur reçoit l'e-mail, répond.
6. Le vendeur déclare la vente. L'annonce disparaît de `/ma`, le dossier se ferme pour l'acheteur.
7. L'acheteur supprime son compte. La preuve de NDA reste.

- [ ] **Étape 2 : Lancer sur la recette**

Run : `E2E_BASE_URL=<recette> npm run e2e -- parcours-complet`. Expected : PASS.

- [ ] **Étape 3 : Vérifier mobile et accessibilité**

Rejouer le parcours sur un écran de 390 px (projet Playwright mobile). Contrôler le clavier et les libellés ARIA du NDA et des boutons d'acceptation.

- [ ] **Étape 4 : Préparer la production**

Jouer sur la base de production, dans l'ordre : les migrations manquantes (bug 1), puis `supabase/production/supprimer-paiements-simules.sql`.
Attendu, vérifié avec un compte connecté : `rpc/simulate_purchase` renvoie PGRST202.

- [ ] **Étape 5 : Ouvrir progressivement**

Avec un premier paiement réel remboursé juste après, vérifier encaissement, facture et droits. Publier quelques annonces réelles relues, puis ouvrir les inscriptions et démarrer le test de 4 semaines de `docs/REFONTE-REPRISE.md` (seuils H1, H2, H3).

- [ ] **Étape 6 : Commit**

```bash
git add e2e docs/MISE-EN-LIGNE.md
git commit -m "Répétition générale du parcours complet et liste de mise en ligne"
```

---

## Ordre et dépendances

```
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12
```

Les tâches 7 et 8 peuvent s'échanger. Les tâches 9, 10 et 11 peuvent avancer en parallèle dès que vos actions sont faites. La tâche 12 attend tout le reste.
