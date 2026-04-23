import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CompatibilityBadgeComponent } from '../compatibility-badge/compatibility-badge.component';

export interface ProfileCardData {
  id: string;
  displayName: string;
  initials: string;
  role: string;
  sector: string;
  stage: string;
  location: string;
  bio: string;
  skills: string[];
  compatibilityScore?: number;
  available: boolean;
}

@Component({
  selector: 'app-profile-card',
  standalone: true,
  imports: [RouterLink, CompatibilityBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-0.5 duration-200 flex flex-col gap-4">
      <div class="flex items-start justify-between">
        <div class="flex items-center gap-3">
          <div class="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-xl flex items-center justify-center text-white font-bold">
            {{ profile.initials }}
          </div>
          <div>
            <div class="font-bold">{{ profile.displayName }}</div>
            <div class="text-sm text-muted-foreground">{{ profile.role }}</div>
          </div>
        </div>
        @if (profile.compatibilityScore !== undefined) {
          <app-compatibility-badge [score]="profile.compatibilityScore" />
        }
      </div>

      <p class="text-sm text-foreground/80 leading-relaxed line-clamp-2">{{ profile.bio }}</p>

      <div class="flex flex-wrap gap-1.5">
        @for (skill of profile.skills.slice(0, 4); track skill) {
          <span class="px-2 py-1 bg-secondary text-xs font-medium rounded-md">{{ skill }}</span>
        }
      </div>

      <div class="flex items-center justify-between pt-2 border-t border-border">
        <div class="flex items-center gap-1.5 text-xs text-muted-foreground">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          {{ profile.location }}
        </div>
        @if (profile.available) {
          <span class="flex items-center gap-1 text-xs text-green-600 font-medium">
            <span class="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
            Disponible
          </span>
        }
      </div>

      <a
        [routerLink]="['/profil', profile.id]"
        class="block text-center py-2.5 bg-accent text-white rounded-lg text-sm font-semibold hover:bg-accent/90 transition-colors"
      >
        Voir le profil
      </a>
    </div>
  `
})
export class ProfileCardComponent {
  @Input({ required: true }) profile!: ProfileCardData;
}
