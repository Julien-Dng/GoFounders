# Plan : un compte, plusieurs usages

> Statut : **validé (novembre 2026), en cours de réalisation**. Migration : `supabase/2026-11-13-compte-multi-usages.sql`.

## Principe

Une personne possède **un seul compte** et peut cumuler plusieurs usages, sans choisir de rôle définitif.

| Je souhaite… | Fonctionnement avec mon compte |
|---|---|
| Vendre une entreprise | Je publie gratuitement mon annonce et je gère les demandes et échanges liés à celle-ci |
| Reprendre une entreprise | Je consulte les aperçus anonymisés, puis je paie 50 € par entreprise pour débloquer le dossier détaillé et le contact, après engagement de confidentialité |
| Trouver des associés ou créer une équipe | Je publie mon projet, précise les compétences recherchées et contacte des profils |
| Rejoindre un projet | Je complète mes compétences, ma disponibilité et mes attentes, puis je contacte les porteurs de projets |

À l'inscription, « Vous êtes plutôt… » propose plusieurs choix. Ils **personnalisent le tableau de bord** et restent
modifiables dans Paramètres ; ils ne donnent **aucun accès** supplémentaire.

**Règle essentielle : les droits dépendent de l'action et des achats, pas de l'usage déclaré.**

- Un cédant qui veut consulter le dossier d'une autre entreprise paie aussi les 50 €.
- FREE et PRO sont des niveaux d'accès, pas des rôles. La même personne peut chercher un associé pour son projet et
  proposer ses compétences à d'autres projets.
- La reprise reste indépendante : FREE comme PRO paient 50 € pour débloquer une entreprise. L'offre PRO « Associés et
  projets » ne débloque pas les dossiers de cession.

## Le compte rassemble

- **Mon profil** : présentation, compétences et expérience.
- **Mes entreprises** : annonces publiées, favoris (à créer) et dossiers débloqués.
- **Mes projets et associés** : projets, recherches et demandes d'accès aux projets (« candidatures »).
- **Messages** : une messagerie commune, chaque conversation rattachée à son entreprise ou à son projet.
- **Paiements** : achats de dossiers et éventuelle offre PRO pour les associés.

## Droits : ce qui ouvre quoi

Les cases cochées ne protègent rien (n'importe qui peut les cocher). Les accès reposent sur des **actions vérifiables** :

| Action | Ce qu'elle ouvre |
|---|---|
| Avoir **publié un projet** (actif) | Voir les profils complets des associés, leur écrire (5 nouveaux contacts par mois en FREE, illimité en PRO), les inviter à lire la partie confidentielle du projet |
| Avoir **complété un profil d'associé** (usage « Rejoindre un projet » et au moins une compétence) | Voir les projets et leurs porteurs, leur écrire (illimité), demander l'accès à la partie confidentielle |
| Avoir **payé 50 €** pour une entreprise (engagement de confidentialité accepté) | Le dossier complet, les coordonnées choisies par le cédant et la messagerie avec lui, pour cette entreprise seulement |
| Être **propriétaire** d'une annonce | La gérer, voir qui a ouvert son dossier et répondre à ces repreneurs |

Conséquences voulues :

- Un associé qui n'a pas de projet ne voit toujours pas les autres associés ; les repreneurs ne se voient pas entre eux.
- Publier une annonce est ouvert à tout membre (gratuit, relu avant publication).
- Les **comptes professionnels** (avocats, experts-comptables, cabinets) restent un type de compte à part (`role = 'pro'`),
  avec leurs règles actuelles ; ils sont masqués au lancement.
- Les admins gardent tous les accès.

## Modèle de données (Supabase)

1. `profiles.usages text[]` : `reprise`, `cession`, `projet`, `associe`. Modifiable par le membre (Paramètres).
2. Fonctions d'action : `has_published_project(uid)`, `is_associate(uid)` ; les règles d'accès les utilisent à la place de `role`.
3. `profiles.role` reste en place : il distingue les comptes **pro** et sert de retour arrière. Pour un nouveau membre,
   il reprend son premier usage (information seulement, plus aucune règle ne s'appuie dessus hors comptes pro).
4. `conversations.context` (`projet`, `annonce`, `pro`) et `conversations.listing_id` : rattachement de chaque conversation.
   Si le site n'indique pas le contexte, la base le déduit des droits des deux personnes (projet, puis annonce débloquée).
5. Quota gratuit : il ne compte que les conversations de contexte `projet` ouvertes par le porteur du projet (plan FREE).

### Reprise des comptes existants

| Rôle actuel | Usages |
|---|---|
| `entrepreneur` | `projet` |
| `talent` | `associe` |
| `buyer` | `reprise` |
| `seller` | `cession` |
| `pro` | aucun (compte pro) |

Les conversations existantes reçoivent leur contexte d'après les rôles des deux participants.

## Côté site

- **Inscription** : « Vous êtes plutôt… » avec des choix multiples ; l'étape suivante montre les champs utiles à chaque choix.
- **Paramètres** : section « Mes usages » pour en ajouter ou en retirer.
- **Navigation et tableau de bord** : sections selon les usages ; Annonces et Associés & équipe restent accessibles à tous.
- **Recherche** : associés si on a un projet publié, projets si on a un profil d'associé, deux onglets si les deux.
- **Messagerie** : chaque conversation affiche son entreprise ou son projet.
- **Paiements** : liste des dossiers achetés et de l'offre PRO.
- **Modèle Angular** : `usages` remplace `profileType` dans les contrôles d'accès ; `RoleGuard` n'est plus utilisé que pour les comptes pro.

## Tests avant mise en ligne

1. Matrice de visibilité SQL sur la base de test locale (`/var/tmp/pgtest`) : profils, projets, partie confidentielle,
   dossiers, conversations et quotas, pour chaque combinaison d'actions ; les attaques déjà testées sont rejouées.
2. Parcours dans le navigateur : un repreneur qui publie un projet et écrit à un associé ; un porteur de projet qui
   achète un dossier ; un cédant qui rejoint un projet.
3. Migration rejouée sur une copie de la base avant la vraie, **le même jour que le déploiement du site**.

## Étapes

| Étape | Contenu |
|---|---|
| 1 | Migration SQL et tests de sécurité |
| 2 | Modèle, inscription, Paramètres |
| 3 | Tableau de bord, navigation, recherche, messagerie, paiements |
| 4 | Textes, tarifs, recette complète |
