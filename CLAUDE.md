# CLAUDE.md — GoFounders

> Ce fichier est la référence complète du projet GoFounders.
> Lis-le entièrement avant d'écrire la moindre ligne de code.

---

## 🎯 Vision du produit

**GoFounders** est une plateforme française qui met en relation :
- Des **porteurs de projet / entrepreneurs** qui cherchent des talents, associés, co-fondateurs
- Des **talents / experts** (développeurs, commerciaux, experts métier) qui proposent leurs compétences
- Des **acheteurs / repreneurs** d'entreprises existantes
- Des **vendeurs** souhaitant céder leur entreprise

Le produit est composé de **deux verticales** :
1. **Marketplace Talents & Associés** — matching entre entrepreneurs et profils
2. **Marketplace M&A** — achat et cession d'entreprises (publication gratuite pour les vendeurs, accès repreneur 149 € / 12 mois)

---

## 👤 Rôles utilisateur

Chaque utilisateur a **un seul rôle**, choisi à l'inscription et non modifiable ensuite (pas de profil « les deux ») :

| Rôle (`profileType`) | Libellé | Verticale | `/recherche` affiche |
|---|---|---|---|
| `entrepreneur` | Porteur de projet | Talents & Associés | Les talents |
| `talent` | Profil | Talents & Associés | Les projets |
| `buyer` | Acheteur / Repreneur | M&A | — (redirigé vers `/ma`) |
| `seller` | Vendeur M&A | M&A | — (redirigé vers `/ma`) |

- `RoleGuard` (`route.data.allowedRoles`) protège `/recherche` ; le dashboard et la navigation s'adaptent au rôle.
- Libellés et rôles de la marketplace : `PROFILE_TYPE_LABELS` et `TALENT_MARKETPLACE_ROLES` dans `user.model.ts`.
- Sur le site, le mot **« talent » n'est jamais affiché** : on parle de **« profil »** (« Je propose mon profil », « profils disponibles »). La valeur technique reste `talent` (base et code).

---

## 💰 Modèle tarifaire

### Abonnements (Marketplace Talents & Associés) — grille d'octobre 2026

Principe : **seule la page tarifs fait foi**, et elle n'annonce que ce qui existe (badge « Bientôt » sinon).
FREE généreux pour attirer du monde, PRO centré sur une promesse (« Trouvez votre associé plus vite »),
PREMIUM = accompagnement humain. Les talents n'ont pas besoin de payer.

| Fonctionnalité | FREE | PRO (49€/mois, sans engagement) | PREMIUM (sur devis) |
|---|---|---|---|
| Profil, recherche, profils visibles | Illimités | Illimités | Illimités |
| Nouveaux contacts / mois | Talents : illimités · Porteurs de projet : 3 | Illimités | Illimités |
| Réponses dans les conversations | Illimitées | Illimitées | Illimitées |
| Score de compatibilité (%) | ✅ | ✅ | ✅ |
| Matching intelligent (raisons détaillées du score) | ❌ | ✅ | ✅ |
| Assistant IA personnel (`/coaching-ia`) | ❌ | ✅ | ✅ |
| Recherche avancée | ❌ | Bientôt | Bientôt |
| Projet mis en avant dans les résultats | ❌ | Bientôt | Bientôt |
| Présentations qualifiées d'associés | ❌ | ❌ | ✅ |
| Mise en relation investisseurs et experts juridiques partenaires | ❌ | ❌ | ✅ |
| Interlocuteur dédié | ❌ | ❌ | ✅ |

- Quotas vérifiés par Supabase (`free_quota_limits`) : 3 nouveaux contacts par mois pour les porteurs de projet en FREE, aucune limite de messages
- Raisons du score : `canSeeMatchReasons()` dans `user.model.ts` (PRO et PREMIUM)
- Le générateur de pitch a été retiré (hors promesse de mise en relation)

### M&A (indépendant de l'abonnement, réservé aux rôles acheteur et vendeur)
- **Vendeur** (`seller`) : publication **gratuite** de son annonce anonymisée (offre de lancement) ; il ne voit pas le détail des annonces des autres vendeurs
- **Acheteur** (`buyer`) : **149 € pour 12 mois** d'accès aux dossiers complets + contact direct des vendeurs (`ma_access_expires_at`)
- **Porteur de projet / Talent** : annonces **anonymisées** uniquement
- Helpers : `canAccessMaDetails()` et `canPublishMaListing()` dans `user.model.ts` ; accès valide = `has_active_ma_access()` côté Supabase

---

## 🗺️ Routes de l'application

```
/                          Landing page (publique)
/tarifs                    Page tarifs (publique)
/inscription               Onboarding — choix du type de profil
/connexion                 Login / mot de passe oublié (envoi du lien de réinitialisation)
/reinitialiser-mot-de-passe  Choix du nouveau mot de passe (ouverte par le lien de l'email)

/dashboard                 Accueil connecté (protégé)
/recherche                 Matching / exploration des profils (protégé)
/profil/:id                Profil public d'un utilisateur (protégé)
/profil/modifier           Édition de son propre profil (protégé)
/messages                  Liste des conversations (protégé)
/messages/:id              Conversation individuelle (protégé)
/coaching-ia               Assistant IA contextuel — PRO uniquement (protégé)

/ma                        Marketplace M&A — accueil (publique, détails verrouillés)
/ma/annonce/:id            Détail d'une annonce M&A (accès repreneur requis)
/ma/deposer                Déposer une annonce M&A (paiement 149€ requis)

/abonnement                Gérer son abonnement Stripe (protégé)
/parametres                Paramètres : email, mot de passe, visibilité dans la recherche, suppression du compte (protégé)
```

**Guards Angular à implémenter :**
- `AuthGuard` → redirige vers `/connexion` si non connecté
- `PlanGuard` → vérifie le niveau d'abonnement (FREE / PRO / PREMIUM)
- `MaAccessGuard` → acheteur avec un accès repreneur en cours (`/ma/annonce/:id`)
- `RoleGuard` → réserve une route à certains rôles (`/recherche` : entrepreneur et talent ; `/ma/deposer` : vendeur)

---

## 🧩 Fonctionnalités détaillées par page

### `/` — Landing Page
- Navbar fixe : logo + liens nav + boutons Connexion / S'inscrire
- Hero : headline, sous-titre, 2 CTA, badges de confiance
- Section "Comment ça marche" : 3 étapes
- Section "Cas d'usage" : 3 cards (associé / talent / M&A)
- Barre de stats sociales : nb profils, projets, mises en relation
- Testimonials : 2-3 avis
- Teaser M&A (fond navy + CTA amber)
- Teaser tarifs simplifié
- Footer complet

### `/inscription` — Onboarding (3 étapes)
- **Étape 1** : Choix du type de profil (un seul rôle par utilisateur, non modifiable ensuite)
  - Porteur de projet
  - Profil (« Je propose mon profil »)
  - Acheteur / Repreneur
  - Vendeur M&A
- **Étape 2** : Informations de base (nom, email, mot de passe, localisation)
  - Mot de passe : 8 caractères minimum, une minuscule, une majuscule, un chiffre et un symbole, mots de passe courants refusés
    (`core/validators/password-policy.validator.ts`, critères affichés par `PasswordCriteriaComponent`).
    Règle à garder identique dans Supabase : Authentication > Sign In / Providers > Email
- **Étape 3** : Détails du profil selon le type choisi
- Barre de progression en haut
- Pas de soumission de formulaire HTML — utiliser des event handlers Angular

### `/dashboard` — Dashboard connecté
- Sidebar gauche fixe (240px) avec navigation complète
- Top bar : recherche globale + notifications + avatar
- Colonne gauche : carte de complétion de profil + bannière upsell PRO
- Colonne centrale : matches du jour + activité récente
- Colonne droite : widget Assistant IA + statistiques
- Floating chat bubble en bas à droite (lien vers /coaching-ia)

### `/recherche` — Matching
- Sidebar filtres (280px) : type, secteur, stade, localisation, disponibilité
- Grille principale 3 colonnes de cards profils
- Bannière IA : "X profils correspondent particulièrement à votre projet"
- Cards profils : avatar, nom, rôle, secteur, stade, bio, tags compétences, score de compatibilité %
- Profils illimités pour tous ; en FREE, le score s'affiche sans ses raisons (lien vers PRO)

### `/profil/:id` — Profil public
- Cover banner + avatar + infos principales
- Badge de compatibilité (avec ses raisons)
- Boutons : "Envoyer un message" + "Sauvegarder"
- Tabs : Présentation / Projet / Expérience / Avis
- Sidebar droite : infos rapides + carte NDA (verrouillée FREE)
- Lien "Signaler ce profil"

### `/messages` — Messagerie
- Liste conversations à gauche
- Zone de chat à droite (style WhatsApp/iMessage)
- Indicateur de lecture + horodatage
- **State FREE (porteur de projet)** : compteur des 3 nouveaux contacts du mois ; réponses illimitées

### `/coaching-ia` — Assistant IA (PRO)
- Layout 2 colonnes
- Gauche : panneau contextuel (profil, matches, activité + questions suggérées)
- Droite : interface de chat avec historique et réponses contextuelles
- L'IA connaît : le profil de l'utilisateur, ses matches, ses stats sur la plateforme
- **State FREE** : overlay complet avec CTA upgrade

### `/ma` — Marketplace M&A
- Header navy avec stats + 2 CTA (amber)
- Barre de filtres horizontale : secteur, CA, prix, région, type
- Grille 2 colonnes de cards annonces anonymisées
- Cards : secteur, métriques clés (CA, marge, ancienneté), fourchette de prix
- **State sans accès M&A** : détails floutés, invitation « Accès repreneur 149 € / 12 mois »
- Section bottom CTA amber : "Déposez votre annonce"

### `/ma/deposer` — Déposer une annonce
- Wizard en étapes : infos générales → métriques → prix → confidentialité → aperçu et publication
- Publication gratuite pour les vendeurs (offre de lancement), sans étape de paiement
- Aperçu de l'annonce avant publication

### `/coaching-ia` — Assistant IA
- Appel à l'API Anthropic avec contexte utilisateur injecté dans le system prompt
- System prompt inclut : profil, matches actifs, statistiques, secteur
- Réponses contextualisées avec boutons d'action rapide

---

## 🎨 Design System

### Couleurs
```scss
$color-primary: #0F1F3D;      // Navy profond — couleur principale
$color-accent: #2563EB;       // Bleu électrique — CTA, liens, accents
$color-ma-accent: #D97706;    // Amber — tout ce qui concerne le M&A
$color-bg: #FFFFFF;           // Fond principal
$color-bg-subtle: #F8FAFC;    // Fond cards et sections alternées
$color-text: #1E293B;         // Texte principal
$color-text-muted: #64748B;   // Texte secondaire
$color-border: #E2E8F0;       // Bordures
$color-success: #10B981;      // Vert — confirmations
$color-danger: #EF4444;       // Rouge — erreurs
```

### Typographie
- Police : **Inter** (Google Fonts)
- Fallback : Plus Jakarta Sans, sans-serif
- Hiérarchie : H1 (48px bold) / H2 (36px bold) / H3 (24px semibold) / Body (16px regular)

### Composants réutilisables à créer
```
ProfileCard          — Card profil (marketplace)
MaCard               — Card annonce M&A
PlanBadge            — Badge FREE / PRO / PREMIUM
CompatibilityBadge   — Score de compatibilité en %
LockedOverlay        — Overlay "Passer en PRO"
StepWizard           — Wizard multi-étapes (onboarding, M&A)
SidebarNav           — Navigation latérale dashboard
ChatBubble           — Interface de chat
NotificationBell     — Cloche notifications
AvatarUpload         — Upload photo de profil
```

---

## 🏗️ Architecture Angular

### Structure des dossiers
```
src/
├── app/
│   ├── core/
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   ├── plan.guard.ts
│   │   │   └── ma-access.guard.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── user.service.ts
│   │   │   ├── matching.service.ts
│   │   │   ├── messaging.service.ts
│   │   │   ├── ma.service.ts
│   │   │   ├── ai.service.ts
│   │   │   └── payment.service.ts
│   │   ├── models/
│   │   │   ├── user.model.ts
│   │   │   ├── project.model.ts
│   │   │   ├── match.model.ts
│   │   │   ├── message.model.ts
│   │   │   └── ma-listing.model.ts
│   │   └── interceptors/
│   │       └── auth.interceptor.ts
│   ├── shared/
│   │   ├── components/
│   │   │   ├── profile-card/
│   │   │   ├── ma-card/
│   │   │   ├── plan-badge/
│   │   │   ├── compatibility-badge/
│   │   │   ├── locked-overlay/
│   │   │   ├── step-wizard/
│   │   │   ├── sidebar-nav/
│   │   │   └── navbar/
│   │   └── pipes/
│   │       └── truncate.pipe.ts
│   ├── features/
│   │   ├── landing/
│   │   ├── auth/
│   │   │   ├── inscription/
│   │   │   └── connexion/
│   │   ├── dashboard/
│   │   ├── recherche/
│   │   ├── profil/
│   │   ├── messages/
│   │   ├── coaching-ia/
│   │   ├── ma/
│   │   │   ├── ma-home/
│   │   │   ├── ma-detail/
│   │   │   └── ma-deposer/
│   │   ├── abonnement/
│   │   └── parametres/
│   ├── app.routes.ts
│   ├── app.config.ts
│   └── app.component.ts
├── assets/
│   ├── images/
│   └── icons/
└── styles/
    ├── _variables.scss
    ├── _typography.scss
    ├── _components.scss
    └── styles.scss
```

### Principes Angular à respecter
- **Angular v17+** avec Standalone Components (pas de NgModules)
- **Signals** pour la gestion d'état local
- **Control Flow** syntaxe (`@if`, `@for`, `@switch`) — pas de `*ngIf` / `*ngFor`
- **Lazy loading** sur toutes les routes features
- **OnPush** Change Detection Strategy sur tous les composants
- **inject()** function plutôt que constructeur injection
- Pas de `any` en TypeScript — tout est typé

### Routing (app.routes.ts)
```typescript
export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/landing/landing.component') },
  { path: 'tarifs', loadComponent: () => import('./features/tarifs/tarifs.component') },
  { path: 'connexion', loadComponent: () => import('./features/auth/connexion/connexion.component') },
  { path: 'inscription', loadComponent: () => import('./features/auth/inscription/inscription.component') },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component') },
      { path: 'recherche', loadComponent: () => import('./features/recherche/recherche.component') },
      { path: 'profil/:id', loadComponent: () => import('./features/profil/profil.component') },
      { path: 'profil/modifier', loadComponent: () => import('./features/profil/modifier/modifier.component') },
      { path: 'messages', loadComponent: () => import('./features/messages/messages.component') },
      { path: 'messages/:id', loadComponent: () => import('./features/messages/conversation/conversation.component') },
      { path: 'coaching-ia', canActivate: [PlanGuard], data: { requiredPlan: 'PRO' }, loadComponent: () => import('./features/coaching-ia/coaching-ia.component') },
      { path: 'abonnement', loadComponent: () => import('./features/abonnement/abonnement.component') },
      { path: 'parametres', loadComponent: () => import('./features/parametres/parametres.component') },
    ]
  },
  { path: 'ma', loadComponent: () => import('./features/ma/ma-home/ma-home.component') },
  { path: 'ma/deposer', canActivate: [AuthGuard], loadComponent: () => import('./features/ma/ma-deposer/ma-deposer.component') },
  { path: 'ma/annonce/:id', loadComponent: () => import('./features/ma/ma-detail/ma-detail.component') },
  { path: '**', redirectTo: '' }
];
```

---

## 🔥 Stack technique

| Technologie | Usage |
|---|---|
| **Angular v17+** | Framework frontend |
| **Firebase Auth** | Authentification (email, Google, Apple) |
| **Firestore** | Base de données |
| **Firebase Storage** | Photos de profil, documents |
| **Firebase Functions** | Backend logic (matching, notifications) |
| **Stripe** | Abonnements PRO/PREMIUM + accès repreneur M&A (12 mois) |
| **OpenAI** (ou **Claude** en option) | Assistant IA contextuel (/coaching-ia), appelé depuis le back Python ; fournisseur choisi selon la clé présente dans `.env` |
| **Python / FastAPI** (`backend/`) | Back de l'assistant IA : vérifie la session Supabase et le plan, injecte le contexte, appelle le modèle d'IA |
| **Angular Material ou PrimeNG** | Composants UI de base |
| **SCSS** | Styles avec variables design system |

---

## 🗄️ Modèles de données Firestore

### Collection `users`
```typescript
interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  location: string;
  profileType: 'entrepreneur' | 'talent' | 'buyer' | 'seller'; // rôle unique
  plan: 'FREE' | 'PRO' | 'PREMIUM';
  maAccess: boolean;           // true si accès repreneur payé et non expiré (12 mois)
  stripeCustomerId?: string;
  createdAt: Timestamp;
  lastActive: Timestamp;
  profileComplete: number;     // 0-100 (%)
  verified: boolean;
}
```

### Collection `profiles`
```typescript
interface Profile {
  userId: string;
  sector: string;
  projectStage: 'idea' | 'mvp' | 'growth' | 'established';
  bio: string;
  lookingFor: string[];        // ['associé', 'développeur', 'commercial']
  skills: string[];
  availability: boolean;
  investmentCapacity?: string; // pour les acheteurs
  confidential: boolean;       // NDA requis pour voir les détails
  views: number;
  updatedAt: Timestamp;
}
```

### Collection `matches`
```typescript
interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  score: number;               // 0-100 score de compatibilité (calcul par règles)
  scoreReason: string[];       // explications du score
  status: 'pending' | 'accepted' | 'rejected' | 'connected';
  createdAt: Timestamp;
}
```

### Collection `messages`
```typescript
interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: Timestamp;
}
```

### Collection `ma_listings`
```typescript
interface MaListing {
  id: string;
  ownerId: string;
  sector: string;
  region: string;
  type: 'cession' | 'fonds_commerce' | 'parts_sociales';
  revenue: number;             // CA annuel
  margin: number;              // % marge
  age: number;                 // ancienneté en années
  priceMin: number;
  priceMax: number;
  saleReason: string;
  description: string;         // visible uniquement avec accès M&A
  contactInfo: string;         // visible uniquement avec accès M&A
  status: 'active' | 'sold' | 'withdrawn';
  createdAt: Timestamp;
}
```

---

## 🤖 Intégration IA (Assistant contextuel)

### Implémentation : back Python (`backend/`)
Angular (`AiService`) → `POST /api/coaching-ia/messages` avec le jeton Supabase → FastAPI vérifie la
session et le plan PRO/PREMIUM, charge le contexte, appelle OpenAI (clé `openAIkey`) ou Claude. Voir `backend/README.md`.
Le prompt réel est dans `backend/app/prompt.py`. Esquisse d'origine :
```typescript
const systemPrompt = `
Tu es l'assistant personnel de GoFounders pour l'utilisateur suivant :

Profil : ${user.displayName}, ${profile.sector}, stade ${profile.projectStage}
Recherche : ${profile.lookingFor.join(', ')}
Matches actifs : ${matchCount} (${newMatchCount} nouveaux cette semaine)
Vues du profil ce mois : ${profile.views}
Complétion du profil : ${user.profileComplete}%

Tu dois donner des conseils SPÉCIFIQUES basés sur ces données réelles.
Tu ne génères pas de contenu générique.
Tu réponds toujours en français.
Tu proposes des actions concrètes sur la plateforme GoFounders.
`;
```

### Règles pour l'IA
- Toujours contextualiser avec les données réelles de l'utilisateur
- Proposer des actions concrètes liées à la plateforme (compléter profil, voir un match, etc.)
- Ne jamais générer de pitch deck ou business plan générique (ChatGPT le fait mieux)
- Répondre en français

---

## 💳 Stripe — Flux de paiement

> **État actuel : paiements simulés** (pas encore de clé Stripe). Tous les achats passent par
> `PaymentService.purchase()` ; `environment.paymentMode = 'simulation'` appelle la fonction Supabase
> `simulate_purchase`. Pour brancher Stripe : passer `paymentMode` à `'stripe'`, implémenter la
> Checkout Session + le webhook, puis **supprimer `simulate_purchase` avant la mise en production**.

### Abonnement PRO (49€/mois)
1. Utilisateur clique "Passer en PRO"
2. Firebase Function crée une Stripe Checkout Session
3. Redirect vers Stripe Checkout
4. Webhook Stripe → met à jour `user.plan = 'PRO'` dans Firestore

### Accès repreneur M&A (149€, 12 mois)
1. L'acheteur clique "Accès repreneur - 149 € / 12 mois"
2. Firebase Function crée un Stripe Payment Intent (one-time)
3. Redirect vers Stripe Checkout
4. Webhook Stripe → met à jour `ma_access = true` et `ma_access_expires_at = now() + 12 mois` dans Supabase

---

## 🔒 Règles de sécurité importantes

- Les détails des annonces M&A (`confidential_description`, `contact_info`, `sale_reason`, `owner_id`) ne sont **jamais** lisibles directement : seules les colonnes anonymisées sont accordées en `select`, le dossier passe par la fonction Supabase `get_ma_listing_detail` (acheteur avec accès, propriétaire ou admin)
- `plan`, `ma_access`, `role` et `is_admin` ne sont modifiables que côté serveur (trigger `enforce_profile_entitlements`)
- **Rôles strictement séparés côté Supabase** (`2026-10-12-profils-par-role.sql`) : un profil n'est lisible que par lui-même, par le rôle complémentaire (porteur de projet ↔ talent), par ses interlocuteurs de conversation et par les admins ; un talent ne voit jamais les autres talents. Projets lisibles par leur propriétaire et par les talents uniquement. Nouvelle conversation uniquement entre rôles complémentaires (porteur de projet ↔ talent, acheteur ↔ vendeur)
- Profil masqué (`is_visible = false`, page Paramètres) : absent de la recherche, visible seulement par soi, ses interlocuteurs et les admins. Suppression du compte : photos du bucket `avatars` effacées par l'appli, puis fonction `delete_my_account()` (RGPD). Une seule photo conservée par utilisateur (`2026-10-12-avatars.sql`)
- **L'email n'est pas lisible dans `profiles`** : jamais de `select('*')` sur cette table, utiliser `PROFILE_COLUMNS` (`supabase-database.model.ts`)
- Les profils avec `confidential: true` masquent les infos de contact côté Firestore Rules
- La limite FREE (3 nouveaux contacts par mois, porteurs de projet uniquement) est vérifiée par des triggers Supabase (`2026-10-11-free-quotas.sql`, règles mises à jour par `2026-10-12-offres.sql`) ; compteurs dans `usage_counters`, lus via `get_my_quota()`
- L'assistant IA vérifie le plan côté back Python, pas seulement via le `PlanGuard`
- Les scores de compatibilité sont calculés **par règles, sans IA** (`core/matching/compatibility.ts`) entre un projet et un talent : compétences recherchées couvertes (50), localisation (20), disponibilité (15), secteur (15), avec les raisons affichées. Pas de score entre deux profils non complémentaires ni pour acheteurs / vendeurs

---

## 📋 Ordre de développement recommandé

### Phase 1 — MVP (priorité absolue)
1. Setup Angular + Firebase + routing
2. Auth (inscription / connexion / guards)
3. Landing page
4. Profils (création + affichage)
5. Recherche avec filtres basiques
6. Messagerie simple

### Phase 2 — Monétisation
7. Intégration Stripe (abonnements + accès repreneur M&A)
8. Guards de plan (LockedOverlay)
9. Marketplace M&A

### Phase 3 — IA & différenciation
10. Matching intelligent (scores de compatibilité par règles — fait)
11. Assistant IA contextuel (/coaching-ia)

### Phase 4 — Polish
12. Notifications
13. Système de NDA digital
14. Vérification de profils
15. Dashboard analytics utilisateur

---

## ⚠️ Points d'attention

- **Pas de `<form>` HTML natif** — utiliser `ReactiveFormsModule` Angular avec `FormBuilder`
- **Pas de `any`** — tout typer avec les interfaces définies ci-dessus
- **Mobile first** — tous les composants doivent être responsive
- **Accessibilité** — attributs ARIA sur tous les éléments interactifs
- Le matching est présenté comme **« Matching intelligent »**, jamais comme de l'IA : le score est calculé par règles
- Le terme **"NDA & accompagnement juridique"** sur le site devient **"Mise en relation avec des experts juridiques partenaires"** — jamais promettre de conseil juridique direct
- Toujours afficher un **disclaimer** sous la valorisation IA M&A : "Estimation indicative, non contractuelle"
