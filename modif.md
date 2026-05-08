# MODIF.md — Historique des modifications GoFounders

> Trace des changements apportés à la configuration du projet.

---

## 📅 Session du 8 mai 2026 — Nettoyage de la stack

### 🎯 Contexte

Le projet exporté contenait un mélange incohérent de deux stacks incompatibles :
- **Angular 17** (cible voulue, documentée dans `CLAUDE.md`)
- **React + Vite + shadcn/ui** (résidus d'un export Figma Make)

Décision prise : **repartir d'une base Angular vierge** plutôt que de patcher la config existante (trop de fichiers à corriger, risque de bugs résiduels).

---

### 🔍 Problèmes identifiés dans la config initiale

#### 1. Conflit framework Angular vs React
| Fichier | État initial | Problème |
|---|---|---|
| `package.json` | Dépendances Angular 17 uniquement | OK côté Angular |
| `angular.json` | Builder `@angular-devkit/build-angular` | OK côté Angular |
| `vite.config.ts` | Plugin `@vitejs/plugin-react` + `figmaAssetResolver` | ❌ React, incompatible Angular |
| `index.html` | `<script src="/src/main.tsx">` | ❌ TSX = React, devrait être `<app-root>` |
| `tsconfig.app.json` | `files: ["src/main.ts"]` | OK Angular mais `include` incomplet |

→ **Résultat** : `ng serve` cherche `main.ts` (Angular), `vite` cherche `main.tsx` (React). Les deux ne peuvent pas coexister.

#### 2. Conflit Tailwind v3 vs v4
- `package.json` installe `tailwindcss: ^3.4.0`
- `default_shadcn_theme.css` utilise la syntaxe `@theme inline { ... }` (Tailwind v4 only)
- `vite.config.ts` importe `@tailwindcss/vite` (Tailwind v4 only)
- `tailwind.config.js` est en format v3 (`module.exports`)

→ **Résultat** : la compilation aurait échoué au premier `ng build`.

#### 3. Design system désaligné
- `default_shadcn_theme.css` = thème shadcn neutre par défaut (couleurs `oklch()` génériques)
- `CLAUDE.md` spécifie une charte précise : navy `#0F1F3D`, électrique `#2563EB`, amber `#D97706` (M&A)
- Aucune correspondance entre les deux

#### 4. Stack incomplète
- `CLAUDE.md` liste Firebase (Auth, Firestore, Storage, Functions) comme stack principale
- `package.json` ne contient **aucune** dépendance Firebase
- Pas de Stripe non plus malgré le besoin de paiements (49€/mois PRO + 149€ one-shot M&A)

#### 5. Petits problèmes de config
- `tsconfig.app.json` : `include: ["src/**/*.d.ts"]` — manque `src/**/*.ts`, aucun composant Angular ne compilerait
- `pnpm-workspace.yaml` présent alors que `package.json` est en npm — incohérent
- `README.md` vide
- Dossier `src/` non fourni (uniquement les configs racine)

---

### ✅ Solution appliquée

#### A. Décision : repartir clean
Plutôt que de patcher 10+ fichiers, on regénère un projet Angular 17 vierge avec :

```bash
ng new gofounders --style=scss --routing --standalone --strict
```

#### B. Fichiers créés (à copier dans le nouveau projet)

| Fichier | Rôle | Source de vérité |
|---|---|---|
| `src/styles/_variables.scss` | Variables SCSS du design system (couleurs, typo, breakpoints) | `CLAUDE.md` § Design System |
| `src/styles.scss` | Bootstrap Tailwind + import Inter + reset CSS | — |
| `tailwind.config.js` | Couleurs métier exposées en classes utilitaires | Aligné sur `_variables.scss` |
| `postcss.config.js` | Bridge entre Tailwind et le builder Angular | Standard Angular CLI |
| `src/app/app.routes.ts` | Routes complètes avec lazy loading + placeholders guards | `CLAUDE.md` § Routes |
| `src/app/app.config.ts` | Bootstrap Angular 17 standalone + slot Firebase | `CLAUDE.md` § Architecture |
| `SETUP.md` | Guide d'installation étape par étape | — |

#### C. Fichiers à abandonner du projet initial
- ❌ `vite.config.ts` (React, inutile en Angular)
- ❌ `index.html` actuel (pointe vers main.tsx)
- ❌ `default_shadcn_theme.css` (shadcn = React only)
- ❌ `pnpm-workspace.yaml`
- ❌ `postcss_config.mjs` (remplacé par `postcss.config.js`)
- ❌ `package-lock.json` actuel (regénéré par npm install)

#### D. Dépendances à installer après `ng new`

```bash
npm install -D tailwindcss@3 postcss autoprefixer
npm install firebase @angular/fire
npm install @stripe/stripe-js
```

⚠️ **Tailwind v3 et non v4** : compatible avec le builder Angular CLI 17.
⚠️ **API Anthropic** : reste côté Firebase Functions, jamais dans le bundle frontend (clé exposée sinon).

---

### 📋 Checklist de mise en route

- [ ] `ng new gofounders --style=scss --routing --standalone --strict`
- [ ] `npm install -D tailwindcss@3 postcss autoprefixer`
- [ ] `npx tailwindcss init`
- [ ] `npm install firebase @angular/fire @stripe/stripe-js`
- [ ] Copier les 6 fichiers de config dans le projet
- [ ] Créer la structure de dossiers (`core/`, `shared/`, `features/`)
- [ ] `ng serve` → vérifier que ça compile
- [ ] Configurer `src/environments/environment.ts` avec la config Firebase
- [ ] Activer les `provide*` Firebase dans `app.config.ts`
- [ ] Générer les composants vides pour chaque route avec `ng generate component`

---

### 📌 Points d'attention pour la suite

- **Pas de `<form>` HTML natif** → utiliser `ReactiveFormsModule` partout (rappel CLAUDE.md)
- **Pas de `*ngIf` / `*ngFor`** → syntaxe moderne `@if` / `@for` en Angular 17
- **OnPush Change Detection** sur tous les composants (déjà configuré dans `angular.json`)
- **`inject()` plutôt que constructor injection** (pratique Angular 17)
- **Pas de `any`** → tout typer avec les interfaces du `CLAUDE.md` § Modèles de données

---

## 📅 Sessions futures

<!-- Ajouter ici les modifications des sessions suivantes -->

---

## Session du 8 mai 2026 - Flux d'inscription, auth et landing

### Changements fonctionnels

- Suppression du role "Les deux" dans l'inscription
- Simplification de l'inscription autour de 2 roles:
  - `entrepreneur` -> depose un projet
  - `talent` -> consulte uniquement des projets
- Mise en place d'un vrai parcours d'inscription en 3 etapes avec creation de compte locale
- Mise en place d'une auth locale mockee persistante via `localStorage` pour tester les guards et les redirections sans backend

### Regles d'acces et redirections

- Renforcement de `AuthGuard` avec `returnUrl`
- Si un visiteur non connecte tente d'ouvrir une page protegee, il est redirige vers `/connexion`
- Apres connexion, il revient automatiquement vers la page initialement demandee
- Si l'utilisateur ouvre `/connexion` directement, la connexion le renvoie vers `/dashboard`
- La navbar detecte maintenant l'etat connecte et affiche `Dashboard` / `Deconnexion`

### Recherche et visibilite par role

- La page `recherche` est maintenant strictement filtree selon le role connecte
- Un `entrepreneur` voit uniquement des `talents`
- Un `talent` voit uniquement des `projets`
- Les libelles de recherche ont ete adaptes pour rendre cette separation explicite
- Les cartes de recherche ouvrent maintenant les profils via les routes protegees
- Le verrouillage FREE apres la 6e carte est conserve avec un bouton d'apercu demo

### Landing page

- La hero a ete recadree pour correspondre au positionnement "projets <-> talents"
- Le CTA principal pointe maintenant vers `/inscription`
- Le teaser tarifs en bas de home affiche des fonctionnalites concretes pour chaque abonnement
- L'animation d'arrivee de la hero a ete ralentie a 5 secondes minimum avec des classes dediees a la landing

### Verification

- Build Angular OK via `npm.cmd run build`

---

## Session du 8 mai 2026 - Accents UTF-8 et animation hero

### Changements UX

- Remise en UTF-8 propre des textes visibles sur les pages clés:
  - landing
  - footer
  - tarifs
  - connexion
  - inscription
  - recherche
  - dashboard
- Suppression des textes cassés du type `Ã©`, `â‚¬`, `ðŸ...`
- Réintroduction des accents français dans les libellés, boutons, descriptions et messages d'erreur

### Animation home

- L'animation de la hero attend maintenant 2 secondes avant de démarrer
- Le rond blanc effectue un trajet vers le réseau central
- En fin d'animation, il se réduit et finit en bas à droite du visuel
- Le texte de la hero n'est plus ralenti artificiellement pendant 5 secondes

### Vérification

- Build Angular relancé après ces changements
---

## Session du 8 mai 2026 - Menu utilisateur avatar

### Changements UX

- Remplacement du bouton deconnexion par un avatar cliquable dans la navbar
- Ajout d'un menu utilisateur avec:
  - Voir le profil
  - Parametres
  - Se deconnecter
- Ajout d'une modale de confirmation avant deconnecter l'utilisateur
- Reutilisation du meme menu utilisateur dans le header du dashboard
- Le bloc utilisateur du dashboard affiche maintenant les vraies infos de session au lieu d'un placeholder fixe

### Technique

- Creation du composant partage `user-menu`
- Branchement dans:
  - `shared/components/navbar`
  - `features/dashboard`

### Verification

- Build Angular OK via `npm.cmd run build`

---

## Session du 8 mai 2026 - Corrections navigation et cloche

### Changements UX

- **Page Profil** : le composant `/profil/:id` détecte maintenant si l'id correspond à l'utilisateur connecté
  - Si oui : affiche le vrai nom, les initiales, la localisation et le rôle depuis `AuthService`
  - Si oui : bouton "Modifier mon profil" (lien `/profil/modifier`) remplace "Envoyer un message"
  - Si oui : badge de compatibilité et "Signaler ce profil" masqués
  - Si non (profil d'un autre) : comportement inchangé, données mockées maintenues

- **Dashboard sidebar** : ajout de `RouterLinkActive` sur tous les items
  - L'item actif est maintenant mis en surbrillance (fond légèrement clair + texte blanc plein)
  - "Mes matches" (qui pointait vers `/dashboard` en doublon) remplacé par "Mon profil" → navigue vers `/profil/:uid` de l'utilisateur connecté

- **Navbar** : ajout de la cloche de notifications quand l'utilisateur est connecté
  - Présente sur toutes les pages avec navbar (landing, tarifs, recherche, M&A…)
  - Point rouge d'indicateur inclus
  - Masquée si non connecté

---

## Session du 8 mai 2026 - Navigation logo et flèche retour dashboard

### Changements UX

- **Logo G (navbar)** : la destination du logo est maintenant dynamique
  - Connecté → redirige vers `/recherche`
  - Non connecté → redirige vers `/` (landing)

- **Flèche retour Dashboard** : bouton circulaire fixe (`top-24 left-6`), visible dès que l'utilisateur est connecté (toutes les pages)
  - Style verre dépoli : `bg-black/15 backdrop-blur-md ring-1 ring-white/20` + ombre douce `shadow-[0_4px_16px_rgba(0,0,0,0.18)]`
  - Flèche blanche — lisible sur fond sombre ET sur fond blanc grâce à l'ombre (design premium, pas agressif)
  - Implémentée dans `root-layout.component.ts`
  - Navigue vers `/dashboard`

---

## Session du 8 mai 2026 - Refonte page Messages

### Changements UX

- **Layout** : la page `/messages` est maintenant un layout deux panneaux plein écran
  - **Gauche (flex-1)** : zone de chat principale
    - État vide (grisé) si aucune conversation sélectionnée, avec message indicatif centré
    - État actif : header avec nom + statut "En ligne", liste des messages, barre de saisie
  - **Droite (w-80)** : liste des conversations avec nom, aperçu du dernier message, horodatage et badge non-lu
  - La conversation active est mise en surbrillance (bordure gauche accent + fond léger)

- **Barre de saisie** : `[📎] [champ texte] [😊] [Envoyer]`
  - **Trombone** (📎) : ouvre l'explorateur de fichiers (`accept="image/*,.pdf,.doc,.docx"`)
  - **Emoji** (😊) : ouvre un picker 16 emojis en popover au-dessus, se ferme au clic extérieur
  - **Envoyer** : désactivé si le champ est vide, ajoute le message en temps réel avec horodatage

### Technique

- `RouterLink` supprimé (plus de navigation vers `/messages/:id`, tout géré en signal dans la même page)
- `selectedConv` : signal `ConversationPreview | null`
- `messages` : signal `ChatMsg[]` mis à jour à chaque envoi
- `emojiPickerOpen` : signal boolean, fermé par `@HostListener('document:click')`
- Le composant `conversation.component.ts` reste en place pour le routage direct `/messages/:id`
- **Hamburger + drawer de navigation** : bouton ☰ dans la **navbar** (à gauche du logo, uniquement quand connecté)
  - Global : fonctionne sur toutes les pages avec navbar (pas seulement messages)
  - Clic → drawer blanc (`w-64`) slide depuis la gauche en overlay (`z-50`), transition 300ms
  - Overlay `bg-black/25` derrière, clic extérieur ou `Escape` pour fermer
  - Contenu : header "Navigation" + X, items avec emoji + label + badge, user info en bas
  - Clic sur un item → navigation + fermeture automatique

- **Cloche de notifications (navbar)** :
  - Badge numéroté (remplace le simple point rouge) : `min-w-[17px] h-[17px]` positionné en `-top-0.5 -right-0.5`
  - Animation `bell-ring` ajoutée dans `styles.scss` : pivote sur l'axe supérieur toutes les 5 secondes, simule une cloche qui sonne

---

## Session du 8 mai 2026 - Mode sombre, hamburger navbar, marges messages

### Changements UX

- **Mode sombre** : toggle iOS-style dans la navbar (section droite, uniquement si connecté)
  - Icône soleil / lune à gauche du slider selon l'état
  - Slider pill `h-5 w-9` avec thumb blanc `h-4 w-4` qui se décale de `translate-x-0.5` à `translate-x-4`
  - Palette nuit : `--background: #0C1426`, `--card: #112036`, `--secondary: #0F1B30`, `--foreground: #E2EBF5`, `--muted-foreground: #7A9BBF`, `--border: rgba(255,255,255,0.08)`, accent `#3B82F6`
  - Persisté dans `localStorage` (`gofounders.dark`) et restauré à l'initialisation via `initDarkMode()`
  - `html.dark` posé sur `document.documentElement` via injection `DOCUMENT`

- **Hamburger dans la navbar** : bouton ☰ à l'extrême gauche (avant le logo), visible uniquement si connecté
  - Ouvre un drawer `w-64` qui slide depuis la gauche (`translateX(-100%)` → `translateX(0)`) avec transition 300ms
  - Overlay semi-transparent `bg-black/25` derrière ; clic extérieur ou `Escape` ferme le drawer
  - Contenu : header "Navigation" + bouton ✕, liste des items avec emoji + label + badge éventuel, user info en pied
  - Chaque item navigue et ferme automatiquement le drawer au clic

- **Marges page Messages** : ajout de `pl-6 pr-4` sur le conteneur flex principal
  - Crée de la respiration à gauche de la zone de chat et à droite de la liste des conversations
  - Évite l'effet trop large / bords collés

### Technique

- `NavbarComponent` : injection `DOCUMENT`, signal `isDark`, méthodes `toggleDarkMode()` et `initDarkMode()`
- `tailwind.config.js` : ajout de `darkMode: 'class'`
- `styles.scss` : bloc `html.dark { ... }` avec variables overrides + `.bg-white` et `nav` forcés en dark

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 8 mai 2026 - Dark mode renforcé + padding messages

### Changements UX

- **Dark mode — palette plus sombre et dégradés** :
  - `--background: #03060E` (quasi-noir bleu nuit), fond body avec dégradé `160deg` fixé
  - `--card: #07101F`, `--secondary: #0A1525` — niveaux de profondeur très distincts
  - Navbar : dégradé horizontal `#040A18 → #060D20 → #040A18` + bordure accent `rgba(79,143,248,0.12)` + shadow profonde
  - `.bg-white` en dark : dégradé `#07101F → #0A1528`
  - Drawer latéral : dégradé vertical `#060E1E → #040B18`
  - Zone messages (`bg-secondary/20`) : dégradé sombre vertical
  - Bulles de message envoyées : classe `.bubble-me` avec dégradé `#2563EB → #3B82F6` (light) / `#1D4FBF → #4F8FF8` + glow bleu en dark

- **Padding page Messages** : `pl-14 pr-10` sur le conteneur principal (56px à gauche, 40px à droite)
