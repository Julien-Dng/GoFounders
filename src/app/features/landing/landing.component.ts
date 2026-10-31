import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaListingData } from '../../core/data/mock-platform.data';
import { OFFER_PRICES } from '../../core/config/offers';
import { MaService } from '../../core/services/ma.service';
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
      <section class="overflow-hidden bg-primary px-4 pb-20 pt-28 text-white sm:px-6 lg:px-8 lg:pb-28 lg:pt-36">
        <div class="mx-auto grid max-w-[78rem] gap-16 lg:grid-cols-12 lg:items-center">
          <div class="lg:col-span-6">
            <h1 class="max-w-[15ch] text-[2.75rem] leading-[1.02] text-white sm:text-6xl lg:text-[4.5rem]">
              Reprenez une entreprise qui a déjà ses clients.
            </h1>
            <p class="mt-7 max-w-[52ch] text-lg leading-relaxed text-white/75">
              GoFounders met en relation les fondateurs qui veulent céder leur entreprise numérique et les repreneurs
              qui préfèrent racheter une activité rentable plutôt que repartir de zéro.
            </p>
            <div class="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
              <a routerLink="/ma" class="rounded bg-white px-6 py-3.5 text-center font-medium text-primary transition-colors hover:bg-white/90">
                Voir les entreprises à reprendre
              </a>
              <a routerLink="/ma/deposer" class="px-2 py-3 text-center font-medium text-white underline decoration-white/40 decoration-2 underline-offset-4 transition-colors hover:decoration-white">
                Je veux céder mon entreprise
              </a>
            </div>
            <ul class="mt-12 grid max-w-[58ch] gap-3 border-l-2 border-amber-400/70 pl-5 text-base text-white/80">
              <li>Annonce gratuite et anonymisée pour les cédants.</li>
              <li>Votre identité n'est révélée qu'aux repreneurs que vous choisissez.</li>
              <li>Aucune commission sur le prix de vente.</li>
            </ul>
          </div>

          @if (featuredListing(); as listing) {
            <figure class="lg:col-span-6 lg:pl-6">
              <div class="relative mx-auto max-w-[34rem]">
                <div class="dossier-sheet dossier-sheet-back" aria-hidden="true"></div>
                <div class="dossier-sheet dossier-sheet-middle" aria-hidden="true"></div>
                <article class="relative rounded-md bg-white p-7 text-foreground shadow-2xl sm:p-9" aria-label="Annonce en ligne">
                  <span class="dossier-stamp" aria-hidden="true">Confidentiel</span>
                  <p class="pr-32 text-sm text-muted-foreground">{{ listing.type }}</p>
                  <h2 class="mt-1 pr-24 text-[1.75rem] leading-snug text-primary">{{ listing.sector }}, {{ listing.region }}</h2>
                  <p class="mt-4 text-base leading-relaxed text-foreground/80">{{ listing.summary }}</p>
                  <dl class="tabular mt-6 grid grid-cols-3 border-y border-border">
                    <div class="py-4 pr-3">
                      <dt class="text-sm text-muted-foreground"><span class="sm:hidden">CA</span><span class="hidden sm:inline">Chiffre d'affaires</span></dt>
                      <dd class="mt-1 text-lg font-semibold text-primary sm:text-xl">{{ listing.revenue }}</dd>
                    </div>
                    <div class="border-l border-border px-3 py-4">
                      <dt class="text-sm text-muted-foreground">Marge nette</dt>
                      <dd class="mt-1 text-lg font-semibold text-primary sm:text-xl">{{ listing.margin }}</dd>
                    </div>
                    <div class="border-l border-border py-4 pl-3">
                      <dt class="text-sm text-muted-foreground">Ancienneté</dt>
                      <dd class="mt-1 text-lg font-semibold text-primary sm:text-xl">{{ listing.age }}</dd>
                    </div>
                  </dl>
                  <div class="mt-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p class="text-sm text-muted-foreground">Prix demandé</p>
                      <p class="font-display tabular mt-1 text-[2rem] font-semibold leading-tight text-amber-600">{{ listing.priceMin }} à {{ listing.priceMax }}</p>
                      <p class="mt-1 text-sm text-muted-foreground">Estimation indicative, non contractuelle.</p>
                    </div>
                    @if (listing.verified) {
                      <span class="rounded-full border border-emerald-700/30 px-2.5 py-1 text-sm font-medium text-emerald-800">Dossier vérifié</span>
                    }
                  </div>
                </article>
              </div>
              <figcaption class="mx-auto mt-8 max-w-[34rem] text-sm text-white/60">
                Une annonce en ligne aujourd'hui. Le nom de l'entreprise et du cédant restent confidentiels.
              </figcaption>
            </figure>
          }
        </div>
      </section>

      <section class="px-4 py-20 sm:px-6 lg:px-8 lg:py-28" aria-label="Notre conviction">
        <div class="mx-auto grid max-w-[78rem] gap-12 lg:grid-cols-12 lg:items-center">
          <div class="lg:col-span-7">
            <p class="font-display text-[1.9rem] font-medium leading-snug text-primary sm:text-4xl sm:leading-snug lg:text-[2.6rem] lg:leading-[1.2]">
              Une entreprise, ce sont des années de travail, des clients qui vous font confiance, parfois une équipe.
              La transmettre mérite mieux qu'une petite annonce.
            </p>
            <p class="mt-8 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
              Chaque année, des entreprises rentables ferment faute de repreneur, pendant que d'autres cherchent
              à racheter une activité qui tourne déjà. GoFounders les rapproche, discrètement et sans commission.
            </p>
            <p class="mt-5 font-medium text-primary">L'équipe GoFounders</p>
          </div>
          <figure class="lg:col-span-5">
            <img src="/assets/images/provisoire/fondateur-boutique.jpg" alt="Un commerçant derrière son comptoir, souriant, avec une cliente" width="1400" height="934" loading="lazy" class="aspect-[4/5] w-full rounded-md object-cover">
          </figure>
        </div>
      </section>

      <section class="border-t border-border px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="audiences-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="audiences-title" class="max-w-[24ch] text-3xl text-primary sm:text-4xl">Une place de marché, trois façons de l'utiliser</h2>
          <div class="mt-10 grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-border">
            @for (audience of audiences; track audience.title; let first = $first) {
              <div [class]="first ? 'md:pr-8' : 'md:px-8'">
                <img [src]="audience.image" [alt]="audience.imageAlt" width="1400" height="933" loading="lazy" class="mb-5 aspect-[3/2] w-full rounded-md object-cover">
                <h3 class="text-lg font-semibold text-primary">{{ audience.title }}</h3>
                <p class="mt-2 text-base leading-relaxed text-muted-foreground">{{ audience.description }}</p>
                <a [routerLink]="audience.href" class="mt-4 inline-block font-medium text-accent underline-offset-4 hover:underline">{{ audience.cta }}</a>
              </div>
            }
          </div>
        </div>
      </section>

      <section class="bg-secondary px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="steps-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="steps-title" class="text-3xl text-primary sm:text-4xl">Comment se passe une reprise</h2>
          <ol class="mt-10 grid gap-8 md:grid-cols-3">
            @for (step of steps; track step.title; let index = $index) {
              <li class="border-t-2 border-primary pt-5">
                <span class="font-display tabular text-3xl font-semibold text-primary">{{ index + 1 }}</span>
                <h3 class="mt-3 text-lg font-semibold text-primary">{{ step.title }}</h3>
                <p class="mt-2 text-base leading-relaxed text-muted-foreground">{{ step.description }}</p>
              </li>
            }
          </ol>
        </div>
      </section>

      <section id="protection" class="px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="protection-title">
        <div class="mx-auto grid max-w-[78rem] gap-10 lg:grid-cols-12">
          <div class="lg:col-span-5">
            <h2 id="protection-title" class="text-3xl text-primary sm:text-4xl">La discrétion par défaut</h2>
            <p class="mt-4 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
              Vendre une entreprise ou présenter un projet expose des informations sensibles. Vous décidez de ce qui est montré, à qui, et sous quel engagement.
            </p>
            <img src="/assets/images/provisoire/dossier-chiffres.jpg" alt="Documents comptables et calculatrice posés sur un bureau" width="1400" height="803" loading="lazy" class="mt-8 hidden aspect-[4/3] w-full rounded-md object-cover lg:block">
          </div>
          <dl class="divide-y divide-border border-y border-border lg:col-span-7">
            @for (item of protectionPoints; track item.title) {
              <div class="grid gap-1 py-5 sm:grid-cols-[14rem_1fr] sm:gap-6">
                <dt class="font-semibold text-primary">{{ item.title }}</dt>
                <dd class="text-base leading-relaxed text-muted-foreground">{{ item.description }}</dd>
              </div>
            }
          </dl>
        </div>
        <p class="mx-auto mt-6 max-w-[78rem] text-sm leading-relaxed text-muted-foreground">
          L'engagement de confidentialité est un modèle mis à disposition par GoFounders, qui n'assure pas de conseil juridique.
          Pour un accord sur mesure, nos experts juridiques partenaires peuvent vous accompagner.
        </p>
      </section>

      <app-success-stories background="bg-secondary" />

      <section class="px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="prices-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="prices-title" class="text-3xl text-primary sm:text-4xl">Vendre est gratuit. Reprendre coûte {{ buyerPrice }}.</h2>
          <p class="mt-4 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
            Pas de commission sur la vente. Les repreneurs paient l'accès aux dossiers complets, une fois par an.
          </p>
          <div class="mt-8 divide-y divide-border border-y border-border">
            @for (row of priceRows; track row.who) {
              <div class="grid items-center gap-3 py-5 sm:grid-cols-[1fr_auto_auto] sm:gap-10">
                <div>
                  <h3 class="font-semibold text-primary">{{ row.who }}</h3>
                  <p class="mt-1 text-base text-muted-foreground">{{ row.detail }}</p>
                </div>
                <p class="font-display tabular text-2xl font-semibold text-primary">{{ row.price }}</p>
                <a [routerLink]="row.href" class="rounded border border-primary px-5 py-2.5 text-center text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white">{{ row.cta }}</a>
              </div>
            }
          </div>
          <a routerLink="/tarifs" class="mt-6 inline-block font-medium text-accent underline-offset-4 hover:underline">Toutes les offres, dont l'accès Plus et les comptes professionnels</a>
        </div>
      </section>

      <section class="bg-secondary px-4 py-16 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="faq-title">
        <div class="mx-auto grid max-w-[78rem] gap-10 lg:grid-cols-12">
          <h2 id="faq-title" class="text-3xl text-primary sm:text-4xl lg:col-span-4">Questions fréquentes</h2>
          <div class="divide-y divide-border border-y border-border lg:col-span-8">
            @for (item of faq; track item.question) {
              <details class="group py-5">
                <summary class="flex cursor-pointer list-none items-start justify-between gap-6 font-semibold text-primary">
                  {{ item.question }}
                  <span class="mt-0.5 text-xl leading-none text-muted-foreground transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p class="mt-3 max-w-[65ch] text-base leading-relaxed text-muted-foreground">{{ item.answer }}</p>
              </details>
            }
          </div>
        </div>
      </section>

      <section class="relative overflow-hidden bg-primary px-4 py-20 text-primary-foreground sm:px-6 lg:px-8 lg:py-24" aria-labelledby="sell-title">
        <img src="/assets/images/provisoire/proprietaire-restaurant.jpg" alt="" aria-hidden="true" width="1400" height="933" loading="lazy" class="absolute inset-0 h-full w-full object-cover object-[center_20%]">
        <div class="absolute inset-0" style="background: rgba(15, 27, 45, 0.86)" aria-hidden="true"></div>
        <div class="relative mx-auto flex max-w-[78rem] flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 id="sell-title" class="text-3xl sm:text-4xl">Vous pensez à passer la main ?</h2>
            <p class="mt-3 max-w-[60ch] text-base leading-relaxed text-primary-foreground/75">
              Déposez votre annonce gratuitement. Elle reste anonyme jusqu'à ce que vous acceptiez un repreneur.
            </p>
          </div>
          <a routerLink="/ma/deposer" class="flex-shrink-0 rounded bg-white px-6 py-3.5 text-center font-medium text-primary transition-colors hover:bg-white/90">
            Déposer mon annonce
          </a>
        </div>
      </section>

      <app-footer />
    </div>
  `
})
export class LandingComponent implements OnInit {
  private readonly maService = inject(MaService);
  private readonly listings = signal<MaListingData[]>([]);

  readonly buyerPrice = OFFER_PRICES.MA_ACCESS.label.replace(' / ', ' par ');

  // Annonce réelle mise en avant dans l'en-tête (en vedette d'abord, sinon la plus récente).
  readonly featuredListing = computed(() => {
    const listings = this.listings();
    return listings.find(listing => listing.featured) ?? listings[0] ?? null;
  });

  readonly audiences = [
    {
      title: 'Repreneurs',
      description: 'Rachetez une activité qui a déjà des clients et un historique, au lieu de repartir de zéro.',
      href: '/ma',
      cta: 'Voir les annonces',
      image: '/assets/images/provisoire/rendez-vous-repreneur.jpg',
      imageAlt: 'Deux personnes en rendez-vous autour d’un ordinateur',
    },
    {
      title: 'Cédants',
      description: 'Passez la main discrètement, à un repreneur qui a pris un accès payant et montré son sérieux.',
      href: '/ma/deposer',
      cta: 'Déposer une annonce',
      image: '/assets/images/provisoire/cedant-cafe.jpg',
      imageAlt: 'Le gérant d’un café sert un client au comptoir',
    },
    {
      title: 'Associés',
      description: 'Trouvez un associé pour votre projet, ou rejoignez un projet qui a besoin de vos compétences.',
      href: '/recherche',
      cta: 'Trouver un associé',
      image: '/assets/images/provisoire/bureau-equipe.jpg',
      imageAlt: 'Une équipe au travail dans un bureau lumineux',
    },
  ];

  readonly steps = [
    { title: 'Parcourez les annonces', description: 'Secteur, chiffre d’affaires, marge, ancienneté et fourchette de prix : les annonces anonymisées sont visibles par tous.' },
    { title: 'Ouvrez les dossiers', description: 'L’accès repreneur donne pendant 12 mois les dossiers complets et le contact direct des vendeurs.' },
    { title: 'Échangez avec le cédant', description: 'Vous discutez directement avec le vendeur. Des experts partenaires, comptables et avocats, peuvent sécuriser la suite.' },
  ];

  readonly protectionPoints = [
    { title: 'Annonces anonymisées', description: 'Le public ne voit que le secteur, la région et les chiffres clés. Le nom de l’entreprise reste réservé aux repreneurs que vous acceptez.' },
    { title: 'Engagement de confidentialité', description: 'Pour un projet, vous pouvez exiger un NDA avant toute lecture des détails. La preuve d’acceptation (nom, date, version du texte) est conservée.' },
    { title: 'Accès sous votre contrôle', description: 'Vous acceptez ou refusez chaque demande et retirez un accès quand vous le souhaitez.' },
  ];

  readonly priceRows = [
    { who: 'Cédant', detail: 'Annonce anonymisée, contacts directs des repreneurs.', price: 'Gratuit', href: '/ma/deposer', cta: 'Déposer une annonce' },
    { who: 'Repreneur', detail: 'Dossiers complets et contact des vendeurs pendant 12 mois.', price: OFFER_PRICES.MA_ACCESS.label, href: '/tarifs', cta: 'Voir l’accès repreneur' },
  ];

  readonly faq: LandingFaqItem[] = [
    { question: 'Quel type d’entreprises trouve-t-on sur GoFounders ?', answer: 'Principalement des entreprises numériques françaises : SaaS, e-commerce, sites de contenu, petites agences, avec un chiffre d’affaires entre 50 k€ et 1 M€. Des TPE plus classiques peuvent aussi être proposées.' },
    { question: 'Mon annonce de cession est-elle confidentielle ?', answer: 'Oui. Seule une annonce anonymisée est publique. Le dossier complet et vos coordonnées ne sont accessibles qu’aux repreneurs ayant un accès en cours.' },
    { question: 'Que comprend l’accès repreneur ?', answer: 'Pendant 12 mois, la lecture des dossiers complets de toutes les annonces actives et le contact direct des vendeurs, avec 3 analyses de dossier par l’IA chaque mois.' },
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
