import { Timestamp } from '@angular/fire/firestore';

// Compte multi-usages (docs/PLAN-COMPTE-MULTI-USAGES.md) : un membre cumule des usages, modifiables à tout moment.
// Les usages personnalisent le site ; les droits viennent des actions et des achats (règles Supabase).
// profileType ne sert plus qu'à distinguer les comptes pro (role = 'pro') ; pour un membre, il reprend son premier usage.
export type ProfileType = 'entrepreneur' | 'talent' | 'buyer' | 'seller' | 'pro';
export type Usage = 'reprise' | 'cession' | 'projet' | 'associe';

// Libellé court d'un usage, pour décrire un membre (« Porteur de projet, Repreneur »).
export const USAGE_SHORT_LABELS: Record<Usage, string> = { projet: 'Porteur de projet', associe: 'Associé', reprise: 'Repreneur', cession: 'Cédant' };

export function usageSummary(user: Pick<User, 'profileType' | 'usages'> | null | undefined): string {
  if (user?.profileType === 'pro') {
    return 'Professionnel';
  }

  return usagesOf(user).map(usage => USAGE_SHORT_LABELS[usage]).join(', ') || 'Membre';
}

const USAGE_TO_PROFILE_TYPE: Record<Usage, ProfileType> = { projet: 'entrepreneur', associe: 'talent', reprise: 'buyer', cession: 'seller' };
const PROFILE_TYPE_TO_USAGE: Partial<Record<ProfileType, Usage>> = { entrepreneur: 'projet', talent: 'associe', buyer: 'reprise', seller: 'cession' };

// Rôle enregistré pour information : celui du premier usage (comme la règle Supabase handle_new_auth_user).
export function primaryProfileType(usages: readonly Usage[]): ProfileType {
  return usages.length > 0 ? USAGE_TO_PROFILE_TYPE[usages[0]] : 'talent';
}

// Usages d'un membre ; anciens comptes sans usages : déduits de leur rôle.
export function usagesOf(user: Pick<User, 'profileType' | 'usages'> | null | undefined): Usage[] {
  if (!user || user.profileType === 'pro') {
    return [];
  }

  if (user.usages && user.usages.length > 0) {
    return user.usages;
  }

  const fallback = PROFILE_TYPE_TO_USAGE[user.profileType];
  return fallback ? [fallback] : [];
}

export function hasUsage(user: Pick<User, 'profileType' | 'usages'> | null | undefined, usage: Usage): boolean {
  return usagesOf(user).includes(usage);
}

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

// Membre intéressé par les associés (projet ou rejoindre un projet) : personnalisation seulement.
export function usesTeamMarketplace(user: Pick<User, 'profileType' | 'usages'> | null | undefined): boolean {
  return hasUsage(user, 'projet') || hasUsage(user, 'associe');
}

// Profil d'associé proposé (case « Proposer mon profil aux porteurs de projet ») avec au moins une compétence :
// c'est ce qui ouvre les projets (is_associate côté Supabase), pas l'objectif.
export function offersAssociateProfile(user: Pick<User, 'profileType' | 'associateOfferedAt' | 'skills'> | null | undefined): boolean {
  return !!user && user.profileType !== 'pro' && !!user.associateOfferedAt && (user.skills?.length ?? 0) > 0;
}

// Apport de l'associé (2026-11-25-apport-associe.sql) : miroir de « projet ouvert à un apport ».
export type InvestmentReadiness = 'yes' | 'discuss' | 'no';
export const INVESTMENT_OPTIONS: ReadonlyArray<{ value: InvestmentReadiness; label: string; badge: string }> = [
  { value: 'yes', label: 'Oui, prêt à investir', badge: 'Prêt à investir' },
  { value: 'discuss', label: 'À discuter selon le projet', badge: 'Apport à discuter' },
  { value: 'no', label: 'Non, compétences seulement', badge: 'Sans apport' },
];
export function investmentBadge(value: InvestmentReadiness | null | undefined): string | null {
  return value === 'yes' || value === 'discuss' ? INVESTMENT_OPTIONS.find(option => option.value === value)!.badge : null;
}

// Prise de contact (2026-11-17-visibilite-contact.sql) : présentation d'au moins 50 caractères, vérifiée aussi par Supabase.
export const MIN_PRESENTATION_LENGTH = 50;

// Profil d'associé complété : intitulé, au moins une compétence, présentation. Suffit pour écrire à un porteur de
// projet, même sans être visible dans la recherche (associate_profile_complete côté Supabase).
export function isAssociateProfileComplete(user: Pick<User, 'profileType' | 'profileTitle' | 'skills' | 'bio'> | null | undefined): boolean {
  return !!user && user.profileType !== 'pro'
    && !!user.profileTitle?.trim()
    && (user.skills?.length ?? 0) > 0
    && (user.bio?.trim().length ?? 0) >= MIN_PRESENTATION_LENGTH;
}

// Projet présenté : titre, présentation, au moins une compétence recherchée. Suffit pour écrire à un associé, même en
// brouillon ; obligatoire pour publier (project_presented et enforce_project_minimum côté Supabase).
export function isProjectPresented(project: { name: string; description: string; skillsNeeded: string[] } | null | undefined): boolean {
  return !!project && !!project.name.trim()
    && project.description.trim().length >= MIN_PRESENTATION_LENGTH
    && project.skillsNeeded.length > 0;
}

// Reprise : tout membre (hors compte pro) peut ouvrir un dossier pour 50 € ; les droits sont vérifiés par Supabase.
export function canBuyMaDossier(user: Pick<User, 'profileType'> | null | undefined): boolean {
  return !!user && user.profileType !== 'pro';
}

// Publication d'annonce : tout membre, et les pros avec un compte pro en cours (règle aussi vérifiée par Supabase).
export function canPublishMa(user: Pick<User, 'profileType' | 'proAccountUntil'> | null | undefined): boolean {
  return !!user && (user.profileType !== 'pro' || isActiveUntil(user.proAccountUntil));
}

export function hasBuyerPlus(user: Pick<User, 'buyerPlusUntil'> | null | undefined): boolean {
  return !!user && isActiveUntil(user.buyerPlusUntil);
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
  // Usages choisis par le membre (personnalisation, aucun droit) ; voir usagesOf().
  usages?: Usage[];
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
  // Profil d'associé proposé aux porteurs de projet : choix explicite, distinct de l'objectif « Rejoindre un projet ».
  associateOfferedAt?: string;
  // Prêt à entrer au capital avec un apport (sans montant) ; non précisé si absent.
  investmentReadiness?: InvestmentReadiness;
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
