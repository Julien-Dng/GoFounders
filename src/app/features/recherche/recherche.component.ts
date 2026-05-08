import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ProfileType } from '../../core/models/user.model';

type SearchProfileType = ProfileType;

interface SearchProfile {
  id: string;
  profileType: SearchProfileType;
  name: string;
  role: string;
  location: string;
  stage: string;
  bio: string;
  skills: string[];
  match: number;
  avatar: string;
  sector: string;
  availableNow: boolean;
}

@Component({
  selector: 'app-recherche',
  standalone: true,
  imports: [NgClass, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen pt-24 pb-12 px-8 bg-white">
      <div class="max-w-[1600px] mx-auto">
        <div class="flex gap-8">

          <aside class="w-[280px] flex-shrink-0">
            <div class="bg-secondary rounded-2xl p-6 sticky top-28">
              <div class="rounded-2xl border border-accent/15 bg-accent/5 p-4 mb-6">
                <div class="text-xs font-bold uppercase tracking-[0.2em] text-accent mb-2">Visibilité</div>
                <h2 class="text-xl font-bold text-primary mb-2">{{ audiencePanelTitle() }}</h2>
                <p class="text-sm leading-relaxed text-muted-foreground">{{ audiencePanelDescription() }}</p>
              </div>

              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold">Filtres</h2>
                <button (click)="resetFilters()" class="text-sm text-accent hover:underline font-medium">Réinitialiser</button>
              </div>

              <div class="space-y-6">
                <div>
                  <label class="block text-sm font-bold mb-3" for="search-sector">Secteur</label>
                  <select
                    id="search-sector"
                    [value]="selectedSector()"
                    (change)="onSectorChange($event)"
                    class="w-full px-3 py-2.5 bg-white border border-border rounded-lg focus:border-accent outline-none text-sm cursor-pointer"
                  >
                    @for (sector of sectors; track sector) {
                      <option [value]="sector">{{ sector }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="block text-sm font-bold mb-3">Stade</label>
                  <div class="flex flex-wrap gap-2">
                    @for (stage of projectStages; track stage) {
                      <button
                        type="button"
                        (click)="toggleStage(stage)"
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        [class.bg-accent]="selectedStage().includes(stage)"
                        [class.text-white]="selectedStage().includes(stage)"
                        [class.shadow-md]="selectedStage().includes(stage)"
                        [class.bg-white]="!selectedStage().includes(stage)"
                        [class.border]="!selectedStage().includes(stage)"
                        [class.border-border]="!selectedStage().includes(stage)"
                        [class.hover:border-accent]="!selectedStage().includes(stage)"
                      >{{ stage }}</button>
                    }
                  </div>
                </div>

                <div>
                  <label class="block text-sm font-bold mb-3" for="search-location">Localisation</label>
                  <input
                    id="search-location"
                    type="text"
                    [value]="selectedLocation()"
                    (input)="onLocationInput($event)"
                    placeholder="France entière"
                    class="w-full px-3 py-2.5 bg-white border border-border rounded-lg focus:border-accent outline-none text-sm"
                  >
                </div>

                <div>
                  <label class="flex items-center justify-between cursor-pointer">
                    <span class="text-sm font-bold">Disponible maintenant</span>
                    <div class="relative">
                      <input type="checkbox" [checked]="isAvailableNow()" (change)="isAvailableNow.set(!isAvailableNow())" class="sr-only peer">
                      <div class="w-11 h-6 bg-border rounded-full peer-checked:bg-accent transition-colors"></div>
                      <div class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </aside>

          <div class="flex-1">
            <div class="flex items-center justify-between mb-8">
              <div class="text-lg">
                <span class="font-bold text-primary">{{ filteredProfiles().length }}</span>
                <span class="text-muted-foreground"> {{ searchResultLabel() }}</span>
              </div>
              <select class="px-4 py-2.5 bg-secondary border border-border rounded-lg focus:border-accent outline-none text-sm font-medium cursor-pointer">
                <option>Pertinence IA</option>
                <option>Plus récents</option>
                <option>Compatibilité décroissante</option>
                <option>Localisation</option>
              </select>
            </div>

            <div class="bg-gradient-to-r from-accent to-primary rounded-2xl p-6 mb-8 text-white shadow-lg animate-fade-in-up">
              <div class="flex items-center gap-2 mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                </svg>
                <h2 class="text-xl font-bold">{{ highlightedBannerTitle() }}</h2>
              </div>

              <div class="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                @for (profile of highlightedProfiles(); track profile.id) {
                  <div class="flex-shrink-0 w-80 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">
                        {{ profile.avatar }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="font-bold truncate">{{ profile.name }}</h3>
                        <div class="text-sm opacity-90">{{ profile.role }}</div>
                      </div>
                      <div class="flex items-center gap-1 px-2.5 py-1 bg-white/20 rounded-full">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                        </svg>
                        <span class="text-sm font-bold">{{ profile.match }}%</span>
                      </div>
                    </div>
                    <p class="text-sm opacity-90 line-clamp-2 mb-3">{{ profile.bio }}</p>
                    <a
                      [routerLink]="['/profil', profile.id]"
                      class="block w-full py-2 bg-white text-accent rounded-lg text-sm font-semibold hover:bg-white/95 transition-colors text-center"
                    >
                      {{ cardActionLabel() }}
                    </a>
                  </div>
                }
              </div>
            </div>

            <div class="grid grid-cols-3 gap-6 relative">
              @for (profile of filteredProfiles(); track profile.id; let profileIndex = $index) {
                <div
                  class="bg-white rounded-2xl border-2 border-border p-6 shadow-sm hover:shadow-lg transition-all animate-fade-in-up"
                  [class.blur-sm]="isLockedCard(profileIndex)"
                >
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <div class="w-14 h-14 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {{ profile.avatar }}
                      </div>
                      <div>
                        <h3 class="font-bold text-lg">{{ profile.name }}</h3>
                        <div class="flex items-center gap-2 mt-1">
                          <span class="px-2.5 py-0.5 bg-accent text-white rounded-full text-xs font-semibold">{{ cardBadgeLabel() }}</span>
                        </div>
                      </div>
                    </div>
                    <button type="button" class="p-2 hover:bg-secondary rounded-lg transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                      </svg>
                    </button>
                  </div>

                  <div class="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{{ profile.location }}</span>
                    <span class="px-2 py-0.5 bg-secondary rounded text-xs font-medium">{{ profile.stage }}</span>
                  </div>

                  <div class="text-sm font-semibold text-primary mb-2">{{ profile.role }}</div>
                  <p class="text-sm text-foreground/80 mb-4 line-clamp-2 leading-relaxed">{{ profile.bio }}</p>

                  <div class="flex flex-wrap gap-2 mb-4">
                    @for (skill of profile.skills; track skill) {
                      <span class="px-3 py-1 bg-secondary text-foreground text-xs rounded-lg font-medium">{{ skill }}</span>
                    }
                  </div>

                  <div class="flex items-center justify-between pt-4 border-t border-border">
                    <div class="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent rounded-full">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                      </svg>
                      <span class="text-sm font-bold">{{ profile.match }}% compatible</span>
                    </div>
                    <a
                      [routerLink]="['/profil', profile.id]"
                      class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      {{ cardActionLabel() }}
                    </a>
                  </div>
                </div>
              } @empty {
                <div class="col-span-3 rounded-2xl border border-border bg-secondary p-12 text-center text-muted-foreground">
                  Aucun résultat avec ces filtres pour le moment.
                </div>
              }

              @if (showLockedOverlay()) {
                <div class="absolute top-[calc(100%/3*2)] left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none">
                  <div class="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-accent p-10 shadow-2xl max-w-md pointer-events-auto text-center animate-fade-in-scale">
                    <div class="w-20 h-20 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m2 4 3 12h14l3-12-6 5-4-5-4 5-6-5z"/>
                        <path d="M5 20h14"/>
                      </svg>
                    </div>
                    <h3 class="text-2xl font-bold mb-3">Passez en PRO</h3>
                    <p class="text-muted-foreground mb-6 leading-relaxed">
                      Débloquez les {{ lockedProfilesCount() }} {{ searchResultLabel() }} restants, la recherche avancée et la messagerie illimitée.
                    </p>
                    <a
                      routerLink="/tarifs"
                      class="block w-full py-4 bg-accent text-white rounded-lg font-bold text-lg shadow-lg hover:bg-accent/90 transition-colors mb-3"
                    >
                      Découvrir PRO - 49€/mois
                    </a>
                    <button type="button" (click)="forcePreviewUnlock.set(true)" class="text-sm text-muted-foreground hover:text-foreground">
                      Aperçu démo
                    </button>
                  </div>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RechercheComponent {
  private readonly auth = inject(AuthService);

  readonly selectedSector = signal('Tous');
  readonly selectedStage = signal<string[]>([]);
  readonly selectedLocation = signal('');
  readonly isAvailableNow = signal(false);
  readonly forcePreviewUnlock = signal(false);

  readonly sectors = ['Tous', 'Tech', 'Santé', 'Commerce', 'Finance', 'Industrie', 'Éducation', 'Marketing'];
  readonly projectStages = ['Idée', 'MVP', 'En croissance', 'Établi'];

  private readonly allProfiles: SearchProfile[] = [
    {
      id: 'talent-sophie-martin',
      profileType: 'talent',
      name: 'Sophie Martin',
      role: 'CTO freelance',
      location: 'Paris',
      stage: 'MVP',
      bio: 'Développeuse produit avec forte expérience SaaS et mise en production IA.',
      skills: ['Angular', 'Firebase', 'IA'],
      match: 95,
      avatar: 'SM',
      sector: 'Tech',
      availableNow: true,
    },
    {
      id: 'talent-thomas-dupont',
      profileType: 'talent',
      name: 'Thomas Dupont',
      role: 'Développeur full-stack',
      location: 'Lyon',
      stage: 'Idée',
      bio: 'Profil technique orienté exécution, très à l’aise sur les marketplaces et paiements.',
      skills: ['Node.js', 'Stripe', 'DevOps'],
      match: 92,
      avatar: 'TD',
      sector: 'Tech',
      availableNow: true,
    },
    {
      id: 'talent-claire-bernard',
      profileType: 'talent',
      name: 'Claire Bernard',
      role: 'Product manager',
      location: 'Bordeaux',
      stage: 'En croissance',
      bio: 'Expérience B2B SaaS, cadrage produit et priorisation de roadmap.',
      skills: ['Produit', 'UX', 'Analytics'],
      match: 89,
      avatar: 'CB',
      sector: 'Tech',
      availableNow: false,
    },
    {
      id: 'talent-marc-laurent',
      profileType: 'talent',
      name: 'Marc Laurent',
      role: 'Commercial senior',
      location: 'Marseille',
      stage: 'Établi',
      bio: 'Habitué des cycles de vente complexes et des premiers recrutements sales.',
      skills: ['Sales', 'Negotiation', 'B2B'],
      match: 87,
      avatar: 'ML',
      sector: 'Commerce',
      availableNow: true,
    },
    {
      id: 'talent-emma-rousseau',
      profileType: 'talent',
      name: 'Emma Rousseau',
      role: 'Designer UI/UX',
      location: 'Toulouse',
      stage: 'MVP',
      bio: 'Designer orientée conversion, parcours clairs et design systems maintenables.',
      skills: ['Figma', 'Branding', 'Design System'],
      match: 84,
      avatar: 'ER',
      sector: 'Marketing',
      availableNow: true,
    },
    {
      id: 'talent-alexandre-petit',
      profileType: 'talent',
      name: 'Alexandre Petit',
      role: 'Growth marketer',
      location: 'Nantes',
      stage: 'En croissance',
      bio: 'Acquisition, rétention et expérimentation pour passer de zéro à traction.',
      skills: ['SEO', 'Ads', 'Growth'],
      match: 82,
      avatar: 'AP',
      sector: 'Marketing',
      availableNow: false,
    },
    {
      id: 'talent-julie-moreau',
      profileType: 'talent',
      name: 'Julie Moreau',
      role: 'Data scientist',
      location: 'Lille',
      stage: 'Idée',
      bio: 'Machine learning appliqué à des cas concrets, avec une vraie culture produit.',
      skills: ['Python', 'ML', 'Data Viz'],
      match: 79,
      avatar: 'JM',
      sector: 'Santé',
      availableNow: true,
    },
    {
      id: 'projet-healthpilot',
      profileType: 'entrepreneur',
      name: 'HealthPilot',
      role: 'Fondatrice · Sophie Bernard',
      location: 'Paris',
      stage: 'MVP',
      bio: 'Assistant clinique basé sur l’IA pour faire gagner du temps aux professionnels de santé.',
      skills: ['Recherche CTO', 'Santé', 'B2B SaaS'],
      match: 96,
      avatar: 'HP',
      sector: 'Santé',
      availableNow: true,
    },
    {
      id: 'projet-greenbox',
      profileType: 'entrepreneur',
      name: 'GreenBox',
      role: 'Fondateur · Thomas Leroy',
      location: 'Lyon',
      stage: 'Idée',
      bio: 'Solution logistique responsable pour commerces locaux avec forte composante terrain.',
      skills: ['Recherche sales', 'Ops', 'Marketplace'],
      match: 91,
      avatar: 'GB',
      sector: 'Commerce',
      availableNow: true,
    },
    {
      id: 'projet-datanest',
      profileType: 'entrepreneur',
      name: 'DataNest',
      role: 'Fondatrice · Claire Renaud',
      location: 'Bordeaux',
      stage: 'En croissance',
      bio: 'Plateforme d’analyse pour PME qui veulent centraliser leurs KPIs sans lourdeur technique.',
      skills: ['Produit', 'Frontend', 'Customer success'],
      match: 88,
      avatar: 'DN',
      sector: 'Tech',
      availableNow: false,
    },
    {
      id: 'projet-fleetflow',
      profileType: 'entrepreneur',
      name: 'FleetFlow',
      role: 'Fondateur · Mehdi Amrani',
      location: 'Marseille',
      stage: 'Établi',
      bio: 'Outil de pilotage de flotte déjà commercialisé, en recherche de renfort growth.',
      skills: ['Growth', 'B2B', 'SaaS'],
      match: 85,
      avatar: 'FF',
      sector: 'Industrie',
      availableNow: true,
    },
    {
      id: 'projet-eduspark',
      profileType: 'entrepreneur',
      name: 'EduSpark',
      role: 'Fondatrice · Nora Lemoine',
      location: 'Toulouse',
      stage: 'MVP',
      bio: 'Parcours de formation hybride pour aider les indépendants à monter en compétences plus vite.',
      skills: ['Design', 'Produit', 'No-code'],
      match: 83,
      avatar: 'ES',
      sector: 'Éducation',
      availableNow: true,
    },
    {
      id: 'projet-atelier-local',
      profileType: 'entrepreneur',
      name: 'Atelier Local',
      role: 'Fondateur · Hugo Perez',
      location: 'Nantes',
      stage: 'Idée',
      bio: 'Réseau de producteurs locaux avec expérience d’achat plus simple et plus humaine.',
      skills: ['Marketplace', 'Operations', 'Branding'],
      match: 80,
      avatar: 'AL',
      sector: 'Commerce',
      availableNow: false,
    },
    {
      id: 'projet-finloop',
      profileType: 'entrepreneur',
      name: 'Finloop',
      role: 'Fondatrice · Sarah Cohen',
      location: 'Lille',
      stage: 'En croissance',
      bio: 'Application de pilotage de trésorerie pour indépendants avec approche simple et actionnable.',
      skills: ['Data', 'Produit', 'Finance'],
      match: 78,
      avatar: 'FL',
      sector: 'Finance',
      availableNow: true,
    },
  ];

  readonly viewerType = computed<ProfileType>(() => this.auth.currentUser()?.profileType ?? 'entrepreneur');
  readonly visibleProfileType = computed<SearchProfileType>(() =>
    this.viewerType() === 'entrepreneur' ? 'talent' : 'entrepreneur'
  );

  readonly filteredProfiles = computed(() => {
    const targetType = this.visibleProfileType();
    const activeSector = this.selectedSector();
    const activeStages = this.selectedStage();
    const location = this.selectedLocation().trim().toLowerCase();
    const availableNowOnly = this.isAvailableNow();

    return this.allProfiles.filter(profile => {
      const matchesRole = profile.profileType === targetType;
      const matchesSector = activeSector === 'Tous' || profile.sector === activeSector;
      const matchesStage = activeStages.length === 0 || activeStages.includes(profile.stage);
      const matchesLocation = location.length === 0 || profile.location.toLowerCase().includes(location);
      const matchesAvailability = !availableNowOnly || profile.availableNow;

      return matchesRole && matchesSector && matchesStage && matchesLocation && matchesAvailability;
    });
  });

  readonly highlightedProfiles = computed(() => this.filteredProfiles().slice(0, 3));
  readonly showLockedOverlay = computed(() =>
    this.auth.plan() === 'FREE' && !this.forcePreviewUnlock() && this.filteredProfiles().length > 6
  );
  readonly lockedProfilesCount = computed(() => Math.max(this.filteredProfiles().length - 6, 0));
  readonly audiencePanelTitle = computed(() =>
    this.visibleProfileType() === 'talent' ? 'Vous voyez uniquement les talents' : 'Vous voyez uniquement les projets'
  );
  readonly audiencePanelDescription = computed(() =>
    this.visibleProfileType() === 'talent'
      ? 'En tant qu’entrepreneur, la recherche affiche seulement des talents afin de garder un matching clair.'
      : 'En tant que talent, la recherche affiche seulement les projets publiés par des entrepreneurs.'
  );
  readonly searchResultLabel = computed(() =>
    this.visibleProfileType() === 'talent' ? 'talents disponibles' : 'projets disponibles'
  );
  readonly highlightedBannerTitle = computed(() =>
    this.visibleProfileType() === 'talent'
      ? 'Les talents les plus alignés avec votre projet'
      : 'Les projets les plus alignés avec votre profil'
  );
  readonly cardBadgeLabel = computed(() =>
    this.visibleProfileType() === 'talent' ? 'Talent' : 'Projet'
  );
  readonly cardActionLabel = computed(() =>
    this.visibleProfileType() === 'talent' ? 'Voir le profil' : 'Voir le projet'
  );

  onSectorChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    this.selectedSector.set(select?.value ?? 'Tous');
  }

  onLocationInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.selectedLocation.set(input?.value ?? '');
  }

  toggleStage(stage: string): void {
    this.selectedStage.update(stages =>
      stages.includes(stage) ? stages.filter(activeStage => activeStage !== stage) : [...stages, stage]
    );
  }

  resetFilters(): void {
    this.selectedSector.set('Tous');
    this.selectedStage.set([]);
    this.selectedLocation.set('');
    this.isAvailableNow.set(false);
  }

  isLockedCard(index: number): boolean {
    return this.showLockedOverlay() && index >= 6;
  }
}
