import { Injectable, inject } from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';
import { MA_LISTINGS, MaListingData, findMaListingById } from '../data/mock-platform.data';
import { MaListing } from '../models/ma-listing.model';
import { SupabaseMaListingInsert, SupabaseMaListingRow } from '../models/supabase-database.model';
import { ProCategory, canAccessMaDetails } from '../models/user.model';
import { AuthService } from './auth.service';
import { ListingAccessService } from './listing-access.service';
import { SupabaseService } from './supabase.service';

// Colonnes anonymisées lisibles par tous ; le dossier complet passe par get_ma_listing_detail (Supabase).
const BASE_LISTING_COLUMNS =
  'id, sector, region, type, revenue, margin, age, price_min, price_max, public_summary, status, featured_until, verified, created_at, updated_at';
const PUBLIC_LISTING_COLUMNS =
  'id, sector, region, type, revenue, margin, age, price_min, price_max, public_summary, status, featured_until, verified, created_at, updated_at, revenue_year, revenue_history, included_assets, monthly_visitors, acquisition_channels, team_size, owner_hours_per_week';

const EARLY_ACCESS_MS = 48 * 3600 * 1000;

// Informations facultatives des annonces enrichies (supabase/2026-10-26-annonces-enrichies.sql).
export interface ListingEnrichment {
  revenueYear: number | null;
  revenueHistory: Array<{ year: number; revenue: number }>;
  includedAssets: string[];
  monthlyVisitors: number | null;
  acquisitionChannels: string[];
  teamSize: number | null;
  ownerHoursPerWeek: number | null;
  growthNotes: string;
}

type PublicListingRow = Omit<SupabaseMaListingRow, 'owner_id' | 'sale_reason' | 'confidential_description' | 'contact_info'>;

export interface VerificationRequest {
  id: string;
  listing_id: string;
  status: 'pending' | 'approved' | 'rejected';
  evidence: string;
  admin_note: string | null;
  created_at: string;
  decided_at: string | null;
}

export interface ProDirectoryEntry {
  id: string;
  display_name: string;
  title: string | null;
  pro_category: ProCategory | null;
  location: string | null;
  bio: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  photo_url: string | null;
  has_pro_account: boolean;
}

// Mode démo (sans Supabase) : exemples de fiches pour visualiser l'annuaire.
const DEMO_PRO_DIRECTORY: ProDirectoryEntry[] = [
  { id: 'demo-pro-1', display_name: 'Claire Dubois', title: 'Transmission Conseil', pro_category: 'cabinet_cession', location: 'Lyon', bio: 'Accompagnement de cessions de PME et d’entreprises numériques, de la valorisation à la signature.', website_url: 'https://exemple.fr', linkedin_url: null, photo_url: null, has_pro_account: true },
  { id: 'demo-pro-2', display_name: 'Karim Benali', title: 'Cabinet Benali Expertise', pro_category: 'expert_comptable', location: 'Paris', bio: 'Expert-comptable spécialisé dans l’audit d’acquisition et la reprise de TPE.', website_url: null, linkedin_url: null, photo_url: null, has_pro_account: false },
  { id: 'demo-pro-3', display_name: 'Maître Sophie Laurent', title: 'Laurent Avocats', pro_category: 'avocat', location: 'Bordeaux', bio: 'Droit des sociétés, protocoles de cession et garanties d’actif et de passif.', website_url: null, linkedin_url: null, photo_url: null, has_pro_account: false },
];

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
      .select(PUBLIC_LISTING_COLUMNS)
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

    return ((data ?? []) as PublicListingRow[]).map(row => this.mapRowToListing(row));
  }

  async getListingById(id: string): Promise<MaListing | null> {
    const row = await this.fetchListingDetailRow(id);
    return row ? this.mapRowToListing(row) : null;
  }

  // --- Offres « reprise » : vérification des dossiers et annuaire des pros -------------------------

  // Demandes de vérification de l'utilisateur connecté (les plus récentes d'abord).
  async getMyVerificationRequests(): Promise<VerificationRequest[]> {
    if (!this.supabase.isConfigured) {
      return [];
    }

    const { data, error } = await this.supabase.client
      .from('ma_verification_requests')
      .select('id, listing_id, status, evidence, admin_note, created_at, decided_at')
      .order('created_at', { ascending: false });

    return error ? [] : ((data ?? []) as VerificationRequest[]);
  }

  // Admins : demandes en attente, avec le secteur et la région de l'annonce.
  async getPendingVerifications(): Promise<Array<VerificationRequest & { listing?: MaListingData }>> {
    if (!this.supabase.isConfigured) {
      return [];
    }

    const { data, error } = await this.supabase.client
      .from('ma_verification_requests')
      .select('id, listing_id, status, evidence, admin_note, created_at, decided_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      return [];
    }

    const requests = (data ?? []) as VerificationRequest[];
    return Promise.all(requests.map(async request => ({ ...request, listing: await this.getListingDetail(request.listing_id) })));
  }

  async decideVerification(requestId: string, approve: boolean, note: string): Promise<boolean> {
    const { error } = await this.supabase.client.rpc('decide_listing_verification', {
      p_request_id: requestId,
      p_approve: approve,
      p_note: note.trim() || null,
    });
    return !error;
  }

  async listProDirectory(category?: ProCategory): Promise<ProDirectoryEntry[]> {
    if (!this.supabase.isConfigured) {
      return DEMO_PRO_DIRECTORY.filter(entry => !category || entry.pro_category === category);
    }

    const { data, error } = await this.supabase.client.rpc('list_pro_directory', { p_category: category ?? null });
    return error ? [] : ((data ?? []) as ProDirectoryEntry[]);
  }

  // Annonces du vendeur connecté, y compris les champs confidentiels.
  async getMyListings(): Promise<MaListing[]> {
    if (!this.supabase.isConfigured) {
      return [];
    }

    const { data, error } = await this.supabase.client.rpc('get_my_ma_listings');

    if (error) {
      return [];
    }

    return ((data ?? []) as SupabaseMaListingRow[]).map(row => this.mapRowToListing(row));
  }

  async getListingCards(): Promise<MaListingData[]> {
    if (!this.supabase.isConfigured) {
      return MA_LISTINGS;
    }

    // Repli sur les colonnes d'avant si la migration 2026-10-26 n'est pas encore passée.
    const rows = (await this.fetchActiveRows(PUBLIC_LISTING_COLUMNS)) ?? (await this.fetchActiveRows(BASE_LISTING_COLUMNS));

    if (!rows) {
      return [];
    }

    // Annonces en vedette d'abord, puis les plus récentes.
    const listings = rows
      .map(row => this.mapCardRow(row))
      .sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
    return listings.length === 0 && this.auth.isAdmin() ? MA_LISTINGS : listings;
  }

  async getListingDetail(listingId: string): Promise<MaListingData | undefined> {
    if (!this.supabase.isConfigured) {
      // Mode démo : même règle que Supabase (acheteur avec accès et demande acceptée, ou admin).
      const allowed = (canAccessMaDetails(this.auth.currentUser()?.profileType) && this.auth.hasMaAccess() && ListingAccessService.demoApproved(listingId)) || this.auth.isAdmin();
      return allowed ? findMaListingById(listingId) : undefined;
    }

    const row = await this.fetchListingDetailRow(listingId);

    if (!row) {
      return this.auth.isAdmin() ? findMaListingById(listingId) : undefined;
    }

    return this.mapDetailRow(row);
  }

  // Partie anonymisée d'une annonce, lisible par tous (y compris les visiteurs).
  async getPublicListing(listingId: string): Promise<MaListingData | undefined> {
    if (!this.supabase.isConfigured) {
      const listing = findMaListingById(listingId);
      return listing ? { ...listing, description: listing.summary, reason: '', highlights: [], ownerId: undefined, contactInfo: undefined } : undefined;
    }

    const rows = (await this.fetchActiveRows(PUBLIC_LISTING_COLUMNS, listingId)) ?? (await this.fetchActiveRows(BASE_LISTING_COLUMNS, listingId));
    return rows?.[0] ? this.mapCardRow(rows[0]) : undefined;
  }

  // Annonces actives (colonnes anonymisées), toutes ou une seule ; null si la requête échoue.
  private async fetchActiveRows(columns: string, listingId?: string): Promise<PublicListingRow[] | null> {
    let query = this.supabase.client.from('ma_listings').select(columns).eq('status', 'active');

    if (listingId) {
      query = query.eq('id', listingId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    return error ? null : ((data ?? []) as unknown as PublicListingRow[]);
  }

  // Le serveur ne renvoie le dossier qu'à un acheteur avec accès M&A, au propriétaire ou à un admin.
  private async fetchListingDetailRow(listingId: string): Promise<SupabaseMaListingRow | null> {
    if (!this.supabase.isConfigured) {
      return null;
    }

    const { data, error } = await this.supabase.client
      .rpc('get_ma_listing_detail', { listing_id: listingId })
      .maybeSingle();

    return error || !data ? null : (data as SupabaseMaListingRow);
  }

  // Annonce complète de son propriétaire, pour la modifier (get_my_ma_listings renvoie toutes les colonnes).
  async getMyListingRow(listingId: string): Promise<SupabaseMaListingRow | null> {
    if (!this.supabase.isConfigured) {
      return null;
    }

    const { data, error } = await this.supabase.client.rpc('get_my_ma_listings');
    const rows = error ? [] : ((data ?? []) as SupabaseMaListingRow[]);
    return rows.find(row => row.id === listingId) ?? null;
  }

  // Modification par le propriétaire : l'annonce repasse en relecture (trigger enforce_ma_listing_moderation).
  async updateListing(listingId: string, data: Omit<MaListing, 'id' | 'createdAt' | 'ownerId' | 'status'> & { publicSummary?: string; enrichment?: ListingEnrichment }): Promise<boolean> {
    if (!this.supabase.isConfigured) {
      return true;
    }

    const { error } = await this.supabase.client
      .from('ma_listings')
      .update({
        sector: data.sector,
        region: data.region,
        type: data.type,
        revenue: data.revenue,
        margin: data.margin,
        age: data.age,
        price_min: data.priceMin,
        price_max: data.priceMax,
        public_summary: (data.publicSummary ?? data.description).slice(0, 220),
        sale_reason: data.saleReason,
        confidential_description: data.description,
        contact_info: data.contactInfo,
        revenue_year: data.enrichment?.revenueYear ?? null,
        revenue_history: data.enrichment?.revenueHistory ?? [],
        included_assets: data.enrichment?.includedAssets ?? [],
        monthly_visitors: data.enrichment?.monthlyVisitors ?? null,
        acquisition_channels: data.enrichment?.acquisitionChannels ?? [],
        team_size: data.enrichment?.teamSize ?? null,
        owner_hours_per_week: data.enrichment?.ownerHoursPerWeek ?? null,
        growth_notes: data.enrichment?.growthNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', listingId);

    return !error;
  }

  async createListing(data: Omit<MaListing, 'id' | 'createdAt'> & { publicSummary?: string; enrichment?: ListingEnrichment }): Promise<string> {
    if (!this.supabase.isConfigured) {
      return '';
    }

    // Id généré côté client : l'insert ne relit pas la ligne, dont les colonnes confidentielles ne sont pas lisibles.
    const id = crypto.randomUUID();
    const insert: SupabaseMaListingInsert = {
      id,
      owner_id: data.ownerId,
      sector: data.sector,
      region: data.region,
      type: data.type,
      revenue: data.revenue,
      margin: data.margin,
      age: data.age,
      price_min: data.priceMin,
      price_max: data.priceMax,
      public_summary: (data.publicSummary ?? data.description).slice(0, 220),
      sale_reason: data.saleReason,
      confidential_description: data.description,
      contact_info: data.contactInfo,
      status: data.status,
      revenue_year: data.enrichment?.revenueYear ?? null,
      revenue_history: data.enrichment?.revenueHistory ?? [],
      included_assets: data.enrichment?.includedAssets ?? [],
      monthly_visitors: data.enrichment?.monthlyVisitors ?? null,
      acquisition_channels: data.enrichment?.acquisitionChannels ?? [],
      team_size: data.enrichment?.teamSize ?? null,
      owner_hours_per_week: data.enrichment?.ownerHoursPerWeek ?? null,
      growth_notes: data.enrichment?.growthNotes || null,
    };

    const { error } = await this.supabase.client
      .from('ma_listings')
      .insert(insert);

    return error ? '' : id;
  }

  private mapRowToListing(row: PublicListingRow & Partial<SupabaseMaListingRow>): MaListing {
    return {
      id: row.id,
      ownerId: row.owner_id ?? '',
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
      featuredUntil: row.featured_until ?? undefined,
      verified: row.verified ?? false,
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
      highlights: [],
      featured: !!row.featured_until && new Date(row.featured_until).getTime() > Date.now(),
      verified: row.verified ?? false,
      isNew: !!row.created_at && Date.now() - new Date(row.created_at).getTime() < EARLY_ACCESS_MS,
      revenueValue: row.revenue ?? null,
      marginValue: row.margin ?? null,
      ageValue: row.age ?? null,
      priceMinValue: row.price_min ?? null,
      priceMaxValue: row.price_max ?? null,
      publishedAt: row.created_at ?? undefined,
      revenueYear: row.revenue_year ?? null,
      revenueHistory: row.revenue_history ?? [],
      includedAssets: row.included_assets ?? [],
      monthlyVisitors: row.monthly_visitors ?? null,
      acquisitionChannels: row.acquisition_channels ?? [],
      teamSize: row.team_size ?? null,
      ownerHoursPerWeek: row.owner_hours_per_week ?? null,
    };
  }

  private mapDetailRow(row: SupabaseMaListingRow): MaListingData {
    return {
      ...this.mapCardRow(row),
      reason: row.sale_reason ?? 'Raison communiquée après qualification.',
      description: row.confidential_description ?? row.public_summary,
      ownerId: row.owner_id,
      contactInfo: row.contact_info ?? undefined,
      growthNotes: row.growth_notes ?? undefined,
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
