import { Timestamp } from '@angular/fire/firestore';

// Un utilisateur a un seul rôle, choisi à l'inscription et non modifiable ensuite.
export type ProfileType = 'entrepreneur' | 'talent' | 'buyer' | 'seller' | 'pro';
export type Plan = 'FREE' | 'PRO' | 'PREMIUM';

export const PROFILE_TYPE_LABELS: Record<ProfileType, string> = {
  entrepreneur: 'Porteur de projet',
  talent: 'Associé',
  buyer: 'Acheteur / Repreneur',
  seller: 'Vendeur M&A',
  pro: 'Professionnel',
};

// Professionnels de la transmission (refonte « reprise ») : annuaire et comptes pros.
export type ProCategory = 'expert_comptable' | 'avocat' | 'cabinet_cession' | 'notaire' | 'autre';

export const PRO_CATEGORY_LABELS: Record<ProCategory, string> = {
  expert_comptable: 'Expert-comptable',
  avocat: 'Avocat',
  cabinet_cession: 'Cabinet de cession',
  notaire: 'Notaire',
  autre: 'Autre professionnel',
};

export function isActiveUntil(value: string | undefined): boolean {
  return !!value && new Date(value).getTime() > Date.now();
}

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

// Vendeurs, et pros avec un compte pro en cours (règle aussi vérifiée par Supabase).
export function canPublishMa(user: Pick<User, 'profileType' | 'proAccountUntil'> | null | undefined): boolean {
  return !!user && (user.profileType === 'seller' || (user.profileType === 'pro' && isActiveUntil(user.proAccountUntil)));
}

export function hasBuyerPlus(user: Pick<User, 'profileType' | 'buyerPlusUntil'> | null | undefined): boolean {
  return !!user && user.profileType === 'buyer' && isActiveUntil(user.buyerPlusUntil);
}

// Matching intelligent (PRO) : les raisons détaillées du score sont réservées aux plans payants.
export const MATCH_REASONS_UPSELL = 'Passez en PRO pour voir pourquoi ce profil vous correspond';

export function canSeeMatchReasons(plan: Plan | undefined): boolean {
  return plan === 'PRO' || plan === 'PREMIUM';
}

// Recherche avancée (mots-clés, compétences, score minimum) : PRO et PREMIUM.
export function canUseAdvancedSearch(plan: Plan | undefined): boolean {
  return plan === 'PRO' || plan === 'PREMIUM';
}

// Projets mis en avant dans la recherche des associés : porteur de projet en PRO ou PREMIUM.
export function isFeaturedProjectPlan(plan: Plan | undefined | null): boolean {
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
  // Date de vérification du profil par l'équipe (badge « Profil vérifié »).
  profileVerifiedAt?: string;
  maRegion?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
  plan: Plan;
  // Accès M&A acheteur payé et non expiré.
  maAccess: boolean;
  maAccessExpiresAt?: string;
  // Offres « reprise » : accès Plus (repreneur), annuaire et compte pro.
  buyerPlusUntil?: string;
  proDirectoryUntil?: string;
  proAccountUntil?: string;
  proCategory?: ProCategory;
  isAdmin?: boolean;
  stripeCustomerId?: string;
  createdAt: Timestamp;
  lastActive: Timestamp;
  profileComplete: number;
  verified: boolean;
}
