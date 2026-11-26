import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaListingData, MarketplaceProfile } from '../../core/data/mock-platform.data';
import { FEATURES } from '../../core/config/features';
import { hasUsage, isAssociateProfileComplete, isProjectPresented, usesTeamMarketplace } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { ListingAccessService } from '../../core/services/listing-access.service';
import { MaService } from '../../core/services/ma.service';
import { MatchingService } from '../../core/services/matching.service';
import { MessagingService } from '../../core/services/messaging.service';
import { NotificationService } from '../../core/services/notification.service';
import { EditableProject, ProjectService } from '../../core/services/project.service';
import { KIND_LABELS, buildFavoriteCards } from '../favoris/favoris.component';
import { AvatarComponent } from '../../shared/components/avatar/avatar.component';

interface NextStep {
  id: 'projet' | 'associe' | 'cession';
  eyebrow: string;
  title: string;
  text: string;
  cta: string;
  path: string;
  steps: Array<{ label: string; done: boolean }>;
}

interface Tile {
  value: string;
  label: string;
  path: string;
  icon: 'messages' | 'users' | 'heart' | 'file' | 'building';
}

// Tableau de bord : prochaine étape, chiffres utiles, derniers favoris, suggestions, activité et profil.
// Il suit les objectifs du membre (personnalisation seulement, aucun droit).
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, AvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-14 pt-20 sm:px-6 sm:pt-24 lg:px-8">
      <div class="mx-auto max-w-6xl space-y-5 sm:space-y-6">
        <div>
          <h1 class="text-2xl font-semibold text-primary sm:text-4xl">Bonjour, {{ firstName() }}</h1>
          <p class="mt-1 text-muted-foreground">{{ subtitle() }}</p>
        </div>

        @if (lastDismissed()) {
          <p class="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm text-muted-foreground ring-1 ring-border" role="status">
            Suggestion masquée
            <span aria-hidden="true">·</span>
            <button type="button" (click)="undoDismiss()" class="font-semibold text-accent hover:underline">Annuler</button>
          </p>
        }

        @if (nextStep(); as step) {
          <section class="rounded-2xl bg-accent/[0.06] p-4 ring-1 ring-accent/15 sm:p-7" aria-labelledby="next-step-title">
            <div class="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p class="text-sm font-bold uppercase tracking-wide text-accent">{{ step.eyebrow }}</p>
                <h2 id="next-step-title" class="mt-1 flex items-center justify-between gap-3 text-xl text-primary sm:text-2xl">{{ step.title }}
                  @if (step.steps.length) {
                    <span class="tabular flex-shrink-0 rounded-full bg-accent/10 px-2.5 py-0.5 text-sm font-bold text-accent sm:hidden">{{ stepsDone(step.steps) }}/{{ step.steps.length }}</span>
                  }
                </h2>
                <p class="mt-1.5 max-w-[60ch] text-sm leading-relaxed text-muted-foreground sm:mt-2 sm:text-base">{{ step.text }}</p>
                @if (step.steps.length) {
                  <!-- Téléphones : barre d'avancement au lieu de la frise. -->
                  <div class="mt-3 h-2 overflow-hidden rounded-full bg-white sm:hidden" role="progressbar" [attr.aria-valuenow]="stepsDone(step.steps)" aria-valuemin="0" [attr.aria-valuemax]="step.steps.length" aria-label="Avancement">
                    <div class="h-full rounded-full bg-accent" [style.width.%]="stepsDone(step.steps) / step.steps.length * 100"></div>
                  </div>
                }
                <div class="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 sm:mt-5">
                  <a [routerLink]="step.path" class="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 font-semibold text-white transition-colors hover:bg-accent/90">{{ step.cta }} <span aria-hidden="true">→</span></a>
                  <button type="button" (click)="dismissStep(step.id)" class="text-sm font-semibold text-muted-foreground underline-offset-4 hover:text-primary hover:underline">Ne plus me proposer cette étape</button>
                </div>
              </div>
              @if (step.steps.length) {
                <ol class="hidden items-start sm:flex" aria-label="Étapes">
                  @for (item of step.steps; track item.label; let i = $index; let last = $last) {
                    <li class="flex items-start">
                      <span class="flex w-24 flex-col items-center text-center sm:w-28">
                        <span class="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
                              [class]="item.done ? 'bg-accent text-white' : 'bg-white text-muted-foreground ring-1 ring-border'">
                          {{ item.done ? '✓' : i + 1 }}
                        </span>
                        <span class="mt-2 text-sm text-muted-foreground">{{ item.label }}<span class="sr-only">{{ item.done ? ' : fait' : ' : à faire' }}</span></span>
                      </span>
                      @if (!last) {
                        <span class="mt-[1.1rem] h-0.5 w-6 sm:w-10" [class]="item.done ? 'bg-accent' : 'bg-border'" aria-hidden="true"></span>
                      }
                    </li>
                  }
                </ol>
              }
            </div>
          </section>
        }

        <!-- Téléphones : deux chiffres côte à côte. -->
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 max-sm:[&>*:nth-child(3)]:hidden">
          @for (tile of tiles(); track tile.label) {
            <a [routerLink]="tile.path" class="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-md sm:items-center sm:gap-4 sm:p-5 ring-1 ring-border transition-shadow hover:shadow-lg">
              <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent sm:h-11 sm:w-11" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  @switch (tile.icon) {
                    @case ('messages') { <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/> }
                    @case ('users') { <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/> }
                    @case ('heart') { <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.8 1.3-1.7 2.9-2.8 4.9-2.8 3.5 0 5.6 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/> }
                    @case ('file') { <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/> }
                    @case ('building') { <rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M10 21v-3h4v3"/> }
                  }
                </svg>
              </span>
              <span class="min-w-0">
                <span class="tabular block text-2xl font-bold leading-tight text-primary">{{ tile.value }}</span>
                <span class="block text-sm leading-snug text-muted-foreground">{{ tile.label }}</span>
              </span>
            </a>
          }
        </div>

        <section aria-labelledby="favorites-title">
          <div class="flex items-end justify-between gap-4">
            <h2 id="favorites-title" class="text-2xl text-primary">Vos derniers favoris</h2>
            @if (favoriteCards().length) {
              <a routerLink="/favoris" class="text-sm font-semibold text-accent hover:underline">Voir tous mes favoris <span aria-hidden="true">→</span></a>
            }
          </div>
          @if (favoriteCards().length) {
            <ul class="mt-3 grid gap-3 sm:mt-4 sm:gap-4 md:grid-cols-3">
              @for (card of favoriteCards(); track card.kind + card.id) {
                <li class="group relative flex flex-col rounded-2xl bg-white p-4 shadow-md sm:p-5 ring-1 ring-border transition-shadow hover:shadow-lg">
                  <span class="self-start rounded-md bg-accent/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-accent">{{ kindLabel(card.kind) }}</span>
                  <h3 class="mt-2 text-base font-bold leading-snug text-primary group-hover:text-accent sm:mt-3 sm:text-lg">
                    <a [routerLink]="card.link" class="after:absolute after:inset-0 after:rounded-2xl focus:outline-none focus-visible:underline">{{ card.title }}</a>
                  </h3>
                  <p class="text-sm text-muted-foreground">{{ card.subtitle }}</p>
                  @if (card.figures.length) {
                    <p class="tabular mt-2 text-sm text-foreground/80">@for (figure of card.figures; track figure.label; let last = $last) { {{ figure.label }} {{ figure.value }}@if (!last) { · } }</p>
                  } @else if (card.detail) {
                    <p class="mt-2 text-sm text-foreground/80">{{ card.detail }}</p>
                  }
                  <span class="absolute right-4 top-4 text-accent sm:static sm:mt-auto sm:self-end sm:pt-3" aria-hidden="true">→</span>
                </li>
              }
            </ul>
          } @else {
            <p class="mt-3 rounded-2xl bg-white p-5 text-sm text-muted-foreground ring-1 ring-border">
              Touchez le cœur sur une entreprise, un projet ou un associé : vos trois derniers favoris s'afficheront ici
            </p>
          }
        </section>

        <section aria-labelledby="suggestions-title">
          <div class="flex items-end justify-between gap-4">
            <h2 id="suggestions-title" class="text-2xl text-primary">{{ suggestionsTitle() }}</h2>
            <a [routerLink]="suggestionsLink()" class="text-sm font-semibold text-accent hover:underline">Voir tout <span aria-hidden="true">→</span></a>
          </div>
          @if (suggestedProfiles().length) {
            <ul class="mt-4 grid gap-4 md:grid-cols-3">
              @for (profile of suggestedProfiles(); track profile.id) {
                <li class="group relative rounded-2xl bg-white p-5 shadow-md ring-1 ring-border transition-shadow hover:shadow-lg">
                  <div class="flex items-start gap-3">
                    <app-avatar class="h-11 w-11 flex-shrink-0" [photoUrl]="profile.photoURL" [initials]="profile.initials" [name]="profile.displayName" />
                    <div class="min-w-0 flex-1">
                      <h3 class="truncate font-bold text-primary group-hover:text-accent">
                        <a [routerLink]="['/profil', profile.id]" class="after:absolute after:inset-0 after:rounded-2xl focus:outline-none">{{ profile.profileType === 'talent' ? (profile.title || profile.displayName) : profile.displayName }}</a>
                      </h3>
                      <p class="truncate text-sm text-muted-foreground">{{ profile.location }}</p>
                      @if (profile.availabilityLabel) {
                        <p class="mt-0.5 truncate text-sm text-emerald-700">{{ profile.availabilityLabel }}</p>
                      }
                    </div>
                    <span class="tabular text-sm font-bold text-accent">{{ profile.match }} %</span>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-1.5">
                    @for (skill of profile.skills.slice(0, 2); track skill) {
                      <span class="rounded-md bg-secondary px-2 py-0.5 text-sm font-medium text-foreground">{{ skill }}</span>
                    }
                  </div>
                </li>
              }
            </ul>
          } @else if (suggestedListings().length) {
            <ul class="mt-4 grid gap-4 md:grid-cols-3">
              @for (listing of suggestedListings(); track listing.id) {
                <li class="group relative rounded-2xl bg-white p-5 shadow-md ring-1 ring-border transition-shadow hover:shadow-lg">
                  <p class="text-sm text-muted-foreground">{{ listing.sector }} · {{ listing.region }}</p>
                  <h3 class="mt-1 font-bold leading-snug text-primary group-hover:text-accent">
                    <a [routerLink]="['/ma/annonce', listing.id]" class="after:absolute after:inset-0 after:rounded-2xl focus:outline-none">{{ listing.title || listing.sector }}</a>
                  </h3>
                  <p class="tabular mt-2 text-sm text-foreground/80">CA {{ listing.revenue }} · <span class="font-semibold text-amber-600">{{ listing.priceMin }} à {{ listing.priceMax }}</span></p>
                </li>
              }
            </ul>
          } @else {
            <p class="mt-3 rounded-2xl bg-white p-5 text-sm text-muted-foreground ring-1 ring-border">Rien à vous proposer pour le moment. Complétez votre profil pour affiner les suggestions</p>
          }
        </section>

        <div class="grid gap-5 sm:gap-6 lg:grid-cols-[3fr_2fr]">
          <section class="rounded-2xl bg-white p-4 shadow-md ring-1 ring-border sm:p-6" aria-labelledby="activity-title">
            <h2 id="activity-title" class="text-xl text-primary">Activité récente</h2>
            <ul class="mt-4 space-y-3">
              @for (activity of activities(); track activity.id) {
                <li>
                  <a [routerLink]="activity.href" [queryParams]="activity.queryParams" (click)="markActivityAsRead(activity.id)" class="flex items-start gap-3 rounded-lg p-2 -m-2 hover:bg-secondary">
                    <span class="mt-2 h-2 w-2 flex-shrink-0 rounded-full" [class]="activity.unread ? 'bg-accent' : 'bg-border'" aria-hidden="true"></span>
                    <span class="flex-1">
                      <span class="block text-sm font-medium text-foreground">{{ activity.title }}</span>
                      <span class="block text-sm text-muted-foreground">{{ activity.time }}</span>
                    </span>
                  </a>
                </li>
              } @empty {
                <li class="py-4 text-center">
                  <p class="font-medium text-primary">Aucune activité pour le moment</p>
                  <p class="mt-1 text-sm text-muted-foreground">Vos messages, contacts et mises à jour apparaîtront ici</p>
                </li>
              }
            </ul>
          </section>

          <section class="rounded-2xl bg-white p-4 shadow-md ring-1 ring-border sm:p-6" aria-labelledby="profile-title">
            <h2 id="profile-title" class="text-xl text-primary">Votre profil · <span class="text-accent">{{ profileComplete() }} %</span></h2>
            <div class="mt-4 h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" [attr.aria-valuenow]="profileComplete()" aria-valuemin="0" aria-valuemax="100" aria-label="Complétion du profil">
              <div class="h-full rounded-full bg-accent" [style.width.%]="profileComplete()"></div>
            </div>
            <p class="mt-4 text-sm leading-relaxed text-muted-foreground">
              {{ profileComplete() >= 100 ? 'Votre profil est complet' : 'Ajoutez quelques informations (parcours, compétences, présentation) pour être davantage visible' }}
            </p>
            <a routerLink="/profil/modifier" class="mt-3 inline-block text-sm font-semibold text-accent hover:underline">Compléter mon profil <span aria-hidden="true">→</span></a>
          </section>
        </div>

        @if (showProUpsell()) {
          <a routerLink="/tarifs" fragment="associes" class="flex items-center justify-between gap-3 rounded-2xl bg-accent/[0.06] px-4 py-3 text-sm ring-1 ring-accent/15 transition-colors hover:bg-accent/10 sm:justify-start sm:px-5 sm:py-4 sm:text-base">
            <span class="font-semibold text-primary">Besoin de plus de contacts ?</span>
            <span class="whitespace-nowrap font-semibold text-accent">Découvrir PRO&nbsp;<span aria-hidden="true">→</span></span>
          </a>
        }
      </div>
    </div>
  `
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);
  private readonly messaging = inject(MessagingService);
  private readonly matchingService = inject(MatchingService);
  private readonly maService = inject(MaService);
  private readonly notifications = inject(NotificationService);
  private readonly favorites = inject(FavoritesService);
  private readonly projects = inject(ProjectService);
  private readonly listingAccess = inject(ListingAccessService);

  readonly currentUser = this.auth.currentUser;
  readonly firstName = computed(() => (this.currentUser()?.displayName ?? '').split(' ')[0] || 'et bienvenue');
  readonly profileComplete = computed(() => this.currentUser()?.profileComplete ?? 0);
  readonly activities = computed(() => this.notifications.notifications().slice(0, 3));
  private readonly usesTeam = computed(() => FEATURES.associates && usesTeamMarketplace(this.currentUser()));
  readonly showProUpsell = computed(() => this.usesTeam() && (this.currentUser()?.plan ?? 'FREE') === 'FREE');

  private readonly ownProject = signal<EditableProject | null>(null);
  private readonly listings = signal<MaListingData[]>([]);
  private readonly profiles = signal<MarketplaceProfile[]>([]);
  private readonly unlockedCount = signal<number | null>(null);
  private readonly myListingsCount = signal<number | null>(null);

  readonly subtitle = computed(() => {
    const user = this.currentUser();
    if (hasUsage(user, 'projet')) {
      return 'Votre projet avance ici';
    }
    if (hasUsage(user, 'cession') && !hasUsage(user, 'reprise')) {
      return 'Suivez votre cession et vos échanges';
    }
    return 'Retrouvez vos favoris, vos échanges et vos prochaines étapes';
  });

  // Prochaine étape selon les objectifs : projet à présenter, profil d'associé à compléter, annonce à déposer.
  // Étapes proposées selon les objectifs ; le membre peut en masquer (sans toucher à ses objectifs ni à ses accès).
  readonly nextStep = computed<NextStep | null>(() => {
    const dismissed = this.dismissedSteps();
    return this.candidateSteps().find(step => !dismissed.includes(step.id)) ?? null;
  });
  private readonly candidateSteps = computed<NextStep[]>(() => {
    const user = this.currentUser();
    const steps: NextStep[] = [];
    if (!user || user.profileType === 'pro') {
      return steps;
    }
    const project = this.ownProject();
    if (FEATURES.associates && hasUsage(user, 'projet') && !project?.isActive) {
      const presented = isProjectPresented(project);
      steps.push({
        id: 'projet',
        eyebrow: 'Votre prochaine étape',
        title: 'Présentez votre projet aux futurs associés',
        text: 'Décrivez votre idée, votre avancement et les compétences recherchées. Un brouillon présenté suffit déjà pour écrire aux associés',
        cta: presented ? 'Publier mon projet' : 'Compléter mon projet',
        path: '/mon-projet',
        steps: [
          { label: 'Présentation', done: !!project && project.description.trim().length >= 50 },
          { label: 'Compétences recherchées', done: !!project && project.skillsNeeded.length > 0 },
          { label: 'Publication', done: !!project?.isActive },
        ],
      });
    }
    if (FEATURES.associates && hasUsage(user, 'associe') && !user.associateOfferedAt) {
      const complete = isAssociateProfileComplete(user);
      steps.push({
        id: 'associe',
        eyebrow: 'Votre prochaine étape',
        title: 'Proposez vos compétences aux porteurs de projet',
        text: 'Un intitulé, vos compétences et une courte présentation suffisent pour écrire aux porteurs. Rendez ensuite votre profil visible si vous le souhaitez',
        cta: complete ? 'Rendre mon profil visible' : 'Compléter mon profil d’associé',
        path: '/profil/associe',
        steps: [
          { label: 'Intitulé', done: !!user.profileTitle?.trim() },
          { label: 'Compétences', done: (user.skills?.length ?? 0) > 0 },
          { label: 'Présentation', done: (user.bio?.trim().length ?? 0) >= 50 },
        ],
      });
    }
    if (hasUsage(user, 'cession') && this.myListingsCount() === 0) {
      steps.push({
        id: 'cession',
        eyebrow: 'Votre prochaine étape',
        title: 'Déposez votre annonce, gratuitement',
        text: 'Activité, chiffres, prix et coordonnées réservées aux repreneurs. Votre annonce reste anonyme et est relue avant publication',
        cta: 'Déposer une annonce',
        path: '/ma/deposer',
        steps: [],
      });
    }
    return steps;
  });

  // Suggestions masquées, gardées dans ce navigateur pour ce membre.
  readonly dismissedSteps = signal<string[]>([]);
  readonly lastDismissed = signal<string | null>(null);

  dismissStep(id: string): void {
    this.saveDismissed([...this.dismissedSteps(), id]);
    this.lastDismissed.set(id);
  }

  undoDismiss(): void {
    const id = this.lastDismissed();
    if (id) {
      this.saveDismissed(this.dismissedSteps().filter(item => item !== id));
      this.lastDismissed.set(null);
    }
  }

  private dismissedKey(): string {
    return `gofounders.dismissed-steps.${this.currentUser()?.uid ?? 'anonyme'}`;
  }

  private saveDismissed(ids: string[]): void {
    this.dismissedSteps.set(ids);
    try {
      localStorage.setItem(this.dismissedKey(), JSON.stringify(ids));
    } catch {
      // Stockage indisponible : la suggestion reste masquée jusqu'au rechargement.
    }
  }

  stepsDone(steps: ReadonlyArray<{ done: boolean }>): number {
    return steps.filter(item => item.done).length;
  }

  readonly tiles = computed<Tile[]>(() => {
    const user = this.currentUser();
    const quota = this.messaging.quota();
    const tiles: Tile[] = [{ value: String(this.messaging.unreadCount()), label: 'messages non lus', path: '/messages', icon: 'messages' }];
    if (quota?.contactsLimit !== null && quota?.contactsLimit !== undefined && hasUsage(user, 'projet')) {
      tiles.push({ value: String(Math.max(0, quota.contactsLimit - quota.contactsUsed)), label: 'contacts disponibles ce mois-ci', path: '/recherche', icon: 'users' });
    } else {
      tiles.push({ value: String(this.favorites.count()), label: 'favoris enregistrés', path: '/favoris', icon: 'heart' });
    }
    if (FEATURES.associates && hasUsage(user, 'projet')) {
      const project = this.ownProject();
      tiles.push({ value: project ? (project.isActive ? 'Publié' : 'Brouillon') : 'À créer', label: 'mon projet', path: '/mon-projet', icon: 'file' });
    } else if (hasUsage(user, 'cession')) {
      tiles.push({ value: this.myListingsCount() === null ? '…' : String(this.myListingsCount()), label: 'annonces publiées', path: '/ma/mes-annonces', icon: 'building' });
    } else {
      tiles.push({ value: this.unlockedCount() === null ? '…' : String(this.unlockedCount()), label: 'dossiers débloqués', path: '/ma/dossiers', icon: 'building' });
    }
    return tiles;
  });

  readonly favoriteCards = computed(() => buildFavoriteCards(this.favorites.all(), this.listings(), this.profiles()).slice(0, 3));

  // Suggestions : associés pour qui a un projet, projets pour qui veut en rejoindre un, sinon des entreprises.
  private readonly suggestionSide = computed<'talent' | 'entrepreneur' | null>(() => {
    const user = this.currentUser();
    if (!this.usesTeam()) {
      return null;
    }
    return hasUsage(user, 'projet') || !hasUsage(user, 'associe') ? 'talent' : 'entrepreneur';
  });
  readonly suggestionsTitle = computed(() =>
    this.suggestionSide() === 'talent' ? 'Des associés à découvrir' : this.suggestionSide() === 'entrepreneur' ? 'Des projets qui recrutent' : 'Des entreprises à reprendre');
  readonly suggestionsLink = computed(() => (this.suggestionSide() ? '/recherche' : '/ma'));
  readonly suggestedProfiles = computed(() => {
    const side = this.suggestionSide();
    return side ? this.profiles().filter(profile => profile.profileType === side).sort((a, b) => b.match - a.match).slice(0, 3) : [];
  });
  readonly suggestedListings = computed(() => (this.suggestionSide() ? [] : this.listings().slice(0, 3)));

  constructor() {
    void this.load();
  }

  kindLabel(kind: keyof typeof KIND_LABELS): string {
    return KIND_LABELS[kind];
  }

  markActivityAsRead(notificationId: string): void {
    this.notifications.markAsRead(notificationId);
  }

  private async load(): Promise<void> {
    await this.auth.ensureSessionReady();
    const user = this.currentUser();
    if (!user) {
      return;
    }
    void this.messaging.refreshQuota();
    try {
      this.dismissedSteps.set(JSON.parse(localStorage.getItem(this.dismissedKey()) ?? '[]') as string[]);
    } catch {
      this.dismissedSteps.set([]);
    }
    const [listings, profiles, project] = await Promise.all([
      this.maService.getListingCards(),
      // Profils et projets : suggestions, et cartes des favoris de projets et d'associés.
      FEATURES.associates ? this.matchingService.getMarketplaceProfilesForSearch() : Promise.resolve<MarketplaceProfile[]>([]),
      hasUsage(user, 'projet') ? this.projects.getOwnedProject(user.uid) : Promise.resolve(null),
      this.favorites.ensureLoaded(),
    ]);
    this.listings.set(listings);
    this.profiles.set(profiles);
    this.ownProject.set(project);
    if (hasUsage(user, 'cession')) {
      this.myListingsCount.set((await this.maService.getMyListings()).length);
    }
    this.unlockedCount.set((await this.listingAccess.listMyUnlocked()).length);
  }
}
