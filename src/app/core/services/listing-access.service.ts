import { Injectable, inject } from '@angular/core';
import { MA_NDA_VERSION } from '../legal/nda';
import { SupabaseService } from './supabase.service';

// Demandes d'accès aux dossiers et relecture des annonces (supabase/2026-10-28-lancement.sql).
export type AccessRequestStatus = 'pending' | 'approved' | 'refused';

export interface MyAccessRequest {
  status: AccessRequestStatus;
  created_at: string;
  decided_at: string | null;
}

export interface ReceivedAccessRequest {
  id: string;
  listing_id: string;
  listing_label: string;
  buyer_id: string | null;
  buyer_name: string | null;
  buyer_title: string | null;
  buyer_location: string | null;
  buyer_budget: string | null;
  buyer_sector: string | null;
  buyer_verified: boolean;
  message: string | null;
  status: AccessRequestStatus;
  nda_accepted_at: string;
  created_at: string;
  decided_at: string | null;
}

export interface ListingReview {
  listing_id: string;
  reviewed_at: string | null;
  withdrawn_by_admin: boolean;
  moderation_note: string | null;
}

export interface AccessResult {
  success: boolean;
  message: string;
  status?: AccessRequestStatus;
}

@Injectable({ providedIn: 'root' })
export class ListingAccessService {
  private readonly supabase = inject(SupabaseService);
  // Mode démo (sans Supabase) : la demande est acceptée tout de suite, pour pouvoir parcourir le dossier.
  static readonly DEMO_KEY = 'gofounders.demo.access';

  static demoApproved(listingId: string): boolean {
    try {
      return (JSON.parse(localStorage.getItem(ListingAccessService.DEMO_KEY) ?? '[]') as string[]).includes(listingId);
    } catch {
      return false;
    }
  }

  private demoApprove(listingId: string): void {
    try {
      const ids = new Set(JSON.parse(localStorage.getItem(ListingAccessService.DEMO_KEY) ?? '[]') as string[]);
      ids.add(listingId);
      localStorage.setItem(ListingAccessService.DEMO_KEY, JSON.stringify([...ids]));
    } catch {
      // Stockage indisponible : la démo reste sans accès.
    }
  }

  async requestAccess(listingId: string, message: string): Promise<AccessResult> {
    if (!this.supabase.isConfigured) {
      this.demoApprove(listingId);
      return { success: true, status: 'approved', message: 'Mode démo : demande acceptée automatiquement.' };
    }

    const { data, error } = await this.supabase.client.rpc('request_listing_access', {
      p_listing_id: listingId,
      p_message: message,
      p_accept_nda: true,
      p_nda_version: MA_NDA_VERSION,
    });

    if (error) {
      return { success: false, message: this.readableError(error.message) };
    }

    const status = data as AccessRequestStatus;
    return {
      success: true,
      status,
      message: status === 'approved' ? 'Le cédant vous a déjà ouvert son dossier.' : 'Demande envoyée. Le cédant vous répond depuis son espace ; vous serez prévenu.',
    };
  }

  async getMyRequest(listingId: string): Promise<MyAccessRequest | null> {
    if (!this.supabase.isConfigured) {
      return ListingAccessService.demoApproved(listingId) ? { status: 'approved', created_at: new Date().toISOString(), decided_at: null } : null;
    }

    const { data, error } = await this.supabase.client.rpc('get_my_access_request', { p_listing_id: listingId });
    const rows = (data ?? []) as MyAccessRequest[];
    return error || rows.length === 0 ? null : rows[0];
  }

  async listReceived(): Promise<ReceivedAccessRequest[]> {
    if (!this.supabase.isConfigured) {
      return [];
    }

    const { data, error } = await this.supabase.client.rpc('list_my_access_requests');
    return error ? [] : ((data ?? []) as ReceivedAccessRequest[]);
  }

  async decide(requestId: string, approve: boolean): Promise<AccessResult> {
    if (!this.supabase.isConfigured) {
      return { success: true, message: approve ? 'Accès accepté (mode démo).' : 'Demande refusée (mode démo).' };
    }

    const { error } = await this.supabase.client.rpc('decide_listing_access', { p_request_id: requestId, p_approve: approve, p_note: null });
    return error
      ? { success: false, message: this.readableError(error.message) }
      : { success: true, message: approve ? 'Accès accepté : le repreneur voit maintenant votre dossier complet et peut vous écrire.' : 'Demande refusée. Le repreneur en est informé.' };
  }

  async myListingReviews(): Promise<Map<string, ListingReview>> {
    if (!this.supabase.isConfigured) {
      return new Map();
    }

    const { data, error } = await this.supabase.client.rpc('get_my_listing_review');
    const rows = error ? [] : ((data ?? []) as ListingReview[]);
    return new Map(rows.map(row => [row.listing_id, row]));
  }

  private readableError(message: string): string {
    const known: Record<string, string> = {
      ACCES_REPRENEUR_REQUIS: 'La demande d’accès est réservée aux repreneurs avec un accès en cours.',
      ANNONCE_INDISPONIBLE: 'Cette annonce n’est plus disponible.',
      NDA_REQUIS: 'Acceptez l’engagement de confidentialité pour envoyer votre demande.',
      PRESENTATION_REQUISE: 'Présentez-vous en quelques phrases (au moins 20 caractères).',
      DEMANDE_REFUSEE: 'Le cédant n’a pas donné suite à votre demande.',
      DEMANDE_INTROUVABLE: 'Demande introuvable.',
      DEMANDE_DEJA_TRAITEE: 'Cette demande a déjà été traitée.',
    };
    const code = Object.keys(known).find(key => message.includes(key));
    return code ? known[code] : 'L’opération a échoué. Réessayez dans quelques instants.';
  }
}
