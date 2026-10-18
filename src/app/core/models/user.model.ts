import { Timestamp } from '@angular/fire/firestore';

// Un utilisateur a un seul rôle, choisi à l'inscription et non modifiable ensuite.
export type ProfileType = 'entrepreneur' | 'talent' | 'buyer' | 'seller';
export type Plan = 'FREE' | 'PRO' | 'PREMIUM';

export const PROFILE_TYPE_LABELS: Record<ProfileType, string> = {
  entrepreneur: 'Porteur de projet',
  talent: 'Associé',
  buyer: 'Acheteur / Repreneur',
  seller: 'Vendeur M&A',
};

// Rôles de la marketplace Talents & Associés ; acheteurs et vendeurs utilisent la verticale M&A.
export const TALENT_MARKETPLACE_ROLES: readonly ProfileType[] = ['entrepreneur', 'talent'];

export function isTalentMarketplaceRole(profileType: ProfileType | undefined): boolean {
  return !!profileType && TALENT_MARKETPLACE_ROLES.includes(profileType);
}

// M&A : l'acheteur paie 149 € pour 12 mois d'accès aux dossiers complets ; le vendeur publie
// gratuitement (offre de lancement). Les autres rôles ne voient que les annonces anonymisées.
export function canAccessMaDetails(profileType: ProfileType | undefined): boolean {
  return profileType === 'buyer';
}

export function canPublishMaListing(profileType: ProfileType | undefined): boolean {
  return profileType === 'seller';
}

// Matching intelligent (PRO) : les raisons détaillées du score sont réservées aux plans payants.
export const MATCH_REASONS_UPSELL = 'Passez en PRO pour voir pourquoi ce profil vous correspond';

export function canSeeMatchReasons(plan: Plan | undefined): boolean {
  return plan === 'PRO' || plan === 'PREMIUM';
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  location: string;
  profileType: ProfileType;
  profileTitle?: string;
  bio?: string;
  skills?: string[];
  lookingFor?: string[];
  availabilityLabel?: string;
  // Infos M&A des acheteurs (cible recherchée) et vendeurs (entreprise cédée).
  maSector?: string;
  maBudget?: string;
  maRegion?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  plan: Plan;
  // Accès M&A acheteur payé et non expiré.
  maAccess: boolean;
  maAccessExpiresAt?: string;
  isAdmin?: boolean;
  stripeCustomerId?: string;
  createdAt: Timestamp;
  lastActive: Timestamp;
  profileComplete: number;
  verified: boolean;
}
