import { FEATURES } from './features';

// Navigation personnelle d'un membre connecté : une seule liste pour le bandeau de l'espace membre
// (MemberShellComponent) et le menu burger du site public (NavbarComponent), mêmes intitulés, icônes et liens.
export type MemberNavIcon = 'home' | 'heart' | 'users' | 'search' | 'briefcase' | 'building' | 'messages' | 'user' | 'card' | 'settings' | 'shield';

export interface MemberNavItem {
  id: string;
  label: string;
  icon: MemberNavIcon;
  path: string;
  // Préfixes d'URL qui rendent l'entrée active (sous-pages comprises).
  match: string[];
  badge?: number;
}

export interface MemberNavContext {
  profilePath: string;
  isAdmin: boolean;
  unread: number;
}

export function buildMemberNav({ profilePath, isAdmin, unread }: MemberNavContext): MemberNavItem[] {
  const items: MemberNavItem[] = [
    { id: 'dashboard', label: 'Tableau de bord', icon: 'home', path: '/dashboard', match: ['/dashboard'] },
    { id: 'favoris', label: 'Mes favoris', icon: 'heart', path: '/favoris', match: ['/favoris', '/ma/favoris'] },
    ...(FEATURES.associates ? [{ id: 'associes', label: 'Associés & projets', icon: 'users' as const, path: '/recherche', match: ['/recherche'] }] : []),
    { id: 'reprendre', label: 'Explorer les entreprises', icon: 'search', path: '/ma', match: ['/ma/annonce'] },
    ...(FEATURES.pros ? [{ id: 'annuaire', label: 'Annuaire des pros', icon: 'briefcase' as const, path: '/pros', match: ['/pros'] }] : []),
    { id: 'entreprises', label: 'Mes entreprises', icon: 'building', path: '/mes-entreprises', match: ['/mes-entreprises', '/ma/dossiers', '/ma/mes-annonces', '/ma/statistiques', '/ma/deposer', '/ma/vendue'] },
    { id: 'messages', label: 'Messages', icon: 'messages', path: '/messages', match: ['/messages'], badge: unread || undefined },
    { id: 'profil', label: 'Mon profil', icon: 'user', path: profilePath, match: [profilePath, '/profil/modifier', '/profil/associe', '/mon-projet'] },
    { id: 'facturation', label: 'Offre et facturation', icon: 'card', path: '/abonnement', match: ['/abonnement', '/paiement'] },
    { id: 'parametres', label: 'Paramètres', icon: 'settings', path: '/parametres', match: ['/parametres'] },
  ];
  if (isAdmin) {
    items.push({ id: 'admin', label: 'Administration', icon: 'shield', path: '/admin/annonces', match: ['/admin'] });
  }
  return items;
}

export function isMemberNavActive(item: MemberNavItem, url: string, profilePath: string): boolean {
  const path = url.split(/[?#]/)[0];
  if (item.id === 'reprendre' && path === '/ma') {
    return true;
  }
  // Fiche d'un autre membre : rattachée à « Associés & projets ».
  if (item.id === 'associes' && path.startsWith('/profil/') && !['/profil/modifier', '/profil/associe', profilePath].includes(path)) {
    return true;
  }
  return item.match.some(prefix => path === prefix || path.startsWith(prefix + '/'));
}
