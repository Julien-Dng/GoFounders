import { Injectable, inject } from '@angular/core';
import { MARKETPLACE_PROFILES, MarketplaceProfile, findMarketplaceProfileById } from '../data/mock-platform.data';
import { Match } from '../models/match.model';
import { Profile } from '../models/project.model';
import { SupabaseProfileRow, SupabaseProjectRow } from '../models/supabase-database.model';
import { ProfileType } from '../models/user.model';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class MatchingService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);

  async getMatchesForUser(_userId: string): Promise<Match[]> {
    return [];
  }

  async getProfilesForSearch(_filters: ProfileSearchFilters): Promise<Profile[]> {
    return [];
  }

  async getMarketplaceProfilesForSearch(viewerType: ProfileType): Promise<MarketplaceProfile[]> {
    if (!this.supabase.isConfigured) {
      return MARKETPLACE_PROFILES;
    }

    try {
      const [profilesResult, projectsResult] = await Promise.all([
        this.supabase.client.from('profiles').select('*'),
        this.supabase.client.from('projects').select('*').eq('is_active', true),
      ]);

      if (profilesResult.error || projectsResult.error) {
        return [];
      }

      const profileRows = (profilesResult.data ?? []) as SupabaseProfileRow[];
      const projectRows = (projectsResult.data ?? []) as SupabaseProjectRow[];

      if (viewerType === 'entrepreneur') {
        const profiles = profileRows
          .filter(profile => profile.role === 'talent')
          .map(profile => this.mapProfileRowToMarketplaceProfile(profile));

        return this.demoProfilesForAdminIfEmpty(profiles);
      }

      const projects = projectRows.map(project => {
        const owner = profileRows.find(profile => profile.id === project.owner_id);
        return this.mapProjectRowToMarketplaceProfile(project, owner);
      });

      return this.demoProfilesForAdminIfEmpty(projects);
    } catch {
      return this.demoProfilesForAdminIfEmpty([]);
    }
  }

  async getMarketplaceProfileById(profileId: string): Promise<MarketplaceProfile | undefined> {
    if (!this.supabase.isConfigured) {
      return findMarketplaceProfileById(profileId);
    }

    try {
      const { data: profileData, error: profileError } = await this.supabase.client
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (!profileError && profileData) {
        return this.mapProfileRowToMarketplaceProfile(profileData as SupabaseProfileRow);
      }

      const { data: projectData, error: projectError } = await this.supabase.client
        .from('projects')
        .select('*')
        .eq('id', profileId)
        .maybeSingle();

      if (projectError || !projectData) {
        return this.auth.isAdmin() ? findMarketplaceProfileById(profileId) : undefined;
      }

      const project = projectData as SupabaseProjectRow;
      const { data: ownerData } = await this.supabase.client
        .from('profiles')
        .select('*')
        .eq('id', project.owner_id)
        .maybeSingle();

      return this.mapProjectRowToMarketplaceProfile(project, ownerData as SupabaseProfileRow | null);
    } catch {
      return undefined;
    }
  }

  async acceptMatch(_matchId: string): Promise<void> {}

  async rejectMatch(_matchId: string): Promise<void> {}

  private demoProfilesForAdminIfEmpty(profiles: MarketplaceProfile[]): MarketplaceProfile[] {
    return profiles.length === 0 && this.auth.isAdmin() ? MARKETPLACE_PROFILES : profiles;
  }

  private mapProfileRowToMarketplaceProfile(profile: SupabaseProfileRow): MarketplaceProfile {
    const skills = profile.skills?.length ? profile.skills : ['Expertise', 'Projet', 'Collaboration'];
    const lookingFor = profile.looking_for?.length ? profile.looking_for : ['Projet entrepreneurial'];
    const title = profile.title?.trim() || this.roleLabel(profile.role);

    return {
      id: profile.id,
      profileType: profile.role,
      displayName: profile.display_name,
      title,
      location: profile.location ?? 'France',
      stage: 'MVP',
      sector: this.inferSector([...skills, ...lookingFor, title]),
      bio: profile.bio ?? 'Profil GoFounders en cours de completion.',
      skills,
      match: this.scoreFromId(profile.id),
      initials: this.initials(profile.display_name),
      photoURL: profile.photo_url ?? undefined,
      availableNow: (profile.availability_label ?? '').toLowerCase().includes('disponible'),
      availabilityLabel: profile.availability_label ?? 'Disponibilite a confirmer',
      lookingFor,
      about: profile.bio ?? 'Ce profil sera enrichi avec les informations ajoutees dans Supabase.',
      projectSummary: profile.role === 'talent'
        ? 'Ce talent souhaite rejoindre un projet aligne avec ses competences.'
        : 'Ce profil entrepreneur presente un projet ou une opportunite a qualifier.',
      experienceSummary: 'Experience detaillee a completer dans le profil.',
      quickInfo: [
        { label: 'Type de profil', value: this.roleLabel(profile.role) },
        { label: 'Plan', value: profile.plan },
        { label: 'Localisation', value: profile.location ?? 'France' },
        { label: 'Disponibilite', value: profile.availability_label ?? 'A confirmer' },
      ],
    };
  }

  private mapProjectRowToMarketplaceProfile(project: SupabaseProjectRow, owner?: SupabaseProfileRow | null): MarketplaceProfile {
    const projectName = project.name;
    const ownerName = owner?.display_name ?? 'Fondateur';
    const skills = project.skills_needed?.length ? project.skills_needed : project.looking_for?.length ? project.looking_for : ['Projet', 'Equipe', 'Execution'];
    const stage = this.stageLabel(project.stage);

    return {
      id: project.id,
      profileType: 'entrepreneur',
      displayName: projectName,
      title: `Fondateur · ${ownerName}`,
      location: project.location ?? owner?.location ?? 'France',
      stage,
      sector: project.sector ?? 'Tech',
      bio: project.description ?? 'Projet GoFounders en cours de presentation.',
      skills,
      match: this.scoreFromId(project.id),
      initials: this.initials(projectName),
      photoURL: owner?.photo_url ?? undefined,
      availableNow: true,
      availabilityLabel: 'Equipe ouverte aux echanges',
      lookingFor: project.looking_for?.length ? project.looking_for : ['Talent', 'Associe', 'Expertise'],
      about: project.description ?? 'Ce projet a ete cree depuis la base Supabase et peut etre enrichi progressivement.',
      projectSummary: project.description ?? 'Le porteur de projet cherche a structurer son equipe et accelerer son execution.',
      experienceSummary: owner?.bio ?? 'Le parcours du fondateur sera detaille dans une prochaine iteration.',
      quickInfo: [
        { label: 'Secteur', value: project.sector ?? 'A preciser' },
        { label: 'Stade', value: stage },
        { label: 'Recherche', value: skills.slice(0, 3).join(', ') },
        { label: 'Localisation', value: project.location ?? owner?.location ?? 'France' },
      ],
    };
  }

  private roleLabel(role: ProfileType): string {
    switch (role) {
      case 'talent':
        return 'Talent / Expert';
      case 'buyer':
        return 'Acheteur / Repreneur';
      case 'seller':
        return 'Vendeur M&A';
      default:
        return 'Porteur de projet';
    }
  }

  private stageLabel(stage: string | null): string {
    switch (stage) {
      case 'idea':
        return 'Idee';
      case 'growth':
        return 'En croissance';
      case 'established':
        return 'Etabli';
      default:
        return 'MVP';
    }
  }

  private inferSector(values: string[]): string {
    const text = values.join(' ').toLowerCase();

    if (text.includes('sante') || text.includes('health')) {
      return 'Sante';
    }

    if (text.includes('commerce') || text.includes('sales')) {
      return 'Commerce';
    }

    if (text.includes('finance') || text.includes('ma')) {
      return 'Finance';
    }

    if (text.includes('marketing') || text.includes('growth')) {
      return 'Marketing';
    }

    return 'Tech';
  }

  private initials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
    return parts.length > 0 ? parts.map(part => part[0]?.toUpperCase() ?? '').join('') : 'GF';
  }

  private scoreFromId(id: string): number {
    const scoreSeed = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return 78 + (scoreSeed % 20);
  }
}

export interface ProfileSearchFilters {
  type?: string[];
  sector?: string;
  stage?: string;
  location?: string;
  availableOnly?: boolean;
}
