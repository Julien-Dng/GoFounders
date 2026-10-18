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

Codes d'erreur : `401` non connecté, `403` plan FREE, `429` plus de `MAX_REQUESTS_PER_HOUR` questions
par heure, `503` fournisseur d'IA indisponible.

## Organisation

- `app/main.py` : routes FastAPI, authentification, contrôle du plan, limite de requêtes
- `app/supabase.py` : vérification du jeton et lecture du contexte utilisateur
- `app/prompt.py` : system prompt (instructions fixes + données de l'utilisateur)
- `app/assistant.py` : prompt, lecture de la réponse JSON, filtrage des actions selon le rôle
- `app/llm_openai.py` : appel OpenAI (Responses API, sortie JSON stricte, `store=False`)
- `app/llm_anthropic.py` : appel Claude (`claude-opus-5-5`, repli automatique en cas de refus)
- `app/models.py` : modèles de données

## Déploiement

N'importe quel hébergeur Python (Render, Railway, Fly.io, Scaleway…) : commande de démarrage
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`, variables d'environnement de `.env.example`, et
l'URL du site Angular dans `ALLOWED_ORIGINS`. La limite de requêtes est gardée en mémoire : avec
plusieurs instances, elle s'applique par instance.
