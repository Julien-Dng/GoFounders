import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MaListingData } from '../../core/data/mock-platform.data';
import { OFFER_PRICES } from '../../core/config/offers';
import { FEATURES } from '../../core/config/features';
import { MaService } from '../../core/services/ma.service';
import { formatEuros, formatMultiple, listingMetrics } from '../../core/ma/listing-metrics';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { SuccessStoriesComponent } from '../../shared/components/success-stories/success-stories.component';

interface LandingFaqItem {
  question: string;
  answer: string;
}

// Accueil de la refonte « reprise ». Système de design : docs/DESIGN.md (fiche de cession, chiffres en avant).
@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, FooterComponent, SuccessStoriesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white">
      <!-- En-tête sombre : titre, recherche, et maquettes d'interface sur un fond de panneaux arrondis. -->
      <section class="relative overflow-hidden bg-primary px-4 pb-20 pt-28 text-white sm:px-6 lg:px-8 lg:pb-24 lg:pt-36">
        <div class="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] lg:block" aria-hidden="true">
          <div class="absolute -top-10 left-[6%] h-36 w-64 rounded-3xl bg-white/[0.04]"></div>
          <div class="absolute left-[6%] top-[62%] h-72 w-64 rounded-3xl bg-white/[0.04]"></div>
          <div class="absolute -top-10 left-[52%] h-56 w-72 rounded-3xl bg-white/[0.04]"></div>
          <div class="absolute bottom-[-3rem] left-[52%] h-40 w-72 rounded-3xl bg-white/[0.04]"></div>
          <div class="absolute right-[-3rem] top-[10%] h-80 w-24 rounded-3xl bg-white/[0.04]"></div>
        </div>

        <div class="relative mx-auto grid max-w-[78rem] gap-14 lg:grid-cols-12 lg:items-center">
          <div class="lg:col-span-6">
            <h1 class="max-w-[16ch] text-[2.6rem] leading-[1.08] text-white sm:text-[3.5rem] lg:text-[3.75rem]">
              Votre entreprise mérite le bon repreneur. Votre ambition, la bonne société.
            </h1>
            <p class="mt-6 max-w-[50ch] text-lg leading-relaxed text-white/70">
              SaaS, e-commerce, agences, sites de contenu : des entreprises françaises rentables, dont les fondateurs veulent passer la main.
            </p>

            <div class="mt-9 rounded-xl bg-white p-2 shadow-2xl" role="search">
              <div class="flex flex-col gap-2 sm:flex-row">
                <label for="hero-search" class="sr-only">Rechercher une entreprise</label>
                <input
                  id="hero-search"
                  type="search"
                  [value]="heroQuery()"
                  (input)="heroQuery.set($any($event.target).value)"
                  (keydown.enter)="search()"
                  placeholder="Secteur, ville, mot-clé"
                  class="min-w-0 flex-1 rounded-lg px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
                >
                <label for="hero-revenue" class="sr-only">Chiffre d'affaires</label>
                <select id="hero-revenue" [value]="heroRevenue()" (change)="heroRevenue.set($any($event.target).value)" class="rounded-lg border border-border bg-secondary px-3 py-3 text-base text-foreground outline-none sm:w-40">
                  <option value="">Tout CA</option>
                  <option value="0-100000">Moins de 100 k€</option>
                  <option value="100000-500000">100 à 500 k€</option>
                  <option value="500000-1000000">500 k€ à 1 M€</option>
                  <option value="1000000-">Plus de 1 M€</option>
                </select>
                <button type="button" (click)="search()" class="rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent/90">Rechercher</button>
              </div>
            </div>

            <div class="mt-6 flex flex-col gap-3 sm:flex-row">
              <a routerLink="/ma" class="rounded-lg border border-white/30 px-6 py-3.5 text-center font-semibold text-white transition-colors hover:border-white/70">Voir toutes les annonces</a>
              <a routerLink="/estimation" class="rounded-lg border border-white/30 px-6 py-3.5 text-center font-semibold text-white transition-colors hover:border-white/70">Estimer mon entreprise gratuitement</a>
            </div>
          </div>

          @if (featuredListing(); as item) {
            <figure class="relative lg:col-span-6 lg:min-h-[30rem]">
              <article class="relative mx-auto max-w-[27rem] rounded-2xl bg-[#DCE5F7] p-6 text-primary shadow-2xl sm:p-7 lg:absolute lg:left-0 lg:top-0 lg:w-[25rem]" aria-label="Annonce en ligne">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-primary/60">{{ item.listing.type }} · {{ item.listing.region }}</p>
                    <h2 class="mt-1 text-xl leading-snug text-primary">{{ item.listing.sector }}</h2>
                  </div>
                  <span class="flex-shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-sm font-semibold text-[#A3341C]">Confidentiel</span>
                </div>
                <p class="mt-3 line-clamp-2 text-base text-primary/75">{{ item.listing.summary }}</p>
                <dl class="tabular mt-5 grid grid-cols-3 gap-2">
                  <div class="rounded-lg bg-white/70 p-3">
                    <dt class="text-sm text-primary/60">CA</dt>
                    <dd class="mt-0.5 font-bold">{{ euros(item.metrics.revenue) }}</dd>
                  </div>
                  <div class="rounded-lg bg-white/70 p-3">
                    <dt class="text-sm text-primary/60">Bénéfice</dt>
                    <dd class="mt-0.5 font-bold">{{ euros(item.metrics.netProfit) }}</dd>
                  </div>
                  <div class="rounded-lg bg-white/70 p-3">
                    <dt class="text-sm text-primary/60">Marge</dt>
                    <dd class="mt-0.5 font-bold">{{ item.listing.margin }}</dd>
                  </div>
                </dl>
                <div class="mt-4 space-y-2" aria-hidden="true">
                  <div class="h-2.5 w-11/12 rounded bg-primary/10"></div>
                  <div class="h-2.5 w-3/4 rounded bg-primary/10"></div>
                </div>
                <div class="mt-5 rounded-xl bg-primary p-4 text-white">
                  <p class="text-sm text-white/65">Prix demandé</p>
                  <p class="tabular mt-0.5 text-2xl font-bold"><span class="whitespace-nowrap">{{ item.listing.priceMin }}</span> à <span class="whitespace-nowrap">{{ item.listing.priceMax }}</span></p>
                  @if (item.metrics.multiple !== null) {
                    <p class="tabular text-sm text-white/65">{{ multiple(item.metrics.multiple) }} le bénéfice annuel</p>
                  }
                </div>
              </article>

              <aside class="relative z-10 mx-auto -mt-4 w-[20rem] max-w-full rounded-2xl bg-[#DCE5F7] p-5 text-primary shadow-2xl lg:absolute lg:bottom-0 lg:right-0 lg:mt-0" aria-label="Exemple de profil repreneur">
                <p class="text-sm font-semibold text-primary/60">Exemple de profil repreneur</p>
                <div class="mt-3 flex items-center gap-3">
                  <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white" aria-hidden="true">R</span>
                  <div class="min-w-0">
                    <p class="font-bold leading-snug">Ancien directeur commercial</p>
                    <p class="text-sm text-primary/70">Budget 300 à 600 k€ · E-commerce</p>
                  </div>
                </div>
                <div class="mt-4 space-y-2" aria-hidden="true">
                  <div class="h-2.5 w-full rounded bg-primary/10"></div>
                  <div class="h-2.5 w-2/3 rounded bg-primary/10"></div>
                </div>
                <div class="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold" aria-hidden="true">
                  <span class="rounded-lg border border-primary/25 py-2 text-center text-primary/70">Refuser</span>
                  <span class="rounded-lg bg-accent py-2 text-center text-white">Accepter</span>
                </div>
              </aside>
            </figure>
          }
        </div>
      </section>

      <section class="bg-[#16243B] px-4 py-9 text-white sm:px-6 lg:px-8" aria-label="Les engagements de GoFounders">
        <dl class="mx-auto grid max-w-[78rem] grid-cols-2 gap-y-8 text-center lg:grid-cols-4">
          @for (fact of facts; track fact.label; let last = $last) {
            <div class="px-4 lg:border-dashed lg:border-white/25" [class.lg:border-r]="!last">
              <dt class="sr-only">{{ fact.label }}</dt>
              <dd class="tabular text-3xl font-extrabold tracking-tight">{{ fact.value }}</dd>
              <dd class="mx-auto mt-1 max-w-[22ch] text-base text-white/70">{{ fact.label }}</dd>
            </div>
          }
        </dl>
      </section>

      <section class="bg-secondary px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="steps-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="steps-title" class="text-center text-3xl text-primary sm:text-4xl">Comment se passe une reprise</h2>
          <p class="mx-auto mt-3 max-w-[56ch] text-center text-lg text-muted-foreground">Trois étapes, sans intermédiaire ni commission.</p>
          <ol class="mt-12 grid gap-6 md:grid-cols-3">
            @for (step of steps; track step.title; let index = $index) {
              <li class="rounded-2xl bg-white p-7 shadow-lg">
                <span class="tabular flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-lg font-extrabold text-accent">{{ index + 1 }}</span>
                <h3 class="mt-5 text-xl font-bold text-primary">{{ step.title }}</h3>
                <p class="mt-2 text-base leading-relaxed text-muted-foreground">{{ step.description }}</p>
              </li>
            }
          </ol>
        </div>
      </section>

      @if (latestListings().length > 0) {
        <section class="px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="latest-title">
          <div class="mx-auto max-w-[78rem]">
            <h2 id="latest-title" class="text-center text-3xl text-primary sm:text-4xl">En ce moment sur GoFounders</h2>
            <p class="mx-auto mt-3 max-w-[56ch] text-center text-lg text-muted-foreground">Quelques entreprises actuellement à reprendre.</p>
            <div class="mt-12 grid gap-6 md:grid-cols-3">
              @for (item of latestListings(); track item.listing.id) {
                <a [routerLink]="['/ma/annonce', item.listing.id]" class="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-border transition-shadow hover:shadow-xl">
                  <p class="bg-primary px-5 py-3 text-sm font-semibold text-white">{{ item.listing.sector }} · {{ item.listing.region }}</p>
                  <div class="flex flex-1 flex-col p-5">
                    <h3 class="line-clamp-3 text-lg font-bold leading-snug text-primary group-hover:text-accent">{{ item.listing.summary }}</h3>
                    <p class="tabular mt-3 text-base text-muted-foreground">CA {{ euros(item.metrics.revenue) }} · Bénéfice {{ euros(item.metrics.netProfit) }}</p>
                    <div class="mt-auto pt-5">
                      <div class="rounded-xl bg-secondary px-4 py-3">
                        <p class="text-sm text-muted-foreground">Prix demandé</p>
                        <p class="tabular font-bold text-amber-600">
                          <span class="whitespace-nowrap">{{ item.listing.priceMin }}</span> à <span class="whitespace-nowrap">{{ item.listing.priceMax }}</span>
                          @if (item.metrics.multiple !== null) {
                            <span class="font-semibold text-muted-foreground"> ({{ multiple(item.metrics.multiple) }} le bénéfice)</span>
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </a>
              }
            </div>
            <div class="mt-10 text-center">
              <a routerLink="/ma" class="inline-block rounded-lg bg-primary px-7 py-3.5 font-semibold text-white transition-colors hover:bg-primary/90">Voir toutes les annonces</a>
            </div>
          </div>
        </section>
      }

      <section class="bg-secondary px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-label="Notre conviction">
        <div class="mx-auto grid max-w-[78rem] items-center gap-10 overflow-hidden rounded-3xl bg-white shadow-lg lg:grid-cols-12 lg:gap-0">
          <div class="p-8 sm:p-12 lg:col-span-7">
            <p class="text-[1.75rem] font-bold leading-snug tracking-tight text-primary sm:text-[2.1rem]">
              Une entreprise, ce sont des années de travail, des clients qui vous font confiance, parfois une équipe.
              La transmettre mérite mieux qu'une petite annonce.
            </p>
            <p class="mt-6 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
              Chaque année, des entreprises rentables ferment faute de repreneur, pendant que d'autres cherchent
              à racheter une activité qui tourne déjà. GoFounders les rapproche, discrètement et sans commission.
            </p>
            <p class="mt-5 font-bold text-primary">L'équipe GoFounders</p>
          </div>
          <figure class="h-full lg:col-span-5">
            <img src="/assets/images/provisoire/fondateurs-ecran.jpg" alt="Un fondateur travaille sur le site de son entreprise, sur deux écrans" width="1400" height="933" loading="lazy" class="h-full max-h-[28rem] w-full object-cover object-[15%_center] lg:max-h-none">
          </figure>
        </div>
      </section>

      <section class="px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="audiences-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="audiences-title" class="text-center text-3xl text-primary sm:text-4xl">{{ visibleAudiences.length === 3 ? 'Une place de marché, trois façons de l’utiliser' : 'Une place de marché pour vendre ou reprendre' }}</h2>
          <div class="mt-12 grid gap-6" [class]="visibleAudiences.length === 3 ? 'md:grid-cols-3' : 'mx-auto max-w-4xl md:grid-cols-2'">
            @for (audience of visibleAudiences; track audience.title) {
              <div class="flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-border">
                <img [src]="audience.image" [alt]="audience.imageAlt" width="1400" height="933" loading="lazy" class="aspect-[3/2] w-full object-cover">
                <div class="flex flex-1 flex-col p-6">
                  <h3 class="text-xl font-bold text-primary">{{ audience.title }}</h3>
                  <p class="mt-2 flex-1 text-base leading-relaxed text-muted-foreground">{{ audience.description }}</p>
                  <a [routerLink]="audience.href" class="mt-5 inline-block font-semibold text-accent underline-offset-4 hover:underline">{{ audience.cta }}</a>
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <section id="protection" class="bg-secondary px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="protection-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="protection-title" class="text-center text-3xl text-primary sm:text-4xl">La discrétion par défaut</h2>
          <p class="mx-auto mt-3 max-w-[60ch] text-center text-lg text-muted-foreground">
            Vous décidez de ce qui est montré, à qui, et sous quel engagement.
          </p>
          <div class="mt-12 grid gap-6 md:grid-cols-3">
            @for (item of protectionPoints; track item.title) {
              <div class="rounded-2xl bg-white p-7 shadow-lg">
                <span class="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <h3 class="mt-5 text-xl font-bold text-primary">{{ item.title }}</h3>
                <p class="mt-2 text-base leading-relaxed text-muted-foreground">{{ item.description }}</p>
              </div>
            }
          </div>
          <p class="mx-auto mt-8 max-w-[70ch] text-center text-sm leading-relaxed text-muted-foreground">
            L'engagement de confidentialité est un modèle mis à disposition par GoFounders, qui n'assure pas de conseil juridique.
            Pour un accord sur mesure, nos experts juridiques partenaires peuvent vous accompagner.
          </p>
        </div>
      </section>

      <app-success-stories />

      <section class="bg-secondary px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="prices-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="prices-title" class="text-center text-3xl text-primary sm:text-4xl">Vendre est gratuit. Reprendre coûte {{ buyerPrice }}.</h2>
          <p class="mx-auto mt-3 max-w-[60ch] text-center text-lg text-muted-foreground">
            Pas de commission sur la vente. Les repreneurs paient l'accès aux dossiers complets, une fois par an.
          </p>
          <div class="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            @for (row of priceRows; track row.who; let first = $first) {
              <div class="flex flex-col rounded-2xl p-8 shadow-lg" [class]="first ? 'bg-white ring-1 ring-border' : 'bg-primary text-white'">
                <h3 class="text-lg font-bold" [class]="first ? 'text-primary' : 'text-white'">{{ row.who }}</h3>
                <p class="tabular mt-3 text-4xl font-extrabold tracking-tight">{{ row.price }}</p>
                <p class="mt-3 flex-1 text-base" [class]="first ? 'text-muted-foreground' : 'text-white/70'">{{ row.detail }}</p>
                <a [routerLink]="row.href" class="mt-7 rounded-lg px-5 py-3 text-center font-semibold transition-colors" [class]="first ? 'bg-primary text-white hover:bg-primary/90' : 'bg-accent text-white hover:bg-accent/90'">{{ row.cta }}</a>
              </div>
            }
          </div>
          <p class="mt-8 text-center">
            <a routerLink="/tarifs" class="font-semibold text-accent underline-offset-4 hover:underline">{{ allOffersLabel }}</a>
          </p>
        </div>
      </section>

      <section class="px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="faq-title">
        <div class="mx-auto max-w-3xl">
          <h2 id="faq-title" class="text-center text-3xl text-primary sm:text-4xl">Questions fréquentes</h2>
          <div class="mt-10 space-y-3">
            @for (item of faq; track item.question) {
              <details class="group rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-border">
                <summary class="flex cursor-pointer list-none items-start justify-between gap-6 font-bold text-primary">
                  {{ item.question }}
                  <span class="mt-0.5 text-xl leading-none text-accent transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p class="mt-3 text-base leading-relaxed text-muted-foreground">{{ item.answer }}</p>
              </details>
            }
          </div>
          <p class="mt-8 text-center">
            <a routerLink="/faq" class="font-semibold text-accent underline-offset-4 hover:underline">Toutes les questions</a>
            <span class="mx-2 text-muted-foreground" aria-hidden="true">·</span>
            <a routerLink="/contact" class="font-semibold text-accent underline-offset-4 hover:underline">Nous contacter</a>
          </p>
        </div>
      </section>

      <section class="px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24" aria-labelledby="sell-title">
        <div class="relative mx-auto max-w-[78rem] overflow-hidden rounded-3xl bg-primary px-6 py-14 text-white sm:px-12 lg:py-16">
          <img src="/assets/images/provisoire/bureau-vue-dessus.jpg" alt="" aria-hidden="true" width="1400" height="933" loading="lazy" class="absolute inset-0 h-full w-full object-cover">
          <div class="absolute inset-0" style="background: rgba(15, 27, 45, 0.86)" aria-hidden="true"></div>
          <div class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="sell-title" class="text-3xl sm:text-4xl">Vous pensez à passer la main ?</h2>
              <p class="mt-3 max-w-[60ch] text-lg leading-relaxed text-white/75">
                Déposez votre annonce gratuitement. Elle reste anonyme jusqu'à ce que vous acceptiez un repreneur.
              </p>
            </div>
            <div class="flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
              <a routerLink="/estimation" class="rounded-lg border border-white/30 px-6 py-3.5 text-center font-semibold text-white transition-colors hover:border-white/70">Estimer sa valeur d'abord</a>
              <a routerLink="/ma/deposer" class="rounded-lg bg-accent px-6 py-3.5 text-center font-semibold text-white transition-colors hover:bg-accent/90">Déposer mon annonce</a>
            </div>
          </div>
        </div>
      </section>

      <app-footer />
    </div>
  `
})
export class LandingComponent implements OnInit {
  private readonly maService = inject(MaService);
  private readonly router = inject(Router);
  private readonly listings = signal<MaListingData[]>([]);

  readonly heroQuery = signal('');
  readonly heroRevenue = signal('');

  // Uniquement des faits vérifiables : pas de volume ni de nombre de ventes inventés.
  readonly facts = [
    { value: '0 %', label: 'de commission sur la vente' },
    { value: 'Gratuit', label: 'pour publier une annonce' },
    { value: '149 €', label: "l'accès repreneur, pour 12 mois" },
    { value: 'NDA', label: 'accepté par chaque repreneur avant votre dossier' },
  ];

  readonly buyerPrice = OFFER_PRICES.MA_ACCESS.label.replace(' / ', ' par ');

  readonly euros = formatEuros;
  readonly multiple = formatMultiple;
  private readonly items = computed(() => this.listings().map(listing => ({ listing, metrics: listingMetrics(listing) })));

  // Annonce réelle mise en avant dans l'en-tête (en vedette d'abord, sinon la plus récente).
  readonly featuredListing = computed(() => {
    const items = this.items();
    return items.find(item => item.listing.featured) ?? items[0] ?? null;
  });

  // Trois annonces sous l'en-tête, hors celle déjà montrée en haut.
  readonly latestListings = computed(() => {
    const featured = this.featuredListing();
    return this.items().filter(item => item.listing.id !== featured?.listing.id).slice(0, 3);
  });

  search(): void {
    const queryParams: Record<string, string> = {};

    if (this.heroQuery().trim()) {
      queryParams['q'] = this.heroQuery().trim();
    }

    if (this.heroRevenue()) {
      queryParams['ca'] = this.heroRevenue();
    }

    void this.router.navigate(['/ma'], { queryParams, fragment: 'ma-listings' });
  }

  readonly allOffersLabel = FEATURES.buyerPlus || FEATURES.pros ? "Toutes les offres, dont l'accès Plus et les comptes professionnels" : 'Toutes les offres et l’accompagnement sur devis';

  readonly audiences = [
    {
      title: 'Repreneurs',
      description: 'Rachetez une activité qui a déjà des clients et un historique, au lieu de repartir de zéro.',
      href: '/ma',
      cta: 'Voir les annonces',
      image: '/assets/images/provisoire/repreneur-tableau-de-bord.jpg',
      imageAlt: 'Un repreneur étudie les indicateurs d’une activité en ligne sur son ordinateur',
    },
    {
      title: 'Cédants',
      description: 'Passez la main discrètement, à un repreneur qui a pris un accès payant et montré son sérieux.',
      href: '/ma/deposer',
      cta: 'Déposer une annonce',
      image: '/assets/images/provisoire/cedant-echange.jpg',
      imageAlt: 'Un échange de travail autour d’un ordinateur portable',
    },
    {
      title: 'Associés',
      feature: 'associates' as const,
      description: 'Trouvez un associé pour votre projet, ou rejoignez un projet qui a besoin de vos compétences.',
      href: '/associes',
      cta: 'Trouver un associé',
      image: '/assets/images/provisoire/equipe-ordinateurs.jpg',
      imageAlt: 'Une petite équipe travaille sur ses ordinateurs',
    },
  ];

  readonly visibleAudiences = this.audiences.filter(audience => !('feature' in audience) || FEATURES.associates);

  readonly steps = [
    { title: 'Parcourez les annonces', description: 'Secteur, chiffre d’affaires, marge, ancienneté et fourchette de prix : les annonces anonymisées sont visibles par tous.' },
    { title: 'Demandez l’accès au dossier', description: 'Avec l’accès repreneur, vous vous présentez et acceptez un engagement de confidentialité. Le cédant vous ouvre son dossier complet.' },
    { title: 'Échangez avec le cédant', description: 'Vous discutez directement avec le vendeur, sans intermédiaire. Faites-vous accompagner par un expert-comptable et un avocat pour sécuriser la suite.' },
  ];

  readonly protectionPoints = [
    { title: 'Annonces anonymisées', description: 'Le public ne voit que le secteur, la région et les chiffres clés. Le nom de l’entreprise reste réservé aux repreneurs que vous acceptez.' },
    { title: 'Engagement de confidentialité', description: 'Chaque repreneur accepte un engagement de confidentialité avant d’ouvrir votre dossier. La preuve d’acceptation (nom, date, version du texte) est conservée.' },
    { title: 'Accès sous votre contrôle', description: 'Vous acceptez ou refusez chaque demande et retirez un accès quand vous le souhaitez.' },
  ];

  readonly priceRows = [
    { who: 'Cédant', detail: 'Annonce anonymisée, contacts directs des repreneurs.', price: 'Gratuit', href: '/ma/deposer', cta: 'Déposer une annonce' },
    { who: 'Repreneur', detail: 'Pendant 12 mois, demandez l’accès aux dossiers complets et échangez avec les vendeurs.', price: OFFER_PRICES.MA_ACCESS.label, href: '/tarifs', cta: 'Voir l’accès repreneur' },
  ];

  readonly faq: LandingFaqItem[] = [
    { question: 'Quel type d’entreprises trouve-t-on sur GoFounders ?', answer: 'Principalement des entreprises numériques françaises : SaaS, e-commerce, sites de contenu, petites agences, avec un chiffre d’affaires entre 50 k€ et 1 M€. Des TPE plus classiques peuvent aussi être proposées.' },
    { question: 'Mon annonce de cession est-elle confidentielle ?', answer: 'Oui. Seule une annonce anonymisée est publique, après relecture par notre équipe. Le dossier complet et vos coordonnées ne s’ouvrent qu’aux repreneurs que vous acceptez, après qu’ils ont accepté un engagement de confidentialité.' },
    { question: 'Que comprend l’accès repreneur ?', answer: 'Pendant 12 mois, vous pouvez demander l’accès au dossier complet de chaque annonce. Dès que le vendeur accepte, vous lisez son dossier et échangez directement avec lui. 3 analyses de dossier par l’IA sont incluses chaque mois.' },
    { question: 'GoFounders prend-il une commission sur la vente ?', answer: 'Non. La publication est gratuite pour les cédants et nous ne prenons aucun pourcentage sur le prix de vente.' },
    { question: 'GoFounders m’accompagne-t-il juridiquement ?', answer: 'Non, nous ne fournissons pas de conseil juridique. Nous vous mettons en relation avec des experts juridiques et comptables partenaires pour sécuriser la transaction.' },
  ];

  ngOnInit(): void {
    void this.loadListings();
  }

  private async loadListings(): Promise<void> {
    this.listings.set(await this.maService.getListingCards());
  }
}
