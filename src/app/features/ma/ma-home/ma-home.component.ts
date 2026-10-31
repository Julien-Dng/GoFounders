import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MaListingData } from '../../../core/data/mock-platform.data';
import { EARLY_ACCESS_HOURS, OFFER_PRICES } from '../../../core/config/offers';
import { canAccessMaDetails, canPublishMaListing, hasBuyerPlus } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { MaService } from '../../../core/services/ma.service';
import { SuccessStoriesComponent } from '../../../shared/components/success-stories/success-stories.component';


@Component({
  selector: 'app-ma-home',
  standalone: true,
  imports: [RouterLink, SuccessStoriesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white">
      <section class="px-4 pb-8 pt-24 sm:px-6 lg:px-8 lg:pt-32">
        <div class="mx-auto flex max-w-[78rem] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-[2.25rem] leading-tight text-primary sm:text-5xl">Entreprises à reprendre</h1>
            <p class="mt-4 max-w-[62ch] text-base leading-relaxed text-muted-foreground sm:text-base">
              Des entreprises rentables, surtout numériques, entre 50 k€ et 1 M€ de chiffre d'affaires. Les annonces sont anonymisées :
              le nom de l'entreprise n'est communiqué qu'aux repreneurs que le cédant accepte.
            </p>
          </div>
          @if (canDepositListing()) {
            <a routerLink="/ma/deposer" class="flex-shrink-0 font-medium text-primary underline decoration-border decoration-2 underline-offset-4 hover:decoration-primary">
              Déposer une annonce gratuitement
            </a>
          }
        </div>
      </section>

      @if (!canViewSensitiveDetails() || accessRequiredNotice()) {
        <section class="px-4 sm:px-6 lg:px-8">
          <div class="mx-auto max-w-[78rem] rounded-lg border border-border bg-secondary p-5 sm:flex sm:items-center sm:justify-between sm:gap-8">
            <div class="text-base leading-relaxed text-foreground/85">
              @if (accessRequiredNotice()) {
                <p class="font-semibold text-primary">Le dossier complet demande un accès repreneur.</p>
              }
              <p>
                Le motif de cession, le détail de l'activité et le contact du vendeur sont réservés aux repreneurs avec l'accès à {{ accessPrice }}.
              </p>
              @if (showEarlyAccessHint()) {
                <p class="mt-1 text-muted-foreground">Avec l'accès Plus, les nouvelles annonces vous sont ouvertes {{ earlyAccessHours }} h avant les autres.</p>
              }
            </div>
            @if (showAccessCta()) {
              <button type="button" (click)="continueToMaAccess()" class="mt-4 w-full flex-shrink-0 rounded bg-primary px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90 sm:mt-0 sm:w-auto">
                {{ accessCtaLabel() }}
              </button>
            }
          </div>
        </section>
      }

      <section id="ma-listings" class="scroll-mt-20 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-[78rem]">
          <div class="mb-6">
            <label for="ma-search" class="sr-only">Rechercher une entreprise</label>
            <input
              id="ma-search"
              type="search"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
              placeholder="Rechercher : SaaS, e-commerce, agence, Lyon…"
              class="w-full rounded-lg border border-input bg-white px-4 py-3.5 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
          </div>
          <div class="flex items-center justify-between gap-4 border-b border-border pb-4">
            <p class="text-base text-foreground/85" aria-live="polite">
              <span class="tabular font-semibold text-primary">{{ filteredListings().length }}</span>
              {{ filteredListings().length > 1 ? 'annonces' : 'annonce' }}
              @if (activeFilterCount() > 0) {
                <button type="button" (click)="resetFilters()" class="ml-3 text-sm font-medium text-accent underline-offset-4 hover:underline">Effacer les filtres</button>
              }
            </p>
            <button
              type="button"
              (click)="filtersOpen.set(!filtersOpen())"
              [attr.aria-expanded]="filtersOpen()"
              aria-controls="ma-filters"
              class="rounded border border-input px-4 py-2 text-sm font-medium text-primary lg:hidden"
            >Filtrer{{ activeFilterCount() > 0 ? ' (' + activeFilterCount() + ')' : '' }}</button>
          </div>

          <div id="ma-filters" class="grid gap-4 border-b border-border py-5 sm:grid-cols-2 lg:grid lg:grid-cols-5" [class.hidden]="!filtersOpen()">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-foreground/85" for="filter-sector">Secteur</label>
              <select id="filter-sector" [value]="selectedSector()" (change)="selectedSector.set($any($event.target).value)" class="w-full rounded border border-input bg-white px-3 py-2.5 text-base outline-none focus:border-primary">
                <option value="">Tous les secteurs</option>
                @for (sector of sectors(); track sector) {
                  <option [value]="sector">{{ sector }}</option>
                }
              </select>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-foreground/85" for="filter-type">Type de cession</label>
              <select id="filter-type" [value]="selectedType()" (change)="selectedType.set($any($event.target).value)" class="w-full rounded border border-input bg-white px-3 py-2.5 text-base outline-none focus:border-primary">
                <option value="">Tous les types</option>
                @for (type of types(); track type) {
                  <option [value]="type">{{ type }}</option>
                }
              </select>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-foreground/85" for="filter-revenue">Chiffre d'affaires</label>
              <select id="filter-revenue" [value]="selectedRevenue()" (change)="selectedRevenue.set($any($event.target).value)" class="w-full rounded border border-input bg-white px-3 py-2.5 text-base outline-none focus:border-primary">
                @for (range of revenueRanges; track range.value) {
                  <option [value]="range.value">{{ range.label }}</option>
                }
              </select>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-foreground/85" for="filter-price">Prix demandé</label>
              <select id="filter-price" [value]="selectedPrice()" (change)="selectedPrice.set($any($event.target).value)" class="w-full rounded border border-input bg-white px-3 py-2.5 text-base outline-none focus:border-primary">
                @for (range of priceRanges; track range.value) {
                  <option [value]="range.value">{{ range.label }}</option>
                }
              </select>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-foreground/85" for="filter-region">Région</label>
              <input id="filter-region" type="search" [value]="region()" (input)="region.set($any($event.target).value)" placeholder="Toute la France" class="w-full rounded border border-input bg-white px-3 py-2.5 text-base outline-none focus:border-primary">
            </div>
          </div>

          @if (filteredListings().length === 0) {
            <div class="py-16 text-center">
              <p class="text-base text-muted-foreground">Aucune annonce ne correspond à ces critères.</p>
              @if (activeFilterCount() > 0) {
                <button type="button" (click)="resetFilters()" class="mt-3 font-medium text-accent underline-offset-4 hover:underline">Effacer les filtres</button>
              }
            </div>
          } @else {
            <div class="mt-6 grid gap-6 lg:grid-cols-2">
              @for (listing of filteredListings(); track listing.id) {
                <article class="flex flex-col rounded-lg border border-border bg-white p-6" [class.border-amber-500]="listing.featured" [attr.aria-labelledby]="'listing-' + listing.id">
                  <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                    <span>{{ listing.type }}</span>
                    @if (listing.featured) {
                      <span class="rounded-full border border-amber-500/40 px-2 py-0.5 text-sm font-medium text-amber-700">En vedette</span>
                    }
                    @if (listing.verified) {
                      <span class="rounded-full border border-emerald-700/30 px-2 py-0.5 text-sm font-medium text-emerald-800">Dossier vérifié</span>
                    }
                    @if (listing.isNew) {
                      <span class="rounded-full border border-accent/30 px-2 py-0.5 text-sm font-medium text-accent">Nouvelle, accès anticipé</span>
                    }
                  </div>
                  <h2 [id]="'listing-' + listing.id" class="mt-2 text-2xl leading-snug text-primary sm:text-[1.75rem]">{{ listing.sector }}, {{ listing.region }}</h2>
                  <p class="mt-3 text-lg leading-relaxed text-foreground/80">{{ listing.summary }}</p>

                  <dl class="tabular mt-5 grid grid-cols-3 border-y border-border">
                    <div class="py-3.5 pr-3">
                      <dt class="text-sm text-muted-foreground"><span class="sm:hidden">CA</span><span class="hidden sm:inline">Chiffre d'affaires</span></dt>
                      <dd class="mt-1 text-lg font-semibold text-primary sm:text-xl">{{ listing.revenue }}</dd>
                    </div>
                    <div class="border-l border-border px-3 py-3.5">
                      <dt class="text-sm text-muted-foreground">Marge nette</dt>
                      <dd class="mt-1 text-lg font-semibold text-primary sm:text-xl">{{ listing.margin }}</dd>
                    </div>
                    <div class="border-l border-border py-3.5 pl-3">
                      <dt class="text-sm text-muted-foreground">Ancienneté</dt>
                      <dd class="mt-1 text-lg font-semibold text-primary sm:text-xl">{{ listing.age }}</dd>
                    </div>
                  </dl>

                  @if (canViewSensitiveDetails()) {
                    <p class="mt-4 text-sm text-foreground/80"><span class="text-muted-foreground">Motif de cession :</span> {{ listing.reason }}</p>
                  }

                  <div class="mt-auto flex flex-col gap-4 pt-5 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p class="text-sm text-muted-foreground">Prix demandé</p>
                      <p class="font-display tabular mt-0.5 text-3xl font-semibold text-amber-600">{{ listing.priceMin }} à {{ listing.priceMax }}</p>
                      <p class="mt-0.5 text-sm text-muted-foreground">Estimation indicative, non contractuelle.</p>
                    </div>
                    @if (canViewSensitiveDetails()) {
                      <a [routerLink]="['/ma/annonce', listing.id]" class="rounded border border-primary px-4 py-2.5 text-center text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white">
                        Ouvrir le dossier
                      </a>
                    }
                  </div>
                </article>
              }
            </div>
          }
        </div>
      </section>

      <app-success-stories background="bg-secondary" />

      <section class="relative overflow-hidden bg-primary px-4 py-20 text-primary-foreground sm:px-6 lg:px-8 lg:py-24" aria-labelledby="ma-sell-title">
        <img src="/assets/images/provisoire/cedant-cafe.jpg" alt="" aria-hidden="true" width="1400" height="933" loading="lazy" class="absolute inset-0 h-full w-full object-cover">
        <div class="absolute inset-0" style="background: rgba(15, 27, 45, 0.86)" aria-hidden="true"></div>
        <div class="relative mx-auto flex max-w-[78rem] flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 id="ma-sell-title" class="text-3xl sm:text-4xl">Vous souhaitez vendre votre entreprise ?</h2>
            <p class="mt-3 max-w-[60ch] text-base leading-relaxed text-primary-foreground/75">
              Publication gratuite pendant le lancement. Votre annonce reste anonyme et les détails sont réservés aux repreneurs vérifiés.
            </p>
          </div>
          @if (canDepositListing()) {
            <div class="flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
              <a routerLink="/estimation" class="px-2 py-3 text-center font-medium text-white underline decoration-white/40 decoration-2 underline-offset-4 hover:decoration-white">Estimer sa valeur d'abord</a>
              <a routerLink="/ma/deposer" class="rounded bg-white px-6 py-3.5 text-center font-medium text-primary transition-colors hover:bg-white/90">Déposer mon annonce</a>
            </div>
          } @else {
            <p class="text-base text-primary-foreground/75">Le dépôt d'annonce est réservé aux comptes vendeur et professionnels.</p>
          }
        </div>
      </section>
    </div>
  `
})
export class MaHomeComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly maService = inject(MaService);

  readonly selectedSector = signal('');
  readonly selectedType = signal('');
  readonly selectedRevenue = signal('');
  readonly selectedPrice = signal('');
  readonly region = signal('');
  // Recherche libre (secteur, région, résumé), préremplie depuis l'accueil (?q=).
  readonly query = signal('');
  // Mobile : filtres repliés pour que les annonces soient visibles dès le premier écran.
  readonly filtersOpen = signal(false);
  readonly listings = signal<MaListingData[]>([]);
  readonly accessRequiredNotice = computed(() =>
    this.route.snapshot.queryParamMap.get('access') === 'required' && !this.auth.hasMaAccess()
  );

  readonly accessPrice = OFFER_PRICES.MA_ACCESS.label.replace(' / ', ' par ');
  readonly revenueRanges = [
    { value: '', label: 'Tous les montants' },
    { value: '0-100000', label: 'Moins de 100 k€' },
    { value: '100000-500000', label: '100 à 500 k€' },
    { value: '500000-1000000', label: '500 k€ à 1 M€' },
    { value: '1000000-', label: 'Plus de 1 M€' },
  ];
  readonly priceRanges = [
    { value: '', label: 'Tous les prix' },
    { value: '0-250000', label: 'Moins de 250 k€' },
    { value: '250000-500000', label: '250 à 500 k€' },
    { value: '500000-1000000', label: '500 k€ à 1 M€' },
    { value: '1000000-', label: 'Plus de 1 M€' },
  ];
  readonly sectors = computed(() => [...new Set(this.listings().map(listing => listing.sector))].sort((a, b) => a.localeCompare(b, 'fr')));
  readonly types = computed(() => [...new Set(this.listings().map(listing => listing.type))].sort((a, b) => a.localeCompare(b, 'fr')));
  readonly activeFilterCount = computed(() =>
    [this.selectedSector(), this.selectedType(), this.selectedRevenue(), this.selectedPrice(), this.region().trim(), this.query().trim()].filter(Boolean).length
  );

  private readonly profileType = computed(() => this.auth.currentUser()?.profileType);
  // Dossier complet : acheteur avec accès payé. Dépôt : vendeur (ou visiteur, invité à s'inscrire).
  readonly earlyAccessHours = EARLY_ACCESS_HOURS;
  // Visiteurs et acheteurs sans accès Plus : les annonces de moins de 48 h leur sont masquées par Supabase.
  readonly showEarlyAccessHint = computed(() => {
    const user = this.auth.currentUser();
    return !user || (user.profileType === 'buyer' && !hasBuyerPlus(user));
  });
  readonly canViewSensitiveDetails = computed(() => canAccessMaDetails(this.profileType()) && this.auth.hasMaAccess());
  readonly canDepositListing = computed(() => !this.auth.isAuthenticated() || canPublishMaListing(this.profileType()));
  readonly showAccessCta = computed(() =>
    !this.auth.isAuthenticated() || (canAccessMaDetails(this.profileType()) && !this.auth.hasMaAccess())
  );
  readonly accessCtaLabel = computed(() =>
    this.auth.isAuthenticated() ? "Prendre l'accès repreneur" : 'Se connecter pour accéder aux dossiers'
  );
  readonly filteredListings = computed(() => {
    const region = this.normalize(this.region());
    const words = this.normalize(this.query()).split(/\s+/).filter(Boolean);

    return this.listings().filter(listing =>
      (!this.selectedSector() || listing.sector === this.selectedSector())
      && (!this.selectedType() || listing.type === this.selectedType())
      && this.inRange(this.parseAmount(listing.revenue), this.selectedRevenue())
      && this.inRange(this.parseAmount(listing.priceMax) ?? this.parseAmount(listing.priceMin), this.selectedPrice())
      && (!region || this.normalize(listing.region).includes(region))
      && words.every(word => this.normalize(`${listing.sector} ${listing.region} ${listing.type} ${listing.summary}`).includes(word))
    );
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.query.set(params.get('q') ?? '');
    this.selectedRevenue.set(this.revenueRanges.some(range => range.value === params.get('ca')) ? params.get('ca') ?? '' : '');

    void this.loadListings();
  }

  async continueToMaAccess(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/connexion'], { queryParams: { returnUrl: '/tarifs#ma-access' } });
      return;
    }

    await this.router.navigate(['/tarifs'], { fragment: 'ma-access' });
  }

  resetFilters(): void {
    this.selectedSector.set('');
    this.selectedType.set('');
    this.selectedRevenue.set('');
    this.selectedPrice.set('');
    this.region.set('');
    this.query.set('');
  }

  // Montants affichés (« 280 k€/an », « 1,2 M€ ») ramenés en euros pour les filtres.
  private parseAmount(text: string): number | null {
    const match = text.replace(/\u202f|\u00a0/g, ' ').match(/([\d\s]+(?:[.,]\d+)?)\s*(k|M)€/);

    if (!match) {
      return null;
    }

    const value = Number(match[1].replace(/\s/g, '').replace(',', '.'));
    return value * (match[2] === 'M' ? 1_000_000 : 1_000);
  }

  private inRange(value: number | null, range: string): boolean {
    if (!range) {
      return true;
    }

    if (value === null) {
      return false;
    }

    const [min, max] = range.split('-');
    return value >= Number(min || 0) && (!max || value < Number(max));
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  private async loadListings(): Promise<void> {
    const listings = await this.maService.getListingCards();
    this.listings.set(listings);
  }
}
