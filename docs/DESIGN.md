# Système de design : « fiche de cession »

Référence visuelle de la branche `refonte-reprise`. À lire avant de créer ou de modifier un écran.

## Le sujet, le public, le but

- **Sujet** : la reprise et la cession de petites entreprises françaises, surtout numériques (50 k€ à 1 M€ de CA), et la recherche d'associés.
- **Public** : des fondateurs qui vendent l'entreprise de toute une vie (prudents, attachés à la discrétion), des repreneurs qui engagent leurs économies, des experts-comptables et avocats.
- **But de chaque page** : inspirer confiance, puis faire déposer une annonce ou prendre l'accès repreneur.

Le site doit ressembler à un **dossier de cession bien tenu**, pas à une application grand public : des chiffres lisibles, peu de décoration, un ton calme.

## Couleurs

| Nom | Valeur | Rôle |
|---|---|---|
| Encre | `#0F1B2D` | Titres, fonds sombres (en-tête de section, pied de page) |
| Texte | `#1E2633` | Texte courant |
| Ardoise | `#5A6474` | Texte secondaire, légendes |
| Filet | `#D9DEE5` | Bordures et séparateurs |
| Fond | `#F5F6F8` | Fond des sections alternées (gris froid, pas crème) |
| Bleu action | `#1D4ED8` | Boutons principaux et liens |
| Ocre | `#9F5F12` (`amber-500`) | **Uniquement** les prix et ce qui concerne la cession |
| Vert | `emerald-700` | Validation, « vérifié », « vendue » |

Règle : l'ocre ne sert jamais à décorer. Si un élément orange n'est ni un prix ni une action de cession, il passe en gris ou en encre.

## Typographie

- **Geist** (400, 500, 600) pour tout le site : moderne, net, lisible. Les titres `h1` et `h2` sont en 600 avec un interlettrage serré (-0,03 à -0,04 em) : c'est ce serrage qui donne le caractère, pas une deuxième police. Classe `tabular` pour aligner les chiffres (CA, marges, prix).
- Choix de novembre 2026 (direction « tech sobre ») : le serif d'origine faisait trop étude de notaire.
- Taille de base 16 px, portée à 17, 18 puis 20 px sur les grands écrans (toutes les tailles sont en rem et suivent). Jamais de texte courant sous 16 px ni d'étiquette sous 14 px. Lignes de texte de 70 caractères maximum.
- Jamais de libellés en majuscules espacées, jamais un mot isolé coloré dans un titre, pas de flèche « → » dans les boutons.

## Formes

- Rayons : 8 px (boutons, champs), 10 à 14 px (cartes). Pas de pilules sauf pour les badges d'état.
- Ombres quasi absentes : on sépare par des filets de 1 px, pas par des ombres. Les ombres restent pour ce qui flotte (menus, fenêtres).
- Pas de dégradés décoratifs, pas d'illustrations de personnages, pas de grossissement au survol, pas d'apparitions animées au défilement.

## Mise en page

- Contenu aligné à gauche, largeur maximale 78 rem (1 250 px environ, plus sur grand écran).
- Accueil : en-tête sombre (encre), le titre et une seule action principale à gauche, **une vraie fiche d'annonce présentée comme un dossier papier** à droite : feuilles empilées et tampon « Confidentiel » rouge (`.dossier-stamp`, `#A3341C`), qui se pose une fois au chargement. C'est l'élément marquant du site, à ne pas recopier ailleurs.
- Inspiration Acquire / Flippa : barre de recherche dans l'en-tête (mène à `/ma` filtré), bouton bleu vif, carte flottante « Exemple de profil repreneur » (toujours marquée comme exemple), bande de faits vérifiables (jamais de volume ou de nombre de ventes inventé), puis trois annonces réelles « En ce moment sur GoFounders ».
- Ensuite une grande phrase éditoriale qui parle des fondateurs : la voix humaine du site, sans faux témoignage.
- `/ma` (inspiration Flippa) : recherche, secteurs en pastilles, filtres dans une colonne à gauche (repliés sur mobile), tri (prix, chiffre d'affaires, bénéfice, multiple). Chaque annonce est une ligne : à gauche secteur, région, résumé et quatre chiffres (CA, bénéfice net, marge, ancienneté) ; à droite, sur fond gris clair, le prix en ocre et le multiple du bénéfice.
- Fiche d'annonce (inspiration Acquire) : bande de six chiffres clés, puis présentation, points clés, motif de cession, prochaines étapes et analyse IA ; à droite un encadré qui reste visible avec le prix et « Contacter le cédant » (barre fixe en bas sur mobile). Bénéfice et multiple sont calculés à partir des chiffres déclarés (`core/ma/listing-metrics.ts`), jamais estimés.
- Listes d'annonces : chaque annonce est une fiche. En titre le secteur et la région, puis trois chiffres en grand (CA, marge, ancienneté), puis le prix en ocre. L'information « dossier réservé » est donnée une seule fois en haut de liste, pas répétée sur chaque fiche.
- Mobile d'abord : sur `/ma`, une annonce doit être visible dès le premier écran (filtres repliés).

## Textes

- Dire ce que fait le bouton : « Prendre l'accès repreneur », « Déposer mon annonce », pas « Choisir cette offre ».
- Phrases courtes, voix active, pas de superlatifs ni de promesses invérifiables.
- Jamais de faux chiffres ni de faux témoignages : seules les données réelles sont affichées.
