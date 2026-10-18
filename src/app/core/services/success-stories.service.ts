import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type PriceDisplay = 'exact' | 'range' | 'hidden';

export interface SuccessStory {
  id: string;
  sector: string;
  region: string;
  type: string;
  price_exact: number | null;
  price_range: string | null;
  months_to_sell: number | null;
  quote: string;
  author_label: string;
  sold_at: string;
}

export interface MySuccessStory {
  id: string;
  listing_id: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
}

export interface PendingSuccessStory {
  id: string;
  listing_id: string;
  owner_name: string | null;
  sector: string;
  region: string;
  price_min: number | null;
  price_max: number | null;
  sale_price: number;
  price_display: PriceDisplay;
  months_to_sell: number | null;
  quote: string;
  author_label: string;
  created_at: string;
}

export interface SuccessStoryInput {
  listingId: string;
  salePrice: number;
  priceDisplay: PriceDisplay;
  quote: string;
  authorLabel: string;
  consent: boolean;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

// Mode démo uniquement : exemples pour visualiser la section. En production, seules les ventes réelles
// validées par un admin sont affichées.
const DEMO_STORIES: SuccessStory[] = [
  {
    id: 'demo-story-1',
    sector: 'E-commerce',
    region: 'Pays de la Loire',
    type: 'cession',
    price_exact: 185000,
    price_range: null,
    months_to_sell: 3,
    quote: 'Annonce prête en une soirée, trois repreneurs sérieux en un mois. La vente a été signée chez le notaire dix semaines plus tard.',
    author_label: 'Julie, fondatrice d’une boutique en ligne',
    sold_at: new Date(Date.now() - 20 * 864e5).toISOString(),
  },
  {
    id: 'demo-story-2',
    sector: 'SaaS',
    region: 'Île-de-France',
    type: 'parts_sociales',
    price_exact: null,
    price_range: '250 à 500 k€',
    months_to_sell: 5,
    quote: 'Je voulais rester discret : l’annonce anonymisée m’a permis de vendre sans que mes clients ne l’apprennent avant la signature.',
    author_label: 'Marc, fondateur d’un logiciel B2B',
    sold_at: new Date(Date.now() - 45 * 864e5).toISOString(),
  },
];

// Ventes réussies (témoignages avec prix) : 2026-10-23-ventes-reussies.sql.
@Injectable({ providedIn: 'root' })
export class SuccessStoriesService {
  private readonly supabase = inject(SupabaseService);

  async list(limit = 6): Promise<SuccessStory[]> {
    if (!this.supabase.isConfigured) {
      return DEMO_STORIES.slice(0, limit);
    }

    const { data, error } = await this.supabase.client.rpc('list_success_stories', { p_limit: limit });
    return error ? [] : ((data ?? []) as SuccessStory[]);
  }

  async countCompletedSales(): Promise<number> {
    if (!this.supabase.isConfigured) {
      return DEMO_STORIES.length;
    }

    const { data, error } = await this.supabase.client.rpc('count_completed_sales');
    return error ? 0 : Number(data ?? 0);
  }

  async getMine(): Promise<MySuccessStory[]> {
    if (!this.supabase.isConfigured) {
      return [];
    }

    const { data, error } = await this.supabase.client.from('ma_success_stories').select('id, listing_id, status, admin_note');
    return error ? [] : ((data ?? []) as MySuccessStory[]);
  }

  async submit(input: SuccessStoryInput): Promise<ActionResult> {
    if (!this.supabase.isConfigured) {
      return { success: false, message: 'La déclaration de vente nécessite la connexion à Supabase (indisponible en mode démo).' };
    }

    const { error } = await this.supabase.client.rpc('submit_success_story', {
      p_listing_id: input.listingId,
      p_sale_price: input.salePrice,
      p_price_display: input.priceDisplay,
      p_quote: input.quote.trim(),
      p_author_label: input.authorLabel.trim(),
      p_consent: input.consent,
    });

    return error
      ? { success: false, message: this.readableError(error.message) }
      : { success: true, message: 'Félicitations pour votre vente ! Votre témoignage sera publié après relecture par l’équipe.' };
  }

  async deleteMine(storyId: string): Promise<ActionResult> {
    if (!this.supabase.isConfigured) {
      return { success: false, message: 'Action indisponible en mode démo.' };
    }

    const { error } = await this.supabase.client.rpc('delete_my_success_story', { p_story_id: storyId });
    return error ? { success: false, message: this.readableError(error.message) } : { success: true, message: 'Témoignage retiré.' };
  }

  async getPending(): Promise<PendingSuccessStory[]> {
    if (!this.supabase.isConfigured) {
      return [];
    }

    const { data, error } = await this.supabase.client.rpc('admin_list_success_stories');
    return error ? [] : ((data ?? []) as PendingSuccessStory[]);
  }

  async decide(storyId: string, approve: boolean, note: string): Promise<ActionResult> {
    if (!this.supabase.isConfigured) {
      return { success: false, message: 'Action indisponible en mode démo.' };
    }

    const { error } = await this.supabase.client.rpc('decide_success_story', {
      p_story_id: storyId,
      p_approve: approve,
      p_note: note.trim() || null,
    });

    return error
      ? { success: false, message: this.readableError(error.message) }
      : { success: true, message: approve ? 'Témoignage publié.' : 'Témoignage refusé, le vendeur est prévenu.' };
  }

  private readableError(message: string): string {
    return message.replace(/^.*?:\s*/, '').trim() || 'Une erreur est survenue, réessayez.';
  }
}
