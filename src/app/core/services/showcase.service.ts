import { Injectable, inject } from '@angular/core';
import { MARKETPLACE_PROFILES } from '../data/mock-platform.data';
import { SupabaseService } from './supabase.service';

// Vitrine publique /associes : profils anonymisés des membres qui l'ont accepté (list_public_marketplace,
// supabase/2026-10-27-vitrine-associes.sql). Jamais de nom, de photo ni de localisation.
export interface ShowcaseEntry {
  kind: 'talent' | 'project';
  profile_id: string;
  title: string | null;
  skills: string[];
  availability: string | null;
  sector: string | null;
  stage: string | null;
  looking_for: string[] | null;
  nda_required: boolean | null;
  open_to_equity: boolean | null;
  updated_at: string;
}

@Injectable({ providedIn: 'root' })
export class ShowcaseService {
  private readonly supabase = inject(SupabaseService);

  async list(): Promise<ShowcaseEntry[]> {
    if (!this.supabase.isConfigured) {
      return this.demoEntries();
    }

    const { data, error } = await this.supabase.client.rpc('list_public_marketplace');
    return error ? [] : ((data ?? []) as ShowcaseEntry[]);
  }

  // Mode démo : les profils fictifs, réduits aux mêmes champs anonymisés que la fonction Supabase.
  private demoEntries(): ShowcaseEntry[] {
    const now = new Date().toISOString();
    return MARKETPLACE_PROFILES.map(profile => ({
      kind: profile.profileType === 'entrepreneur' ? 'project' : 'talent',
      profile_id: profile.id,
      title: profile.profileType === 'entrepreneur' ? null : profile.title,
      skills: profile.skills,
      availability: profile.profileType === 'entrepreneur' ? null : profile.availabilityLabel || null,
      sector: profile.profileType === 'entrepreneur' ? profile.sector : null,
      stage: profile.profileType === 'entrepreneur' ? profile.stage : null,
      looking_for: profile.profileType === 'entrepreneur' ? profile.lookingFor : null,
      nda_required: profile.profileType === 'entrepreneur' ? false : null,
      open_to_equity: profile.profileType === 'entrepreneur' ? !!profile.openToEquity : null,
      updated_at: now,
    }));
  }
}
