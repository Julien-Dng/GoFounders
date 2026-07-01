import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { MarketplaceProfile } from '../../core/data/mock-platform.data';
import { AuthService } from '../../core/services/auth.service';
import { MatchingService } from '../../core/services/matching.service';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [NgClass, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
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
                  <div class="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-accent shadow-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#2563EB" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
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
                    @if (!isOwnProfile()) {
                      <div>
                        <div class="inline-flex items-center gap-2 text-accent">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                          </svg>
                          <span class="compatibility-score-shine font-bold">{{ compatibilityScore() }}% compatible</span>
                          <span class="text-sm">avec votre profil</span>
                        </div>
                        <div class="mt-1 text-xs font-medium text-muted-foreground">Basé sur vos critères de recherche</div>
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
  private readonly auth = inject(AuthService);
  private readonly matchingService = inject(MatchingService);

  readonly activeTab = signal('presentation');
  readonly isBookmarked = signal(false);
  readonly loadedPublicProfile = signal<MarketplaceProfile | undefined>(undefined);

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
    this.isOwnProfile() ? (this.currentUser()?.photoURL ?? '') : ''
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
        return 'Talent / Expert';
      }

      if (profileType === 'buyer') {
        return 'Acheteur / Repreneur';
      }

      if (profileType === 'seller') {
        return 'Vendeur M&A';
      }

      return 'Porteur de projet';
    }

    return this.publicProfile()?.title ?? 'Profil public';
  });
  readonly compatibilityScore = computed(() => this.publicProfile()?.match ?? 87);
  readonly presentationText = computed(() =>
    this.isOwnProfile()
      ? (this.currentUser()?.bio || "Votre profil personnel sera enrichi ici à partir de vos vraies informations, de votre parcours et de ce que vous recherchez sur la plateforme.")
      : (this.publicProfile()?.about ?? "Ce profil n'est pas encore détaillé.")
  );
  readonly projectText = computed(() =>
    this.isOwnProfile()
      ? "Cette section présentera votre projet, votre contexte actuel et ce que vous cherchez à construire avec GoFounders."
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
      ? (this.currentUser()?.lookingFor?.length ? this.currentUser()?.lookingFor ?? [] : ['Co-fondateur technique', 'Talent produit', 'Profil growth'])
      : (this.publicProfile()?.lookingFor ?? ['Échange qualifié'])
  );
  readonly skills = computed(() =>
    this.isOwnProfile()
      ? (this.currentUser()?.skills?.length ? this.currentUser()?.skills ?? [] : ['Vision produit', 'Business', 'Pitch', 'Exécution'])
      : (this.publicProfile()?.skills ?? [])
  );
  readonly quickInfo = computed(() =>
    this.isOwnProfile()
      ? [
          { label: 'Type de profil', value: this.profileRole() },
          { label: 'Plan', value: this.currentUser()?.plan ?? 'FREE' },
          { label: 'Complétion', value: `${this.currentUser()?.profileComplete ?? 65}%` },
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
  readonly trustSignals = computed(() =>
    this.isOwnProfile()
      ? ['Profil connecté', 'Actif récemment', `Plan ${this.currentUser()?.plan ?? 'FREE'}`]
      : ['Profil vérifié', 'Actif récemment', 'Répond sous 24h']
  );
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
      return ['Profil modifiable', 'Données centralisées', 'Présentation claire'];
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
    void this.loadProfile();
  }

  toggleBookmark(): void {
    this.isBookmarked.update(value => !value);
  }

  private async loadProfile(): Promise<void> {
    await this.auth.ensureSessionReady();
    const profileId = this.routeId();

    if (!profileId || this.isOwnProfile()) {
      return;
    }

    const profile = await this.matchingService.getMarketplaceProfileById(profileId);
    this.loadedPublicProfile.set(profile);
  }
}
