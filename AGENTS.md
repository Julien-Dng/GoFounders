# AGENTS.md — GoFounders

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
2. **Marketplace M&A** — achat et cession d'entreprises (accès one-shot 149€, indépendant de l'abonnement)

---

## 💰 Modèle tarifaire

### Abonnements (Marketplace Talents & Associés)

| Fonctionnalité | FREE | PRO (49€/mois) | PREMIUM (Sur mesure) |
|---|---|---|---|
| Nombre de contacts | 3/mois | Illimité | Illimité |
| Match IA | ❌ | ✅ | ✅ |
| Recherche avancée | ❌ | ✅ | ✅ |
| Messages | 5/mois | Illimité | Illimité |
| Visibilité premium | ❌ | ✅ (top résultats) | ✅ |
| Assistant IA contextuel | ❌ | ✅ basique | ✅ complet |
| Recherche investisseurs | ❌ | ❌ | ✅ |
| Coaching humain | ❌ | ❌ | ✅ |
| Account manager dédié | ❌ | ❌ | ✅ |
| NDA & accompagnement juridique | ❌ | ❌ | ✅ (partenaires) |
| Support | Email | Email rapide | Téléphone + Email |

### M&A — Accès One-Shot (149€, paiement unique)
- Totalement **indépendant** de l'abonnement mensuel
- Donne accès à : consultation complète des annonces, dépôt d'annonce, mise en relation directe
- Les utilisateurs FREE/PRO voient les annonces **anonymisées** sans accès aux détails

### PREMIUM M&A
- Accompagnement complet : valorisation, mise en relation experts (notaires, comptables partenaires)
- Tarif sur devis

---

## 🗺️ Routes de l'application

```
/                          Landing page (publique)
/tarifs                    Page tarifs (publique)
/inscription               Onboarding — choix du type de profil
/connexion                 Login / mot de passe oublié

/dashboard                 Accueil connecté (protégé)
/recherche                 Matching / exploration des profils (protégé)
/profil/:id                Profil public d'un utilisateur (protégé)
/profil/modifier           Édition de son propre profil (protégé)
/messages                  Liste des conversations (protégé)
/messages/:id              Conversation individuelle (protégé)
/coaching-ia               Assistant IA contextuel — PRO uniquement (protégé)

/ma                        Marketplace M&A — accueil (publique, détails verrouillés)
/ma/annonce/:id            Détail d'une annonce M&A (accès one-shot requis)
/ma/deposer                Déposer une annonce M&A (paiement 149€ requis)

/abonnement                Gérer son abonnement Stripe (protégé)
/parametres                Paramètres du compte (protégé)
```

**Guards Angular à implémenter :**
- `AuthGuard` → redirige vers `/connexion` si non connecté
- `PlanGuard` → vérifie le niveau d'abonnement (FREE / PRO / PREMIUM)
- `MaAccessGuard` → vérifie si l'utilisateur a payé le one-shot M&A

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
- **Étape 1** : Choix du type de profil
  - Porteur de projet
  - Talent / Expert
  - Les deux
  - Acheteur / Repreneur
- **Étape 2** : Informations de base (nom, email, mot de passe, localisation)
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
- Cards profils : avatar, nom, rôle, secteur, stade, bio, tags compétences, score IA %
- **State FREE** : après la 6ème card, overlay blur avec CTA upgrade PRO

### `/profil/:id` — Profil public
- Cover banner + avatar + infos principales
- Badge compatibilité IA
- Boutons : "Envoyer un message" + "Sauvegarder"
- Tabs : Présentation / Projet / Expérience / Avis
- Sidebar droite : infos rapides + carte NDA (verrouillée FREE)
- Lien "Signaler ce profil"

### `/messages` — Messagerie
- Liste conversations à gauche
- Zone de chat à droite (style WhatsApp/iMessage)
- Indicateur de lecture + horodatage
- **State FREE** : limité à 5 messages/mois, compteur visible

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
- **State sans accès M&A** : détails floutés, overlay "Accès one-shot 149€"
- Section bottom CTA amber : "Déposez votre annonce"

### `/ma/deposer` — Déposer une annonce
- Wizard en étapes : infos générales → métriques → prix → confidentialité → paiement
- Paiement Stripe (149€ one-shot) avant publication
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
CompatibilityBadge   — Score IA en %
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
| **Stripe** | Abonnements PRO/PREMIUM + one-shot M&A |
| **API Anthropic (Codex)** | Assistant IA contextuel (/coaching-ia) |
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
  profileType: 'entrepreneur' | 'talent' | 'both' | 'buyer';
  plan: 'FREE' | 'PRO' | 'PREMIUM';
  maAccess: boolean;           // true si one-shot M&A payé
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
  score: number;               // 0-100 score de compatibilité IA
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

### Comment appeler l'API Anthropic depuis Firebase Functions
```typescript
// functions/src/ai-assistant.ts
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

### Abonnement PRO (49€/mois)
1. Utilisateur clique "Passer en PRO"
2. Firebase Function crée une Stripe Checkout Session
3. Redirect vers Stripe Checkout
4. Webhook Stripe → met à jour `user.plan = 'PRO'` dans Firestore

### One-shot M&A (149€)
1. Utilisateur clique "Accès one-shot 149€"
2. Firebase Function crée un Stripe Payment Intent (one-time)
3. Redirect vers Stripe Checkout
4. Webhook Stripe → met à jour `user.maAccess = true` dans Firestore

---

## 🔒 Règles de sécurité importantes

- Les détails des annonces M&A (`description`, `contactInfo`) ne sont **jamais** retournés au frontend si `user.maAccess = false` — validation côté Firebase Functions, pas côté client
- Les profils avec `confidential: true` masquent les infos de contact côté Firestore Rules
- La limite de 3 contacts/mois pour FREE est vérifiée côté Firebase Functions
- Les scores de compatibilité IA sont calculés côté Firebase Functions (jamais exposé le prompt)

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
7. Intégration Stripe (abonnements + one-shot)
8. Guards de plan (LockedOverlay)
9. Marketplace M&A

### Phase 3 — IA & différenciation
10. Matching IA (scores de compatibilité)
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
- Le terme **"NDA & accompagnement juridique"** sur le site devient **"Mise en relation avec des experts juridiques partenaires"** — jamais promettre de conseil juridique direct
- Toujours afficher un **disclaimer** sous la valorisation IA M&A : "Estimation indicative, non contractuelle"
