import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type ListingViewKind = 'page' | 'dossier';

export interface ListingStats {
  listing_id: string;
  sector: string;
  region: string;
  status: string;
  created_at: string;
  page_views_total: number;
  page_views_period: number;
  dossier_views_total: number;
  dossier_views_period: number;
}

export interface DailyViews {
  day: string;
  page_views: number;
  dossier_views: number;
}

export interface ContactStats {
  contacts_total: number;
  contacts_period: number;
}

export interface ProStats {
  is_listed: boolean;
  profile_views_total: number;
  profile_views_period: number;
  website_clicks_total: number;
  website_clicks_period: number;
}

export interface SellerStats {
  listings: ListingStats[];
  daily: DailyViews[];
  contacts: ContactStats;
}

// Statistiques des vendeurs : vues des annonces (page, dossier complet) et contacts reçus.
// Côté Supabase : record_ma_listing_view, get_my_listing_stats, get_my_listing_daily_views, get_my_contact_stats.
@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly supabase = inject(SupabaseService);

  // Appel silencieux : une statistique manquée ne doit jamais gêner la consultation.
  async recordListingView(listingId: string, kind: ListingViewKind): Promise<void> {
    if (!this.supabase.isConfigured || !listingId) {
      return;
    }

    try {
      await this.supabase.client.rpc('record_ma_listing_view', { p_listing_id: listingId, p_kind: kind });
    } catch {
      // Ignoré volontairement.
    }
  }

  // Professionnels de l'annuaire : ouverture de la fiche ou clic vers le site (refonte-reprise).
  async recordProEvent(proId: string, kind: 'profile' | 'website'): Promise<void> {
    if (!this.supabase.isConfigured || !proId) {
      return;
    }

    try {
      await this.supabase.client.rpc('record_pro_profile_event', { p_pro_id: proId, p_kind: kind });
    } catch {
      // Ignoré volontairement.
    }
  }

  async getProStats(days = 30): Promise<ProStats> {
    if (!this.supabase.isConfigured) {
      return { is_listed: true, profile_views_total: 58, profile_views_period: 21, website_clicks_total: 17, website_clicks_period: 6 };
    }

    const { data } = await this.supabase.client.rpc('get_my_pro_stats', { p_days: days }).maybeSingle();
    const row = data as ProStats | null;

    return {
      is_listed: row?.is_listed ?? false,
      profile_views_total: Number(row?.profile_views_total ?? 0),
      profile_views_period: Number(row?.profile_views_period ?? 0),
      website_clicks_total: Number(row?.website_clicks_total ?? 0),
      website_clicks_period: Number(row?.website_clicks_period ?? 0),
    };
  }

  async getSellerStats(days = 30): Promise<SellerStats> {
    if (!this.supabase.isConfigured) {
      return this.demoStats(days);
    }

    const [listings, daily, contacts] = await Promise.all([
      this.supabase.client.rpc('get_my_listing_stats', { p_days: days }),
      this.supabase.client.rpc('get_my_listing_daily_views', { p_days: days }),
      this.supabase.client.rpc('get_my_contact_stats', { p_days: days }).maybeSingle(),
    ]);

    return {
      listings: ((listings.data ?? []) as ListingStats[]).map(row => ({
        ...row,
        page_views_total: Number(row.page_views_total),
        page_views_period: Number(row.page_views_period),
        dossier_views_total: Number(row.dossier_views_total),
        dossier_views_period: Number(row.dossier_views_period),
      })),
      daily: ((daily.data ?? []) as DailyViews[]).map(row => ({
        day: row.day,
        page_views: Number(row.page_views),
        dossier_views: Number(row.dossier_views),
      })),
      contacts: {
        contacts_total: Number((contacts.data as ContactStats | null)?.contacts_total ?? 0),
        contacts_period: Number((contacts.data as ContactStats | null)?.contacts_period ?? 0),
      },
    };
  }

  // Mode démo : chiffres d'exemple pour visualiser la page.
  private demoStats(days: number): SellerStats {
    const daily = Array.from({ length: days }, (_, index) => {
      const date = new Date(Date.now() - (days - 1 - index) * 864e5);
      const pages = Math.round(3 + 4 * Math.abs(Math.sin(index / 3)) + (index % 7 === 1 ? 5 : 0));
      return { day: date.toISOString().slice(0, 10), page_views: pages, dossier_views: Math.round(pages / 3) };
    });
    const pageViews = daily.reduce((total, row) => total + row.page_views, 0);
    const dossierViews = daily.reduce((total, row) => total + row.dossier_views, 0);

    return {
      listings: [
        {
          listing_id: 'MA-001',
          sector: 'E-commerce',
          region: 'Pays de la Loire',
          status: 'active',
          created_at: new Date(Date.now() - 40 * 864e5).toISOString(),
          page_views_total: pageViews + 37,
          page_views_period: pageViews,
          dossier_views_total: dossierViews + 9,
          dossier_views_period: dossierViews,
        },
      ],
      daily,
      contacts: { contacts_total: 6, contacts_period: 4 },
    };
  }
}
