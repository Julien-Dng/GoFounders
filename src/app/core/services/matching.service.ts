import { Injectable } from '@angular/core';
import { Match } from '../models/match.model';
import { Profile } from '../models/project.model';

@Injectable({ providedIn: 'root' })
export class MatchingService {
  async getMatchesForUser(userId: string): Promise<Match[]> {
    return [];
  }

  async getProfilesForSearch(filters: ProfileSearchFilters): Promise<Profile[]> {
    return [];
  }

  async acceptMatch(matchId: string): Promise<void> {}

  async rejectMatch(matchId: string): Promise<void> {}
}

export interface ProfileSearchFilters {
  type?: string[];
  sector?: string;
  stage?: string;
  location?: string;
  availableOnly?: boolean;
}
