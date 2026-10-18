import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export type VerificationStatus = 'pending' | 'approved' | 'rejected';

export interface ProfileVerificationRequest {
  id: string;
  status: VerificationStatus;
  admin_note: string | null;
  created_at: string;
}

export interface PendingProfileVerification {
  id: string;
  user_id: string;
  evidence: string;
  created_at: string;
  display_name: string;
  role: string;
  title: string | null;
  location: string | null;
  linkedin_url: string | null;
  website_url: string | null;
}

export interface ActionResult {
  success: boolean;
  message: string;
}

const DEMO_PENDING: PendingProfileVerification[] = [
  {
    id: 'demo-verif-1',
    user_id: 'talent-claire-bernard',
    evidence: 'https://www.linkedin.com/in/exemple-claire\nProduct manager chez Exemple SAS depuis 2021.',
    created_at: new Date(Date.now() - 864e5).toISOString(),
    display_name: 'Claire Bernard',
    role: 'talent',
    title: 'Product manager',
    location: 'Bordeaux',
    linkedin_url: 'https://www.linkedin.com/in/exemple-claire',
    website_url: null,
  },
];

// Vérification des profils (badge « Profil vérifié ») : demande du membre, décision d'un admin.
// Côté Supabase : 2026-10-21-moderation-verification-stats.sql.
@Injectable({ providedIn: 'root' })
export class VerificationService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  async getMyLatestRequest(): Promise<ProfileVerificationRequest | null> {
    const userId = this.auth.currentUser()?.uid;

    if (!userId || !this.supabase.isConfigured) {
      return null;
    }

    const { data, error } = await this.supabase.client
      .from('profile_verification_requests')
      .select('id, status, admin_note, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return error || !data ? null : (data as ProfileVerificationRequest);
  }

  async requestVerification(evidence: string): Promise<ActionResult> {
    if (!this.supabase.isConfigured) {
      return { success: false, message: 'La vérification nécessite la connexion à Supabase (indisponible en mode démo).' };
    }

    const { error } = await this.supabase.client.rpc('request_profile_verification', { p_evidence: evidence.trim() });
    return error
      ? { success: false, message: this.readableError(error.message) }
      : { success: true, message: 'Demande envoyée. L’équipe vous répond sous 3 jours ouvrés.' };
  }

  async getPending(): Promise<PendingProfileVerification[]> {
    if (!this.supabase.isConfigured) {
      return DEMO_PENDING;
    }

    const { data, error } = await this.supabase.client.rpc('admin_list_profile_verifications');
    return error ? [] : ((data ?? []) as PendingProfileVerification[]);
  }

  async decide(requestId: string, approve: boolean, note: string): Promise<ActionResult> {
    if (!this.supabase.isConfigured) {
      return { success: false, message: 'Action indisponible en mode démo.' };
    }

    const { error } = await this.supabase.client.rpc('decide_profile_verification', {
      p_request_id: requestId,
      p_approve: approve,
      p_note: note.trim() || null,
    });

    return error
      ? { success: false, message: this.readableError(error.message) }
      : { success: true, message: approve ? 'Profil vérifié.' : 'Demande refusée, le membre est prévenu.' };
  }

  private readableError(message: string): string {
    return message.replace(/^.*?:\s*/, '').trim() || 'Une erreur est survenue, réessayez.';
  }
}
