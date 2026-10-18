import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type ModerationFilter = 'to_review' | 'active' | 'withdrawn' | 'all';
export type ModerationAction = 'approve' | 'withdraw' | 'restore';

export interface ModeratedListing {
  id: string;
  owner_id: string;
  owner_name: string | null;
  sector: string;
  region: string;
  type: string;
  revenue: number | null;
  margin: number | null;
  age: number | null;
  price_min: number | null;
  price_max: number | null;
  public_summary: string;
  sale_reason: string | null;
  confidential_description: string | null;
  contact_info: string | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  moderation_note: string | null;
  withdrawn_by_admin: boolean;
}

const DEMO_LISTINGS: ModeratedListing[] = [
  {
    id: 'MA-001',
    owner_id: 'demo-seller',
    owner_name: 'Vendeur démo',
    sector: 'E-commerce',
    region: 'Pays de la Loire',
    type: 'cession',
    revenue: 180000,
    margin: 25,
    age: 4,
    price_min: 150000,
    price_max: 220000,
    public_summary: 'Boutique en ligne de décoration rentable, clientèle fidèle et récurrente.',
    sale_reason: 'Nouveau projet entrepreneurial',
    confidential_description: 'Boutique Shopify créée il y a 4 ans, 3 000 clients dont 40 % récurrents, logistique externalisée.',
    contact_info: 'vendeur@exemple.fr',
    status: 'active',
    created_at: new Date(Date.now() - 2 * 3600e3).toISOString(),
    reviewed_at: null,
    moderation_note: null,
    withdrawn_by_admin: false,
  },
];

// Modération des annonces M&A par les admins. Les droits sont contrôlés par Supabase
// (admin_list_ma_listings, moderate_ma_listing : 2026-10-21-moderation-verification-stats.sql).
@Injectable({ providedIn: 'root' })
export class ModerationService {
  private readonly supabase = inject(SupabaseService);

  async list(filter: ModerationFilter): Promise<ModeratedListing[]> {
    if (!this.supabase.isConfigured) {
      return filter === 'withdrawn' ? [] : DEMO_LISTINGS;
    }

    const { data, error } = await this.supabase.client.rpc('admin_list_ma_listings', { p_filter: filter });
    return error ? [] : ((data ?? []) as ModeratedListing[]);
  }

  async moderate(listingId: string, action: ModerationAction, note: string): Promise<{ success: boolean; message: string }> {
    if (!this.supabase.isConfigured) {
      return { success: false, message: 'Action indisponible en mode démo.' };
    }

    const { error } = await this.supabase.client.rpc('moderate_ma_listing', {
      p_listing_id: listingId,
      p_action: action,
      p_note: note.trim() || null,
    });

    if (error) {
      return { success: false, message: error.message.replace(/^.*?:\s*/, '').trim() || 'Une erreur est survenue.' };
    }

    const messages: Record<ModerationAction, string> = {
      approve: 'Annonce marquée comme relue.',
      withdraw: 'Annonce retirée, le vendeur est prévenu.',
      restore: 'Annonce remise en ligne, le vendeur est prévenu.',
    };

    return { success: true, message: messages[action] };
  }
}
