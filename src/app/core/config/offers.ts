// Grille des offres « reprise » (branche refonte-reprise). Source unique des prix affichés.
// Les droits correspondants sont accordés côté serveur (simulate_purchase / simulate_listing_purchase en
// simulation, webhook Stripe ensuite) : voir supabase/2026-10-20b-offres-reprise.sql.

export type AccountProduct = 'PRO' | 'PREMIUM' | 'MA_ACCESS' | 'MA_PLUS' | 'PRO_DIRECTORY' | 'PRO_ACCOUNT';
export type ListingProduct = 'FEATURE_7D' | 'FEATURE_30D' | 'VERIFICATION';

export interface OfferPrice {
  amount: number;
  label: string;
}

export const OFFER_PRICES: Record<AccountProduct | ListingProduct, OfferPrice> = {
  PRO: { amount: 49, label: '49 € / mois' },
  PREMIUM: { amount: 0, label: 'Sur devis' },
  MA_ACCESS: { amount: 149, label: '149 € / an' },
  MA_PLUS: { amount: 390, label: '390 € / an' },
  FEATURE_7D: { amount: 14, label: '14 € (7 jours)' },
  FEATURE_30D: { amount: 49, label: '49 € (30 jours)' },
  VERIFICATION: { amount: 199, label: '199 € une fois' },
  PRO_DIRECTORY: { amount: 79, label: '79 € / mois' },
  PRO_ACCOUNT: { amount: 199, label: '199 € / mois' },
};

// Analyses de dossier par l'IA incluses chaque mois avec l'accès repreneur 149 € (illimitées avec Plus).
export const FREE_AI_ANALYSES_PER_MONTH = 3;

// Accès anticipé des repreneurs Plus aux nouvelles annonces.
export const EARLY_ACCESS_HOURS = 48;
