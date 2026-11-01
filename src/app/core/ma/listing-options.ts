// Options des annonces enrichies (supabase/2026-10-26-annonces-enrichies.sql) : les valeurs doivent rester
// identiques aux listes autorisées par la contrainte ma_listings_enrichment_check.

export type IncludedAsset = 'site' | 'domaine' | 'marque' | 'code' | 'clients' | 'stock' | 'contrats' | 'reseaux' | 'publicite' | 'equipe' | 'locaux' | 'materiel';
export type AcquisitionChannel = 'seo' | 'publicite' | 'reseaux' | 'email' | 'marketplaces' | 'bouche_a_oreille' | 'partenariats' | 'commercial';
export type ListingType = 'cession' | 'fonds_commerce' | 'parts_sociales';

export interface RevenuePoint {
  year: number;
  revenue: number;
}

export const INCLUDED_ASSETS: Array<{ value: IncludedAsset; label: string }> = [
  { value: 'site', label: 'Site ou application' },
  { value: 'domaine', label: 'Nom de domaine' },
  { value: 'marque', label: 'Marque et logo' },
  { value: 'code', label: 'Code source' },
  { value: 'clients', label: 'Base clients' },
  { value: 'stock', label: 'Stock' },
  { value: 'contrats', label: 'Contrats fournisseurs ou clients' },
  { value: 'reseaux', label: 'Comptes de réseaux sociaux' },
  { value: 'publicite', label: 'Comptes publicitaires' },
  { value: 'equipe', label: 'Équipe ou prestataires' },
  { value: 'locaux', label: 'Locaux ou bail' },
  { value: 'materiel', label: 'Matériel' },
];

export const ACQUISITION_CHANNELS: Array<{ value: AcquisitionChannel; label: string }> = [
  { value: 'seo', label: 'Référencement naturel' },
  { value: 'publicite', label: 'Publicité en ligne' },
  { value: 'reseaux', label: 'Réseaux sociaux' },
  { value: 'email', label: 'Emailing' },
  { value: 'marketplaces', label: 'Marketplaces' },
  { value: 'bouche_a_oreille', label: 'Bouche-à-oreille' },
  { value: 'partenariats', label: 'Partenariats' },
  { value: 'commercial', label: 'Prospection commerciale' },
];

export const LISTING_TYPES: Array<{ value: ListingType; label: string; hint: string }> = [
  { value: 'cession', label: 'Cession', hint: "Vente de l'activité, sous la forme à définir avec le repreneur" },
  { value: 'parts_sociales', label: 'Parts sociales', hint: 'Vente de la société elle-même (actions ou parts)' },
  { value: 'fonds_commerce', label: 'Fonds de commerce', hint: 'Vente du fonds : clientèle, nom, matériel, bail' },
];

export function labelOf<T extends string>(options: Array<{ value: T; label: string }>, value: T): string {
  return options.find(option => option.value === value)?.label ?? value;
}

// Historique trié, dernier exercice inclus (s'il est connu), pour le graphique et la croissance.
export function revenueSeries(history: RevenuePoint[] | undefined, lastYear: number | null | undefined, lastRevenue: number | null | undefined): RevenuePoint[] {
  const points = [...(history ?? [])];

  if (lastYear && lastRevenue !== null && lastRevenue !== undefined && !points.some(point => point.year === lastYear)) {
    points.push({ year: lastYear, revenue: lastRevenue });
  }

  return points.sort((a, b) => a.year - b.year);
}

// Croissance du dernier exercice par rapport à l'année précédente (en %), si les deux années sont connues et consécutives.
export function lastGrowth(series: RevenuePoint[]): number | null {
  if (series.length < 2) {
    return null;
  }

  const last = series[series.length - 1];
  const previous = series[series.length - 2];

  if (last.year - previous.year !== 1 || previous.revenue <= 0) {
    return null;
  }

  return Math.round(((last.revenue - previous.revenue) / previous.revenue) * 100);
}
