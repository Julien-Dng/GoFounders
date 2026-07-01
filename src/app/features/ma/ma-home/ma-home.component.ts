import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MaListingData } from '../../../core/data/mock-platform.data';
import { AuthService } from '../../../core/services/auth.service';
import { MaService } from '../../../core/services/ma.service';

type MaStatIcon = 'mask' | 'handshake' | 'certified';

@Component({
  selector: 'app-ma-home',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary">
      <section class="bg-primary px-4 pb-16 pt-32 text-primary-foreground sm:px-6 lg:px-8">
        <div class="mx-auto max-w-[1400px]">
          <div class="relative text-center lg:min-h-[28rem] lg:pr-[28rem] lg:text-left">
            <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-amber-500 shadow-2xl lg:mx-0">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>

            <h1 class="mb-4 text-4xl font-bold sm:text-5xl">Marketplace M&A - Achat & Cession d'entreprise</h1>
            <p class="mx-auto mb-8 max-w-3xl text-lg opacity-90 sm:text-xl lg:mx-0">
              Trouvez votre prochaine acquisition ou cédez votre entreprise en toute confidentialité.
            </p>

            <div class="mb-12 flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
              <a routerLink="/ma" fragment="ma-listings" class="rounded-lg bg-amber-500 px-8 py-4 font-bold text-white shadow-2xl transition-all hover:scale-105 hover:bg-amber-600 active:scale-95">
                Voir les annonces
              </a>
              <a routerLink="/ma/deposer" class="rounded-lg border-2 border-white px-8 py-4 font-bold text-white transition-all hover:scale-105 hover:bg-white/10 active:scale-95">
                Déposer une annonce
              </a>
              @if (!canViewSensitiveDetails()) {
                <button type="button" (click)="continueToMaAccess()" class="rounded-lg border-2 border-amber-300/80 bg-amber-300/10 px-8 py-4 font-bold text-amber-100 transition-all hover:scale-105 hover:bg-amber-300/20 active:scale-95">
                  {{ accessCtaLabel() }}
                </button>
              }
            </div>

            <div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              @for (stat of stats; track stat.label) {
                <div class="flex min-h-[5.6rem] items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-left text-lg font-semibold opacity-95 backdrop-blur-sm">
                  <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-300 ring-1 ring-amber-300/20" aria-hidden="true">
                    @switch (stat.icon) {
                      @case ('mask') {
                        <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M4 11.5c2.2-1.5 4.4-2.2 8-2.2s5.8.7 8 2.2v2.2c0 3.1-2.5 5.6-5.6 5.6H9.6A5.6 5.6 0 0 1 4 13.7z"/>
                          <path d="M8 14h.01"/>
                          <path d="M16 14h.01"/>
                          <path d="M9 16.5c1.8.8 4.2.8 6 0"/>
                        </svg>
                      }
                      @case ('handshake') {
                        <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="m8 12 2.3 2.3a2.4 2.4 0 0 0 3.4 0L15 13"/>
                          <path d="M7 13 3.5 9.5 7 6l3 3"/>
                          <path d="m17 13 3.5-3.5L17 6l-3 3"/>
                          <path d="m10 16-2-2"/>
                          <path d="m14 16 2-2"/>
                        </svg>
                      }
                      @case ('certified') {
                        <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M12 3 15 5.2l3.7.2.9 3.6 2.4 2.8-2.4 2.8-.9 3.6-3.7.2L12 21l-3-2.2-3.7-.2-.9-3.6L2 12.2l2.4-2.8.9-3.6 3.7-.2z"/>
                          <path d="m8.5 12.2 2.2 2.2 4.8-5"/>
                        </svg>
                      }
                    }
                  </span>
                  <span class="leading-snug">{{ stat.label }}</span>
                </div>
              }
            </div>

            <div class="pointer-events-none absolute bottom-0 right-0 hidden h-[27rem] w-[26rem] lg:block xl:h-[30rem] xl:w-[29rem]">
              <div class="absolute inset-x-8 bottom-6 h-28 rounded-full bg-amber-500/15 blur-3xl"></div>
              <div class="absolute right-0 top-6 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"></div>
              <img
                src="/assets/images/ma-expert.png"
                alt=""
                aria-hidden="true"
                class="absolute bottom-0 right-0 z-10 h-[25rem] w-auto object-contain drop-shadow-2xl xl:h-[28rem]"
              >
              <div class="absolute -bottom-3 right-2 z-20 max-w-[13rem] rounded-2xl border border-white/15 bg-white/10 p-4 text-left text-sm leading-relaxed text-white/90 shadow-2xl backdrop-blur-md xl:right-4">
                <div class="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-amber-300">M&A confidentiel</div>
                <p>Un accès séparé pour consulter, déposer et organiser les mises en relation.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="sticky top-0 z-30 border-b-2 border-border bg-white px-4 py-6 shadow-sm sm:px-6 lg:px-8">
        <div class="mx-auto max-w-[1400px]">
          <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div>
              <label class="mb-2 block text-xs font-bold text-muted-foreground">SECTEUR</label>
              <select
                [value]="selectedSector()"
                (change)="selectedSector.set($any($event.target).value)"
                class="w-full cursor-pointer rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium outline-none focus:border-amber-500"
              >
                @for (sector of sectors; track sector) {
                  <option [value]="sector">{{ sector }}</option>
                }
              </select>
            </div>

            <div>
              <label class="mb-2 block text-xs font-bold text-muted-foreground">TYPE</label>
              <select
                [value]="selectedType()"
                (change)="selectedType.set($any($event.target).value)"
                class="w-full cursor-pointer rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium outline-none focus:border-amber-500"
              >
                @for (type of types; track type) {
                  <option [value]="type">{{ type }}</option>
                }
              </select>
            </div>

            <div>
              <label class="mb-2 block text-xs font-bold text-muted-foreground">CA ANNUEL</label>
              <select class="w-full cursor-pointer rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium outline-none focus:border-amber-500">
                <option>Tous</option>
                <option>0 - 100 k€</option>
                <option>100 k€ - 500 k€</option>
                <option>500 k€ - 1 M€</option>
                <option>1 M€+</option>
              </select>
            </div>

            <div>
              <label class="mb-2 block text-xs font-bold text-muted-foreground">PRIX DEMANDÉ</label>
              <select class="w-full cursor-pointer rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm font-medium outline-none focus:border-amber-500">
                <option>Tous</option>
                <option>0 - 250 k€</option>
                <option>250 k€ - 500 k€</option>
                <option>500 k€ - 1 M€</option>
                <option>1 M€+</option>
              </select>
            </div>

            <div>
              <label class="mb-2 block text-xs font-bold text-muted-foreground">RÉGION</label>
              <input type="text" placeholder="Toute la France" class="w-full rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none focus:border-amber-500">
            </div>
          </div>
        </div>
      </section>

      <section id="ma-listings" class="scroll-mt-28 px-4 py-12 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-[1400px]">
          <div class="mb-8 text-lg">
            <span class="font-bold text-primary">{{ filteredListings().length }}</span>
            <span class="text-muted-foreground"> annonces disponibles</span>
          </div>

          @if (accessRequiredNotice()) {
            <div class="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 class="mb-1 text-lg font-bold">Accès M&A requis pour consulter le dossier complet</h2>
                  <p class="text-sm text-amber-900/80">
                    Les teasers restent lisibles ci-dessous. Les informations sensibles et la mise en relation sont réservées aux comptes avec accès M&A.
                  </p>
                </div>
                <button type="button" (click)="continueToMaAccess()" class="rounded-lg bg-amber-500 px-5 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-amber-600">
                  {{ accessCtaLabel() }}
                </button>
              </div>
            </div>
          }

          <div class="grid gap-8 lg:grid-cols-2">
            @for (listing of filteredListings(); track listing.id; let index = $index) {
              <div class="relative overflow-hidden rounded-2xl border-2 border-border bg-white shadow-md transition-all hover:shadow-xl" [class]="'animate-fade-in-up delay-' + ((index % 4) * 100)">
                <div class="p-6">
                  <div class="mb-4 flex items-start justify-between gap-4">
                    <div class="flex items-center gap-3">
                      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="1" y="3" width="15" height="18"/>
                          <rect x="16" y="8" width="5" height="13"/>
                          <rect x="5" y="7" width="3" height="3"/>
                          <rect x="9" y="7" width="3" height="3"/>
                        </svg>
                      </div>
                      <div>
                        <div class="mb-1 text-xs font-mono text-muted-foreground">{{ listing.id }}</div>
                        <div class="font-bold text-foreground">Entreprise confidentielle</div>
                      </div>
                    </div>
                    <span class="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700">{{ listing.type }}</span>
                  </div>

                  <div class="mb-4 flex flex-wrap gap-2">
                    <span class="rounded-lg bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-700">{{ listing.sector }}</span>
                    <span class="flex items-center gap-1 rounded-lg bg-secondary px-3 py-1 text-sm font-semibold text-foreground">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {{ listing.region }}
                    </span>
                  </div>

                  <p class="mb-4 text-sm leading-relaxed text-foreground/70">{{ listing.summary }}</p>

                  <div class="mb-4 grid grid-cols-3 gap-3 border-b border-border pb-4">
                    <div>
                      <div class="mb-1 text-xs text-muted-foreground">Chiffre d'affaires</div>
                      <div class="text-sm font-bold">{{ listing.revenue }}</div>
                    </div>
                    <div>
                      <div class="mb-1 text-xs text-muted-foreground">Marge nette</div>
                      <div class="text-sm font-bold">{{ listing.margin }}</div>
                    </div>
                    <div>
                      <div class="mb-1 text-xs text-muted-foreground">Ancienneté</div>
                      <div class="text-sm font-bold">{{ listing.age }}</div>
                    </div>
                  </div>

                  @if (canViewSensitiveDetails()) {
                    <div class="mb-4">
                      <div class="mb-1 text-xs text-muted-foreground">Raison de la cession</div>
                      <div class="text-sm font-medium">{{ listing.reason }}</div>
                    </div>
                  } @else {
                    <div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <div class="flex items-start gap-3">
                        <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                        </div>
                        <div>
                          <div class="mb-1 text-sm font-bold text-amber-900">Dossier complet réservé</div>
                          <p class="text-xs leading-relaxed text-amber-900/75">
                            Motif de cession, informations détaillées et mise en relation sont accessibles après l'accès M&A one-shot.
                          </p>
                        </div>
                      </div>
                    </div>
                  }

                  <div class="mb-4 flex flex-wrap gap-2">
                    @for (highlight of listing.highlights; track highlight) {
                      <span class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{{ highlight }}</span>
                    }
                  </div>

                  <div class="flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div class="mb-1 text-xs text-muted-foreground">Prix demandé</div>
                      <div class="text-2xl font-bold text-amber-600">{{ listing.priceMin }} - {{ listing.priceMax }}</div>
                      <p class="mt-2 text-xs text-muted-foreground">Estimation indicative, non contractuelle.</p>
                    </div>
                    @if (canViewSensitiveDetails()) {
                      <a [routerLink]="['/ma/annonce', listing.id]" class="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-white shadow-md transition-colors hover:bg-amber-600">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                        </svg>
                        Voir le dossier
                      </a>
                    } @else {
                      <button type="button" (click)="continueToMaAccess()" class="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-6 py-2.5 font-semibold text-white shadow-md transition-colors hover:bg-amber-600">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        {{ accessCtaLabel() }}
                      </button>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <section class="bg-gradient-to-br from-amber-500 to-orange-600 px-4 py-20 text-white sm:px-6 lg:px-8">
        <div class="mx-auto max-w-[1400px] text-center">
          <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="1" y="3" width="15" height="18"/>
              <rect x="16" y="8" width="5" height="13"/>
            </svg>
          </div>
          <h2 class="mb-4 text-4xl font-bold">Vous souhaitez vendre votre entreprise ?</h2>
          <p class="mx-auto mb-8 max-w-2xl text-xl opacity-90">Préparez votre annonce confidentielle avant validation de l'accès M&A.</p>
          <a routerLink="/ma/deposer" class="inline-block rounded-lg bg-white px-10 py-5 text-lg font-bold text-amber-600 shadow-2xl transition-all hover:scale-105 hover:bg-white/95 active:scale-95">
            Déposer mon annonce
          </a>
          <div class="mt-8 flex flex-col items-center justify-center gap-4 text-sm opacity-90 sm:flex-row sm:flex-wrap sm:gap-8">
            @for (bullet of bullets; track bullet) {
              <div class="flex items-center gap-2">
                <div class="h-1.5 w-1.5 rounded-full bg-white"></div>
                <span>{{ bullet }}</span>
              </div>
            }
          </div>
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

  readonly selectedSector = signal('Tous');
  readonly selectedType = signal('Tous');
  readonly listings = signal<MaListingData[]>([]);
  readonly accessRequiredNotice = computed(() =>
    this.route.snapshot.queryParamMap.get('access') === 'required' && !this.auth.hasMaAccess()
  );

  readonly sectors = ['Tous', 'E-commerce', 'SaaS', 'Commerce de détail', 'Restauration', 'Services B2B'];
  readonly types = ['Tous', 'Cession', 'Fonds de commerce', 'Parts sociales'];
  readonly stats: Array<{ label: string; icon: MaStatIcon }> = [
    { label: 'Annonces anonymisées', icon: 'mask' },
    { label: 'Transactions de 50 k€ à 5 M€', icon: 'handshake' },
    { label: 'Mise en relation après accès validé', icon: 'certified' },
  ];
  readonly bullets = ['Teaser public lisible', 'Détails sensibles réservés', 'Publication après paiement confirmé'];

  readonly canViewSensitiveDetails = computed(() => this.auth.hasMaAccess());
  readonly accessCtaLabel = computed(() =>
    this.auth.isAuthenticated() ? "Débloquer l'accès M&A - 149€" : "Se connecter pour l'accès M&A"
  );
  readonly filteredListings = computed(() =>
    this.listings().filter(listing => {
      const matchesSector = this.selectedSector() === 'Tous' || listing.sector === this.selectedSector();
      const matchesType = this.selectedType() === 'Tous' || listing.type === this.selectedType();
      return matchesSector && matchesType;
    })
  );

  ngOnInit(): void {
    void this.loadListings();
  }

  async continueToMaAccess(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/connexion'], { queryParams: { returnUrl: '/tarifs#ma-access' } });
      return;
    }

    await this.router.navigate(['/tarifs'], { fragment: 'ma-access' });
  }

  private async loadListings(): Promise<void> {
    const listings = await this.maService.getListingCards();
    this.listings.set(listings);
  }
}
