import { Injectable, inject } from '@angular/core';
import { MARKETPLACE_PROFILES, MarketplaceProfile, findMarketplaceProfileById } from '../data/mock-platform.data';
import { Match } from '../models/match.model';
import { Profile } from '../models/project.model';
import { SupabaseProfileRow, SupabaseProjectRow, PROFILE_COLUMNS } from '../models/supabase-database.model';
import { PROFILE_TYPE_LABELS, ProfileType, isTalentMarketplaceRole } from '../models/user.model';
import { ProjectSide, TalentSide, computeCompatibility } from '../matching/compatibility';
import { AuthService } from './auth.service';
import { ProjectService } from './project.service';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class MatchingService {
  private readonly supabase = inject(SupabaseService);
  private readonly auth = inject(AuthService);
  private readonly projects = inject(ProjectService);

  async getMatchesForUser(_userId: string): Promise<Match[]> {
    return [];
  }

  async getProfilesForSearch(_filters: ProfileSearchFilters): Promise<Profile[]> {
    return [];
  }

  // Profils proposés à l'utilisateur connecté, triés par compatibilité décroissante.
  async getMarketplaceProfilesForSearch(viewerType: ProfileType): Promise<MarketplaceProfile[]> {
    const [profiles, viewer] = await Promise.all([this.loadMarketplaceProfiles(viewerType), this.loadViewerSide()]);
    return profiles
      .map(profile => this.withCompatibility(profile, viewer))
      .sort((a, b) => b.match - a.match);
  }

  private async loadMarketplaceProfiles(viewerType: ProfileType): Promise<MarketplaceProfile[]> {
    if (!isTalentMarketplaceRole(viewerType)) {
      return [];
    }

    if (!this.supabase.isConfigured) {
      return MARKETPLACE_PROFILES;
    }

    try {
      const [profilesResult, projectsResult] = await Promise.all([
        this.supabase.client.from('profiles').select(PROFILE_COLUMNS),
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

  async getMarketplaceProfileById(profileId: string, withCompatibility = true): Promise<MarketplaceProfile | undefined> {
    if (!withCompatibility) {
      return this.loadMarketplaceProfileById(profileId);
    }

    const [profile, viewer] = await Promise.all([this.loadMarketplaceProfileById(profileId), this.loadViewerSide()]);
    return profile ? this.withCompatibility(profile, viewer) : undefined;
  }

  private async loadMarketplaceProfileById(profileId: string): Promise<MarketplaceProfile | undefined> {
    if (!this.supabase.isConfigured) {
      return findMarketplaceProfileById(profileId);
    }

    try {
      const { data: profileData, error: profileError } = await this.supabase.client
        .from('profiles')
        .select(PROFILE_COLUMNS)
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
        .select(PROFILE_COLUMNS)
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
      match: 0,
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
        ...(profile.ma_sector ? [{ label: 'Secteur M&A', value: profile.ma_sector }] : []),
        ...(profile.ma_budget ? [{ label: profile.role === 'seller' ? 'Ordre de grandeur' : 'Budget', value: profile.ma_budget }] : []),
        ...(profile.ma_region ? [{ label: 'Région visée', value: profile.ma_region }] : []),
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
      match: 0,
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
    return PROFILE_TYPE_LABELS[role];
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

  // Côté de l'utilisateur connecté dans le calcul : son projet s'il est porteur de projet, ses compétences s'il est talent.
  private async loadViewerSide(): Promise<ViewerSide | null> {
    await this.auth.ensureSessionReady();
    const user = this.auth.currentUser();

    if (user?.profileType === 'talent') {
      return {
        kind: 'talent',
        talent: {
          offers: [...(user.skills ?? []), user.profileTitle ?? ''],
          text: user.bio,
          location: user.location,
          availableNow: (user.availabilityLabel ?? '').toLowerCase().includes('disponible'),
        },
      };
    }

    if (user?.profileType === 'entrepreneur') {
      const project = await this.projects.getOwnedProject(user.uid);
      return {
        kind: 'project',
        project: {
          needs: [...(project?.skillsNeeded ?? []), ...(project?.lookingFor ?? []), ...(user.lookingFor ?? [])],
          sector: project?.sector,
          location: project?.location || user.location,
        },
      };
    }

    return null;
  }

  // Score calculé uniquement entre un projet et un talent ; sinon le profil n'a pas de score (matchReasons absent).
  private withCompatibility(profile: MarketplaceProfile, viewer: ViewerSide | null): MarketplaceProfile {
    if (viewer?.kind === 'project' && profile.profileType === 'talent') {
      const talent: TalentSide = {
        offers: [...profile.skills, profile.title],
        text: profile.bio,
        location: profile.location,
        availableNow: profile.availableNow,
      };
      const result = computeCompatibility(viewer.project, talent);
      return { ...profile, match: result.score, matchReasons: result.reasons };
    }

    if (viewer?.kind === 'talent' && profile.profileType === 'entrepreneur') {
      const project: ProjectSide = {
        needs: [...profile.skills, ...profile.lookingFor],
        sector: profile.sector,
        location: profile.location,
      };
      const result = computeCompatibility(project, viewer.talent);
      return { ...profile, match: result.score, matchReasons: result.reasons };
    }

    return { ...profile, match: 0, matchReasons: undefined };
  }
}

export interface ProfileSearchFilters {
  type?: string[];
  sector?: string;
  stage?: string;
  location?: string;
  availableOnly?: boolean;
}

type ViewerSide = { kind: 'project'; project: ProjectSide } | { kind: 'talent'; talent: TalentSide };
