# Refonte « Reprise » — note de discussion

> Branche : `refonte-reprise` (partie de `V6`).
> But : en discuter entre associés avant de décider si on bascule.

---

## 1. Pourquoi changer

Avec l'IA, n'importe qui sort aujourd'hui un MVP seul. La promesse « trouver un associé technique pour construire mon produit » perd beaucoup de valeur, et un assistant IA de coaching ne justifie pas 49 €/mois (ChatGPT fait déjà mieux sur le générique).

Quand construire ne coûte presque plus rien, ce qui devient rare :
- **des clients qui paient déjà** ;
- **la confiance** (chiffres vérifiés, discrétion) ;
- **la distribution et l'expertise métier**.

C'est exactement ce qu'apporte une **reprise d'entreprise**. Notre verticale M&A est la partie la plus défendable du projet. On en fait le cœur.

## 2. Nouveau positionnement

**Accroche :** *Reprenez une entreprise rentable, avec les bons associés.*

**Niche de départ :** les entreprises numériques françaises (SaaS, e-commerce, sites de contenu, petites agences), avec un chiffre d'affaires de 50 k€ à 1 M€.
- On sait évaluer ces actifs et parler à cette audience.
- Vendeurs et acheteurs se trouvent en ligne, donc le sourcing coûte peu.
- Le marché francophone est peu servi (Acquire.com et Flippa sont anglophones).

| Cible | Profil | Ce qu'il veut |
|---|---|---|
| Repreneur | Cadre ou dev en reconversion, indie hacker, 20 à 300 k€ d'apport | Un actif rentable déjà vérifié |
| Cédant | Fondateur fatigué ou parti sur autre chose, produit rentable qui stagne | Céder vite, discrètement, au juste prix |
| Associé | Profil commercial, technique ou métier | Rejoindre un repreneur pour opérer |

**Modèle de prix testé :**
- Cédant : **gratuit** (c'est l'offre de vendeurs qui est rare, on ne la freine pas).
- Repreneur : **149 € une fois** pour les dossiers complets et les mises en relation.
- Plus tard, éventuellement une commission au succès. ⚠️ **À faire valider par un avocat avant** : les intermédiaires en cession de *fonds de commerce* relèvent de la loi Hoguet (carte professionnelle obligatoire).

**Gardé en second plan :** la recherche de talents et de projets, présentée comme « Trouver un associé » (pour opérer une entreprise reprise, ou lancer un projet).

**Mis de côté pour l'instant (les routes restent dans le code) :** assistant IA, générateur de pitch, plans PRO/PREMIUM.

## 3. Ce qui change dans cette branche

| Zone | Changement |
|---|---|
| Landing (`/`) | Nouveau discours « reprise ». Témoignages fictifs remplacés par une FAQ. Tarifs : Cédant gratuit / Repreneur 149 €. |
| Navigation et footer | Annonces · Vendre · Trouver un associé · Tarifs. « Trouver un associé » mène à la recherche de talents et de projets (`/recherche`). Assistant IA et Pitch IA retirés des menus. |
| `/ma` | Hero « Entreprises à reprendre ». Le bouton de déblocage mène au paiement Stripe. |
| `/ma/deposer` | **Dépôt gratuit**, l'étape de paiement est supprimée. Plus de valeurs d'exemple pré-remplies. |
| `/tarifs` | Le bouton 149 € mène au paiement Stripe. |
| **Sécurité** | Avant : la description, la raison de la cession et le contact des annonces partaient vers le navigateur de **tout le monde**, et le flou n'était que visuel. Après : la base ne renvoie ces colonnes qu'au propriétaire, aux comptes avec `ma_access` et aux admins (`supabase/2026-10-12-ma-listings-confidential-columns.sql`). |

### Mise en route (à faire une fois)
1. **Exécuter la migration SQL** `supabase/2026-10-12-ma-listings-confidential-columns.sql` dans l'éditeur SQL de Supabase. Sans elle, la faille reste ouverte et la page de détail ne charge plus.
2. **Créer un Stripe Payment Link** : produit « Accès repreneur GoFounders », 149 €, paiement unique. Coller l'URL dans `src/app/core/config/ma-offer.config.ts`. Tant que la constante est vide, les boutons renvoient vers `/abonnement` comme avant.
3. **Après chaque paiement**, passer `profiles.ma_access = true` à la main dans Supabase. Le paiement Stripe contient l'uid de l'acheteur (`client_reference_id`) et son e-mail. Pas besoin de webhook pour 10 paiements.
4. **Modérer les annonces** : le dépôt est gratuit et publie directement. Il faut relire chaque nouvelle annonce et supprimer celles qui ne sont pas sérieuses.

## 4. Le test de validation (4 semaines)

**Règle : aucune nouvelle fonctionnalité pendant le test.**

| # | Hypothèse | ✅ Succès | ❌ Arrêt ou pivot |
|---|---|---|---|
| H1 | On trouve des vendeurs | ≥ 15 annonces qualifiées | < 5 |
| H2 | Des repreneurs paient 149 € | ≥ 10 paiements | < 3 |
| H3 | Les mises en relation sont sérieuses | ≥ 5 rendez-vous acheteur-vendeur | 0 |

On fixe ces seuils **avant** de commencer et on ne les modifie pas après coup.

- **Semaine 1 : entretiens.** 10 repreneurs et 10 cédants potentiels, 15 min chacun.
  - Repreneur : « Tu as déjà cherché à racheter une boîte ? Où ? Qu'est-ce qui t'a bloqué ? Quel budget ? Tu paierais pour quoi ? »
  - Cédant : « Tu as pensé à vendre ? Qu'est-ce qui t'en empêche ? Tu as peur de quoi (confidentialité, prix, temps) ? »
- **Semaine 2 : trouver des vendeurs** (le plus dur). Makers français sur Product Hunt et Indie Hackers avec un produit de plus de 2 ans, communautés de founders sur LinkedIn et X, boutiques Shopify françaises, groupes d'e-commerçants, notre réseau. Objectif : 100 messages pour 15 annonces.
- **Semaine 3 : ouvrir l'accès aux repreneurs.** Groupes LinkedIn sur le repreneuriat, association CRA (Cédants et Repreneurs d'Affaires), communautés d'indie hackers, newsletters. Chaque mise en relation est faite **à la main** par nous.
- **Semaine 4 : mesurer et décider.** On remplit le tableau et on rappelle 5 repreneurs qui n'ont pas payé pour savoir pourquoi.

**Message type pour les cédants :**
> « Salut [prénom], je lance GoFounders, une place discrète pour céder des petites entreprises numériques en France. Si un jour tu envisages de passer la main sur [produit], je peux te présenter des repreneurs qualifiés. C'est gratuit et anonyme : ton nom n'apparaît qu'avec ton accord. Ça t'intéresse d'en parler 10 min ? »

## 5. Après le test

**Si c'est validé, on construit dans cet ordre :**
1. Webhook Stripe pour activer `ma_access` automatiquement.
2. Statut « en attente de validation » pour les annonces (modération).
3. Vérification des métriques (connexion Stripe ou Shopify en lecture seule, pour un CA prouvé).
4. Fourchette de valorisation calculée par l'IA, avec la mention « Estimation indicative, non contractuelle ».
5. NDA numérique avant d'ouvrir le dossier complet.
6. Profils « associé repreneur » rattachés à une annonce.

**Si ça échoue, selon l'hypothèse qui a cassé :**
- **H1** (pas de vendeurs) : pivoter vers les TPE classiques via les experts-comptables.
- **H2** (personne ne paie) : accès gratuit, et faire payer le vendeur ou une commission au succès (après avoir vu un avocat).
- **H3** (pas de rendez-vous) : travailler la qualité et la vérification des annonces.

## 6. Points à trancher entre nous
- On part sur la niche numérique, ou les TPE classiques dès le départ ?
- Qui s'occupe du sourcing des vendeurs, et qui des repreneurs ?
- On garde le nom GoFounders, ou on prend un nom plus orienté reprise ?
- La page `/tarifs` affiche encore FREE/PRO/PREMIUM : on la simplifie maintenant ou après le test ?
