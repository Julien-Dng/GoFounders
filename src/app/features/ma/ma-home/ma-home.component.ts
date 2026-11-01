import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MaListingData } from '../../../core/data/mock-platform.data';
import { EARLY_ACCESS_HOURS, OFFER_PRICES } from '../../../core/config/offers';
import { canAccessMaDetails, canPublishMaListing, hasBuyerPlus } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { MaService } from '../../../core/services/ma.service';
import { formatEuros, formatMultiple, listingMetrics, publishedLabel } from '../../../core/ma/listing-metrics';
import { lastGrowth, revenueSeries } from '../../../core/ma/listing-options';

type SortKey = 'pertinence' | 'recent' | 'prix-asc' | 'prix-desc' | 'ca-desc' | 'benefice-desc' | 'multiple-asc';
import { SuccessStoriesComponent } from '../../../shared/components/success-stories/success-stories.component';


@Component({
  selector: 'app-ma-home',
  standalone: true,
  imports: [RouterLink, SuccessStoriesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary">
      <section class="bg-primary px-4 pb-8 pt-24 text-white sm:px-6 sm:pb-12 sm:pt-28 lg:px-8 lg:pt-36">
        <div class="mx-auto flex max-w-[78rem] flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 class="text-[2.25rem] leading-tight text-white sm:text-5xl">Entreprises à reprendre</h1>
            <p class="mt-3 max-w-[62ch] text-lg leading-relaxed text-white/70 sm:mt-4">
              Des entreprises rentables, surtout numériques, entre 50 k€ et 1 M€ de chiffre d'affaires.<span class="hidden sm:inline"> Les annonces sont anonymisées :
              le nom de l'entreprise n'est communiqué qu'aux repreneurs que le cédant accepte.</span>
            </p>
          </div>
          @if (canDepositListing()) {
            <a routerLink="/ma/deposer" class="hidden flex-shrink-0 rounded-lg bg-accent px-6 py-3.5 font-semibold text-white transition-colors hover:bg-accent/90 sm:inline-block">
              Déposer une annonce gratuitement
            </a>
          }
        </div>
      </section>

      @if (!canViewSensitiveDetails() || accessRequiredNotice()) {
        <section class="px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8">
          <div class="mx-auto max-w-[78rem] rounded-2xl bg-white p-4 shadow-lg ring-1 ring-border sm:flex sm:p-5 sm:items-center sm:justify-between sm:gap-8">
            <div class="text-base leading-relaxed text-foreground/85">
              @if (accessRequiredNotice()) {
                <p class="font-semibold text-primary">Le dossier complet demande un accès repreneur.</p>
              }
              <p>
                Le motif de cession, le détail de l'activité et le contact du vendeur sont réservés aux repreneurs avec l'accès à {{ accessPrice }}.
              </p>
              @if (showEarlyAccessHint()) {
                <p class="mt-1 hidden text-muted-foreground sm:block">Avec l'accès Plus, les nouvelles annonces vous sont ouvertes {{ earlyAccessHours }} h avant les autres.</p>
              }
            </div>
            @if (showAccessCta()) {
              <button type="button" (click)="continueToMaAccess()" class="mt-3 w-full flex-shrink-0 rounded-lg bg-accent px-5 py-2.5 text-sm sm:mt-0 sm:py-3 font-semibold text-white transition-colors hover:bg-accent/90 sm:w-auto">
                {{ accessCtaLabel() }}
              </button>
            }
          </div>
        </section>
      }

      <section id="ma-listings" class="scroll-mt-20 px-4 pb-16 pt-5 sm:pt-8 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-[78rem]">
          <label for="ma-search" class="sr-only">Rechercher une entreprise</label>
          <div class="relative">
            <svg class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input
              id="ma-search"
              type="search"
              [value]="query()"
              (input)="query.set($any($event.target).value)"
              placeholder="SaaS, e-commerce, agence, Lyon…"
              class="w-full rounded-xl border border-input bg-white py-3.5 pl-12 pr-4 shadow-sm text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
          </div>

          @if (sectors().length > 1) {
            <div class="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Secteurs">
              <button type="button" (click)="selectedSector.set('')" [attr.aria-pressed]="!selectedSector()" class="flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors" [class]="!selectedSector() ? 'border-primary bg-primary text-white' : 'border-border bg-white text-foreground/85 hover:border-primary/40'">Tous</button>
              @for (sector of sectors(); track sector) {
                <button type="button" (click)="selectedSector.set(selectedSector() === sector ? '' : sector)" [attr.aria-pressed]="selectedSector() === sector" class="flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors" [class]="selectedSector() === sector ? 'border-primary bg-primary text-white' : 'border-border bg-white text-foreground/85 hover:border-primary/40'">{{ sector }}</button>
              }
            </div>
          }

          <div class="mt-5 grid gap-6 sm:mt-8 lg:grid-cols-[16.5rem,1fr] lg:gap-8">
            <aside id="ma-filters" aria-label="Filtres" class="lg:block" [class.hidden]="!filtersOpen()">
              <div class="space-y-5 rounded-2xl bg-white p-5 shadow-lg ring-1 ring-border lg:sticky lg:top-24">
                <div class="flex items-center justify-between">
                  <p class="font-semibold text-primary">Filtres</p>
                  @if (activeFilterCount() > 0) {
                    <button type="button" (click)="resetFilters()" class="text-sm font-medium text-accent underline-offset-4 hover:underline">Tout effacer</button>
                  }
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
                      <option [value]="range.value" [selected]="range.value === selectedRevenue()">{{ range.label }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-foreground/85" for="filter-price">Prix demandé</label>
                  <select id="filter-price" [value]="selectedPrice()" (change)="selectedPrice.set($any($event.target).value)" class="w-full rounded border border-input bg-white px-3 py-2.5 text-base outline-none focus:border-primary">
                    @for (range of priceRanges; track range.value) {
                      <option [value]="range.value" [selected]="range.value === selectedPrice()">{{ range.label }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-foreground/85" for="filter-margin">Marge nette</label>
                  <select id="filter-margin" [value]="minMargin()" (change)="minMargin.set($any($event.target).value)" class="w-full rounded border border-input bg-white px-3 py-2.5 text-base outline-none focus:border-primary">
                    @for (option of marginOptions; track option.value) {
                      <option [value]="option.value">{{ option.label }}</option>
                    }
                  </select>
                </div>
                <div>
                  <label class="mb-1.5 block text-sm font-medium text-foreground/85" for="filter-region">Région</label>
                  <input id="filter-region" type="search" [value]="region()" (input)="region.set($any($event.target).value)" placeholder="Toute la France" class="w-full rounded border border-input bg-white px-3 py-2.5 text-base outline-none focus:border-primary">
                </div>
                <label class="flex cursor-pointer items-center gap-3 border-t border-border pt-5 text-base text-foreground/85">
                  <input type="checkbox" [checked]="verifiedOnly()" (change)="verifiedOnly.set($any($event.target).checked)" class="h-4 w-4 rounded border-input accent-[#1D4ED8]">
                  Dossiers vérifiés uniquement
                </label>
              </div>
            </aside>

            <div class="min-w-0">
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <p class="text-base text-foreground/85" aria-live="polite">
                  <span class="tabular font-semibold text-primary">{{ filteredListings().length }}</span>
                  {{ filteredListings().length > 1 ? 'entreprises à reprendre' : 'entreprise à reprendre' }}
                </p>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    (click)="filtersOpen.set(!filtersOpen())"
                    [attr.aria-expanded]="filtersOpen()"
                    aria-controls="ma-filters"
                    class="rounded border border-input px-4 py-2 text-sm font-medium text-primary lg:hidden"
                  >Filtrer{{ activeFilterCount() > 0 ? ' (' + activeFilterCount() + ')' : '' }}</button>
                  <label for="ma-sort" class="sr-only">Trier</label>
                  <select id="ma-sort" [value]="sort()" (change)="sort.set($any($event.target).value)" class="rounded border border-input bg-white px-3 py-2 text-sm font-medium text-primary outline-none focus:border-primary">
                    @for (option of sortOptions; track option.value) {
                      <option [value]="option.value">{{ option.label }}</option>
                    }
                  </select>
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
                <ul class="mt-5 space-y-4">
                  @for (item of filteredListings(); track item.listing.id) {
                    <li>
                      <article class="group relative grid rounded-2xl bg-white shadow-lg ring-1 transition-shadow hover:shadow-xl md:grid-cols-[1fr,15rem]" [class]="item.listing.featured ? 'ring-amber-500/60' : 'ring-border'" [attr.aria-labelledby]="'listing-' + item.listing.id">
                        <div class="p-5 sm:p-6">
                          <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                            <span>{{ item.listing.type }}</span>
                            @if (item.published) {
                              <span aria-hidden="true">·</span>
                              <span>{{ item.published }}</span>
                            }
                            @if (item.listing.featured) {
                              <span class="rounded-full border border-amber-500/40 px-2 py-0.5 font-medium text-amber-700">En vedette</span>
                            }
                            @if (item.listing.verified) {
                              <span class="rounded-full border border-emerald-700/30 px-2 py-0.5 font-medium text-emerald-800">Dossier vérifié</span>
                            }
                            @if (item.listing.isNew) {
                              <span class="rounded-full border border-accent/30 px-2 py-0.5 font-medium text-accent">Nouvelle</span>
                            }
                          </div>
                          <h2 [id]="'listing-' + item.listing.id" class="mt-2 text-xl font-bold leading-snug text-primary group-hover:text-accent sm:text-2xl">
                            <a [routerLink]="['/ma/annonce', item.listing.id]" class="after:absolute after:inset-0 after:rounded-2xl focus:outline-none focus-visible:underline">{{ item.listing.sector }}, {{ item.listing.region }}</a>
                          </h2>
                          <p class="mt-2 line-clamp-2 text-base leading-relaxed text-foreground/80">{{ item.listing.summary }}</p>

                          <dl class="tabular mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                            <div>
                              <dt class="text-sm text-muted-foreground">Chiffre d'affaires</dt>
                              <dd class="mt-0.5 text-lg font-semibold text-primary">
                                {{ euros(item.metrics.revenue) }}
                                @if (item.growth !== null) {
                                  <span class="ml-1 text-sm font-bold" [class]="item.growth >= 0 ? 'text-emerald-700' : 'text-destructive'">{{ item.growth >= 0 ? '+' : '' }}{{ item.growth }} %</span>
                                }
                              </dd>
                            </div>
                            <div>
                              <dt class="text-sm text-muted-foreground">Bénéfice net</dt>
                              <dd class="mt-0.5 text-lg font-semibold text-primary">{{ euros(item.metrics.netProfit) }}</dd>
                            </div>
                            <div>
                              <dt class="text-sm text-muted-foreground">Marge nette</dt>
                              <dd class="mt-0.5 text-lg font-semibold text-primary">{{ item.listing.margin }}</dd>
                            </div>
                            <div>
                              <dt class="text-sm text-muted-foreground">Ancienneté</dt>
                              <dd class="mt-0.5 text-lg font-semibold text-primary">{{ item.listing.age }}</dd>
                            </div>
                          </dl>
                        </div>

                        <div class="flex flex-col justify-between gap-4 p-5 pt-0 sm:p-6 md:pl-0">
                          <div class="flex flex-1 flex-col justify-between gap-4 rounded-xl bg-secondary p-4">
                          <div>
                            <p class="text-sm text-muted-foreground">Prix demandé</p>
                            <p class="tabular mt-0.5 text-2xl font-semibold leading-tight text-amber-600"><span class="whitespace-nowrap">{{ item.listing.priceMin }}</span> à <span class="whitespace-nowrap">{{ item.listing.priceMax }}</span></p>
                            @if (item.metrics.multiple !== null) {
                              <p class="tabular mt-1 text-sm text-muted-foreground">Soit {{ multiple(item.metrics.multiple) }} le bénéfice annuel</p>
                            }
                          </div>
                          <span class="rounded-lg bg-primary px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors group-hover:bg-accent" aria-hidden="true">Voir l'annonce</span>
                          </div>
                        </div>
                      </article>
                    </li>
                  }
                </ul>
                <p class="mt-6 text-sm text-muted-foreground">
                  Chiffres déclarés par les cédants. Prix indicatifs, non contractuels ; le bénéfice et le multiple sont calculés à partir du chiffre d'affaires et de la marge annoncés.
                </p>
              }
            </div>
          </div>
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
  readonly minMargin = signal('');
  readonly verifiedOnly = signal(false);
  readonly sort = signal<SortKey>('pertinence');
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
  readonly marginOptions = [
    { value: '', label: 'Toutes les marges' },
    { value: '10', label: '10 % et plus' },
    { value: '20', label: '20 % et plus' },
    { value: '30', label: '30 % et plus' },
  ];
  readonly sortOptions: Array<{ value: SortKey; label: string }> = [
    { value: 'pertinence', label: 'Recommandées' },
    { value: 'recent', label: 'Plus récentes' },
    { value: 'prix-asc', label: 'Prix croissant' },
    { value: 'prix-desc', label: 'Prix décroissant' },
    { value: 'ca-desc', label: "Chiffre d'affaires" },
    { value: 'benefice-desc', label: 'Bénéfice net' },
    { value: 'multiple-asc', label: 'Multiple le plus bas' },
  ];
  readonly euros = formatEuros;
  readonly multiple = formatMultiple;
  readonly sectors = computed(() => [...new Set(this.listings().map(listing => listing.sector))].sort((a, b) => a.localeCompare(b, 'fr')));
  readonly types = computed(() => [...new Set(this.listings().map(listing => listing.type))].sort((a, b) => a.localeCompare(b, 'fr')));
  readonly activeFilterCount = computed(() =>
    [this.selectedSector(), this.selectedType(), this.selectedRevenue(), this.selectedPrice(), this.minMargin(), this.verifiedOnly(), this.region().trim(), this.query().trim()].filter(Boolean).length
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
    this.auth.isAuthenticated() ? "Prendre l'accès repreneur" : 'Créer un compte repreneur'
  );
  readonly filteredListings = computed(() => {
    const region = this.normalize(this.region());
    const words = this.normalize(this.query()).split(/\s+/).filter(Boolean);
    const minMargin = Number(this.minMargin() || 0);

    const items = this.listings()
      .map(listing => {
        const metrics = listingMetrics(listing);
        const growth = lastGrowth(revenueSeries(listing.revenueHistory, listing.revenueYear, metrics.revenue));
        return { listing, metrics, growth, published: publishedLabel(metrics.publishedAt) };
      })
      .filter(({ listing, metrics }) =>
        (!this.selectedSector() || listing.sector === this.selectedSector())
        && (!this.selectedType() || listing.type === this.selectedType())
        && this.inRange(metrics.revenue, this.selectedRevenue())
        && this.inRange(metrics.priceMax ?? metrics.priceMin, this.selectedPrice())
        && (!minMargin || (metrics.margin ?? -Infinity) >= minMargin)
        && (!this.verifiedOnly() || !!listing.verified)
        && (!region || this.normalize(listing.region).includes(region))
        && words.every(word => this.normalize(`${listing.sector} ${listing.region} ${listing.type} ${listing.summary}`).includes(word))
      );

    // Les valeurs inconnues vont en fin de liste quel que soit le sens du tri.
    const by = (value: (item: (typeof items)[number]) => number | null, direction: 1 | -1) =>
      (a: (typeof items)[number], b: (typeof items)[number]) => {
        const left = value(a);
        const right = value(b);
        if (left === null || right === null) {
          return left === right ? 0 : left === null ? 1 : -1;
        }
        return (left - right) * direction;
      };

    switch (this.sort()) {
      case 'recent':
        return [...items].sort(by(item => item.metrics.publishedAt?.getTime() ?? null, -1));
      case 'prix-asc':
        return [...items].sort(by(item => item.metrics.price, 1));
      case 'prix-desc':
        return [...items].sort(by(item => item.metrics.price, -1));
      case 'ca-desc':
        return [...items].sort(by(item => item.metrics.revenue, -1));
      case 'benefice-desc':
        return [...items].sort(by(item => item.metrics.netProfit, -1));
      case 'multiple-asc':
        return [...items].sort(by(item => item.metrics.multiple, 1));
      default:
        // Ordre du serveur : annonces en vedette, puis les plus récentes.
        return items;
    }
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.query.set(params.get('q') ?? '');
    this.selectedRevenue.set(this.revenueRanges.some(range => range.value === params.get('ca')) ? params.get('ca') ?? '' : '');

    void this.loadListings();
  }

  async continueToMaAccess(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/inscription'], { queryParams: { profil: 'buyer', returnUrl: '/tarifs#ma-access' } });
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
    this.minMargin.set('');
    this.verifiedOnly.set(false);
    this.query.set('');
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
