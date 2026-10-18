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
import { ProfileType, MATCH_REASONS_UPSELL, canSeeMatchReasons } from '../../core/models/user.model';
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

                @if (visibleProfileType() === 'entrepreneur') {
                  <div>
                    <label class="flex cursor-pointer items-center justify-between gap-3">
                      <span class="text-sm font-bold">Ouvert à un associé avec apport</span>
                      <div class="relative flex-shrink-0">
                        <input type="checkbox" [checked]="openToEquityOnly()" (change)="openToEquityOnly.set(!openToEquityOnly())" class="peer sr-only" aria-describedby="equity-filter-help">
                        <div class="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-accent"></div>
                        <div class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5"></div>
                      </div>
                    </label>
                    <p id="equity-filter-help" class="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Projets dont le porteur accepte un associé qui entrerait au capital. Les conditions se négocient en privé ; GoFounders ne propose pas d'investissement.
                    </p>
                  </div>
                }
              </div>
            </div>
          </aside>

          <div class="min-w-0 flex-1">
            <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="text-lg">
                <span class="font-bold text-primary">{{ filteredProfiles().length }}</span>
                <span class="text-muted-foreground"> {{ searchResultLabel() }}</span>
              </div>
              <span class="text-sm font-medium text-muted-foreground">Triés par compatibilité</span>
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
                        <div class="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 font-bold text-white">
                          <span>{{ profile.initials }}</span>
                          @if (profile.photoURL) {
                            <img [src]="profile.photoURL" [alt]="'Photo de ' + profile.displayName" (error)="hideBrokenImage($event)" class="absolute inset-0 h-full w-full object-cover">
                          }
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
                >
                  <div class="mb-4 flex items-start justify-between">
                    <div class="flex items-center gap-3">
                      <div class="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-accent to-primary text-lg font-bold text-white">
                        <span>{{ profile.initials }}</span>
                        @if (profile.photoURL) {
                          <img [src]="profile.photoURL" [alt]="'Photo de ' + profile.displayName" (error)="hideBrokenImage($event)" class="absolute inset-0 h-full w-full object-cover">
                        }
                      </div>
                      <div>
                        <h3 class="text-lg font-bold">{{ profile.displayName }}</h3>
                        <div class="mt-1 flex flex-wrap items-center gap-2">
                          <span class="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">{{ cardBadgeLabel() }}</span>
                          @if (profile.openToEquity) {
                            <span class="whitespace-nowrap rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">Associé avec apport</span>
                          }
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
                    <div class="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-accent" [title]="canSeeReasons() ? (profile.matchReasons ?? []).join(' · ') : reasonsUpsell">
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

            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class RechercheComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  readonly canSeeReasons = computed(() => canSeeMatchReasons(this.auth.plan()));
  readonly reasonsUpsell = MATCH_REASONS_UPSELL;
  private readonly matchingService = inject(MatchingService);
  private intersectionObserver: IntersectionObserver | null = null;
  private cardsChangesSubscription: Subscription | null = null;

  @ViewChildren('searchCard', { read: ElementRef })
  private readonly searchCards?: QueryList<ElementRef<HTMLElement>>;

  readonly selectedSector = signal('Tous');
  readonly selectedStage = signal<string[]>([]);
  readonly selectedLocation = signal('');
  readonly isAvailableNow = signal(false);
  readonly openToEquityOnly = signal(false);

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
    const equityOnly = this.openToEquityOnly() && targetType === 'entrepreneur';

    return this.allProfiles().filter(profile => {
      const matchesRole = profile.profileType === targetType;
      const matchesSector = activeSector === 'Tous' || profile.sector === activeSector;
      const matchesStage = activeStages.length === 0 || activeStages.includes(profile.stage);
      const matchesLocation = location.length === 0 || profile.location.toLowerCase().includes(location);
      const matchesAvailability = !availableNowOnly || profile.availableNow;
      const matchesEquity = !equityOnly || profile.openToEquity === true;

      return matchesRole && matchesSector && matchesStage && matchesLocation && matchesAvailability && matchesEquity;
    });
  });

  readonly highlightedProfiles = computed(() => this.filteredProfiles().slice(0, 3));
  readonly audiencePanelTitle = computed(() =>
    this.visibleProfileType() === 'talent' ? 'Vous voyez uniquement les associés' : 'Vous voyez uniquement les projets'
  );
  readonly audiencePanelDescription = computed(() =>
    this.visibleProfileType() === 'talent'
      ? "En tant que porteur de projet, la recherche affiche seulement des associés afin de garder un matching clair."
      : 'En tant qu’associé, la recherche affiche seulement les projets publiés par des porteurs de projet.'
  );
  readonly searchResultLabel = computed(() =>
    this.visibleProfileType() === 'talent' ? 'associés disponibles' : 'projets disponibles'
  );
  readonly highlightedBannerTitle = computed(() =>
    this.visibleProfileType() === 'talent'
      ? 'Les associés les plus alignés avec votre projet'
      : 'Les projets les plus alignés avec votre profil'
  );
  readonly hasActiveFilters = computed(() =>
    this.selectedSector() !== 'Tous'
    || this.selectedStage().length > 0
    || this.selectedLocation().trim().length > 0
    || this.isAvailableNow()
    || this.openToEquityOnly()
  );
  readonly emptyBannerDescription = computed(() => {
    if (this.hasActiveFilters()) {
      return `Aucun ${this.searchResultLabel()} ne correspond à ces filtres. Tu peux les réinitialiser pour revoir toutes les opportunités disponibles.`;
    }

    return this.visibleProfileType() === 'talent'
      ? "Aucun associé n'est encore disponible. Dès qu'un profil compatible est publié, il apparaîtra ici."
      : "Aucun projet n'est encore publié. Dès qu'un entrepreneur ajoute une opportunité, elle apparaîtra ici.";
  });
  readonly cardBadgeLabel = computed(() =>
    this.visibleProfileType() === 'talent' ? 'Associé' : 'Projet'
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
    this.openToEquityOnly.set(false);
  }

  revealDelay(index: number): string {
    return `${(index % 3) * 70}ms`;
  }

  hideBrokenImage(event: Event): void {
    const image = event.target as HTMLImageElement | null;

    if (image) {
      image.hidden = true;
    }
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
