# MODIF.md — Historique des modifications GoFounders

> Trace des changements apportés à la configuration du projet.

---

## Repères de suivi quotidien interne

> Repères de reprise pour savoir quoi relire, tester ou continuer selon les jours. Cette section sert de guide d'avancement, l'historique détaillé reste dans les sessions ci-dessous.

- **20 mai 2026** : cohérence profil, icônes de navigation, routes prioritaires et CTA principaux.
- **21 mai 2026** : inscription, rôles utilisateur et textes visibles à relire pour garder un parcours clair.
- **22 mai 2026** : navbar, menu avatar, cloche de notifications et navigation connectée à vérifier.
- **23 mai 2026** : messagerie, conversation active, espacement et comportement de la bulle flottante.
- **24 mai 2026** : recherche, visibilité par rôle et limites FREE/PRO à contrôler.
- **25 mai 2026** : profils publics, CTA message, onglets profil et cohérence entre mon profil/profil externe.
- **26 mai 2026** : marketplace M&A, teasers, verrouillage des détails sensibles et parcours one-shot.
- **27 mai 2026** : tarifs, promesses commerciales, wording de confiance et pages légales.
- **28 mai 2026** : notifications, menu déroulant, redirections et état des non-lus.
- **29 mai 2026** : audit UX appliqué, nettoyage des démos visibles, build final et prochain focus Stripe/Firebase.

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

## Session du 1er juin 2026 - Correctifs dark mode

### Correctifs appliqués

- **Champs et menus déroulants** :
  - Ajout d'un style global dark mode pour `select`, `option`, `input` et `textarea`
  - Correction des menus natifs qui s'ouvraient en blanc avec un texte trop pâle

- **Surfaces M&A / confidentialité** :
  - Les fonds `amber` très clairs passent maintenant sur des surfaces sombres et lisibles en mode nuit
  - Les textes amber des encarts gardent un contraste plus premium en dark mode

- **Profil public** :
  - Retouche ciblée de la carte `Détails confidentiels` pour éviter le rendu crème/blanc et le texte trop faible en mode nuit

- **Overlays verrouillés** :
  - Correction de l'overlay PRO de la recherche qui restait trop blanc en mode nuit
  - Harmonisation du composant `LockedOverlay` partagé avec une surface sombre et un CTA contrasté

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 20 mai 2026 - Cohérence données, responsive et pages clés

### Changements UX / produit

- **Home reliftée** :
  - suppression des derniers emojis visuels sur la landing au profit d'icônes SVG
  - textes et accents corrigés
  - sections rendues plus responsives sur mobile et tablette

- **Recherche / Profil** :
  - les cartes de recherche et les profils publics reposent maintenant sur une base mock commune
  - ouvrir un profil affiche désormais un contenu cohérent avec la carte sélectionnée
  - le bouton message depuis un profil ouvre une conversation dédiée via `/messages/:id`

- **Messagerie** :
  - la liste des conversations, le détail et la conversation dédiée utilisent les mêmes données mock
  - envoi de message géré dans la vue principale avec mise à jour du dernier message
  - layout amélioré sur petits écrans

- **M&A** :
  - les annonces M&A utilisent maintenant des données mock communes entre listing et détail
  - `/ma/annonce/:id` affiche un vrai détail dynamique
  - `/ma/deposer` n'est plus un simple placeholder : wizard mock en 5 étapes + activation de l'accès M&A
  - ajout d'un déblocage mock `maAccess` dans `AuthService`

- **Tarifs / Footer / Coaching IA** :
  - tarifs nettoyés, CTA des cartes rendus cliquables via `PricingCardComponent`
  - bloc M&A de la page tarifs branché vers `/ma`
  - footer : liens morts neutralisés, sections "bientôt" explicites
  - coaching IA nettoyé, overlay incohérent retiré, texte et responsive corrigés

- **Dashboard** :
  - CTA `Voir tous`, `Voir le profil` et actions rapides raccordés à de vraies routes

### Technique

- nouveau fichier partagé : `src/app/core/data/mock-platform.data.ts`
  - profils marketplace
  - conversations
  - annonces M&A
- `AuthService`
  - correction des messages texte
  - ajout de `grantMaAccess()` pour simuler l'achat one-shot

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 31 mai 2026 - Expert M&A

### Correctifs appliqués

- Ajout du visuel expert M&A dans `src/assets/images/ma-expert.png`
- Intégration du personnage dans le hero de `/ma`, à droite du texte principal
- Retrait du badge `Accès 149€` dans le hero pour éviter de mettre le prix trop fortement en avant
- Simplification du CTA hero en `Déposer une annonce`
- Repositionnement du bloc `M&A confidentiel` pour conserver le texte sans chevaucher les statistiques du hero
- Vérification de la page `/tarifs` : elle contient bien une section M&A, désormais ciblable via `#ma-access`
- Les CTA d'accès verrouillé renvoient vers `Découvrir l'offre M&A` au lieu d'envoyer directement vers le paiement
- Validation par l'audit Sagan : les 4 personnages actuels sont cohérents et il recommande de s'arrêter là pour éviter un site trop illustré

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 30 mai 2026 - Coach profil

### Correctifs appliqués

- Ajout du visuel coach dans `src/assets/images/profile-coach.png`
- Remplacement du visuel coach par la nouvelle version fournie le 31 mai
- Intégration d'un bandeau coach sur `/profil/modifier` pour accompagner la complétion du profil
- Ajout d'une présence discrète du coach pendant les étapes formulaire de `/inscription` sur grand écran
- Conservation d'un affichage décoratif masqué aux lecteurs d'écran pour ne pas alourdir l'accessibilité

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 30 mai 2026 - Mascotte recherche

### Correctif appliqué

- Ajout de l'illustration loupe dans les assets sous `src/assets/images/search-mascot.png`
- Intégration discrète de la mascotte dans le bandeau IA de la page `/recherche`
- Taille limitée et affichage seulement sur grand écran pour garder un rendu professionnel
- Ajout d'un halo léger et d'un libellé court pour intégrer l'image au design existant
- Agrandissement de la mascotte et ajout d'une petite bulle d'aide pour mieux occuper la zone droite du bandeau
- Remplacement par l'illustration analyste définitive `src/assets/images/search-analyst.png`
- Ajout du duo entrepreneur / talent dans la hero landing via `src/assets/images/landing-founder-duo.png`
- Suppression de l'ancienne animation de ronds et connexions derrière le duo landing pour préparer une future animation After Effects
- Remplacement du PNG du duo landing par l'animation `src/assets/videos/landing-puzzle-animation.webm`
- Remplacement de l'animation landing par une version optimisée et lecture unique sans boucle
- Correction du lancement de l'animation landing : la vidéo n'est plus remplacée par un poster en réduction d'animations et un `play()` sécurisé est déclenché au chargement
- Suppression du fallback PNG dans la balise vidéo hero : la landing affiche uniquement la vidéo WebM
- Renforcement du lancement de la vidéo hero : référence directe au `<video>`, `muted/defaultMuted/playsInline` forcés côté Angular et URL versionnée pour éviter le cache navigateur
- Sécurisation du cas cache/navigateur où la vidéo hero pouvait être restaurée directement sur sa dernière frame : retour à `currentTime = 0` avant lecture initiale
- Habillage de la zone vidéo landing avec une scène glassmorphism, halos discrets et repères `Match qualifié`, `Talent disponible`, `Projet cadré` pour éviter l'effet vide autour de l'animation
- Retrait du cadre fermé autour de la vidéo landing et espacement des étiquettes pour garder une composition plus ouverte
- Remplacement du grand cercle visible derrière la vidéo landing par un halo flouté plus propre
- Réorganisation des étiquettes de la vidéo landing en colonne structurée avec fond bleuté léger et fil discret, pour éviter l'effet placement aléatoire sur fond clair
- Retour à une composition circulaire plus propre : anneau léger centré derrière le duo et étiquettes repositionnées sur trois points du cercle
- Ajustement du cercle en mode jour : anneau parfaitement rond, halo moins gris et badges plus doux pour éviter l'effet étrange sur fond blanc
- Agrandissement de l'anneau landing en mode jour et halo passé sur un bleu plus clair pour mieux respirer autour des personnages
- Ajout d'un mini bloc d'orientation `Entrepreneurs`, `Talents`, `M&A` dans le hero
- Remplacement du CTA secondaire par `Explorer les opportunités`
- Retrait du prix M&A de la landing pour garder le tarif dans les pages dédiées
- Remplacement des statistiques abstraites par des garanties concrètes
- Témoignages rendus plus réalistes avec prénoms, rôles et situations précises

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 1 juin 2026 - Notifications lues

### Correctif appliqué

- Ajout d'un service partagé de notifications pour éviter que la navbar et le dashboard gardent chacun leur propre état
- Ouverture du menu de notifications = notifications marquées comme vues
- Persistance locale des notifications lues par utilisateur pour éviter qu'elles redeviennent non lues au changement de page
- Animation de la cloche limitée aux notifications non lues : si le compteur est à zéro, la cloche reste fixe
- Retour du bouton `Aperçu démo (pour ce test)` dans les zones verrouillées PRO, avec activation locale du plan de démo mock

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 30 mai 2026 - Modification du profil utilisateur

### Correctifs appliqués

- Création d'une vraie page `/profil/modifier` avec formulaire éditable
- Ajout de la modification du nom, de la localisation, du titre, de la bio et de la disponibilité
- Ajout de compétences et objectifs sous forme de tags séparés par virgules
- Ajout d'une photo de profil avec aperçu, suppression possible et sauvegarde locale mock
- Ajout de liens professionnels GitHub, LinkedIn et site/portfolio
- Sauvegarde des données dans l'auth mock locale et recalcul de la complétion du profil
- Affichage de la photo, de la bio, du titre, des tags et des liens sur le profil personnel

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 30 mai 2026 - Messagerie profil latéral et conversations

### Correctifs appliqués

- La mini card profil n'est plus empilée au-dessus de la liste des conversations
- Sur grand écran, l'ordre devient : chat, liste des conversations, profil du contact à droite
- La liste des conversations garde toute sa hauteur et reste visible sans être écrasée
- Chaque conversation affiche maintenant ses propres messages mockés
- L'envoi d'un message ajoute le contenu uniquement à la conversation active

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 30 mai 2026 - Dark mode adouci

### Correctifs appliqués

- Palette sombre moins contrastée : fond navy ardoise au lieu d'un quasi-noir
- Cards, drawer et navbar rendus plus doux avec des bordures gris-bleu moins lumineuses
- Réduction des halos bleus et de l'effet néon
- Bulle de message envoyée moins brillante en dark mode

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 30 mai 2026 - Reveal au scroll sur la recherche

### Correctifs appliqués

- Ajout d'un effet d'apparition progressif sur les cards de la page `/recherche`
- Déclenchement au scroll avec `IntersectionObserver`
- Légère animation de montée + fondu avec décalage discret par colonne
- Respect de `prefers-reduced-motion` : les cards restent visibles sans animation si l'utilisateur réduit les animations

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 30 mai 2026 - Bouton PRO tarifs visible

### Correctif appliqué

- Le CTA du pack PRO utilise maintenant une classe dédiée indépendante du `bg-white` global
- Correction de la lisibilité du bouton en mode clair et en mode sombre
- Harmonisation rapide des CTA FREE / PRO / PREMIUM dans `PricingCardComponent`

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 30 mai 2026 - Logo GoFounders intégré

### Correctifs appliqués

- Ajout du logo optimisé dans `src/assets/images/gofounders-logo.png`
- Remplacement du carré `G` par le logo dans la navbar, la sidebar dashboard et le footer
- Ajout de `src/assets` dans `angular.json` pour que le logo soit servi et inclus au build
- Correction du chemin image en `/assets/images/gofounders-logo.png` pour éviter l'icône d'image cassée
- Ajout d'un conteneur clair dédié au logo pour garder une bonne lisibilité en mode clair et sombre

### Vérification

- Build Angular OK via `npm.cmd run build`
- Logo présent dans `dist/gofounders/browser/assets/images/gofounders-logo.png`

---

## Session du 30 mai 2026 - Messagerie resserrée

### Correctif appliqué

- Zone messages recentrée avec une largeur maximale plus compacte
- Réduction des espacements internes du chat et de la barre de conversation
- Liste des conversations légèrement plus étroite et plus dense
- Bulles de messages mieux cadrées pour éviter l'effet trop étalé

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 30 mai 2026 - Mini profil dans la messagerie

### Correctif appliqué

- Ajout d'une mini card profil à droite de la conversation sélectionnée
- Affichage du nom, rôle, ville, score de compatibilité, disponibilité, bio courte et compétences
- Réutilisation des données mock de profil existantes pour éviter les doublons
- État vide prévu quand aucune conversation n'est sélectionnée

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 30 mai 2026 - Nettoyage emojis revenus

### Correctifs appliqués

- Remplacement des emojis revenus dans le drawer de navigation par des icônes SVG sobres
- Remplacement des emojis décoratifs de la landing par des icônes SVG pour le badge, les étapes et les cas d'usage
- Conservation volontaire de l'emoji picker dans les messages, car il sert à rédiger un message et n'est pas une icône de navigation

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 29 mai 2026 - Correction page blanche au lancement

### Correctif appliqué

- Correction du crash Angular `NG04012: Outlet is not activated`
- L'animation de transition vérifie maintenant que le `RouterOutlet` est activé avant de lire la route active
- Correctif appliqué dans le layout racine et le layout public avec navbar

### Vérification

- Build Angular OK via `npm.cmd run build`
- Vérification navigateur headless OK : landing + navbar visibles, aucune erreur JS bloquante

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

---

## Session du 20 mai 2026 - Icônes de navigation et cohérence profil

### Changements UX

- **Menus sans emojis** : remplacement des emojis du drawer, de la sidebar dashboard et du menu avatar par des icônes SVG sobres
  - Menu utilisateur : `Voir le profil`, `Paramètres`, `Mode sombre`, `Se déconnecter`
  - Drawer navbar : ajout de `Mon profil` avec un lien vers le profil du compte connecté
  - Dashboard : sidebar, statistiques et actions rapides harmonisées visuellement

- **Navigation connectée** :
  - Le logo connecté renvoie maintenant vers `/dashboard`
  - Le logo du dashboard renvoie aussi vers `/dashboard`
  - La cloche de notifications reste visible dans la navbar quand l'utilisateur est connecté

- **Parcours profil** :
  - Le lien `Voir le profil` du menu avatar pointe vers le profil de l'utilisateur connecté
  - L'ordre des routes a été corrigé pour déclarer `profil/modifier` avant `profil/:id`

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 20 mai 2026 - Audit routing et CTA

### Correctifs appliqués

- **Routes M&A rendues cliquables** :
  - Hero `/ma` : `Voir les annonces` scrolle maintenant vers la grille des annonces
  - Hero `/ma` : `Déposer une annonce — 149€` pointe vers `/ma/deposer`
  - Grille `/ma` : chaque bouton `Voir l'annonce` pointe vers `/ma/annonce/:id`
  - CTA de bas de page `/ma` : `Déposer mon annonce` pointe vers `/ma/deposer`

- **Cohérence guards M&A** :
  - `/ma/deposer` est désormais protégé par `AuthGuard` uniquement, pour laisser le paiement se faire dans le wizard
  - `/ma/annonce/:id` est désormais protégé par `AuthGuard` + `MaAccessGuard`, pour réserver le détail complet aux comptes avec accès one-shot

- **Profil public** :
  - Le bouton `Envoyer un message` pointe maintenant vers `/messages`

- **Dashboard** :
  - Le bouton `Découvrir PRO` pointe maintenant vers `/tarifs`

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 20 mai 2026 - Nettoyage final inscription et pitch

### Correctifs appliqués

- **Inscription** :
  - Remise à plat complète des accents et libellés cassés
  - Suppression des emojis restants au profit d'icônes SVG plus sobres
  - Mise en page plus responsive sur mobile et tablette
  - Parcours 3 étapes conservé avec le flux `returnUrl`

- **Générateur de pitch IA** :
  - Suppression de l'overlay de démo incohérent avec la route déjà protégée en PRO
  - Refonte des textes avec accents propres et ton plus premium
  - Ajout de deux actions utiles en sortie : `Copier le texte` et `Télécharger le pitch`
  - Mise en page responsive et plus propre sur petits écrans

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 28 mai 2026 - Notifications et bulle flottante

### Correctifs appliqués

- **Cloche de notifications** :
  - Ajout d'un menu déroulant cliquable sur la cloche dans la navbar et le dashboard
  - Affichage de notifications mock avec badges de non-lus
  - Décrément visuel des non-lus quand on ouvre une notification

- **Bulle flottante** :
  - La bulle n'envoie plus automatiquement un compte FREE vers les tarifs
  - Compte FREE : redirection vers `/messages`
  - Compte PRO/PREMIUM : redirection vers `/coaching-ia`

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 29 mai 2026 - Messagerie, notifications et transitions

### Correctifs appliqués

- **Messagerie** :
  - Suppression du parcours vers une page conversation dédiée : les anciennes URLs `/messages/:id` redirigent maintenant vers `/messages`
  - Les conversations peuvent être ouvertes directement depuis `/messages?conversation=...`
  - Ajout d'espace à gauche de la page messages et mise en page plus aérée avec panneaux arrondis

- **Notifications** :
  - La navbar utilise désormais le vrai menu déroulant de notifications
  - Une notification de message renvoie vers `/messages` avec la conversation concernée ouverte automatiquement
  - Les notifications conservent leur décrément visuel des non-lus au clic

- **Dashboard** :
  - La bulle bleue en bas à droite renvoie toujours vers `/messages` pour éviter les redirections ambiguës

- **Navigation** :
  - Suppression de la flèche flottante de retour au dashboard, jugée redondante avec le hamburger
  - Ajout d'un fondu léger lors des changements de page Angular

- **Tarifs** :
  - Correction du bouton des cards de pricing : `app-pricing-card` accepte maintenant `href` et navigue via `RouterLink`

### Vérification

- Build Angular OK via `npm.cmd run build`

---

## Session du 29 mai 2026 - Audit UX appliqué

### Correctifs appliqués

- **Routage et conversion** :
  - Le CTA `Envoyer un message` depuis un profil ouvre désormais `/messages` avec la conversation ciblée en query param
  - Les détails confidentiels d'un profil ouvrent aussi la conversation concernée
  - `/coaching-ia` propose des liens visibles vers le dashboard et les messages pour éviter l'impasse de navigation

- **M&A** :
  - Suppression de l'aperçu démo et de l'accès gratuit côté marketplace M&A
  - Les cartes M&A restent lisibles en teaser, seuls les détails sensibles et le dossier complet sont verrouillés
  - Le dépôt d'annonce ne simule plus d'activation gratuite : il prépare un paiement sécurisé à brancher
  - Le guard M&A redirige vers `/ma?access=required` avec un message explicite sur l'accès requis

- **Inscription** :
  - Ajout des profils `Acheteur / Repreneur` et `Vendeur M&A`
  - Ajout de champs dédiés au parcours M&A dans l'étape de détails

- **Confiance et crédibilité** :
  - Remplacement des statistiques/promesses non prouvées sur la landing par des formulations de lancement
  - CTA de recherche clarifié : la consultation se fait après connexion
  - Ajout de routes légales provisoires : CGU, confidentialité, mentions légales
  - Le lien `Mot de passe oublié ?` n'est plus mort et ouvre un contact support
  - Suppression des boutons d'aperçu démo visibles dans les zones verrouillées Angular

- **Responsive** :
  - Grilles de la landing et du footer rendues mobile-first
  - Footer légal branché vers de vraies pages au lieu de `#`

### Vérification

- Build Angular OK via `npm.cmd run build`
