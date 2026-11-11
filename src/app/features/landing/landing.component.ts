import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MaListingData } from '../../core/data/mock-platform.data';
import { INTRO_SUMMARY, OFFER_PRICES } from '../../core/config/offers';
import { ShowcaseEntry, ShowcaseService } from '../../core/services/showcase.service';
import { FEATURES } from '../../core/config/features';
import { MaService } from '../../core/services/ma.service';
import { AuthService } from '../../core/services/auth.service';
import { isTalentMarketplaceRole } from '../../core/models/user.model';
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
      <!-- En-tête : titre, sous-titre court et les deux parcours (pas de recherche ni d'illustration ici). -->
      <section class="relative overflow-hidden bg-primary px-4 pb-16 pt-28 text-white sm:px-6 lg:px-8 lg:pb-20 lg:pt-36">
        <div class="relative mx-auto max-w-[62rem] text-center">
          <h1 class="mx-auto max-w-[20ch] text-[2.2rem] leading-[1.08] text-white sm:text-[3.5rem] lg:text-[3.75rem]">
            @if (showAssociates) {
              Reprenez une entreprise. Trouvez vos associés.
            } @else {
              Reprenez une entreprise qui a déjà ses clients
            }
          </h1>
          <p class="mx-auto mt-5 max-w-[48ch] text-lg leading-relaxed text-white/70">
            Des entreprises à reprendre partout en France, et des associés pour lancer ou développer votre projet.
          </p>

          <div class="mx-auto mt-10 grid max-w-[52rem] gap-4 text-left" [class.sm:grid-cols-2]="showAssociates">
            <a href="#entreprises" (click)="scrollTo($event, 'entreprises')" class="group flex flex-col rounded-2xl border border-white/20 bg-white/[0.06] p-6 transition-colors hover:border-white/60 hover:bg-white/[0.1]">
              <span class="text-xl font-bold text-white">Explorer les entreprises</span>
              <span class="mt-2 flex-1 text-base leading-relaxed text-white/70">Commerces, services, industrie, activités en ligne : découvrez celles qui sont à reprendre.</span>
              <span class="mt-5 whitespace-nowrap font-semibold text-[#9DB8FF] group-hover:text-white">Voir les entreprises&nbsp;→</span>
            </a>
            @if (showAssociates) {
              <a [routerLink]="associatesHref()" class="group flex flex-col rounded-2xl border border-white/20 bg-white/[0.06] p-6 transition-colors hover:border-white/60 hover:bg-white/[0.1]">
                <span class="text-xl font-bold text-white">Trouver des associés et une équipe</span>
                <span class="mt-2 flex-1 text-base leading-relaxed text-white/70">Présentez votre projet ou rejoignez une équipe qui cherche vos compétences.</span>
                <span class="mt-5 whitespace-nowrap font-semibold text-[#9DB8FF] group-hover:text-white">Voir les projets et associés&nbsp;→</span>
              </a>
            }
          </div>

          <p class="mt-6 text-base text-white/60">
            Vous vendez ? <a routerLink="/ma/deposer" class="font-semibold text-white underline-offset-4 hover:underline">Déposer une annonce gratuite</a>
            <span class="mx-1.5" aria-hidden="true">·</span>
            <a routerLink="/estimation" class="font-semibold text-white underline-offset-4 hover:underline">Estimer sa valeur</a>
          </p>
        </div>
      </section>

      <!-- Entreprises à reprendre : recherche et filtres, puis les annonces du moment. -->
      <section id="entreprises" class="scroll-mt-20 px-4 py-14 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="latest-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="latest-title" class="text-center text-3xl text-primary sm:text-4xl">Entreprises à reprendre</h2>
          <p class="mx-auto mt-3 max-w-[60ch] text-center text-lg text-muted-foreground">{{ introSummary }}</p>

          <div class="mx-auto mt-8 max-w-3xl rounded-xl bg-white p-2 shadow-lg ring-1 ring-border" role="search">
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
              <select id="hero-revenue" [value]="heroRevenue()" (change)="heroRevenue.set($any($event.target).value)" class="rounded-lg border border-border bg-secondary px-3 py-3 text-base text-foreground outline-none sm:w-56">
                <option value="">Tout chiffre d'affaires</option>
                <option value="0-100000">Moins de 100 k€</option>
                <option value="100000-500000">100 à 500 k€</option>
                <option value="500000-1000000">500 k€ à 1 M€</option>
                <option value="1000000-">Plus de 1 M€</option>
              </select>
              <button type="button" (click)="search()" class="rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent/90">Rechercher</button>
            </div>
          </div>

          @if (latestListings().length > 0) {
            <div class="mt-10 grid gap-6 md:grid-cols-3 max-sm:[&>*:nth-child(3)]:hidden">
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
          }
          <div class="mt-10 text-center">
            <a routerLink="/ma" class="inline-block rounded-lg bg-primary px-7 py-3.5 font-semibold text-white transition-colors hover:bg-primary/90">Voir toutes les annonces</a>
          </div>
        </div>
      </section>

      @if (showAssociates && showcase().length > 0) {
        <!-- Projets et associés : aperçu anonymisé (membres ayant accepté d'apparaître sur la vitrine publique). -->
        <section class="bg-secondary px-4 py-14 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="team-title">
          <div class="mx-auto max-w-[78rem]">
            <h2 id="team-title" class="text-center text-3xl text-primary sm:text-4xl">Projets et associés</h2>
            <p class="mx-auto mt-3 max-w-[60ch] text-center text-lg text-muted-foreground">
              Des porteurs de projet qui cherchent des compétences, et des associés prêts à rejoindre une équipe.
            </p>
            <div class="mt-10 grid gap-6 md:grid-cols-3 max-sm:[&>*:nth-child(3)]:hidden">
              @for (entry of showcase(); track entry.profile_id) {
                <div class="flex flex-col rounded-2xl bg-white p-6 shadow-lg ring-1 ring-border">
                  <p class="text-sm font-semibold uppercase tracking-wide" [class]="entry.kind === 'project' ? 'text-accent' : 'text-emerald-700'">
                    {{ entry.kind === 'project' ? 'Projet' : 'Associé' }}
                  </p>
                  <h3 class="mt-2 text-lg font-bold leading-snug text-primary">
                    {{ entry.kind === 'project' ? (entry.sector || 'Projet en recherche d’associés') : (entry.title || 'Associé disponible') }}
                  </h3>
                  @if (entry.kind === 'project' && entry.looking_for?.length) {
                    <p class="mt-2 text-base text-foreground/85"><span class="font-semibold text-primary">Cherche :</span> {{ entry.looking_for!.slice(0, 3).join(', ') }}</p>
                  } @else if (entry.availability) {
                    <p class="mt-2 text-base text-foreground/85">{{ entry.availability }}</p>
                  }
                  @if (entry.skills.length > 0) {
                    <ul class="mt-4 flex flex-wrap gap-2">
                      @for (skill of entry.skills.slice(0, 4); track skill) {
                        <li class="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-foreground">{{ skill }}</li>
                      }
                    </ul>
                  }
                </div>
              }
            </div>
            <div class="mt-10 text-center">
              <a [routerLink]="associatesHref()" class="inline-block rounded-lg bg-primary px-7 py-3.5 font-semibold text-white transition-colors hover:bg-primary/90">Voir les projets et associés</a>
            </div>
          </div>
        </section>
      }

      <section class="px-4 py-14 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="steps-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="steps-title" class="text-center text-3xl text-primary sm:text-4xl">Comment se passe une reprise</h2>
          <ol class="mt-8 grid gap-3 sm:mt-12 sm:gap-6 md:grid-cols-3">
            @for (step of steps; track step.title; let index = $index) {
              <li class="flex gap-4 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-border sm:block sm:p-7">
                <span class="tabular flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 font-extrabold text-accent sm:h-11 sm:w-11 sm:text-lg">{{ index + 1 }}</span>
                <div>
                  <h3 class="text-lg font-bold text-primary sm:mt-5 sm:text-xl">{{ step.title }}</h3>
                  <p class="mt-1 text-base leading-relaxed text-muted-foreground sm:mt-2">{{ step.description }}</p>
                </div>
              </li>
            }
          </ol>
        </div>
      </section>

      <!-- Un seul bloc de réassurance : commission, gratuité, prix et confidentialité. -->
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

      <section class="hidden bg-secondary px-4 py-16 sm:block sm:px-6 lg:px-8 lg:py-24" aria-label="Notre conviction">
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

      <app-success-stories />

      <section class="bg-secondary px-4 py-16 sm:px-6 lg:px-8 lg:py-24" aria-labelledby="prices-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="prices-title" class="text-center text-3xl text-primary sm:text-4xl">Vendre est gratuit. Une mise en relation coûte {{ buyerPrice }}.</h2>
          <p class="mx-auto mt-3 max-w-[60ch] text-center text-lg text-muted-foreground">
            Aucune commission sur la vente, aucun abonnement.
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
  private readonly auth = inject(AuthService);
  private readonly showcaseService = inject(ShowcaseService);
  readonly introSummary = INTRO_SUMMARY;
  // Aperçu « Projets et associés » : deux projets et un associé de la vitrine publique (profils anonymisés).
  readonly showcase = signal<ShowcaseEntry[]>([]);
  private readonly listings = signal<MaListingData[]>([]);

  readonly heroQuery = signal('');
  readonly heroRevenue = signal('');

  // Uniquement des faits vérifiables : pas de volume ni de nombre de ventes inventés.
  readonly facts = [
    { value: '0 %', label: 'de commission sur la vente' },
    { value: 'Gratuit', label: 'pour publier une annonce' },
    { value: OFFER_PRICES.INTRO.label, label: 'par entreprise pour le dossier et le contact' },
    { value: 'NDA', label: 'accepté par chaque repreneur avant d’ouvrir un dossier' },
  ];

  readonly buyerPrice = OFFER_PRICES.INTRO.label;

  readonly euros = formatEuros;
  readonly multiple = formatMultiple;
  private readonly items = computed(() => this.listings().map(listing => ({ listing, metrics: listingMetrics(listing) })));

  // Trois annonces sous les filtres : en vedette d'abord, puis les plus récentes.
  readonly latestListings = computed(() =>
    [...this.items()].sort((a, b) => Number(b.listing.featured ?? false) - Number(a.listing.featured ?? false)).slice(0, 3)
  );

  scrollTo(event: Event, id: string): void {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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

  readonly allOffersLabel = FEATURES.pros ? 'Toutes les offres, dont celles des professionnels et l’accompagnement sur devis' : 'Toutes les offres et l’accompagnement sur devis';


  readonly showAssociates = FEATURES.associates;
  // Porteurs de projet et associés connectés : recherche complète ; les autres : vitrine publique.
  readonly associatesHref = computed(() => (isTalentMarketplaceRole(this.auth.currentUser()?.profileType) ? '/recherche' : '/associes'));

  readonly steps = [
    { title: 'Parcourez les annonces', description: 'Secteur, région, chiffres clés et fourchette de prix : les annonces anonymisées sont visibles par tous.' },
    { title: 'Débloquez le dossier', description: `Après un engagement de confidentialité, ${OFFER_PRICES.INTRO.label} ouvrent aussitôt le dossier complet et les coordonnées du cédant, sans attendre son accord.` },
    { title: 'Échangez avec le cédant', description: 'En direct dans la messagerie, sans intermédiaire. Faites-vous accompagner par un expert-comptable et un avocat pour la suite.' },
  ];


  readonly priceRows = [
    { who: 'Cédant', detail: 'Annonce anonymisée, relue avant publication. Vous êtes prévenu à chaque ouverture de votre dossier.', price: 'Gratuit', href: '/ma/deposer', cta: 'Déposer une annonce' },
    { who: 'Repreneur', detail: 'Dossier complet, coordonnées du cédant et messagerie, ouverts aussitôt après l’engagement de confidentialité.', price: `${OFFER_PRICES.INTRO.label} par entreprise`, href: '/ma', cta: 'Voir les annonces' },
  ];

  readonly faq: LandingFaqItem[] = [
    { question: 'Quel type d’entreprises trouve-t-on sur GoFounders ?', answer: 'Des entreprises françaises de tous secteurs : commerces, restaurants, artisans et entreprises du bâtiment, sociétés de services, PME industrielles, mais aussi entreprises en ligne (e-commerce, logiciels, sites, agences). Surtout des TPE et petites PME, de quelques dizaines de milliers d’euros à quelques millions d’euros de chiffre d’affaires.' },
    { question: 'Mon annonce de cession est-elle confidentielle ?', answer: 'Oui. Seule une annonce anonymisée est publique, après relecture par notre équipe. Le dossier complet et vos coordonnées ne s’ouvrent qu’aux repreneurs qui acceptent un engagement de confidentialité et paient l’accès ; vous êtes prévenu à chaque ouverture.' },
    { question: 'Combien coûte la reprise pour un repreneur ?', answer: INTRO_SUMMARY + ' Sans abonnement ni commission sur la vente.' },
    { question: 'GoFounders prend-il une commission sur la vente ?', answer: 'Non. La publication est gratuite pour les cédants et nous ne prenons aucun pourcentage sur le prix de vente.' },
    { question: 'GoFounders m’accompagne-t-il juridiquement ?', answer: 'Non, nous ne fournissons pas de conseil juridique. Nous vous mettons en relation avec des experts juridiques et comptables partenaires pour sécuriser la transaction.' },
  ];

  ngOnInit(): void {
    void this.loadListings();
    if (FEATURES.associates) {
      void this.loadShowcase();
    }
  }

  private async loadShowcase(): Promise<void> {
    const entries = await this.showcaseService.list();
    const projects = entries.filter(entry => entry.kind === 'project').slice(0, 2);
    const talents = entries.filter(entry => entry.kind === 'talent').slice(0, 3 - projects.length);
    this.showcase.set([...projects, ...talents]);
  }

  private async loadListings(): Promise<void> {
    this.listings.set(await this.maService.getListingCards());
  }
}
