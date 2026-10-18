import { Injectable, inject } from '@angular/core';
import { NDA_VERSION } from '../legal/nda';
import { MARKETPLACE_PROFILES } from '../data/mock-platform.data';
import { ProjectAccessStatus, SupabaseProjectAccessRequestRow } from '../models/supabase-database.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

const LOCAL_REQUESTS_KEY = 'gofounders.mock.access-requests';

export interface ProjectAccessRequest {
  id: string;
  projectId: string;
  requesterId: string | null;
  ownerId: string | null;
  status: ProjectAccessStatus;
  ndaVersion: string | null;
  ndaAcceptedAt: string | null;
  ndaIp: string | null;
  ndaUserAgent: string | null;
  projectName: string;
  ownerName: string;
  requesterName: string;
  createdAt: string;
  decidedAt: string | null;
}

export interface RequestAccessResult {
  success: boolean;
  status?: ProjectAccessStatus;
  message?: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  NDA_REQUIS: "Ce projet exige l'acceptation de l'engagement de confidentialité.",
  ACCES_RESERVE_ASSOCIES: "Seuls les associés peuvent demander l'accès à un projet.",
  PROJET_INDISPONIBLE: "Ce projet n'est plus disponible.",
};

// Partie confidentielle des projets : demandes d'accès, décision du porteur, preuve d'acceptation du NDA.
// Côté Supabase, tout passe par les fonctions de 2026-10-19-projets-confidentiels-nda.sql.
@Injectable({ providedIn: 'root' })
export class ProjectAccessService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  async getMyRequest(projectId: string): Promise<ProjectAccessRequest | null> {
    const userId = this.auth.currentUser()?.uid;

    if (!userId || !projectId) {
      return null;
    }

    if (!this.supabase.isConfigured) {
      return this.readLocal().find(request => request.projectId === projectId && request.requesterId === userId) ?? null;
    }

    const { data, error } = await this.supabase.client
      .from('project_access_requests')
      .select('*')
      .eq('project_id', projectId)
      .eq('requester_id', userId)
      .maybeSingle();

    return error || !data ? null : this.mapRow(data as SupabaseProjectAccessRequestRow);
  }

  async requestAccess(projectId: string, acceptNda: boolean, ndaRequired: boolean, names: { projectName: string; ownerName: string }): Promise<RequestAccessResult> {
    const user = this.auth.currentUser();

    if (!user) {
      return { success: false, message: 'Connectez-vous pour demander l’accès.' };
    }

    if (ndaRequired && !acceptNda) {
      return { success: false, message: ERROR_MESSAGES['NDA_REQUIS'] };
    }

    if (!this.supabase.isConfigured) {
      return this.requestLocally(projectId, acceptNda, names);
    }

    const { data, error } = await this.supabase.client.rpc('request_project_access', {
      p_project_id: projectId,
      p_accept_nda: acceptNda,
      p_nda_version: acceptNda ? NDA_VERSION : null,
    });

    if (error) {
      const code = Object.keys(ERROR_MESSAGES).find(key => error.message.includes(key));
      return { success: false, message: code ? ERROR_MESSAGES[code] : "La demande n'a pas pu être envoyée. Réessayez dans un instant." };
    }

    return { success: true, status: data as ProjectAccessStatus };
  }

  async getConfidentialDetails(projectId: string): Promise<string | null> {
    if (!projectId) {
      return null;
    }

    if (!this.supabase.isConfigured) {
      return this.localConfidentialDetails(projectId);
    }

    const { data, error } = await this.supabase.client.rpc('get_project_confidential', { p_project_id: projectId });
    return error ? null : ((data as string | null) ?? null);
  }

  // Demandes reçues par le porteur pour son projet, les plus récentes d'abord.
  async listForProject(projectId: string): Promise<ProjectAccessRequest[]> {
    if (!projectId) {
      return [];
    }

    if (!this.supabase.isConfigured) {
      return this.readLocal()
        .filter(request => request.projectId === projectId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    const { data, error } = await this.supabase.client
      .from('project_access_requests')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    return error ? [] : ((data ?? []) as SupabaseProjectAccessRequestRow[]).map(row => this.mapRow(row));
  }

  async decide(requestId: string, approve: boolean): Promise<boolean> {
    if (!this.supabase.isConfigured) {
      const requests = this.readLocal();
      const request = requests.find(item => item.id === requestId);

      if (!request || request.ownerId !== this.auth.currentUser()?.uid) {
        return false;
      }

      request.status = approve ? 'approved' : 'refused';
      request.decidedAt = new Date().toISOString();
      this.writeLocal(requests);
      return true;
    }

    const { error } = await this.supabase.client.rpc('decide_project_access', { p_request_id: requestId, p_approve: approve });
    return !error;
  }

  private requestLocally(projectId: string, acceptNda: boolean, names: { projectName: string; ownerName: string }): RequestAccessResult {
    const user = this.auth.currentUser();

    if (!user || user.profileType !== 'talent') {
      return { success: false, message: ERROR_MESSAGES['ACCES_RESERVE_ASSOCIES'] };
    }

    const requests = this.readLocal();
    const existing = requests.find(request => request.projectId === projectId && request.requesterId === user.uid);
    const now = new Date().toISOString();

    if (existing?.status === 'approved') {
      return { success: true, status: 'approved' };
    }

    const request: ProjectAccessRequest = {
      id: existing?.id ?? `access-${Date.now()}`,
      projectId,
      requesterId: user.uid,
      ownerId: null,
      status: 'pending',
      ndaVersion: acceptNda ? NDA_VERSION : existing?.ndaVersion ?? null,
      ndaAcceptedAt: acceptNda ? now : existing?.ndaAcceptedAt ?? null,
      ndaIp: null,
      ndaUserAgent: acceptNda && typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 300) : existing?.ndaUserAgent ?? null,
      projectName: names.projectName,
      ownerName: names.ownerName,
      requesterName: user.displayName,
      createdAt: now,
      decidedAt: null,
    };

    this.writeLocal([...requests.filter(item => item.id !== request.id), request]);
    return { success: true, status: 'pending' };
  }

  private localConfidentialDetails(projectId: string): string | null {
    const request = this.readLocal().find(item => item.projectId === projectId && item.requesterId === this.auth.currentUser()?.uid);
    return request?.status === 'approved'
      ? MARKETPLACE_PROFILES.find(profile => profile.id === projectId)?.confidentialDetails ?? null
      : null;
  }

  private mapRow(row: SupabaseProjectAccessRequestRow): ProjectAccessRequest {
    return {
      id: row.id,
      projectId: row.project_id ?? '',
      requesterId: row.requester_id,
      ownerId: row.owner_id,
      status: row.status,
      ndaVersion: row.nda_version,
      ndaAcceptedAt: row.nda_accepted_at,
      ndaIp: row.nda_ip,
      ndaUserAgent: row.nda_user_agent,
      projectName: row.snapshot?.project_name ?? 'Projet',
      ownerName: row.snapshot?.owner_name ?? 'Porteur de projet',
      requesterName: row.snapshot?.requester_name ?? 'Associé',
      createdAt: row.created_at,
      decidedAt: row.decided_at,
    };
  }

  private readLocal(): ProjectAccessRequest[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const value = JSON.parse(localStorage.getItem(LOCAL_REQUESTS_KEY) ?? '[]') as ProjectAccessRequest[];
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  private writeLocal(requests: ProjectAccessRequest[]): void {
    localStorage.setItem(LOCAL_REQUESTS_KEY, JSON.stringify(requests));
  }
}
