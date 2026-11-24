// Pages de l'espace membre : bandeau bleu à gauche (MemberShellComponent) au lieu de la barre du haut du site.
// Les pages publiques (accueil, annonces, vitrine, tarifs, aide…) gardent la barre du haut, même connecté.
const MEMBER_AREA_PREFIXES = [
  '/dashboard',
  '/favoris',
  '/recherche',
  '/profil',
  '/mon-projet',
  '/messages',
  '/mes-entreprises',
  '/ma/favoris',
  '/ma/dossiers',
  '/ma/mes-annonces',
  '/ma/statistiques',
  '/ma/deposer',
  '/ma/vendue',
  '/abonnement',
  '/parametres',
  '/paiement',
  '/admin',
];

// Annonces : pour un membre connecté, la liste et les fiches restent dans l'espace membre (même cadre après chaque clic).
const MEMBER_LISTING_PAGES = ['/ma', '/ma/annonce'];

export function isMemberAreaUrl(url: string): boolean {
  const path = url.split(/[?#]/)[0];
  return MEMBER_AREA_PREFIXES.some(prefix => path === prefix || path.startsWith(prefix + '/'))
    || MEMBER_LISTING_PAGES.some(prefix => path === prefix || path.startsWith(prefix + '/'));
}
