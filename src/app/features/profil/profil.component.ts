import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { MarketplaceProfile } from '../../core/data/mock-platform.data';
import { MATCH_REASONS_UPSELL, PROFILE_TYPE_LABELS, canSeeMatchReasons } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { MatchingService } from '../../core/services/matching.service';
import { StatsService } from '../../core/services/stats.service';
import { EditableProject, ProjectService } from '../../core/services/project.service';
import { ProjectAccessRequest, ProjectAccessService } from '../../core/services/project-access.service';
import { NDA_VERSION, downloadTextFile, ndaArticles, ndaProofDocument } from '../../core/legal/nda';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [NgClass, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isUnavailable()) {
      <div class="flex min-h-screen items-center justify-center bg-secondary px-4 pt-20">
        <div class="max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-sm" role="alert">
          <h1 class="mb-3 text-2xl font-bold text-primary">Ce profil n'est pas accessible</h1>
          <p class="mb-6 text-sm leading-relaxed text-muted-foreground">
            Il n'existe pas, ou il ne correspond pas à votre type de compte : les porteurs de projet voient les associés,
            les associés voient les projets.
          </p>
          <a routerLink="/dashboard" class="inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-white hover:bg-accent/90">Retour au tableau de bord</a>
        </div>
      </div>
    } @else {
      <div class="min-h-screen bg-secondary pt-20">
        <div class="relative h-64 overflow-hidden bg-gradient-to-br from-accent via-primary to-accent">
          <div class="absolute inset-0 opacity-20">
            <svg class="h-full w-full" viewBox="0 0 1000 400">
              <circle cx="200" cy="100" r="150" fill="white" opacity="0.1" />
              <circle cx="800" cy="300" r="200" fill="white" opacity="0.15" />
              <circle cx="500" cy="200" r="100" fill="white" opacity="0.1" />
            </svg>
          </div>
        </div>

        <div class="relative z-10 mx-auto -mt-12 max-w-[1400px] px-4 pb-12 sm:-mt-16 sm:px-6 lg:-mt-20 lg:px-8">
          <div class="grid grid-cols-1 gap-8 xl:grid-cols-12">
            <div class="xl:col-span-8">
              <div class="mb-6 rounded-2xl border-2 border-border bg-white p-6 shadow-xl sm:p-8">
                <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
                  <div class="relative lg:-mt-1">
                    <div class="h-28 w-28 overflow-hidden rounded-2xl bg-gradient-to-br from-accent to-primary text-3xl font-bold text-white shadow-lg sm:h-32 sm:w-32 sm:text-4xl">
                      @if (profilePhotoUrl()) {
                        <img [src]="profilePhotoUrl()" [alt]="'Photo de profil de ' + profileName()" class="h-full w-full object-cover">
                      } @else {
                        <div class="flex h-full w-full items-center justify-center">
                          {{ profileInitials() }}
                        </div>
                      }
                    </div>
                    @if (isVerified()) {
                      <div class="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent shadow-lg" title="Profil vérifié par GoFounders">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#2563EB" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Profil vérifié">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                          <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                      </div>
                    }
                  </div>

                  <div class="flex-1 pt-2">
                    <div class="mb-3">
                      <div class="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center">
                        <h1 class="text-3xl font-bold">{{ profileName() }}</h1>
                        <span class="inline-flex rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white">{{ profileRole() }}</span>
                      </div>
                      <div class="mb-3 flex items-center gap-2 text-muted-foreground">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>{{ profileLocation() }}</span>
                      </div>
                      <div class="mb-3 flex flex-wrap gap-2">
                        @for (signal of trustSignals(); track signal) {
                          <span class="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground">
                            {{ signal }}
                          </span>
                        }
                      </div>
                      @if (!isOwnProfile() && compatibilityScore() !== null) {
                        <div>
                          <div class="inline-flex items-center gap-2 text-accent">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                            </svg>
                            <span class="compatibility-score-shine font-bold">{{ compatibilityScore() }}% compatible</span>
                            <span class="text-sm">avec votre profil</span>
                          </div>
                          @if (canSeeReasons()) {
                            <div class="mt-1 text-xs font-medium text-muted-foreground">{{ compatibilityReasons() }}</div>
                          } @else {
                            <a routerLink="/tarifs" class="mt-1 inline-block text-xs font-semibold text-accent hover:underline">{{ reasonsUpsell }}</a>
                          }
                        </div>
                      }
                    </div>

                    <div class="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      @if (isOwnProfile()) {
                        <a routerLink="/profil/modifier" class="inline-flex items-center justify-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-5 py-2.5 text-sm font-bold text-accent shadow-sm transition-all hover:-translate-y-0.5 hover:bg-accent hover:text-white hover:shadow-lg hover:shadow-accent/20 active:translate-y-0">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                          Modifier mon profil
                        </a>
                      } @else {
                        <a routerLink="/messages" [queryParams]="{ conversation: profileId() }" class="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 font-semibold text-white shadow-lg shadow-accent/25 transition-all hover:scale-105 hover:bg-accent/90 active:scale-95">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                          Envoyer un message
                        </a>
                        <button
                          type="button"
                          (click)="toggleBookmark()"
                          class="inline-flex items-center justify-center gap-2 rounded-lg border-2 px-6 py-3 font-semibold transition-all hover:scale-105 active:scale-95"
                          [ngClass]="isBookmarked() ? 'border-accent bg-accent/10 text-accent' : 'border-border text-foreground'"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" [attr.fill]="isBookmarked() ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                          </svg>
                          {{ isBookmarked() ? 'Sauvegardé' : 'Sauvegarder' }}
                        </button>
                      }
                    </div>
                  </div>

                  @if (!isOwnProfile()) {
                    <div class="rounded-2xl border border-accent/15 bg-accent/5 p-4 lg:w-60">
                      <div class="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-accent">Pourquoi ça matche</div>
                      <div class="space-y-2">
                        @for (reason of matchReasons(); track reason) {
                          <div class="flex items-start gap-2 text-sm font-semibold text-primary">
                            <span class="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent"></span>
                            <span>{{ reason }}</span>
                          </div>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="mb-6 rounded-2xl border-2 border-border bg-white shadow-lg">
                <div class="border-b border-border px-2">
                  <div class="flex flex-wrap gap-1">
                    @for (tab of tabs; track tab.id) {
                      <button
                        type="button"
                        (click)="activeTab.set(tab.id)"
                        class="relative px-5 py-4 font-semibold transition-all sm:px-6"
                        [class.text-accent]="activeTab() === tab.id"
                        [class.text-muted-foreground]="activeTab() !== tab.id"
                        [class.hover:text-foreground]="activeTab() !== tab.id"
                      >
                        {{ tab.label }}
                        @if (activeTab() === tab.id) {
                          <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"></div>
                        }
                      </button>
                    }
                  </div>
                </div>

                <div class="p-6 sm:p-8">
                  @if (activeTab() === 'presentation') {
                    <div class="space-y-8">
                      <div>
                        <h3 class="mb-4 text-xl font-bold">À propos</h3>
                        <p class="leading-relaxed text-foreground/80">{{ presentationText() }}</p>
                      </div>

                      <div class="rounded-2xl border border-border bg-secondary/40 p-5">
                        <div class="mb-3 text-sm font-bold uppercase tracking-[0.14em] text-accent">Ce que {{ isOwnProfile() ? 'mon profil' : 'ce profil' }} apporte</div>
                        <div class="grid gap-3 sm:grid-cols-3">
                          @for (point of contributionPoints(); track point) {
                            <div class="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-primary shadow-sm">
                              {{ point }}
                            </div>
                          }
                        </div>
                      </div>

                      <div>
                        <h3 class="mb-4 text-xl font-bold">Ce que {{ isOwnProfile() ? 'je' : 'ce profil' }} recherche</h3>
                        <div class="flex flex-wrap gap-3">
                          @for (item of searchingFor(); track item) {
                            <span class="rounded-lg border border-accent/20 bg-accent/10 px-4 py-2 font-semibold text-accent">{{ item }}</span>
                          }
                        </div>
                      </div>

                      <div>
                        <h3 class="mb-4 text-xl font-bold">Compétences</h3>
                        <div class="flex flex-wrap gap-2">
                          @for (skill of skills(); track skill) {
                            <span class="cursor-default rounded-lg bg-secondary px-4 py-2 font-medium text-foreground transition-colors hover:bg-accent/10 hover:text-accent">{{ skill }}</span>
                          } @empty {
                            <p class="text-sm text-muted-foreground">
                              @if (isOwnProfile()) {
                                Aucune compétence renseignée. <a routerLink="/profil/modifier" class="font-semibold text-accent hover:underline">Ajoutez-les</a> pour améliorer vos scores de compatibilité.
                              } @else {
                                Aucune compétence renseignée pour le moment.
                              }
                            </p>
                          }
                        </div>
                      </div>

                      <div>
                        <h3 class="mb-4 text-xl font-bold">Disponibilité</h3>
                        <div class="inline-flex items-center gap-2 rounded-lg bg-green-100 px-4 py-2 font-semibold text-green-700">
                          <div class="h-2 w-2 rounded-full bg-green-500"></div>
                          {{ availabilityText() }}
                        </div>
                      </div>
                    </div>
                  }

                  @if (activeTab() === 'projet') {
                    <div class="space-y-6">
                      <div>
                        <h3 class="mb-4 text-xl font-bold">Projet</h3>
                        <p class="leading-relaxed text-foreground/80">{{ projectText() }}</p>
                      </div>
                      <div class="grid gap-4 sm:grid-cols-2">
                        @for (info of quickInfo(); track info.label) {
                          <div class="rounded-xl border border-border bg-secondary/50 p-4">
                            <div class="mb-1 text-xs font-semibold uppercase text-muted-foreground">{{ info.label }}</div>
                            <div class="font-semibold text-foreground">{{ info.value }}</div>
                          </div>
                        }
                      </div>
                    </div>
                  }

                  @if (activeTab() === 'experience') {
                    <div class="space-y-6">
                      <div>
                        <h3 class="mb-4 text-xl font-bold">Expérience</h3>
                        <p class="leading-relaxed text-foreground/80">{{ experienceText() }}</p>
                      </div>
                      <div class="rounded-2xl border border-border bg-secondary/60 p-5">
                        <h4 class="mb-2 font-bold text-primary">Points forts</h4>
                        <ul class="space-y-2 text-sm text-foreground/80">
                          @for (item of strengths(); track item) {
                            <li class="flex items-start gap-2">
                              <span class="mt-1 h-2 w-2 rounded-full bg-accent"></span>
                              <span>{{ item }}</span>
                            </li>
                          }
                        </ul>
                      </div>
                    </div>
                  }

                  @if (activeTab() === 'avis') {
                    <div class="rounded-2xl border border-border bg-secondary/50 p-8 text-center text-muted-foreground">
                      Les recommandations et retours d'expérience seront ajoutés ici dans une prochaine itération.
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="space-y-6 xl:col-span-4">
              <div class="rounded-2xl border-2 border-border bg-white p-6 shadow-lg">
                <h3 class="mb-4 text-lg font-bold">Informations clés</h3>
                <div class="space-y-4">
                  @for (info of quickInfo(); track info.label) {
                    <div class="border-b border-border pb-4 last:border-0 last:pb-0">
                      <div class="mb-1 text-xs font-semibold uppercase text-muted-foreground">{{ info.label }}</div>
                      <div class="font-semibold text-foreground">{{ info.value }}</div>
                    </div>
                  }
                </div>
              </div>

              @if (openToEquity()) {
                <div class="rounded-2xl border-2 border-accent/20 bg-accent/[0.04] p-6 shadow-lg">
                  <h3 class="mb-2 text-lg font-bold">Ouvert à un associé avec apport</h3>
                  <p class="text-sm leading-relaxed text-foreground/80">
                    Le porteur de ce projet accepte d'accueillir un associé qui entrerait au capital en apportant aussi de l'argent.
                  </p>
                  <p class="mt-3 text-xs leading-relaxed text-muted-foreground">
                    GoFounders ne propose pas d'investissement. Les conditions d'entrée au capital se négocient directement entre les parties,
                    avec l'aide d'un professionnel (avocat, expert-comptable).
                  </p>
                </div>
              }

              @if (socialLinks().length > 0) {
                <div class="rounded-2xl border-2 border-border bg-white p-6 shadow-lg">
                  <h3 class="mb-4 text-lg font-bold">Liens professionnels</h3>
                  <div class="space-y-3">
                    @for (link of socialLinks(); track link.label) {
                      <a
                        [href]="link.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="flex items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
                      >
                        <span>{{ link.label }}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M7 17 17 7"/>
                          <path d="M7 7h10v10"/>
                        </svg>
                      </a>
                    }
                  </div>
                </div>
              }

              @if (isProjectProfile()) {
                <div class="rounded-2xl border-2 border-primary/15 bg-white p-6 shadow-lg" aria-live="polite">
                  <div class="mb-3 flex flex-wrap items-center gap-2">
                    <svg class="text-primary" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <h3 class="text-lg font-bold">Partie confidentielle</h3>
                    @if (publicProfile()?.ndaRequired) {
                      <span class="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">NDA requis</span>
                    }
                  </div>

                  @switch (accessState()) {
                    @case ('approved') {
                      @if (confidentialDetails()) {
                        <p class="whitespace-pre-line text-sm leading-relaxed text-foreground/85">{{ confidentialDetails() }}</p>
                      } @else {
                        <p class="text-sm text-muted-foreground">Le porteur n'a pas encore rempli cette partie.</p>
                      }
                      @if (myRequest()?.ndaAcceptedAt) {
                        <button type="button" (click)="downloadMyNda()" class="mt-4 text-sm font-semibold text-accent hover:underline">
                          Télécharger mon engagement de confidentialité
                        </button>
                      }
                    }
                    @case ('pending') {
                      <p class="text-sm leading-relaxed text-foreground/80">
                        Demande envoyée le {{ formatDate(myRequest()!.createdAt) }}. Le porteur de projet vous répondra depuis son espace.
                      </p>
                    }
                    @default {
                      @if (!publicProfile()?.hasConfidential) {
                        <p class="text-sm text-muted-foreground">Le porteur n'a pas encore ajouté de partie confidentielle à ce projet.</p>
                      } @else {
                        <p class="mb-4 text-sm leading-relaxed text-foreground/80">
                          @if (accessState() === 'refused') {
                            Le porteur n'a pas donné suite à votre précédente demande. Vous pouvez la renouveler.
                          } @else if (publicProfile()?.ndaRequired) {
                            Le porteur partage les détails sensibles de son projet aux associés qui acceptent un engagement de confidentialité, puis valide chaque demande.
                          } @else {
                            Le porteur partage les détails sensibles de son projet après avoir validé votre demande.
                          }
                        </p>
                        <button type="button" (click)="startAccessRequest()" [disabled]="isRequestingAccess()" class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 font-semibold text-white shadow-md transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70">
                          Demander l'accès
                        </button>
                      }
                    }
                  }

                  @if (accessMessage()) {
                    <p class="mt-3 text-sm text-destructive" role="alert">{{ accessMessage() }}</p>
                  }
                </div>
              }

              @if (!isOwnProfile() && !isProjectProfile()) {
                <div class="relative overflow-hidden rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-lg dark:border-amber-300/25 dark:from-amber-500/15 dark:to-orange-500/10">
                  <div class="relative z-10">
                    <div class="mb-4 flex items-center gap-3">
                      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                      </div>
                      <h3 class="text-lg font-bold dark:text-amber-50">Détails confidentiels</h3>
                    </div>
                    <p class="mb-4 text-sm leading-relaxed text-foreground/80 dark:text-amber-100/85">
                      Accédez aux informations complètes en passant par un échange sécurisé et, si besoin, un cadre de confidentialité.
                    </p>
                    <a routerLink="/messages" [queryParams]="{ conversation: profileId() }" class="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 font-semibold text-white shadow-md transition-colors hover:bg-amber-600">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      Ouvrir un échange
                    </a>
                    <p class="mt-3 text-center text-xs text-muted-foreground dark:text-amber-100/70">Mise en relation avec des experts juridiques partenaires</p>
                  </div>
                  <div class="absolute -right-16 -top-16 h-32 w-32 rounded-full bg-amber-500/10 dark:bg-amber-300/10"></div>
                </div>
              }

              @if (!isOwnProfile()) {
                <div class="text-center">
                  <button type="button" class="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-destructive">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                      <line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                    Signaler ce profil
                  </button>
                </div>
              }
            </div>
          </div>
        </div>
      </div>
    }

    <dialog
      #ndaDialog
      class="m-auto w-[calc(100%_-_2rem)] max-w-2xl rounded-2xl border-0 bg-white p-0 shadow-2xl backdrop:bg-black/40"
      aria-labelledby="nda-title"
      (close)="ndaModalOpen.set(false)"
      (click)="onNdaDialogClick($event)"
    >
      @if (ndaModalOpen()) {
        <div class="flex max-h-[85vh] flex-col">
          <div class="border-b border-border px-6 py-5">
            <h2 id="nda-title" class="text-xl font-bold text-primary">Engagement de confidentialité</h2>
            <p class="mt-1 text-sm text-muted-foreground">
              Le porteur de « {{ publicProfile()?.displayName }} » demande cet engagement avant de partager les détails de son projet.
            </p>
          </div>
          <div class="flex-1 space-y-4 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-foreground/85">
            @for (article of ndaText(); track article.title) {
              <section>
                <h3 class="mb-1 font-semibold text-foreground">{{ article.title }}</h3>
                @for (paragraph of article.paragraphs; track $index) {
                  <p class="mb-2">{{ paragraph }}</p>
                }
              </section>
            }
          </div>
          <div class="border-t border-border px-6 py-5">
            <label class="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" [checked]="ndaChecked()" (change)="ndaChecked.set(!ndaChecked())" class="mt-0.5 h-4 w-4 flex-shrink-0 accent-accent">
              <span>J'ai lu et j'accepte cet engagement de confidentialité (version {{ ndaVersion }}).</span>
            </label>
            <p class="mt-2 text-xs text-muted-foreground">
              Votre acceptation est enregistrée comme preuve (nom, date, version du texte, adresse IP). GoFounders n'est pas partie à cet engagement et n'assure pas de conseil juridique.
            </p>
            <div class="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" (click)="closeNdaModal()" class="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold transition-colors hover:border-accent">
                Annuler
              </button>
              <button type="button" (click)="submitAccessRequest(true)" [disabled]="!ndaChecked() || isRequestingAccess()" class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
                Accepter et envoyer ma demande
              </button>
            </div>
          </div>
        </div>
      }
    </dialog>
  `
  ,
  styles: [`
    .compatibility-score-shine {
      position: relative;
      display: inline-block;
      overflow: hidden;
      isolation: isolate;
    }

    .compatibility-score-shine::after {
      content: '';
      position: absolute;
      inset: -20% auto -20% -45%;
      width: 42%;
      transform: skewX(-20deg);
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.95), transparent);
      animation: compatibility-shine 2.8s ease-in-out infinite;
      mix-blend-mode: overlay;
    }

    @keyframes compatibility-shine {
      0%, 42% {
        left: -45%;
      }

      78%, 100% {
        left: 115%;
      }
    }
  `]
})
export class ProfilComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly stats = inject(StatsService);
  private readonly auth = inject(AuthService);
  private readonly matchingService = inject(MatchingService);
  private readonly projectService = inject(ProjectService);
  private readonly projectAccess = inject(ProjectAccessService);

  // Partie confidentielle d'un projet (voir 2026-10-19-projets-confidentiels-nda.sql).
  readonly ndaVersion = NDA_VERSION;
  readonly myRequest = signal<ProjectAccessRequest | null>(null);
  readonly confidentialDetails = signal<string | null>(null);
  readonly ndaModalOpen = signal(false);
  // <dialog> natif (showModal) : affiché au-dessus de toute la page, Échap et focus gérés par le navigateur.
  @ViewChild('ndaDialog') private readonly ndaDialog?: ElementRef<HTMLDialogElement>;
  readonly ndaChecked = signal(false);
  readonly isRequestingAccess = signal(false);
  readonly accessMessage = signal('');

  readonly activeTab = signal('presentation');
  readonly isBookmarked = signal(false);
  readonly loadedPublicProfile = signal<MarketplaceProfile | undefined>(undefined);
  // Profil absent ou masqué par Supabase (rôle non complémentaire, voir 2026-10-12-profils-par-role.sql).
  readonly isUnavailable = signal(false);
  readonly ownProject = signal<EditableProject | null>(null);

  private readonly routeId = toSignal(
    this.route.params.pipe(map((params: Record<string, string>) => params['id'] ?? '')),
    { initialValue: '' }
  );

  readonly profileId = computed(() => this.routeId());
  readonly currentUser = this.auth.currentUser;
  readonly isOwnProfile = computed(() => {
    const uid = this.currentUser()?.uid ?? '';
    return uid !== '' && uid === this.routeId();
  });

  readonly publicProfile = computed(() => this.loadedPublicProfile());
  readonly profileName = computed(() => {
    if (this.isOwnProfile()) {
      return this.currentUser()?.displayName?.trim() || 'Mon profil';
    }

    return this.publicProfile()?.displayName?.trim() || 'Profil introuvable';
  });
  readonly profileInitials = computed(() =>
    this.isOwnProfile() ? this.auth.initials() : (this.publicProfile()?.initials ?? 'GF')
  );
  readonly profilePhotoUrl = computed(() =>
    this.isOwnProfile() ? (this.currentUser()?.photoURL ?? '') : (this.publicProfile()?.photoURL ?? '')
  );
  readonly profileLocation = computed(() =>
    this.isOwnProfile() ? (this.currentUser()?.location ?? 'Paris, France') : (this.publicProfile()?.location ?? 'France')
  );
  readonly profileRole = computed(() => {
    if (this.isOwnProfile()) {
      const profileTitle = this.currentUser()?.profileTitle?.trim();

      if (profileTitle) {
        return profileTitle;
      }

      const profileType = this.currentUser()?.profileType;

      if (profileType === 'talent') {
        return 'Associé';
      }

      if (profileType === 'buyer') {
        return 'Acheteur / Repreneur';
      }

      if (profileType === 'seller') {
        return 'Vendeur M&A';
      }

      if (profileType === 'pro') {
        return 'Professionnel';
      }

      return 'Porteur de projet';
    }

    return this.publicProfile()?.title ?? 'Profil public';
  });
  // Score calculé par core/matching/compatibility.ts ; absent entre deux profils non complémentaires.
  readonly compatibilityScore = computed(() => {
    const profile = this.publicProfile();
    return profile?.matchReasons ? profile.match : null;
  });
  readonly canSeeReasons = computed(() => canSeeMatchReasons(this.auth.plan()));
  readonly reasonsUpsell = MATCH_REASONS_UPSELL;
  readonly compatibilityReasons = computed(() => {
    const reasons = this.publicProfile()?.matchReasons ?? [];
    return reasons.length > 0 ? reasons.join(' · ') : 'Peu de critères en commun pour le moment';
  });
  readonly presentationText = computed(() =>
    this.isOwnProfile()
      ? (this.currentUser()?.bio || 'Vous n’avez pas encore de bio. Ajoutez quelques lignes depuis « Modifier mon profil » : c’est ce que les autres membres lisent en premier.')
      : (this.publicProfile()?.about ?? "Ce profil n'est pas encore détaillé.")
  );
  readonly projectText = computed(() =>
    this.isOwnProfile()
      ? (this.ownProject()?.description || "Ajoutez une présentation à votre annonce depuis la modification du profil.")
      : (this.publicProfile()?.projectSummary ?? 'Aucun détail de projet disponible pour le moment.')
  );
  readonly experienceText = computed(() =>
    this.isOwnProfile()
      ? "Votre expérience, vos réalisations et les éléments qui renforcent votre crédibilité apparaîtront ici."
      : (this.publicProfile()?.experienceSummary ?? 'Aucune expérience détaillée pour le moment.')
  );
  readonly availabilityText = computed(() =>
    this.isOwnProfile() ? (this.currentUser()?.availabilityLabel ?? 'Disponible pour échanger rapidement') : (this.publicProfile()?.availabilityLabel ?? 'Disponibilité à confirmer')
  );
  readonly searchingFor = computed(() =>
    this.isOwnProfile()
      ? (this.ownProject()?.lookingFor?.length
          ? this.ownProject()?.lookingFor ?? []
          : (this.currentUser()?.lookingFor?.length ? this.currentUser()?.lookingFor ?? [] : ['Recherche à préciser']))
      : (this.publicProfile()?.lookingFor ?? ['Échange qualifié'])
  );
  readonly skills = computed(() =>
    this.isOwnProfile()
      ? (this.currentUser()?.skills ?? [])
      : (this.publicProfile()?.skills ?? [])
  );
  readonly isProjectProfile = computed(() => !this.isOwnProfile() && this.publicProfile()?.profileType === 'entrepreneur');
  readonly accessState = computed(() => this.myRequest()?.status ?? 'none');
  private readonly ndaParties = computed(() => ({
    ownerName: this.publicProfile()?.ownerName ?? 'le porteur de projet',
    associateName: this.currentUser()?.displayName ?? 'l’associé',
    projectName: this.publicProfile()?.displayName ?? 'le projet',
  }));
  readonly ndaText = computed(() => ndaArticles(this.ndaParties()));
  readonly openToEquity = computed(() => !this.isOwnProfile() && this.publicProfile()?.openToEquity === true);
  readonly quickInfo = computed(() =>
    this.isOwnProfile()
      ? [
          { label: 'Type de profil', value: PROFILE_TYPE_LABELS[this.currentUser()?.profileType ?? 'entrepreneur'] },
          { label: 'Plan', value: this.currentUser()?.plan ?? 'FREE' },
          { label: 'Complétion', value: `${this.currentUser()?.profileComplete ?? 0}%` },
          { label: 'Localisation', value: this.currentUser()?.location ?? 'France' },
        ]
      : (this.publicProfile()?.quickInfo ?? [])
  );
  readonly strengths = computed(() =>
    this.isOwnProfile()
      ? [
          'Profil connecté à votre session actuelle',
          'Accès direct à la modification de votre profil',
          'Base prête pour brancher vos vraies données',
        ]
      : [
          `${this.publicProfile()?.sector ?? 'Secteur non renseigné'} comme secteur principal`,
          `${this.publicProfile()?.stage ?? 'Stade à préciser'} comme niveau de maturité`,
          `${this.publicProfile()?.skills.slice(0, 2).join(' et ') || 'Compétences à préciser'} comme premiers points forts`,
        ]
  );
  // Badge réel : profil vérifié par un admin (pour un projet, celui de son porteur).
  readonly isVerified = computed(() =>
    this.isOwnProfile() ? Boolean(this.currentUser()?.profileVerifiedAt) : this.publicProfile()?.verified === true
  );
  readonly trustSignals = computed(() => {
    const verified = this.isVerified() ? ['Profil vérifié'] : [];

    return this.isOwnProfile()
      ? [...verified, 'Profil connecté', `Plan ${this.currentUser()?.plan ?? 'FREE'}`]
      : [...verified, 'Actif récemment'];
  });
  readonly matchReasons = computed(() => {
    const profile = this.publicProfile();
    const firstNeed = profile?.lookingFor?.[0];

    return [
      profile?.sector ? `Secteur ${profile.sector}` : 'Secteur cohérent',
      firstNeed ? `Recherche ${firstNeed}` : 'Besoin aligné',
      profile?.availableNow ? 'Disponible rapidement' : 'Échange qualifié',
    ];
  });
  readonly contributionPoints = computed(() => {
    if (this.isOwnProfile()) {
      const user = this.currentUser();
      return [
        PROFILE_TYPE_LABELS[user?.profileType ?? 'entrepreneur'],
        user?.skills?.[0] ? `Expertise ${user.skills[0]}` : 'Compétences à renseigner',
        user?.availabilityLabel || user?.location || 'Disponibilité à préciser',
      ];
    }

    const profile = this.publicProfile();
    const firstSkill = profile?.skills?.[0];

    return [
      profile?.sector ? `${profile.sector} cadré` : 'Contexte cadré',
      firstSkill ? `Expertise ${firstSkill}` : 'Expertise identifiable',
      profile?.stage ? `Stade ${profile.stage}` : 'Objectif lisible',
    ];
  });
  readonly socialLinks = computed(() => {
    if (!this.isOwnProfile()) {
      return [];
    }

    const user = this.currentUser();

    return [
      { label: 'GitHub', url: user?.githubUrl },
      { label: 'LinkedIn', url: user?.linkedinUrl },
      { label: 'Site / portfolio', url: user?.websiteUrl },
    ].filter((link): link is { label: string; url: string } => Boolean(link.url));
  });

  readonly tabs = [
    { id: 'presentation', label: 'Présentation' },
    { id: 'projet', label: 'Projet' },
    { id: 'experience', label: 'Expérience' },
    { id: 'avis', label: 'Avis' },
  ];

  ngOnInit(): void {
    // Rechargé à chaque changement d'id : le composant est réutilisé d'un profil à l'autre.
    this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.loadedPublicProfile.set(undefined);
      void this.loadProfile();
    });
  }

  toggleBookmark(): void {
    this.isBookmarked.update(value => !value);
  }

  private async loadProfile(): Promise<void> {
    await this.auth.ensureSessionReady();
    const profileId = this.routeId();

    if (!profileId) {
      return;
    }

    if (this.isOwnProfile()) {
      this.ownProject.set(await this.projectService.getOwnedProject(profileId));
      return;
    }

    const profile = await this.matchingService.getMarketplaceProfileById(profileId);
    this.loadedPublicProfile.set(profile);
    this.isUnavailable.set(!profile);

    if (profile?.profileType === 'pro') {
      void this.stats.recordProEvent(profile.id, 'profile');
    }

    if (profile?.profileType === 'entrepreneur') {
      await this.loadAccess(profile.id);
    }
  }

  private async loadAccess(projectId: string): Promise<void> {
    const request = await this.projectAccess.getMyRequest(projectId);
    this.myRequest.set(request);
    this.confidentialDetails.set(request?.status === 'approved' ? await this.projectAccess.getConfidentialDetails(projectId) : null);
  }

  startAccessRequest(): void {
    this.accessMessage.set('');

    if (this.publicProfile()?.ndaRequired) {
      this.ndaChecked.set(false);
      this.ndaModalOpen.set(true);
      this.ndaDialog?.nativeElement.showModal();
      return;
    }

    void this.submitAccessRequest(false);
  }

  closeNdaModal(): void {
    this.ndaDialog?.nativeElement.close();
    this.ndaModalOpen.set(false);
  }

  // Clic sur le fond (hors du contenu) : ferme la fenêtre.
  onNdaDialogClick(event: MouseEvent): void {
    if (event.target === this.ndaDialog?.nativeElement) {
      this.closeNdaModal();
    }
  }

  async submitAccessRequest(acceptNda: boolean): Promise<void> {
    const project = this.publicProfile();

    if (!project || this.isRequestingAccess()) {
      return;
    }

    this.isRequestingAccess.set(true);

    try {
      const result = await this.projectAccess.requestAccess(project.id, acceptNda, project.ndaRequired === true, {
        projectName: project.displayName,
        ownerName: project.ownerName ?? 'Porteur de projet',
      });

      if (!result.success) {
        this.accessMessage.set(result.message ?? "La demande n'a pas pu être envoyée.");
        return;
      }

      this.closeNdaModal();
      await this.loadAccess(project.id);
    } finally {
      this.isRequestingAccess.set(false);
    }
  }

  downloadMyNda(): void {
    const request = this.myRequest();

    if (!request?.ndaAcceptedAt || !request.ndaVersion) {
      return;
    }

    const content = ndaProofDocument(
      { ownerName: request.ownerName, associateName: request.requesterName, projectName: request.projectName },
      { version: request.ndaVersion, acceptedAt: request.ndaAcceptedAt, ip: request.ndaIp, userAgent: request.ndaUserAgent }
    );
    downloadTextFile('engagement-de-confidentialite.txt', content);
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
