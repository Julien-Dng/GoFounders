// Estimation indicative de la valeur d'une petite entreprise (outil gratuit /estimation).
// Calcul par règles, sans IA : bénéfice net annuel × multiple de marché, ajusté par quelques critères.
// Les multiples sont des repères courants pour les petites entreprises (moins de 1 M€ de CA) ;
// ils ne remplacent pas l'avis d'un expert-comptable. À ajuster ici si besoin.

export type BusinessKind = 'saas' | 'ecommerce' | 'contenu' | 'agence' | 'appli' | 'autre';
export type Growth = 'baisse' | 'stable' | 'croissance' | 'forte';
export type Recurring = 'faible' | 'moyenne' | 'forte';
export type FounderDependence = 'forte' | 'moyenne' | 'faible';

export interface ValuationInput {
  kind: BusinessKind;
  revenue: number;          // chiffre d'affaires annuel en euros
  marginPercent: number;    // marge nette en %
  ageYears: number;
  growth: Growth;
  recurring: Recurring;
  founderDependence: FounderDependence;
}

export interface ValuationFactor {
  label: string;
  effect: number;           // en points de multiple (+0,3 = +0,3x)
}

export interface ValuationResult {
  netProfit: number;
  multipleLow: number;
  multipleHigh: number;
  valueLow: number;
  valueHigh: number;
  factors: ValuationFactor[];
}

export const BUSINESS_KIND_LABELS: Record<BusinessKind, string> = {
  saas: 'SaaS, logiciel',
  ecommerce: 'E-commerce',
  contenu: 'Site de contenu, newsletter',
  agence: 'Agence, services',
  appli: 'Application mobile',
  autre: 'Autre activité',
};

// Fourchette de multiples du bénéfice net annuel, par type d'activité.
const BASE_MULTIPLES: Record<BusinessKind, [number, number]> = {
  saas: [3, 5],
  ecommerce: [2, 3.5],
  contenu: [2.5, 4],
  agence: [1.5, 3],
  appli: [2.5, 4],
  autre: [1.5, 3],
};

const GROWTH_EFFECT: Record<Growth, [string, number]> = {
  baisse: ["Chiffre d'affaires en baisse", -0.5],
  stable: ["Chiffre d'affaires stable", 0],
  croissance: ['Croissance de 10 à 30 % par an', 0.3],
  forte: ['Croissance de plus de 30 % par an', 0.7],
};

const RECURRING_EFFECT: Record<Recurring, [string, number]> = {
  faible: ['Peu de revenus récurrents', 0],
  moyenne: ['25 à 60 % de revenus récurrents', 0.3],
  forte: ['Plus de 60 % de revenus récurrents', 0.6],
};

const FOUNDER_EFFECT: Record<FounderDependence, [string, number]> = {
  forte: ['Activité très dépendante du fondateur', -0.5],
  moyenne: ['Activité en partie dépendante du fondateur', -0.2],
  faible: ['Activité qui tourne sans le fondateur', 0],
};

const MIN_MULTIPLE = 0.5;

// Renvoie null si l'entreprise n'est pas bénéficiaire : un multiple du bénéfice n'a alors pas de sens.
export function estimateValue(input: ValuationInput): ValuationResult | null {
  const netProfit = Math.round((input.revenue * input.marginPercent) / 100);

  if (!Number.isFinite(netProfit) || netProfit <= 0) {
    return null;
  }

  const factors: ValuationFactor[] = [
    { label: GROWTH_EFFECT[input.growth][0], effect: GROWTH_EFFECT[input.growth][1] },
    { label: RECURRING_EFFECT[input.recurring][0], effect: RECURRING_EFFECT[input.recurring][1] },
    { label: FOUNDER_EFFECT[input.founderDependence][0], effect: FOUNDER_EFFECT[input.founderDependence][1] },
    ageFactor(input.ageYears),
  ];

  const adjustment = factors.reduce((total, factor) => total + factor.effect, 0);
  const [baseLow, baseHigh] = BASE_MULTIPLES[input.kind];
  const multipleLow = round1(Math.max(MIN_MULTIPLE, baseLow + adjustment));
  const multipleHigh = round1(Math.max(multipleLow + 0.5, baseHigh + adjustment));

  return {
    netProfit,
    multipleLow,
    multipleHigh,
    valueLow: roundTo5k(netProfit * multipleLow),
    valueHigh: roundTo5k(netProfit * multipleHigh),
    factors,
  };
}

function ageFactor(ageYears: number): ValuationFactor {
  if (ageYears < 2) {
    return { label: "Moins de 2 ans d'historique", effect: -0.5 };
  }

  if (ageYears > 5) {
    return { label: "Plus de 5 ans d'historique", effect: 0.2 };
  }

  return { label: "2 à 5 ans d'historique", effect: 0 };
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundTo5k(value: number): number {
  return Math.max(5000, Math.round(value / 5000) * 5000);
}
