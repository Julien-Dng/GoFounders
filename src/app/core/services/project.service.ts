import { Injectable, inject } from '@angular/core';
import {
  PROJECT_COLUMNS,
  SupabaseProjectInsert,
  SupabaseProjectRow,
  SupabaseProjectUpdate,
} from '../models/supabase-database.model';
import { SupabaseService } from './supabase.service';

const LOCAL_PROJECTS_KEY = 'gofounders.mock.projects';

export interface EditableProject {
  id: string;
  ownerId: string;
  name: string;
  sector: string;
  stage: string;
  description: string;
  lookingFor: string[];
  skillsNeeded: string[];
  location: string;
  isActive: boolean;
  openToEquity: boolean;
  // Partie réservée aux associés dont le porteur a accepté la demande d'accès.
  confidentialDetails: string;
  ndaRequired: boolean;
}

export interface SaveProjectPayload {
  name: string;
  sector: string;
  stage: string;
  description: string;
  lookingFor: string[];
  skillsNeeded: string[];
  location: string;
  isActive: boolean;
  openToEquity: boolean;
  confidentialDetails: string;
  ndaRequired: boolean;
}

export interface SaveProjectResult {
  success: boolean;
  project?: EditableProject;
  message?: string;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private readonly supabase = inject(SupabaseService);

  async getOwnedProject(ownerId: string): Promise<EditableProject | null> {
    if (!ownerId) {
      return null;
    }

    if (!this.supabase.isConfigured) {
      return this.readLocalProjects().find(project => project.ownerId === ownerId) ?? null;
    }

    const { data, error } = await this.supabase.client
      .from('projects')
      .select(PROJECT_COLUMNS)
      .eq('owner_id', ownerId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Annonce de projet introuvable dans Supabase :', error.message);
      return null;
    }

    return data ? this.mapRow(data as SupabaseProjectRow, await this.readConfidentialDetails((data as SupabaseProjectRow).id)) : null;
  }

  // La partie confidentielle ne se lit jamais directement (voir 2026-10-19-projets-confidentiels-nda.sql).
  private async readConfidentialDetails(projectId: string): Promise<string> {
    const { data, error } = await this.supabase.client.rpc('get_project_confidential', { p_project_id: projectId });
    return error ? '' : ((data as string | null) ?? '');
  }

  async saveOwnedProject(
    ownerId: string,
    projectId: string | null,
    payload: SaveProjectPayload
  ): Promise<SaveProjectResult> {
    if (!ownerId) {
      return { success: false, message: 'Vous devez être connecté pour modifier cette annonce.' };
    }

    if (!this.supabase.isConfigured) {
      return this.saveLocalProject(ownerId, projectId, payload);
    }

    const values: SupabaseProjectUpdate = {
      name: payload.name.trim(),
      sector: this.optionalText(payload.sector),
      stage: this.optionalText(payload.stage),
      description: this.optionalText(payload.description),
      looking_for: this.cleanTags(payload.lookingFor),
      skills_needed: this.cleanTags(payload.skillsNeeded),
      location: this.optionalText(payload.location),
      is_active: payload.isActive,
      open_to_equity: payload.openToEquity,
      confidential_details: this.optionalText(payload.confidentialDetails),
      nda_required: payload.ndaRequired,
      updated_at: new Date().toISOString(),
    };

    if (projectId) {
      const { data, error } = await this.supabase.client
        .from('projects')
        .update(values)
        .eq('id', projectId)
        .eq('owner_id', ownerId)
        .select(PROJECT_COLUMNS)
        .single();

      if (error || !data) {
        return {
          success: false,
          message: error?.message ?? "Impossible de mettre à jour l'annonce.",
        };
      }

      return { success: true, project: this.mapRow(data as SupabaseProjectRow, payload.confidentialDetails.trim()) };
    }

    const insert: SupabaseProjectInsert = {
      owner_id: ownerId,
      name: payload.name.trim(),
      sector: values.sector,
      stage: values.stage,
      description: values.description,
      looking_for: values.looking_for,
      skills_needed: values.skills_needed,
      location: values.location,
      is_active: values.is_active,
      open_to_equity: values.open_to_equity,
      confidential_details: values.confidential_details,
      nda_required: values.nda_required,
      updated_at: values.updated_at,
    };
    const { data, error } = await this.supabase.client
      .from('projects')
      .insert(insert)
      .select(PROJECT_COLUMNS)
      .single();

    if (error || !data) {
      return {
        success: false,
        message: error?.message ?? "Impossible de créer l'annonce.",
      };
    }

    return { success: true, project: this.mapRow(data as SupabaseProjectRow, payload.confidentialDetails.trim()) };
  }

  private saveLocalProject(
    ownerId: string,
    projectId: string | null,
    payload: SaveProjectPayload
  ): SaveProjectResult {
    const projects = this.readLocalProjects();
    const existingIndex = projects.findIndex(project =>
      project.id === projectId || (!projectId && project.ownerId === ownerId)
    );
    const project: EditableProject = {
      id: existingIndex >= 0 ? projects[existingIndex].id : `project-${Date.now()}`,
      ownerId,
      name: payload.name.trim(),
      sector: payload.sector.trim(),
      stage: payload.stage.trim(),
      description: payload.description.trim(),
      lookingFor: this.cleanTags(payload.lookingFor),
      skillsNeeded: this.cleanTags(payload.skillsNeeded),
      location: payload.location.trim(),
      isActive: payload.isActive,
      openToEquity: payload.openToEquity,
      confidentialDetails: payload.confidentialDetails.trim(),
      ndaRequired: payload.ndaRequired,
    };

    if (existingIndex >= 0) {
      projects[existingIndex] = project;
    } else {
      projects.push(project);
    }

    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
    return { success: true, project };
  }

  private readLocalProjects(): EditableProject[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }

    try {
      const value = JSON.parse(localStorage.getItem(LOCAL_PROJECTS_KEY) ?? '[]') as EditableProject[];
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  private mapRow(row: SupabaseProjectRow, confidentialDetails = ''): EditableProject {
    return {
      id: row.id,
      ownerId: row.owner_id,
      name: row.name,
      sector: row.sector ?? '',
      stage: row.stage ?? 'mvp',
      description: row.description ?? '',
      lookingFor: row.looking_for ?? [],
      skillsNeeded: row.skills_needed ?? [],
      location: row.location ?? '',
      isActive: row.is_active,
      openToEquity: row.open_to_equity ?? false,
      confidentialDetails,
      ndaRequired: row.nda_required ?? false,
    };
  }

  private optionalText(value: string): string | null {
    return value.trim() || null;
  }

  private cleanTags(values: string[]): string[] {
    return [...new Set(values.map(value => value.trim()).filter(Boolean))].slice(0, 12);
  }
}
