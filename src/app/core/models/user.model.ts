import { Timestamp } from '@angular/fire/firestore';

// Un utilisateur a un seul rôle, choisi à l'inscription et non modifiable ensuite.
export type ProfileType = 'entrepreneur' | 'talent' | 'buyer' | 'seller';
export type Plan = 'FREE' | 'PRO' | 'PREMIUM';

export const PROFILE_TYPE_LABELS: Record<ProfileType, string> = {
  entrepreneur: 'Porteur de projet',
  talent: 'Talent / Expert',
  buyer: 'Acheteur / Repreneur',
  seller: 'Vendeur M&A',
};

// Rôles de la marketplace Talents & Associés ; acheteurs et vendeurs utilisent la verticale M&A.
export const TALENT_MARKETPLACE_ROLES: readonly ProfileType[] = ['entrepreneur', 'talent'];

export function isTalentMarketplaceRole(profileType: ProfileType | undefined): boolean {
  return !!profileType && TALENT_MARKETPLACE_ROLES.includes(profileType);
}

// Accès M&A (149€) : l'acheteur consulte les dossiers complets, le vendeur publie son annonce.
// Les autres rôles ne voient que les annonces anonymisées.
export function canAccessMaDetails(profileType: ProfileType | undefined): boolean {
  return profileType === 'buyer';
}

export function canPublishMaListing(profileType: ProfileType | undefined): boolean {
  return profileType === 'seller';
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
  maAccess: boolean;
  isAdmin?: boolean;
  stripeCustomerId?: string;
  createdAt: Timestamp;
  lastActive: Timestamp;
  profileComplete: number;
  verified: boolean;
}
