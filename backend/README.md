# GoFounders — back Python (assistant IA)

API FastAPI qui sert l'assistant contextuel de `/coaching-ia`. Elle :

1. vérifie le jeton de session Supabase envoyé par l'appli Angular ;
2. vérifie côté serveur que l'utilisateur est en plan PRO ou PREMIUM ;
3. charge ses données réelles (profil, projet, conversations, annonces M&A) avec la clé `service_role` ;
4. interroge le modèle d'IA avec ces données dans le prompt et renvoie une réponse + des actions rapides.

Fournisseur d'IA : **OpenAI** si la clé `openAIkey` (ou `OPENAI_API_KEY`) est renseignée, sinon **Claude**
(`ANTHROPIC_API_KEY`). Modèle par défaut : `gpt-6.1-sol` (modifiable avec `OPENAI_MODEL`).

## Installation

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows : .venv\Scripts\activate
pip install -r requirements-dev.txt
cp .env.example .env             # puis remplir les clés
```

Le fichier `.env` peut aussi être à la racine du projet (`../.env`) : les deux sont lus.

```bash
```

## Lancement

```bash
uvicorn app.main:app --reload --port 8000
```

Côté Angular, `aiApiUrl` dans `src/environments/environment.ts` doit pointer vers cette URL
(`http://localhost:8000` par défaut).

## Tests

```bash
pytest
```

Les tests n'appellent ni Supabase ni OpenAI / Anthropic (clients simulés).

## Routes

| Méthode | Route | Rôle |
|---|---|---|
| `GET` | `/health` | Vérification que le service tourne |
| `GET` | `/api/coaching-ia/contexte` | Données affichées dans le panneau « Ce que je sais sur vous » |
| `POST` | `/api/coaching-ia/messages` | `{ "messages": [{ "role": "user", "content": "..." }] }` → `{ "reply", "actions" }` |
| `POST` | `/api/ma/brouillon-annonce` | Vendeur : `{ "description": "..." }` → teaser, description anonymisée, champs du formulaire, `identifying_details` |
| `POST` | `/api/ma/annonces/{id}/analyse` | Acheteur avec accès repreneur en cours : synthèse, points forts, points de vigilance, questions, vérifications. 3 analyses par mois, illimitées avec l'accès Plus (402 au-delà) |
| `POST` | `/api/paiements/session` | Membre connecté : `{ "product", "listing_id"?, "evidence"? }` → `{ "url" }` de la page de paiement Stripe Checkout (rôle et propriété de l'annonce vérifiés) |
| `POST` | `/api/paiements/portail` | Membre connecté ayant déjà payé : `{ "url" }` du portail Stripe (factures, carte, résiliation) |
| `POST` | `/api/stripe/webhook` | Appelé par Stripe uniquement (signature vérifiée) : accorde, prolonge ou retire les droits |

Codes d'erreur : `401` non connecté, `403` plan FREE, `429` plus de `MAX_REQUESTS_PER_HOUR` questions
par heure, `503` fournisseur d'IA indisponible.

## E-mails métier (Resend)

Supabase met en file (`email_outbox`, migration `2026-10-28-lancement.sql`) les événements importants : nouveau
message (au plus un e-mail par conversation toutes les 3 heures, réglable dans Paramètres), demande d'accès à un
dossier, accès accepté ou refusé, annonce publiée, refusée, retirée ou remise en ligne. Le back les envoie toutes les
minutes avec Resend (`app/emails.py`). Aucun e-mail ne contient d'information confidentielle.

1. Créer un compte Resend et y vérifier le domaine du site (enregistrements DNS fournis par Resend).
2. Dans `backend/.env` : `RESEND_API_KEY=…` et `RESEND_FROM=GoFounders <notifications@votre-domaine.fr>`.
3. Redémarrer le back. Sans clé, rien n'est envoyé : les e-mails attendent dans la file et partiront dès que la clé
   sera renseignée (les plus anciens peuvent être purgés avant : `delete from email_outbox where sent_at is null;`).

Les e-mails de compte (confirmation, mot de passe) restent envoyés par Supabase : configurer Resend comme serveur
SMTP dans Supabase (Authentication > Emails > SMTP Settings) pour qu'ils partent de votre domaine.

## Paiements Stripe

Tant que `STRIPE_SECRET_KEY` est vide, les routes de paiement répondent `503` et le site reste en
`paymentMode: 'simulation'`. Pour passer aux vrais paiements :

1. **Supabase** : exécuter `supabase/2026-10-24-paiements-stripe.sql` (après les migrations précédentes).
2. **Stripe, mode test d'abord** (dashboard.stripe.com, interrupteur « Mode test ») :
   - Développeurs > Clés API : copier la clé secrète `sk_test_…` dans `STRIPE_SECRET_KEY` ;
   - Développeurs > Webhooks > Ajouter un endpoint : `https://<votre-back>/api/stripe/webhook`, événements
     `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted` ; copier le secret de
     signature `whsec_…` dans `STRIPE_WEBHOOK_SECRET` ;
   - Paramètres > Facturation > Portail client : activer le portail (résiliation, factures, moyens de paiement).
3. **`.env`** : renseigner aussi `SITE_URL` (adresse publique du site Angular).
4. **Site** : `paymentMode: 'stripe'` dans `src/environments/environment.ts`.
5. **Tester** avec la carte `4242 4242 4242 4242` (date future, n'importe quel CVC). En local, la CLI Stripe
   relaie les webhooks : `stripe listen --forward-to localhost:8000/api/stripe/webhook`.
6. **Mise en ligne** : passer aux clés `sk_live_…` et au webhook du mode réel, puis exécuter
   `supabase/production/supprimer-paiements-simules.sql` (supprime `simulate_purchase` et
   `simulate_listing_purchase`).

Les prix sont définis dans `app/payments.py` (`OFFERS`), à garder alignés sur `src/app/core/config/offers.ts`.
Aucun produit n'est à créer dans Stripe. PREMIUM reste sur devis (non achetable en ligne).

## Organisation

- `app/main.py` : routes FastAPI, authentification, contrôle du plan, limite de requêtes
- `app/supabase.py` : vérification du jeton, lecture du contexte utilisateur, droits après paiement (`apply_purchase`)
- `app/payments.py` : catalogue des offres, appels à l'API Stripe (httpx, sans SDK) et vérification de la signature des webhooks
- `app/prompt.py` : system prompt (instructions fixes + données de l'utilisateur)
- `app/ma_ai.py` : outils IA M&A (brouillon d'annonce anonymisée, analyse de dossier), limités à 10 demandes par heure et par utilisateur ; `owner_id` et `contact_info` ne sont jamais transmis au modèle
- `app/assistant.py` : prompt, lecture de la réponse JSON, filtrage des actions selon le rôle
- `app/llm_openai.py` : appel OpenAI (Responses API, sortie JSON stricte, `store=False`)
- `app/llm_anthropic.py` : appel Claude (`claude-opus-5-5`, repli automatique en cas de refus)
- `app/models.py` : modèles de données

## Déploiement

N'importe quel hébergeur Python (Render, Railway, Fly.io, Scaleway…) : commande de démarrage
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`, variables d'environnement de `.env.example`, et
l'URL du site Angular dans `ALLOWED_ORIGINS`. La limite de requêtes est gardée en mémoire : avec
plusieurs instances, elle s'applique par instance.
