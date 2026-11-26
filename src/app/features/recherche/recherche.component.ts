import { NgClass, NgTemplateOutlet } from '@angular/common';
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
import { FavoriteButtonComponent } from '../../shared/components/favorite-button/favorite-button.component';
import { BottomSheetComponent } from '../../shared/components/bottom-sheet/bottom-sheet.component';
import { Subscription } from 'rxjs';
import { MarketplaceProfile } from '../../core/data/mock-platform.data';
import { ProfileType, MATCH_REASONS_UPSELL, canSeeMatchReasons, canUseAdvancedSearch, hasUsage, investmentBadge } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { MatchingService } from '../../core/services/matching.service';

type SearchProfileType = ProfileType;

@Component({
  selector: 'app-recherche',
  standalone: true,
  imports: [NgClass, NgTemplateOutlet, RouterLink, FavoriteButtonComponent, BottomSheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-12 pt-20 sm:px-6 sm:pt-24 lg:px-8">
      <div class="mx-auto max-w-[1600px]">
        <!-- En-tête : associés ou projets, au choix (compte multi-usages). -->
        <div class="mb-6 sm:mb-8">
          <h1 class="text-2xl font-semibold text-primary sm:text-4xl"><span class="sm:hidden">{{ visibleProfileType() === 'talent' ? 'Trouver un associé' : 'Trouver un projet' }}</span><span class="hidden sm:inline">{{ visibleProfileType() === 'talent' ? 'Trouvez votre prochain associé' : 'Trouvez le projet qui vous correspond' }}</span></h1>
          <p class="mt-2 text-muted-foreground">{{ visibleProfileType() === 'talent' ? 'Explorez des profils complémentaires, échangez et lancez votre projet ensemble' : 'Découvrez les projets qui recrutent et proposez vos compétences' }}</p>
          <div class="mt-4 grid w-full grid-cols-2 gap-1 sm:mt-5 sm:inline-grid sm:w-auto rounded-xl bg-white p-1 ring-1 ring-border" role="tablist" aria-label="Que cherchez-vous ?">
            <button type="button" role="tab" [attr.aria-selected]="visibleProfileType() === 'talent'" (click)="showSide('talent')"
                    class="rounded-lg px-5 py-2.5 font-semibold transition-colors"
                    [class]="visibleProfileType() === 'talent' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-primary'">Associés<span class="hidden sm:inline"> disponibles</span></button>
            <button type="button" role="tab" [attr.aria-selected]="visibleProfileType() === 'entrepreneur'" (click)="showSide('entrepreneur')"
                    class="rounded-lg px-5 py-2.5 font-semibold transition-colors"
                    [class]="visibleProfileType() === 'entrepreneur' ? 'bg-primary text-white' : 'text-muted-foreground hover:text-primary'">Projets<span class="hidden sm:inline"> qui recrutent</span></button>
          </div>
        </div>
        <div class="flex flex-col gap-8 xl:flex-row">
          <ng-template #filtersPanel let-inSheet>
              <!-- Compte multi-usages : on passe des associés aux projets ; ce qui s'affiche dépend de ses actions. -->
              <p class="mb-6 text-sm leading-relaxed text-muted-foreground">{{ audiencePanelDescription() }}</p>

              @if (!inSheet) {
                <div class="mb-6 flex items-center justify-between">
                  <h2 class="text-xl font-semibold">Filtres</h2>
                  <button type="button" (click)="resetFilters()" class="text-sm font-medium text-accent hover:underline">Réinitialiser</button>
                </div>
              }

              <div class="space-y-6">
                <div>
                  <label class="mb-3 block text-sm font-semibold" for="search-sector">Secteur</label>
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
                  <label class="mb-3 block text-sm font-semibold">Stade</label>
                  <div class="flex flex-wrap gap-2">
                    @for (stage of projectStages; track stage) {
                      <button
                        type="button"
                        (click)="toggleStage(stage)"
                        class="rounded-lg px-3 py-1.5 text-sm font-semibold transition-all"
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
                  <label class="mb-3 block text-sm font-semibold" for="search-location">Localisation</label>
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
                    <span class="text-sm font-semibold">Disponible maintenant</span>
                    <div class="relative">
                      <input type="checkbox" [checked]="isAvailableNow()" (change)="isAvailableNow.set(!isAvailableNow())" class="peer sr-only">
                      <div class="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-accent"></div>
                      <div class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></div>
                    </div>
                  </label>
                </div>

                @if (visibleProfileType() === 'talent') {
                  <div>
                    <label class="flex cursor-pointer items-center justify-between gap-3">
                      <span class="text-sm font-semibold">Prêt à investir</span>
                      <div class="relative flex-shrink-0">
                        <input type="checkbox" [checked]="investorsOnly()" (change)="investorsOnly.set(!investorsOnly())" class="peer sr-only" aria-describedby="investor-filter-help">
                        <div class="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-accent"></div>
                        <div class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></div>
                      </div>
                    </label>
                    <p id="investor-filter-help" class="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Associés prêts à entrer au capital avec un apport, ou à en discuter. Les montants se discutent en privé ; GoFounders ne propose pas d'investissement
                    </p>
                  </div>
                }

                @if (visibleProfileType() === 'entrepreneur') {
                  <div>
                    <label class="flex cursor-pointer items-center justify-between gap-3">
                      <span class="text-sm font-semibold">Ouvert à un associé avec apport</span>
                      <div class="relative flex-shrink-0">
                        <input type="checkbox" [checked]="openToEquityOnly()" (change)="openToEquityOnly.set(!openToEquityOnly())" class="peer sr-only" aria-describedby="equity-filter-help">
                        <div class="h-6 w-11 rounded-full bg-border transition-colors peer-checked:bg-accent"></div>
                        <div class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform peer-checked:translate-x-5"></div>
                      </div>
                    </label>
                    <p id="equity-filter-help" class="mt-2 text-sm leading-relaxed text-muted-foreground">
                      Projets dont le porteur accepte un associé qui entrerait au capital. Les conditions se négocient en privé ; GoFounders ne propose pas d'investissement
                    </p>
                  </div>
                }

                <div class="border-t border-border pt-6">
                  <div class="mb-3 flex items-center justify-between gap-2">
                    <h3 class="text-sm font-semibold">Recherche avancée</h3>
                    <span class="rounded-full bg-primary px-2 py-0.5 text-sm font-semibold text-white">PRO</span>
                  </div>

                  @if (canUseAdvanced()) {
                    <div class="space-y-5">
                      <div>
                        <label class="mb-2 block text-sm font-semibold text-foreground/80" for="search-keywords">Mots-clés</label>
                        <input
                          id="search-keywords"
                          type="search"
                          [value]="keywords()"
                          (input)="onKeywordsInput($event)"
                          placeholder="Ex. SaaS, fintech, growth"
                          class="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm outline-none focus:border-accent"
                        >
                      </div>

                      @if (skillOptions().length > 0) {
                        <div>
                          <span class="mb-2 block text-sm font-semibold text-foreground/80" id="search-skills-label">{{ skillsFilterLabel() }}</span>
                          <div class="flex flex-wrap gap-2" role="group" aria-labelledby="search-skills-label">
                            @for (skill of skillOptions(); track skill) {
                              <button
                                type="button"
                                (click)="toggleSkill(skill)"
                                [attr.aria-pressed]="selectedSkills().includes(skill)"
                                class="rounded-lg px-2.5 py-1 text-sm font-semibold transition-all"
                                [ngClass]="selectedSkills().includes(skill) ? 'bg-primary text-white ' : 'border border-border bg-white hover:border-accent'"
                              >{{ skill }}</button>
                            }
                          </div>
                        </div>
                      }

                      <div>
                        <label class="mb-2 flex items-center justify-between text-sm font-semibold text-foreground/80" for="search-min-score">
                          <span>Compatibilité minimale</span>
                          <span class="text-accent">{{ minScore() === 0 ? 'Toutes' : minScore() + ' %' }}</span>
                        </label>
                        <input
                          id="search-min-score"
                          type="range"
                          min="0"
                          max="90"
                          step="10"
                          [value]="minScore()"
                          (input)="onMinScoreInput($event)"
                          class="w-full accent-[#2563EB]"
                        >
                      </div>
                    </div>
                  } @else {
                    <p class="text-sm leading-relaxed text-muted-foreground">
                      Mots-clés, compétences précises et compatibilité minimale pour aller droit aux profils qui comptent
                    </p>
                    <a routerLink="/tarifs" fragment="associes" class="mt-3 inline-block text-sm font-semibold text-accent hover:underline">Passer en PRO</a>
                  }
                </div>
              </div>
          </ng-template>

          @if (wide()) {
            <aside class="w-[340px] flex-shrink-0">
              <div class="sticky top-28 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-border">
                <ng-container *ngTemplateOutlet="filtersPanel; context: { $implicit: false }" />
              </div>
            </aside>
          } @else {
            <!-- Téléphones et tablettes : les filtres s'ouvrent à la demande, dans un panneau. -->
            <button type="button" (click)="filtersOpen.set(true)" class="-mb-4 inline-flex items-center justify-center gap-2 self-start rounded-xl bg-white px-4 py-2.5 font-semibold text-primary shadow-sm ring-1 ring-border hover:ring-accent/40">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>
              Filtres
              @if (activeFilterCount()) {
                <span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-white">{{ activeFilterCount() }}</span>
              }
            </button>
            @if (filtersOpen()) {
              <app-bottom-sheet [title]="visibleProfileType() === 'talent' ? 'Filtrer les associés' : 'Filtrer les projets'" (closed)="filtersOpen.set(false)">
                <ng-container *ngTemplateOutlet="filtersPanel; context: { $implicit: true }" />
                <div sheetFooter class="flex items-center gap-4">
                  <button type="button" (click)="resetFilters()" class="px-2 py-3 font-semibold text-accent hover:underline">Effacer</button>
                  <button type="button" (click)="filtersOpen.set(false)" class="flex-1 rounded-lg bg-accent px-4 py-3 font-semibold text-white hover:bg-accent/90">Voir les {{ filteredProfiles().length }} {{ visibleProfileType() === 'talent' ? 'associés' : 'projets' }}</button>
                </div>
              </app-bottom-sheet>
            }
          }

          <div class="min-w-0 flex-1">
            <div class="mb-4 flex flex-col gap-1 sm:mb-8 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div class="text-lg">
                <span class="font-semibold text-primary">{{ filteredProfiles().length }}</span>
                <span class="text-muted-foreground"> {{ searchResultLabel() }}</span>
              </div>
              <span class="text-sm font-medium text-muted-foreground">{{ sortLabel() }}</span>
            </div>

            <!-- Sélection « les plus alignés » : tablette et ordinateur (page courte sur téléphone). -->
            <div class="relative mb-8 hidden overflow-hidden rounded-lg bg-primary p-6 text-white sm:block">
              <div class="mb-4 flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                </svg>
                <h2 class="text-xl font-semibold">{{ highlightedBannerTitle() }}</h2>
              </div>

              @if (highlightedProfiles().length > 0) {
                <div class="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2">
                  @for (profile of highlightedProfiles(); track profile.id) {
                    <div class="flex min-h-[12.5rem] w-[19rem] flex-shrink-0 flex-col rounded-xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
                      <div class="mb-3 flex items-center gap-3">
                        <div class="relative flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/20 font-semibold text-white">
                          <span>{{ profile.initials }}</span>
                          @if (profile.photoURL) {
                            <img [src]="profile.photoURL" [alt]="'Photo de ' + profile.displayName" (error)="hideBrokenImage($event)" class="absolute inset-0 h-full w-full object-cover">
                          }
                        </div>
                        <div class="min-w-0 flex-1">
                          <h3 class="truncate font-semibold">{{ profile.displayName }}</h3>
                          <div class="line-clamp-2 text-sm opacity-90">{{ profile.title }}</div>
                        </div>
                        <div class="flex flex-shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-1">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                          </svg>
                          <span class="text-sm font-semibold">{{ profile.match }}%</span>
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
                      class="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-accent transition-colors hover:bg-white/90"
                    >
                      Réinitialiser les filtres
                    </button>
                  } @else {
                    <a [routerLink]="visibleProfileType() === 'talent' ? '/mon-projet' : '/profil/associe'"
                       class="shrink-0 rounded-lg bg-white px-4 py-2 text-center text-sm font-semibold text-accent transition-colors hover:bg-white/90">
                      {{ visibleProfileType() === 'talent' ? 'Présenter mon projet' : 'Proposer mes compétences' }}
                    </a>
                  }
                </div>
              }
            </div>

            <div class="relative grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
              @for (profile of filteredProfiles(); track profile.id; let profileIndex = $index) {
                <div
                  #searchCard
                  class="search-card-reveal flex flex-col rounded-2xl bg-white p-4 shadow-lg ring-1 transition-all hover:shadow-xl sm:min-h-[21.5rem] sm:p-6"
                  [ngClass]="profile.featured ? 'ring-accent/50' : 'ring-border'"
                  [style.--reveal-delay]="revealDelay(profileIndex)"
                >
                  <div class="mb-3 flex items-start justify-between sm:mb-4">
                    <div class="flex items-center gap-3">
                      <div class="relative flex h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-semibold text-white">
                        <span>{{ profile.initials }}</span>
                        @if (profile.photoURL) {
                          <img [src]="profile.photoURL" [alt]="'Photo de ' + profile.displayName" (error)="hideBrokenImage($event)" class="absolute inset-0 h-full w-full object-cover">
                        }
                      </div>
                      <div>
                        <h3 class="flex items-center gap-1.5 text-lg font-semibold">
                          {{ profile.displayName }}
                          @if (profile.verified) {
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#2563EB" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Profil vérifié">
                              <title>{{ profile.profileType === 'entrepreneur' ? 'Porteur de projet vérifié par GoFounders' : 'Profil vérifié par GoFounders' }}</title>
                              <circle cx="12" cy="12" r="10"/><path d="m8 12 3 3 5-6"/>
                            </svg>
                          }
                        </h3>
                        <div class="mt-1 flex flex-wrap items-center gap-2">
                          <span class="rounded-full bg-primary px-2.5 py-0.5 text-sm font-semibold text-white">{{ cardBadgeLabel() }}</span>
                          @if (profile.featured) {
                            <span class="whitespace-nowrap rounded-full bg-amber-500 px-2.5 py-0.5 text-sm font-semibold text-white" title="Projet d'un porteur PRO, affiché en priorité">Mis en avant</span>
                          }
                          @if (profile.ndaRequired) {
                            <span class="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-primary px-2.5 py-0.5 text-sm font-semibold text-white" title="Détails partagés après engagement de confidentialité">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <rect x="3" y="11" width="18" height="11" rx="2"/>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                              </svg>
                              NDA
                            </span>
                          }
                          @if (profile.profileType === 'talent' && investmentBadge(profile.investmentReadiness); as badge) {
                            <span class="whitespace-nowrap rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-sm font-semibold text-emerald-800">{{ badge }}</span>
                          }
                          @if (profile.openToEquity) {
                            <span class="whitespace-nowrap rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-sm font-semibold text-accent">Associé avec apport</span>
                          }
                        </div>
                      </div>
                    </div>
                    <app-favorite-button class="ml-2 flex-shrink-0" [listingId]="profile.id" [kind]="profile.profileType === 'talent' ? 'associate' : 'project'" [label]="profile.displayName" />
                  </div>

                  <div class="mb-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span class="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {{ profile.location }}
                    </span>
                    <span class="rounded bg-secondary px-2 py-0.5 text-sm font-medium">{{ profile.stage }}</span>
                  </div>

                  <div class="mb-2 text-sm font-semibold text-primary">{{ profile.title }}</div>
                  <p class="mb-3 line-clamp-2 text-sm leading-relaxed text-foreground/80 sm:mb-4 sm:min-h-[2.75rem]" [ngClass]="profile.profileType === 'talent' ? 'max-sm:hidden' : ''">{{ profile.bio }}</p>

                  <div class="mb-3 flex flex-wrap gap-2 sm:mb-4 sm:min-h-[2rem] max-sm:[&>*:nth-child(n+4)]:hidden">
                    @for (skill of profile.skills; track skill) {
                      <span class="rounded-lg bg-secondary px-3 py-1 text-sm font-medium text-foreground">{{ skill }}</span>
                    }
                  </div>

                  <div class="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3 sm:pt-4">
                    <div class="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent/10 px-3 py-1.5 text-accent" [title]="canSeeReasons() ? (profile.matchReasons ?? []).join(' · ') : reasonsUpsell">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                      </svg>
                      <span class="text-sm font-semibold">{{ profile.match }}% compatible</span>
                    </div>
                    <a
                      [routerLink]="['/profil', profile.id]"
                      class="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      {{ cardActionLabel() }}
                    </a>
                  </div>
                </div>
              } @empty {
                <div class="rounded-2xl bg-white p-12 text-center shadow-lg text-muted-foreground md:col-span-2 xl:col-span-3">
                  Aucun résultat avec ces filtres pour le moment
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
  // Associés prêts à investir (ou à en discuter).
  readonly investorsOnly = signal(false);
  investmentBadge = investmentBadge;
  readonly keywords = signal('');
  readonly selectedSkills = signal<string[]>([]);
  readonly minScore = signal(0);
  readonly canUseAdvanced = computed(() => canUseAdvancedSearch(this.auth.plan()));

  readonly sectors = ['Tous', 'Tech', 'Santé', 'Commerce', 'Finance', 'Industrie', 'Éducation', 'Marketing'];
  readonly projectStages = ['Idée', 'MVP', 'En croissance', 'Établi'];
  readonly allProfiles = signal<MarketplaceProfile[]>([]);

  // Onglet affiché : associés (pour un projet) ou projets (pour les rejoindre). Par défaut selon les usages du membre.
  readonly visibleProfileType = signal<SearchProfileType>('talent');

  readonly filteredProfiles = computed<MarketplaceProfile[]>(() => {
    const targetType = this.visibleProfileType();
    const activeSector = this.selectedSector();
    const activeStages = this.selectedStage();
    const location = this.selectedLocation().trim().toLowerCase();
    const availableNowOnly = this.isAvailableNow();
    const equityOnly = this.openToEquityOnly() && targetType === 'entrepreneur';
    const investorsOnly = this.investorsOnly() && targetType === 'talent';
    const advanced = this.canUseAdvanced();
    const keywords = advanced ? this.normalize(this.keywords()).split(/\s+/).filter(Boolean) : [];
    const skills = advanced ? this.selectedSkills().map(skill => this.normalize(skill)) : [];
    const minScore = advanced ? this.minScore() : 0;

    return this.allProfiles().filter(profile => {
      const matchesRole = profile.profileType === targetType;
      const matchesSector = activeSector === 'Tous' || profile.sector === activeSector;
      const matchesStage = activeStages.length === 0 || activeStages.includes(profile.stage);
      const matchesLocation = location.length === 0 || profile.location.toLowerCase().includes(location);
      const matchesAvailability = !availableNowOnly || profile.availableNow;
      const matchesEquity = (!equityOnly || profile.openToEquity === true)
        && (!investorsOnly || profile.investmentReadiness === 'yes' || profile.investmentReadiness === 'discuss');
      const profileSkills = profile.skills.map(skill => this.normalize(skill));
      const haystack = this.normalize([profile.displayName, profile.title, profile.bio, profile.sector, ...profile.skills, ...profile.lookingFor].join(' '));
      const matchesKeywords = keywords.every(keyword => haystack.includes(keyword));
      const matchesSkills = skills.every(skill => profileSkills.includes(skill));
      const matchesScore = profile.match >= minScore;

      return matchesRole && matchesSector && matchesStage && matchesLocation && matchesAvailability && matchesEquity
        && matchesKeywords && matchesSkills && matchesScore;
    });
  });

  readonly highlightedProfiles = computed(() => this.filteredProfiles().slice(0, 3));
  // Compétences les plus fréquentes parmi les profils affichables, proposées en filtre (recherche avancée).
  readonly skillOptions = computed(() => {
    const counts = new Map<string, number>();

    for (const profile of this.allProfiles()) {
      if (profile.profileType !== this.visibleProfileType()) {
        continue;
      }

      for (const skill of profile.skills) {
        counts.set(skill, (counts.get(skill) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
      .slice(0, 12)
      .map(([skill]) => skill);
  });
  readonly skillsFilterLabel = computed(() =>
    this.visibleProfileType() === 'talent' ? 'Compétences (toutes requises)' : 'Compétences recherchées (toutes requises)'
  );
  readonly sortLabel = computed(() =>
    this.visibleProfileType() === 'entrepreneur' ? 'Projets mis en avant, puis par compatibilité' : 'Triés par compatibilité'
  );
  readonly audiencePanelDescription = computed(() =>
    this.visibleProfileType() === 'talent'
      ? 'Les associés sont visibles une fois votre projet publié.'
      : 'Les projets sont visibles une fois votre profil d’associé complété (compétences).'
  );
  readonly searchResultLabel = computed(() =>
    this.visibleProfileType() === 'talent' ? 'associés disponibles' : 'projets disponibles'
  );
  readonly highlightedBannerTitle = computed(() =>
    this.visibleProfileType() === 'talent'
      ? 'Les associés les plus alignés avec votre projet'
      : 'Les projets les plus alignés avec votre profil'
  );
  // Filtres en panneau sous 1280 px (même seuil que la colonne de filtres).
  private readonly wideQuery = window.matchMedia('(min-width: 1280px)');
  readonly wide = signal(this.wideQuery.matches);
  private readonly onWideChange = (event: MediaQueryListEvent) => {
    this.wide.set(event.matches);
    if (event.matches) {
      this.filtersOpen.set(false);
    }
  };
  readonly filtersOpen = signal(false);
  readonly activeFilterCount = computed(() =>
    [
      this.selectedSector() !== 'Tous',
      this.selectedStage().length > 0,
      this.selectedLocation().trim().length > 0,
      this.isAvailableNow(),
      this.investorsOnly(),
      this.openToEquityOnly(),
      this.canUseAdvanced() && (this.keywords().trim().length > 0 || this.selectedSkills().length > 0 || this.minScore() > 0),
    ].filter(Boolean).length
  );

  readonly hasActiveFilters = computed(() =>
    this.selectedSector() !== 'Tous'
    || this.selectedStage().length > 0
    || this.selectedLocation().trim().length > 0
    || this.isAvailableNow()
    || this.investorsOnly()
    || this.openToEquityOnly()
    || (this.canUseAdvanced() && (this.keywords().trim().length > 0 || this.selectedSkills().length > 0 || this.minScore() > 0))
  );
  readonly emptyBannerDescription = computed(() => {
    if (this.hasActiveFilters()) {
      return `Aucun ${this.searchResultLabel()} ne correspond à ces filtres. Tu peux les réinitialiser pour revoir toutes les opportunités disponibles.`;
    }

    return this.visibleProfileType() === 'talent'
      ? "Aucun associé visible pour l'instant. Présentez votre projet pour pouvoir leur écrire dès leur arrivée."
      : "Aucun projet publié pour l'instant. Complétez votre profil d'associé pour pouvoir écrire aux porteurs dès leur arrivée.";
  });
  readonly cardBadgeLabel = computed(() =>
    this.visibleProfileType() === 'talent' ? 'Associé' : 'Projet'
  );
  readonly cardActionLabel = computed(() =>
    this.visibleProfileType() === 'talent' ? 'Voir le profil' : 'Voir le projet'
  );

  showSide(side: SearchProfileType): void {
    this.visibleProfileType.set(side);
    this.selectedSkills.set([]);
  }

  onSectorChange(event: Event): void {
    const select = event.target as HTMLSelectElement | null;
    this.selectedSector.set(select?.value ?? 'Tous');
  }

  onLocationInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.selectedLocation.set(input?.value ?? '');
  }

  onKeywordsInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.keywords.set(input?.value ?? '');
  }

  onMinScoreInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.minScore.set(Number(input?.value ?? 0));
  }

  toggleSkill(skill: string): void {
    this.selectedSkills.update(skills =>
      skills.includes(skill) ? skills.filter(activeSkill => activeSkill !== skill) : [...skills, skill]
    );
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
    this.investorsOnly.set(false);
    this.keywords.set('');
    this.selectedSkills.set([]);
    this.minScore.set(0);
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
    this.wideQuery.addEventListener('change', this.onWideChange);
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
    this.wideQuery.removeEventListener('change', this.onWideChange);
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

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private async loadProfiles(): Promise<void> {
    await this.auth.ensureSessionReady();
    const user = this.auth.currentUser();
    this.visibleProfileType.set(hasUsage(user, 'projet') || !hasUsage(user, 'associe') ? 'talent' : 'entrepreneur');
    const profiles = await this.matchingService.getMarketplaceProfilesForSearch();
    this.allProfiles.set(profiles);
  }
}
