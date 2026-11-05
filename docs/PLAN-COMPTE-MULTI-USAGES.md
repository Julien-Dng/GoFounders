# Plan : un compte, plusieurs usages

> Statut : **proposition à valider**, rien n'est encore modifié dans le code ni dans Supabase.

## Objectif

Un seul compte, un seul profil, une seule messagerie. Chaque membre peut, avec le même compte :

- reprendre une entreprise ;
- céder son entreprise ;
- présenter un projet et chercher des associés ;
- rejoindre le projet de quelqu'un d'autre.

Les **droits** viennent des offres payées (accès repreneur, Projet PRO), plus du rôle choisi à l'inscription.
L'accès repreneur à 149 €/an inclut les fonctions Projet PRO pendant 12 mois.

## Ce qui change pour le membre

| Aujourd'hui | Demain |
|---|---|
| Un rôle choisi à l'inscription, non modifiable | Un ou plusieurs **usages** cochés à l'inscription, modifiables dans Paramètres |
| `/recherche` réservé aux porteurs de projet et associés | Ouvert à tous ; il montre les associés si vous avez un projet, les projets si vous voulez rejoindre une équipe, les deux sinon |
| `/ma/deposer` réservé au rôle vendeur | Ouvert à tous : publier une cession reste gratuit |
| Accès repreneur réservé au rôle acheteur | Achetable par tout membre |
| Un repreneur qui veut un associé crée un second compte | Il coche « Je cherche des associés » et c'est tout |

Les quatre usages : **Reprendre** (`reprise`), **Céder** (`cession`), **Mon projet** (`projet`, cherche des associés),
**Rejoindre un projet** (`associe`). Le compte professionnel (`pro`) reste un type de compte à part : il est masqué au
lancement, et un cabinet n'a pas les mêmes besoins.

## Modèle de données (Supabase)

1. Nouvelle colonne `profiles.usages text[]`, limitée à `reprise`, `cession`, `projet` et `associe`. Elle est modifiable par le membre lui-même.
2. Fonction `has_usage(uid, usage)`, utilisée par toutes les règles à la place de `role`.
3. Fonction `has_projet_pro(uid)` : plan PRO ou PREMIUM, **ou** accès repreneur en cours.
   - Côté site, elle remplace les vérifications de plan dans `canSeeMatchReasons`, `canUseAdvancedSearch` et `isFeaturedProjectPlan`.
4. `profiles.role` est **conservé, en lecture seule**, le temps de la transition, pour pouvoir revenir en arrière. Il sera supprimé une fois tout validé.

### Reprise des comptes existants

| Rôle actuel | Usages |
|---|---|
| `entrepreneur` | `projet` |
| `talent` | `associe` |
| `buyer` | `reprise` |
| `seller` | `cession` |
| `pro` | inchangé (type de compte pro) |

## Règles d'accès à réécrire

Ce sont les points sensibles : des données confidentielles en dépendent. Chaque règle garde son intention actuelle.

| Règle | Aujourd'hui (rôle) | Demain (usages et droits) |
|---|---|---|
| Voir un profil (`viewer_can_see_profile`) | porteur de projet ↔ associé, interlocuteurs, admins | `projet` voit `associe` et inversement ; interlocuteurs ; admins. Un membre qui n'a que `associe` ne voit **toujours pas** les autres associés |
| Voir un projet (`projects_select_selon_role`) | propriétaire et associés | propriétaire et membres ayant `associe` |
| Partie confidentielle d'un projet | associé dont la demande est acceptée | inchangé, mais la demande exige l'usage `associe` au lieu du rôle `talent` |
| Nouvelle conversation (`ROLE_CONTACT_INTERDIT`) | paires de rôles complémentaires | `projet` ↔ `associe` ; repreneur ↔ cédant seulement **à propos d'une annonce** dont l'accès a été accepté |
| Quota gratuit (5 contacts par mois) | rôle porteur de projet en FREE | conversation ouverte par un membre `projet` vers un `associe`, sans Projet PRO (plan ou accès repreneur) |
| Demander un dossier (`request_listing_access`) | rôle acheteur + accès payé | accès repreneur payé, quel que soit l'usage |
| Lire un dossier (`get_ma_listing_detail`) | rôle acheteur + demande acceptée | demande acceptée (et accès en cours), propriétaire, admins |
| Achat de l'accès repreneur (`simulate_purchase`, back Stripe) | rôle acheteur | tout membre (sauf compte pro) |
| Publier une annonce | rôle vendeur | tout membre (sauf compte pro, qui garde ses règles) |

Les conversations reçoivent un **contexte** (`projet` ou `annonce`) pour appliquer le bon quota et le bon e-mail. Les conversations existantes sont reprises selon les rôles des deux participants.

## Côté site

- **Inscription** : l'étape 1 devient « Qu'est-ce qui vous amène ? » avec des cases à cocher. L'étape 3 montre les champs de chaque usage coché (budget et secteur pour reprendre, compétences et disponibilité pour rejoindre…).
- **Paramètres** : une section « Mes usages » pour en ajouter ou en retirer.
- **Navigation et tableau de bord** : les sections s'affichent selon les usages, mais les menus Annonces et Associés & équipe restent visibles pour tous.
- **`/recherche`** : deux onglets (associés / projets) quand le membre a les deux usages.
- **Profil public** : il montre seulement les blocs correspondant aux usages de la personne.
- **Tarifs** : la carte Repreneur annonce « Projet PRO inclus pendant 12 mois ». La règle reste qu'aucune offre mensuelle ne donne accès aux dossiers.
- **Modèle Angular** : `profileType` est remplacé par `usages` ; `RoleGuard` devient `UsageGuard`, utilisé seulement là où c'est nécessaire.

## Tests avant mise en ligne

1. **Matrice de visibilité SQL** sur la base de test locale : chaque combinaison d'usages × profils, projets, partie confidentielle, dossiers, conversations et quotas. Toutes les attaques déjà testées sont rejouées (lecture directe des colonnes confidentielles, contournement du quota, etc.).
2. **Parcours complets dans le navigateur** :
   - un repreneur qui ajoute « Mon projet » et écrit à un associé ;
   - un porteur de projet qui achète l'accès repreneur et demande un dossier ;
   - un cédant qui rejoint un projet.
3. **Migration rejouée sur une copie de la base** avant la vraie.

## Étapes et durée estimée

| Étape | Contenu | Estimation |
|---|---|---|
| 1 | Migration SQL (usages, fonctions, règles, reprise des comptes) et tests de sécurité | 1,5 jour |
| 2 | Modèle, gardes, inscription, Paramètres | 1,5 jour |
| 3 | Recherche, tableau de bord, navigation, profil public | 1 jour |
| 4 | Tarifs (Projet PRO inclus) et textes | 0,5 jour |
| 5 | Recette complète et corrections | 0,5 à 1 jour |

Total : **environ 5 jours de travail**, livrés en une fois. La migration doit être exécutée en même temps que le déploiement du site.

## Décisions à prendre avant de commencer

1. **Inscription** : cocher ses usages dès l'inscription (proposé), ou commencer par un seul et ajouter les autres ensuite ?
2. **Projet PRO inclus dans les 149 €/an** : confirmé ?
3. **Comptes professionnels** : on les garde à part comme proposé ?
4. **Visibilité entre repreneurs** : ils ne se voient pas entre eux (proposé, comme aujourd'hui entre associés) ?
