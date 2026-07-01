import { NgClass } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  OnDestroy,
  QueryList,
  ViewChildren,
  computed,
  inject,
  signal
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { MarketplaceProfile } from '../../core/data/mock-platform.data';
import { ProfileType } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { MatchingService } from '../../core/services/matching.service';

type SearchProfileType = ProfileType;

@Component({
  selector: 'app-recherche',
  standalone: true,
  imports: [NgClass, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white px-4 pb-12 pt-24 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1600px]">
        <div class="flex flex-col gap-8 xl:flex-row">
          <aside class="w-full xl:w-[280px] xl:flex-shrink-0">
            <div class="sticky top-28 rounded-2xl bg-secondary p-6">
              <div class="mb-6 rounded-2xl border border-accent/15 bg-accent/5 p-4">
                <div class="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-accent">Visibilité</div>
                <h2 class="mb-2 text-xl font-bold text-primary">{{ audiencePanelTitle() }}</h2>
                <p class="text-sm leading-relaxed text-muted-foreground">{{ audiencePanelDescription() }}</p>
              </div>

              <div class="mb-6 flex items-center justify-between">
                <h2 class="text-xl font-bold">Filtres</h2>
                <button type="button" (click)="resetFilters()" class="text-sm font-medium text-accent hover:underline">Réinitialiser</button>
              </div>

              <div class="space-y-6">
                <div>
                  <label class="mb-3 block text-sm font-bold" for="search-sector">Secteur</label>
                  <select
                    id="search-sector"
                    [value]="selectedSector()"
                    (change)="onSectorChange($event)"
                    class="w-full cursor-pointer rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
                  >
                    @for (sector of sectors; track sector) {
                      <option [value]="sector">{{ sector }}</option>
                    }
                  </select>
                </div>

                <div>
                  <label class="mb-3 block text-sm font-bold">Stade</label>
                  <div class="flex flex-wrap gap-2">
                    @for (stage of projectStages; track stage) {
                      <button
                        type="button"
                        (click)="toggleStage(stage)"
                        class="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all"
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
                  <label class="mb-3 block text-sm font-bold" for="search-location">Localisation</label>
                  <input
                    id="search-location"
                    type="text"
                    [value]="selectedLocation()"
                    (input)="onLocationInput($event)"
                    placeholder="France entière"
                    class="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
                  >
                </div>

                <div>
                  <label class="flex cursor-pointer items-center justify-between">
                    <span class="text-sm font-bold">Disponible maintenant</span>
                    <div class="relative">
                      <input type="checkbox" [checked]="isAvailableNow()" (change)="isAvailableNow.set(!isAvailableNow())" class="peer sr-only">
                      <div class="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-accent"></div>
                      <div class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </aside>

          <div class="min-w-0 flex-1">
            <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="text-lg">
                <span class="font-bold text-primary">{{ filteredProfiles().length }}</span>
                <span class="text-muted-foreground"> {{ searchResultLabel() }}</span>
              </div>
              <select class="cursor-pointer rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium outline-none focus:border-accent">
                <option>Pertinence IA</option>
                <option>Plus récents</option>
                <option>Compatibilité décroissante</option>
                <option>Localisation</option>
              </select>
            </div>

            <div
              class="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-accent to-primary p-6 text-white shadow-lg"
              [ngClass]="highlightedProfiles().length > 0 ? 'lg:pr-64' : 'lg:pr-6'"
            >
              <div class="pointer-events-none absolute -right-16 -top-14 hidden h-72 w-72 rounded-full bg-white/10 blur-3xl lg:block"></div>
              @if (highlightedProfiles().length > 0) {
                <img
                src="/assets/images/search-analyst.png"
                alt=""
                aria-hidden="true"
                class="pointer-events-none absolute right-3 top-2 hidden h-44 w-56 object-contain object-right drop-shadow-2xl xl:h-52 xl:w-64 lg:block"
                >
                <div class="pointer-events-none absolute right-20 top-44 hidden rounded-full border border-white/20 bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm xl:top-52 lg:block">
                Recherche
                </div>
                <div class="pointer-events-none absolute bottom-6 right-4 hidden w-64 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-center text-xs font-medium leading-relaxed text-white/90 shadow-xl backdrop-blur-md xl:block">
                Je vous aide à repérer les profils les plus alignés avec vos filtres.
                </div>
              }
              <div class="mb-4 flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                </svg>
                <h2 class="text-xl font-bold">{{ highlightedBannerTitle() }}</h2>
              </div>

              @if (highlightedProfiles().length > 0) {
                <div class="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2">
                  @for (profile of highlightedProfiles(); track profile.id) {
                    <div class="flex min-h-[12.5rem] w-[19rem] flex-shrink-0 flex-col rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                      <div class="mb-3 flex items-center gap-3">
                        <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 font-bold text-white">
                          {{ profile.initials }}
                        </div>
                        <div class="min-w-0 flex-1">
                          <h3 class="truncate font-bold">{{ profile.displayName }}</h3>
                          <div class="line-clamp-2 text-sm opacity-90">{{ profile.title }}</div>
                        </div>
                        <div class="flex flex-shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                          </svg>
                          <span class="text-sm font-bold">{{ profile.match }}%</span>
                        </div>
                      </div>
                      <p class="mb-3 line-clamp-2 text-sm opacity-90">{{ profile.bio }}</p>
                      <a
                        [routerLink]="['/profil', profile.id]"
                        class="mt-auto block w-full rounded-lg bg-white py-2 text-center text-sm font-semibold text-accent transition-colors hover:bg-white/95"
                      >
                        {{ cardActionLabel() }}
                      </a>
                    </div>
                  }
                </div>
              } @else {
                <div class="relative flex flex-col gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
                  <p class="text-sm leading-relaxed text-white/90 sm:text-base">
                    {{ emptyBannerDescription() }}
                  </p>
                  @if (hasActiveFilters()) {
                    <button
                      type="button"
                      (click)="resetFilters()"
                      class="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-bold text-accent transition-colors hover:bg-white/90"
                    >
                      Réinitialiser les filtres
                    </button>
                  }
                </div>
              }
            </div>

            <div class="relative grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              @for (profile of filteredProfiles(); track profile.id; let profileIndex = $index) {
                <div
                  #searchCard
                  class="search-card-reveal flex min-h-[21.5rem] flex-col rounded-2xl border-2 border-border bg-white p-6 shadow-sm transition-all hover:shadow-lg"
                  [style.--reveal-delay]="revealDelay(profileIndex)"
                  [class.blur-sm]="isLockedCard(profileIndex)"
                >
                  <div class="mb-4 flex items-start justify-between">
                    <div class="flex items-center gap-3">
                      <div class="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary text-lg font-bold text-white">
                        {{ profile.initials }}
                      </div>
                      <div>
                        <h3 class="text-lg font-bold">{{ profile.displayName }}</h3>
                        <div class="mt-1 flex items-center gap-2">
                          <span class="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">{{ cardBadgeLabel() }}</span>
                        </div>
                      </div>
                    </div>
                    <button type="button" class="rounded-lg p-2 transition-colors hover:bg-secondary" aria-label="Sauvegarder ce profil">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                      </svg>
                    </button>
                  </div>

                  <div class="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span class="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {{ profile.location }}
                    </span>
                    <span class="rounded bg-secondary px-2 py-0.5 text-xs font-medium">{{ profile.stage }}</span>
                  </div>

                  <div class="mb-2 text-sm font-semibold text-primary">{{ profile.title }}</div>
                  <p class="mb-4 min-h-[2.75rem] line-clamp-2 text-sm leading-relaxed text-foreground/80">{{ profile.bio }}</p>

                  <div class="mb-4 flex min-h-[2rem] flex-wrap gap-2">
                    @for (skill of profile.skills; track skill) {
                      <span class="rounded-lg bg-secondary px-3 py-1 text-xs font-medium text-foreground">{{ skill }}</span>
                    }
                  </div>

                  <div class="mt-auto flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-accent">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                      </svg>
                      <span class="text-sm font-bold">{{ profile.match }}% compatible</span>
                    </div>
                    <a
                      [routerLink]="['/profil', profile.id]"
                      class="flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      {{ cardActionLabel() }}
                    </a>
                  </div>
                </div>
              } @empty {
                <div class="rounded-2xl border border-border bg-secondary p-12 text-center text-muted-foreground md:col-span-2 xl:col-span-3">
                  Aucun résultat avec ces filtres pour le moment.
                </div>
              }

              @if (showLockedOverlay()) {
                <div class="absolute inset-x-0 bottom-0 top-[60%] flex items-center justify-center px-4">
                  <div class="locked-upgrade-panel pointer-events-auto max-w-md rounded-2xl border-2 border-accent bg-white/95 p-8 text-center shadow-2xl backdrop-blur-md">
                    <div class="locked-upgrade-icon mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary shadow-lg">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m2 4 3 12h14l3-12-6 5-4-5-4 5-6-5z"/>
                        <path d="M5 20h14"/>
                      </svg>
                    </div>
                    <h3 class="mb-3 text-2xl font-bold text-primary dark:text-foreground">Passez en PRO</h3>
                    <p class="mb-6 leading-relaxed text-muted-foreground dark:text-muted-foreground">
                      Débloquez les {{ lockedProfilesCount() }} {{ searchResultLabel() }} restants, la recherche avancée et la messagerie illimitée.
                    </p>
                    <a
                      routerLink="/tarifs"
                      class="locked-upgrade-cta mb-3 block w-full rounded-lg bg-accent py-4 text-lg font-bold text-white shadow-lg shadow-accent/20 transition-colors hover:bg-accent/90"
                    >
                      Découvrir PRO - 49€/mois
                    </a>
                    <button
                      type="button"
                      (click)="activateProDemo()"
                      class="locked-demo-link text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Aperçu démo (pour ce test)
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
export class RechercheComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly matchingService = inject(MatchingService);
  private intersectionObserver: IntersectionObserver | null = null;
  private cardsChangesSubscription: Subscription | null = null;

  @ViewChildren('searchCard', { read: ElementRef })
  private readonly searchCards?: QueryList<ElementRef<HTMLElement>>;

  readonly selectedSector = signal('Tous');
  readonly selectedStage = signal<string[]>([]);
  readonly selectedLocation = signal('');
  readonly isAvailableNow = signal(false);

  readonly sectors = ['Tous', 'Tech', 'Santé', 'Commerce', 'Finance', 'Industrie', 'Éducation', 'Marketing'];
  readonly projectStages = ['Idée', 'MVP', 'En croissance', 'Établi'];
  readonly allProfiles = signal<MarketplaceProfile[]>([]);

  readonly viewerType = computed<ProfileType>(() => this.auth.currentUser()?.profileType ?? 'entrepreneur');
  readonly visibleProfileType = computed<SearchProfileType>(() =>
    this.viewerType() === 'entrepreneur' ? 'talent' : 'entrepreneur'
  );

  readonly filteredProfiles = computed<MarketplaceProfile[]>(() => {
    const targetType = this.visibleProfileType();
    const activeSector = this.selectedSector();
    const activeStages = this.selectedStage();
    const location = this.selectedLocation().trim().toLowerCase();
    const availableNowOnly = this.isAvailableNow();

    return this.allProfiles().filter(profile => {
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
    this.auth.plan() === 'FREE' && this.filteredProfiles().length > 6
  );
  readonly lockedProfilesCount = computed(() => Math.max(this.filteredProfiles().length - 6, 0));
  readonly audiencePanelTitle = computed(() =>
    this.visibleProfileType() === 'talent' ? 'Vous voyez uniquement les talents' : 'Vous voyez uniquement les projets'
  );
  readonly audiencePanelDescription = computed(() =>
    this.visibleProfileType() === 'talent'
      ? "En tant qu'entrepreneur, la recherche affiche seulement des talents afin de garder un matching clair."
      : this.viewerType() === 'talent'
        ? 'En tant que talent, la recherche affiche seulement les projets publiés par des entrepreneurs.'
        : 'Votre compte M&A garde accès aux projets côté marketplace talents ; les opportunités de reprise restent dans la verticale M&A.'
  );
  readonly searchResultLabel = computed(() =>
    this.visibleProfileType() === 'talent' ? 'talents disponibles' : 'projets disponibles'
  );
  readonly highlightedBannerTitle = computed(() =>
    this.visibleProfileType() === 'talent'
      ? 'Les talents les plus alignés avec votre projet'
      : 'Les projets les plus alignés avec votre profil'
  );
  readonly hasActiveFilters = computed(() =>
    this.selectedSector() !== 'Tous'
    || this.selectedStage().length > 0
    || this.selectedLocation().trim().length > 0
    || this.isAvailableNow()
  );
  readonly emptyBannerDescription = computed(() => {
    if (this.hasActiveFilters()) {
      return `Aucun ${this.searchResultLabel()} ne correspond à ces filtres. Tu peux les réinitialiser pour revoir toutes les opportunités disponibles.`;
    }

    return this.visibleProfileType() === 'talent'
      ? "Aucun talent n'est encore disponible. Dès qu'un profil compatible est publié, il apparaîtra ici."
      : "Aucun projet n'est encore publié. Dès qu'un entrepreneur ajoute une opportunité, elle apparaîtra ici.";
  });
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

  activateProDemo(): void {
    void this.auth.grantDemoPlan('PRO');
  }

  revealDelay(index: number): string {
    return `${(index % 3) * 70}ms`;
  }

  ngOnInit(): void {
    void this.loadProfiles();
  }

  ngAfterViewInit(): void {
    if (this.shouldSkipScrollReveal()) {
      this.showCardsImmediately();
      return;
    }

    this.intersectionObserver = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          entry.target.classList.add('is-visible');
          this.intersectionObserver?.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    );

    this.observeSearchCards();
    this.cardsChangesSubscription = this.searchCards?.changes.subscribe(() => {
      this.observeSearchCards();
    }) ?? null;
  }

  ngOnDestroy(): void {
    this.cardsChangesSubscription?.unsubscribe();
    this.intersectionObserver?.disconnect();
  }

  private observeSearchCards(): void {
    const cards = this.searchCards?.toArray() ?? [];

    for (const card of cards) {
      const element = card.nativeElement;
      element.classList.remove('is-visible');
      this.intersectionObserver?.observe(element);
    }
  }

  private showCardsImmediately(): void {
    queueMicrotask(() => {
      const cards = this.searchCards?.toArray() ?? [];
      for (const card of cards) {
        card.nativeElement.classList.add('is-visible');
      }
    });
  }

  private shouldSkipScrollReveal(): boolean {
    return typeof window === 'undefined'
      || typeof IntersectionObserver === 'undefined'
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  private async loadProfiles(): Promise<void> {
    await this.auth.ensureSessionReady();
    const profiles = await this.matchingService.getMarketplaceProfilesForSearch(this.viewerType());
    this.allProfiles.set(profiles);
  }
}
