import { Injectable, inject } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { MA_LISTINGS, MaListingData, findMaListingById } from '../data/mock-platform.data';
import { MaListing } from '../models/ma-listing.model';
import { SupabaseMaListingInsert, SupabaseMaListingRow } from '../models/supabase-database.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export interface MaSearchFilters {
  sector?: string;
  region?: string;
  priceMin?: number;
  priceMax?: number;
  type?: string;
}

@Injectable({ providedIn: 'root' })
export class MaService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  async getListings(filters?: MaSearchFilters): Promise<MaListing[]> {
    if (!this.supabase.isConfigured) {
      return [];
    }

    let query = this.supabase.client
      .from('ma_listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.sector && filters.sector !== 'Tous') {
      query = query.eq('sector', filters.sector);
    }

    if (filters?.region) {
      query = query.ilike('region', `%${filters.region}%`);
    }

    if (filters?.type && filters.type !== 'Tous') {
      query = query.eq('type', filters.type);
    }

    if (typeof filters?.priceMin === 'number') {
      query = query.gte('price_min', filters.priceMin);
    }

    if (typeof filters?.priceMax === 'number') {
      query = query.lte('price_max', filters.priceMax);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }

    return ((data ?? []) as SupabaseMaListingRow[]).map(row => this.mapRowToListing(row));
  }

  async getListingById(id: string): Promise<MaListing | null> {
    if (!this.supabase.isConfigured) {
      return null;
    }

    const { data, error } = await this.supabase.client
      .from('ma_listings')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this.mapRowToListing(data as SupabaseMaListingRow);
  }

  async getListingCards(): Promise<MaListingData[]> {
    if (!this.supabase.isConfigured) {
      return MA_LISTINGS;
    }

    const { data, error } = await this.supabase.client
      .from('ma_listings')
      .select('id, sector, region, type, revenue, margin, age, price_min, price_max, public_summary, status, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    const listings = ((data ?? []) as SupabaseMaListingRow[]).map(row => this.mapCardRow(row));
    return listings.length === 0 && this.auth.isAdmin() ? MA_LISTINGS : listings;
  }

  async getListingDetail(listingId: string): Promise<MaListingData | undefined> {
    if (!this.supabase.isConfigured) {
      return findMaListingById(listingId);
    }

    const { data, error } = await this.supabase.client
      .from('ma_listings')
      .select('*')
      .eq('id', listingId)
      .maybeSingle();

    if (error || !data) {
      return this.auth.isAdmin() ? findMaListingById(listingId) : undefined;
    }

    return this.mapDetailRow(data as SupabaseMaListingRow);
  }

  async createListing(data: Omit<MaListing, 'id' | 'createdAt'>): Promise<string> {
    if (!this.supabase.isConfigured) {
      return '';
    }

    const insert: SupabaseMaListingInsert = {
      owner_id: data.ownerId,
      sector: data.sector,
      region: data.region,
      type: data.type,
      revenue: data.revenue,
      margin: data.margin,
      age: data.age,
      price_min: data.priceMin,
      price_max: data.priceMax,
      public_summary: data.description.slice(0, 220),
      sale_reason: data.saleReason,
      confidential_description: data.description,
      contact_info: data.contactInfo,
      status: data.status,
    };

    const { data: createdListing, error } = await this.supabase.client
      .from('ma_listings')
      .insert(insert)
      .select('id')
      .single();

    if (error || !createdListing) {
      return '';
    }

    return (createdListing as { id: string }).id;
  }

  private mapRowToListing(row: SupabaseMaListingRow): MaListing {
    return {
      id: row.id,
      ownerId: row.owner_id,
      sector: row.sector,
      region: row.region,
      type: row.type,
      revenue: row.revenue ?? 0,
      margin: row.margin ?? 0,
      age: row.age ?? 0,
      priceMin: row.price_min ?? 0,
      priceMax: row.price_max ?? 0,
      saleReason: row.sale_reason ?? '',
      description: row.confidential_description ?? row.public_summary,
      contactInfo: row.contact_info ?? '',
      status: row.status,
      createdAt: Timestamp.fromDate(new Date(row.created_at)),
    };
  }

  private mapCardRow(row: Partial<SupabaseMaListingRow> & Pick<SupabaseMaListingRow, 'id' | 'sector' | 'region' | 'type' | 'public_summary'>): MaListingData {
    return {
      id: row.id,
      sector: row.sector,
      region: row.region,
      type: this.listingTypeLabel(row.type),
      revenue: this.formatMoney(row.revenue ?? null),
      margin: row.margin === null || row.margin === undefined ? 'À préciser' : `${row.margin} %`,
      age: row.age === null || row.age === undefined ? 'À préciser' : `${row.age} ans`,
      reason: 'Réservé au dossier complet',
      priceMin: this.formatMoney(row.price_min ?? null),
      priceMax: this.formatMoney(row.price_max ?? null),
      summary: row.public_summary,
      description: row.public_summary,
      highlights: ['Annonce anonymisée', 'Accès M&A requis', 'Dossier confidentiel'],
    };
  }

  private mapDetailRow(row: SupabaseMaListingRow): MaListingData {
    return {
      ...this.mapCardRow(row),
      reason: row.sale_reason ?? 'Raison communiquée après qualification.',
      description: row.confidential_description ?? row.public_summary,
      highlights: ['Dossier complet', 'Mise en relation possible', 'Informations confidentielles'],
    };
  }

  private listingTypeLabel(value: string): string {
    switch (value) {
      case 'fonds_commerce':
        return 'Fonds de commerce';
      case 'parts_sociales':
        return 'Parts sociales';
      default:
        return 'Cession';
    }
  }

  private formatMoney(value: number | null): string {
    if (value === null) {
      return 'À préciser';
    }

    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M€`;
    }

    return `${Math.round(value / 1_000).toLocaleString('fr-FR')} k€`;
  }
}
