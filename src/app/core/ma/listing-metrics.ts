import { MaListingData } from '../data/mock-platform.data';

// Chiffres d'une annonce calculés à partir de ce que le cédant a déclaré (CA, marge, prix).
// Utilisés pour le tri sur /ma et les chiffres clés de la fiche : rien n'est inventé ni estimé par l'IA.
export interface ListingMetrics {
  revenue: number | null;
  margin: number | null;
  age: number | null;
  priceMin: number | null;
  priceMax: number | null;
  // Prix de référence : milieu de la fourchette (ou la seule borne connue).
  price: number | null;
  netProfit: number | null;
  // Prix demandé divisé par le bénéfice net annuel.
  multiple: number | null;
  publishedAt: Date | null;
}

export function listingMetrics(listing: MaListingData): ListingMetrics {
  const revenue = listing.revenueValue ?? parseAmount(listing.revenue);
  const margin = listing.marginValue ?? parseNumber(listing.margin);
  const age = listing.ageValue ?? parseNumber(listing.age);
  const priceMin = listing.priceMinValue ?? parseAmount(listing.priceMin);
  const priceMax = listing.priceMaxValue ?? parseAmount(listing.priceMax);
  const price = priceMin !== null && priceMax !== null ? (priceMin + priceMax) / 2 : priceMin ?? priceMax;
  const netProfit = revenue !== null && margin !== null ? Math.round((revenue * margin) / 100) : null;
  const multiple = price !== null && netProfit !== null && netProfit > 0 ? price / netProfit : null;
  const publishedAt = listing.publishedAt ? new Date(listing.publishedAt) : null;

  return { revenue, margin, age, priceMin, priceMax, price, netProfit, multiple, publishedAt };
}

// « 280 k€/an », « 1,2 M€ » → montant en euros.
export function parseAmount(text: string | undefined): number | null {
  const match = (text ?? '').replace(/ | /g, ' ').match(/([\d\s]+(?:[.,]\d+)?)\s*(k|M)€/);

  if (!match) {
    return null;
  }

  const value = Number(match[1].replace(/\s/g, '').replace(',', '.'));
  return value * (match[2] === 'M' ? 1_000_000 : 1_000);
}

function parseNumber(text: string | undefined): number | null {
  const match = (text ?? '').match(/-?\d+(?:[.,]\d+)?/);
  return match ? Number(match[0].replace(',', '.')) : null;
}

export function formatEuros(value: number | null): string {
  if (value === null) {
    return 'À préciser';
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M€`;
  }

  return `${Math.round(value / 1_000).toLocaleString('fr-FR')} k€`;
}

export function formatMultiple(value: number | null): string {
  return value === null ? 'À préciser' : `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}×`;
}

// « aujourd'hui », « il y a 3 jours », « il y a 2 mois ».
export function publishedLabel(date: Date | null, now = Date.now()): string {
  if (!date) {
    return '';
  }

  const days = Math.floor((now - date.getTime()) / 86_400_000);

  if (days <= 0) {
    return "Publiée aujourd'hui";
  }

  if (days === 1) {
    return 'Publiée hier';
  }

  if (days < 30) {
    return `Publiée il y a ${days} jours`;
  }

  const months = Math.floor(days / 30);
  return months < 12 ? `Publiée il y a ${months} mois` : `Publiée il y a plus d'un an`;
}
