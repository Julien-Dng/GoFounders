# Refonte « Reprise » — note de discussion

> Branche : `refonte-reprise`, construite sur `V6` (dernier rattrapage : 19 octobre 2026). `V6` reste le projet de base.
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
| Associé | Profil commercial, technique ou métier | Rejoindre un projet comme associé |

**Modèle de prix testé :**
- Cédant : **gratuit** (c'est l'offre de vendeurs qui est rare, on ne la freine pas).
- Repreneur : **149 € pour 12 mois** (paiement unique, déjà en place dans `V6`) pour les dossiers complets et le contact direct des vendeurs.
- Plus tard, éventuellement une commission au succès. ⚠️ **À faire valider par un avocat avant** : les intermédiaires en cession de *fonds de commerce* relèvent de la loi Hoguet (carte professionnelle obligatoire).

**Gardé en second plan :** la marketplace porteurs de projet ↔ associés, présentée comme « Trouver un associé ». Elle reste réservée à ces deux rôles : `V6` sépare strictement les rôles en base, donc les acheteurs et vendeurs ne la voient pas.

**Mis de côté pour l'instant (les routes restent dans le code) :** assistant IA, générateur de pitch, plans PRO/PREMIUM.

## 3. Ce qui change dans cette branche (par rapport à `V6`)

La branche ne change que la **vitrine**. Toute la logique (rôles, sécurité, paiements simulés, publication gratuite des vendeurs, partie confidentielle et NDA des projets) vient de `V6`.

| Zone | Changement |
|---|---|
| Landing (`/`) | Discours « reprise » : « Reprenez une entreprise rentable, avec les bons associés ». Témoignages fictifs remplacés par une FAQ. Tarifs : Cédant gratuit / Repreneur 149 € pour 12 mois. La section « Votre idée reste protégée » (NDA) de `V6` est conservée. |
| Navigation et footer | Annonces · Vendre · Trouver un associé · Tarifs. « Vendre » visible pour les visiteurs et les vendeurs, « Trouver un associé » pour les visiteurs, porteurs de projet et associés. Assistant IA retiré des menus (route conservée). |
| `/ma` | Hero « Entreprises à reprendre », cible 50 k€ à 1 M€ de CA. |

### IA au service de la reprise

| Pour qui | Fonction | Où |
|---|---|---|
| Cédant | **Préparer mon annonce avec l'IA** : à partir d'une description libre, teaser public, description anonymisée, champs remplis, et liste des passages qui pourraient l'identifier | `/ma/deposer`, étape 1 |
| Repreneur (accès en cours) | **Analyser ce dossier** : synthèse, points forts, points de vigilance, questions à poser au vendeur, vérifications à faire avec un professionnel | `/ma/annonce/:id` |

- Appels faits par le back Python (`backend/app/ma_ai.py`), qui vérifie la session, le rôle et l'accès repreneur, avec la même clé OpenAI ou Claude que l'assistant.
- Pas de conseil juridique, comptable ou financier ni de valorisation dans l'analyse : rappel dans les instructions du modèle et sous chaque analyse.
- Discours investisseurs : l'IA rend la cession rapide et sûre (annonce anonymisée en 5 minutes, dossier analysé pour le repreneur) ; les annonces et transactions accumulées deviennent un actif de données (multiples réels par secteur) difficile à copier.

### Mise en route (à faire une fois)
1. **Aucune migration propre à la branche.** Il suffit que la base ait reçu les migrations de `V6`.
2. **Paiement** : comme sur `V6`, les achats passent par `PaymentService` (mode simulation tant que Stripe n'est pas branché). ⚠️ Supprimer `simulate_purchase` avant toute mise en ligne avec de vrais utilisateurs.
3. **Modérer les annonces** : la publication est gratuite et immédiate. Il faut relire chaque nouvelle annonce et supprimer celles qui ne sont pas sérieuses.

### Garder la branche à jour
`V6` avance en parallèle. Récupérer régulièrement ses nouveautés :
```bash
git checkout refonte-reprise
git pull origin refonte-reprise
git merge origin/V6
```
En cas de conflit sur la landing, les menus ou `/ma`, garder la version de cette branche pour les textes et celle de `V6` pour la logique.

## 4. Le test de validation (4 semaines)

**Règle : aucune nouvelle fonctionnalité pendant le test.**

| # | Hypothèse | ✅ Succès | ❌ Arrêt ou pivot |
|---|---|---|---|
| H1 | On trouve des vendeurs | ≥ 15 annonces qualifiées | < 5 |
| H2 | Des repreneurs paient 149 € (12 mois) | ≥ 10 paiements | < 3 |
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
