import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountProduct, EARLY_ACCESS_HOURS, FREE_AI_ANALYSES_PER_MONTH, OFFER_PRICES } from '../../core/config/offers';
import { FEATURES } from '../../core/config/features';
import { hasBuyerPlus, isActiveUntil } from '../../core/models/user.model';
import { PaymentService, PremiumTopic } from '../../core/services/payment.service';
import { PricingFeature } from '../../shared/components/pricing-card/pricing-card.component';
import { AuthService } from '../../core/services/auth.service';

// Offres « reprise » (refonte) : action = achat (paiement simulé tant que Stripe n'est pas branché) ou lien.
interface RepriseOffer {
  title: string;
  price: string;
  description: string;
  cta?: string;
  features: string[];
  product?: AccountProduct;
  link?: { href: string; label: string; fragment?: string };
}

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  badge?: string;
  highlights: string[];
  features: PricingFeature[];
  cta: string;
  href: string;
  reassurance: string;
  variant: 'free' | 'pro' | 'premium';
}

@Component({
  selector: 'app-tarifs',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-20 pt-24 sm:px-6 lg:px-8 lg:pt-32">
      <div class="mx-auto max-w-[78rem]">
        <header class="mx-auto max-w-[62ch] text-center">
          <h1 class="text-[2.25rem] leading-tight text-primary sm:text-5xl">Tarifs</h1>
          <p class="mt-4 text-lg leading-relaxed text-muted-foreground">
            Publier une annonce est gratuit et nous ne prenons aucune commission sur la vente. Les repreneurs paient l'accès aux dossiers,
            les professionnels leur visibilité.
          </p>
          <nav class="mt-7 flex flex-wrap justify-center gap-2" aria-label="Offres par profil">
            @for (anchor of anchors; track anchor.id) {
              <a routerLink="/tarifs" [fragment]="anchor.id" class="rounded-full bg-white px-4 py-2 text-base font-semibold text-primary shadow-sm ring-1 ring-border transition-colors hover:text-accent">{{ anchor.label }}</a>
            }
          </nav>
        </header>

        @if (statusMessage()) {
          <div class="mx-auto mt-8 max-w-3xl rounded-xl border px-5 py-4 text-base" [class]="statusIsError() ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'" role="status">
            {{ statusMessage() }}
          </div>
        }

        @for (group of offerGroups(); track group.id) {
          <section [id]="group.id" class="mt-20 scroll-mt-24" [attr.aria-labelledby]="group.id + '-title'">
            <div class="mx-auto max-w-[60ch] text-center">
              <h2 [id]="group.id + '-title'" class="text-3xl text-primary sm:text-4xl">{{ group.title }}</h2>
              <p class="mt-3 text-lg leading-relaxed text-muted-foreground">{{ group.description }}</p>
            </div>
            <div class="mx-auto mt-10 grid gap-6" [class]="group.offers.length >= 3 ? 'md:grid-cols-3' : group.offers.length === 2 ? 'max-w-4xl md:grid-cols-2' : 'max-w-md'">
              @for (offer of group.offers; track offer.title; let first = $first) {
                <div class="flex flex-col rounded-2xl bg-white p-7 shadow-lg" [class]="first && group.offers.length > 1 ? 'ring-2 ring-accent' : 'ring-1 ring-border'">
                  <h3 class="text-lg font-bold text-primary">{{ offer.title }}</h3>
                  <p class="tabular mt-3 text-[2rem] font-extrabold leading-tight tracking-tight text-primary">{{ offer.price }}</p>
                  <p class="mt-2 text-base text-muted-foreground">{{ offer.description }}</p>
                  <ul class="mt-5 flex-1 space-y-2.5 border-t border-border pt-5 text-base text-foreground/85">
                    @for (feature of offer.features; track feature) {
                      <li class="flex gap-2.5">
                        <svg class="mt-1 flex-shrink-0 text-accent" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>{{ feature }}</span>
                      </li>
                    }
                  </ul>
                  <div class="mt-7">
                    @if (offer.product) {
                      @if (isOwned(offer.product)) {
                        <p class="rounded-lg bg-emerald-50 py-3 text-center font-semibold text-emerald-800">Actif sur votre compte</p>
                      } @else {
                        <button type="button" (click)="buy(offer.product)" [disabled]="busyProduct() === offer.product" class="w-full rounded-lg px-4 py-3 font-semibold text-white transition-colors disabled:cursor-wait disabled:opacity-60" [class]="first && group.offers.length > 1 ? 'bg-accent hover:bg-accent/90' : 'bg-primary hover:bg-primary/90'">
                          {{ busyProduct() === offer.product ? 'Activation…' : (offer.cta ?? 'Activer') }}
                        </button>
                      }
                    } @else if (offer.link) {
                      <a [routerLink]="offer.link.href" [fragment]="offer.link.fragment" class="block w-full rounded-lg bg-primary px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-primary/90">{{ offer.link.label }}</a>
                    }
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <section id="premium" class="mt-20 grid scroll-mt-24 gap-8 overflow-hidden rounded-3xl bg-white p-6 shadow-lg ring-1 ring-border sm:p-10 lg:grid-cols-12" aria-labelledby="premium-title">
          <div class="lg:col-span-4">
            <h2 id="premium-title" class="text-3xl text-primary sm:text-4xl">Accompagnement</h2>
            <p class="mt-3 max-w-[40ch] text-base leading-relaxed text-muted-foreground">
              Préparation du dossier de cession, présentation de repreneurs ou de cédants qualifiés, mise en relation avec nos experts partenaires.
              Forfait sur devis, sans commission sur la vente.
            </p>
            <ul class="mt-4 space-y-1.5 text-base text-foreground/85">
              <li>Premier échange gratuit, devis sous 48 h ouvrées.</li>
              <li>Un interlocuteur dédié jusqu'à la signature.</li>
            </ul>
            <p class="mt-4 text-sm leading-relaxed text-muted-foreground">GoFounders n'assure pas de conseil juridique : les actes sont réalisés par nos experts partenaires.</p>
            <img src="/assets/images/provisoire/accord-conclu.jpg" alt="Deux personnes se félicitent après un rendez-vous de travail" width="1400" height="933" loading="lazy" class="mt-6 hidden aspect-[3/2] w-full rounded-2xl object-cover lg:block">
          </div>
          <div class="rounded-2xl bg-secondary p-6 lg:col-span-8">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="premium-topic" class="mb-1.5 block text-sm font-medium text-foreground/85">Votre besoin</label>
                <select id="premium-topic" [value]="premiumTopic()" (change)="premiumTopic.set($any($event.target).value)" class="w-full rounded border border-input bg-white px-3 py-2.5 text-base outline-none focus:border-primary">
                  <option value="cession">Céder mon entreprise</option>
                  <option value="reprise">Reprendre une entreprise</option>
                  @if (features.associates) {
                    <option value="associes">Trouver un associé</option>
                  }
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label for="premium-phone" class="mb-1.5 block text-sm font-medium text-foreground/85">Téléphone (facultatif)</label>
                <input id="premium-phone" type="tel" maxlength="30" [value]="premiumPhone()" (input)="premiumPhone.set($any($event.target).value)" class="w-full rounded border border-input bg-white px-3 py-2.5 text-base outline-none focus:border-primary">
              </div>
            </div>
            <label for="premium-message" class="mb-1.5 mt-4 block text-sm font-medium text-foreground/85">Votre situation en quelques phrases</label>
            <textarea id="premium-message" rows="4" maxlength="3000" [value]="premiumMessage()" (input)="premiumMessage.set($any($event.target).value)" class="w-full resize-y rounded border border-input bg-white px-3 py-2.5 text-base outline-none focus:border-primary" placeholder="Activité, taille, calendrier souhaité"></textarea>
            <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p class="text-sm text-muted-foreground">20 caractères minimum.</p>
              <button type="button" (click)="sendPremium()" [disabled]="premiumSending() || premiumMessage().trim().length < 20" class="rounded-lg bg-accent px-5 py-3 font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50">
                {{ premiumSending() ? 'Envoi…' : 'Demander un devis' }}
              </button>
            </div>
            @if (premiumResult()) {
              <p class="mt-3 text-sm" [class]="premiumResultIsError() ? 'text-destructive' : 'text-emerald-700'" role="status">{{ premiumResult() }}</p>
            }
          </div>
        </section>

        @if (features.associates) {
        <section id="associes" class="mt-20 scroll-mt-24" aria-labelledby="associes-title">
          <div class="mx-auto max-w-[62ch] text-center">
            <h2 id="associes-title" class="text-3xl text-primary sm:text-4xl">Trouver un associé</h2>
            <p class="mt-3 text-base leading-relaxed text-muted-foreground">
              Gratuit pour se faire connaître, PRO pour trouver son associé plus vite, PREMIUM pour être accompagné. Les associés n'ont pas besoin de payer.
            </p>
          </div>

          <div class="relative mt-10 overflow-x-auto rounded-2xl bg-white p-4 shadow-lg ring-1 ring-border sm:p-6">
            <table class="tabular w-full min-w-[680px] border-collapse text-left text-base">
              <caption class="sr-only">Comparaison des formules FREE, PRO et PREMIUM</caption>
              <thead>
                <tr class="border-b border-primary align-bottom">
                  <th scope="col" class="w-[34%] py-4 pr-4 font-medium text-muted-foreground">Formule</th>
                  @for (plan of plans; track plan.name) {
                    <th scope="col" class="w-[22%] px-4 py-4">
                      <span class="block font-semibold text-primary">{{ plan.name }}</span>
                      <span class="font-display mt-1 block text-2xl font-semibold text-primary">{{ plan.price }}<span class="font-sans text-sm font-normal text-muted-foreground">{{ plan.period === '/mois' ? ' par mois' : '' }}</span></span>
                      <span class="mt-1 block text-sm font-normal text-muted-foreground">{{ plan.description }}</span>
                    </th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of comparisonRows; track $index) {
                  <tr class="border-b border-border">
                    <th scope="row" class="py-3.5 pr-4 font-normal text-foreground/85">{{ row[0] }}</th>
                    <td class="px-4 py-3.5 text-foreground/85">
                          @if (row[1] === '✓') {
                            <span aria-hidden="true">Inclus</span><span class="sr-only">Inclus</span>
                          } @else if (row[1] === '✗') {
                            <span class="text-muted-foreground" aria-hidden="true">–</span><span class="sr-only">Non inclus</span>
                          } @else {
                            {{ row[1] }}
                          }
                    </td>
                    <td class="px-4 py-3.5 text-foreground/85">
                          @if (row[2] === '✓') {
                            <span aria-hidden="true">Inclus</span><span class="sr-only">Inclus</span>
                          } @else if (row[2] === '✗') {
                            <span class="text-muted-foreground" aria-hidden="true">–</span><span class="sr-only">Non inclus</span>
                          } @else {
                            {{ row[2] }}
                          }
                    </td>
                    <td class="px-4 py-3.5 text-foreground/85">
                          @if (row[3] === '✓') {
                            <span aria-hidden="true">Inclus</span><span class="sr-only">Inclus</span>
                          } @else if (row[3] === '✗') {
                            <span class="text-muted-foreground" aria-hidden="true">–</span><span class="sr-only">Non inclus</span>
                          } @else {
                            {{ row[3] }}
                          }
                    </td>
                  </tr>
                }
                <tr>
                  <td class="py-5 pr-4"></td>
                  @for (plan of plans; track plan.name) {
                    <td class="px-4 py-5 align-top">
                      <a [routerLink]="planHref(plan)" [class]="plan.variant === 'pro'
                        ? 'block rounded bg-primary px-4 py-2.5 text-center text-sm font-medium text-white transition-colors hover:bg-primary/90'
                        : 'block rounded border border-primary px-4 py-2.5 text-center text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white'">{{ plan.cta }}</a>
                      @if (plan.reassurance) {
                        <p class="mt-2 text-center text-sm text-muted-foreground">{{ plan.reassurance }}</p>
                      }
                    </td>
                  }
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        }
      </div>
    </div>
  `
})
export class TarifsComponent {
  private readonly auth = inject(AuthService);
  private readonly payment = inject(PaymentService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly features = FEATURES;
  readonly anchors = [
    { id: 'repreneurs', label: 'Repreneurs' },
    { id: 'cedants', label: 'Cédants' },
    ...(FEATURES.pros ? [{ id: 'pros', label: 'Professionnels' }] : []),
    { id: 'premium', label: 'Accompagnement' },
    ...(FEATURES.associates ? [{ id: 'associes', label: 'Trouver un associé' }] : []),
  ];

  readonly busyProduct = signal<AccountProduct | null>(null);
  readonly statusMessage = signal(
    this.route.snapshot.queryParamMap.get('paiement') === 'annule' ? 'Paiement annulé : aucun montant n’a été prélevé.' : ''
  );
  readonly statusIsError = signal(false);
  readonly premiumTopic = signal<PremiumTopic>('cession');
  readonly premiumMessage = signal('');
  readonly premiumPhone = signal('');
  readonly premiumSending = signal(false);
  readonly premiumResult = signal('');
  readonly premiumResultIsError = signal(false);

  readonly offerGroups = computed(() => this.allOfferGroups()
    .filter(group => group.id !== 'pros' || FEATURES.pros)
    .map(group => ({
      ...group,
      offers: group.offers.filter(offer =>
        !(offer.product === 'MA_PLUS' && !FEATURES.buyerPlus)
        && !((offer.title === 'Mise en avant' || offer.title === 'Dossier vérifié') && !FEATURES.sellerPaidOffers)
      ),
    })));

  private readonly allOfferGroups = computed(() => [
    {
      id: 'repreneurs',
      title: 'Repreneurs',
      description: 'Demandez l’accès aux dossiers complets des entreprises à reprendre et échangez directement avec les vendeurs.',
      offers: [
        {
          title: 'Accès repreneur',
          price: OFFER_PRICES.MA_ACCESS.label,
          description: 'Pour étudier les entreprises à reprendre et entrer en contact avec leurs vendeurs.',
          features: [
            'Demandes d’accès aux dossiers complets de toutes les annonces',
            'Dossier et contact du vendeur ouverts dès qu’il accepte votre demande',
            'Engagement de confidentialité accepté en ligne, une fois par dossier',
            `${FREE_AI_ANALYSES_PER_MONTH} analyses de dossier par l'IA chaque mois`,
            'Valable 12 mois, sans renouvellement automatique',
          ],
          product: 'MA_ACCESS',
          cta: "Prendre l'accès repreneur",
        },
        {
          title: 'Accès repreneur Plus',
          price: OFFER_PRICES.MA_PLUS.label,
          description: 'Pour les repreneurs actifs qui ne veulent rater aucune opportunité.',
          features: [
            "Tout l'accès repreneur, plus :",
            "Analyses de dossier par l'IA illimitées",
            'Alertes sur les nouvelles annonces qui correspondent à votre recherche',
            `Accès anticipé : les nouvelles annonces ${EARLY_ACCESS_HOURS} h avant les autres`,
          ],
          product: 'MA_PLUS',
          cta: "Prendre l'accès Plus",
        },
      ] as RepriseOffer[],
    },
    {
      id: 'cedants',
      title: 'Cédants',
      description: FEATURES.sellerPaidOffers
        ? 'Publiez gratuitement, puis donnez plus de visibilité et de crédibilité à votre annonce si vous le souhaitez.'
        : 'Publiez gratuitement, sans commission sur la vente, et gardez la main sur qui voit votre dossier.',
      offers: [
        {
          title: 'Publication',
          price: 'Gratuit',
          description: 'Offre de lancement.',
          features: ["Annonce anonymisée, préparée avec l'IA et relue par notre équipe avant publication", 'Vous choisissez les repreneurs qui voient votre dossier et vos coordonnées', 'Chaque repreneur accepte un engagement de confidentialité', 'Estimation gratuite de la valeur de votre entreprise'],
          link: { href: '/ma/deposer', label: 'Déposer mon annonce' },
        },
        {
          title: 'Mise en avant',
          price: `${OFFER_PRICES.FEATURE_7D.amount} € ou ${OFFER_PRICES.FEATURE_30D.amount} €`,
          description: 'Votre annonce en tête de liste pendant 7 ou 30 jours, avec le badge « En vedette ».',
          features: ['Affichée avant les autres annonces', 'Badge « En vedette »', 'Sans engagement'],
          link: { href: '/ma/mes-annonces', label: 'Mettre une annonce en avant' },
        },
        {
          title: 'Dossier vérifié',
          price: OFFER_PRICES.VERIFICATION.label,
          description: "Vos chiffres contrôlés par l'équipe GoFounders.",
          features: ["Vérification de vos justificatifs (Stripe, Shopify, bilans)", 'Badge « Dossier vérifié » sur l’annonce', 'Plus de demandes de repreneurs sérieux'],
          link: { href: '/ma/mes-annonces', label: 'Faire vérifier mon dossier' },
        },
      ] as RepriseOffer[],
    },
    {
      id: 'pros',
      title: 'Professionnels',
      description: 'Experts-comptables, avocats, notaires et cabinets de cession : soyez visibles auprès des cédants et des repreneurs.',
      offers: [
        {
          title: 'Annuaire des professionnels',
          price: OFFER_PRICES.PRO_DIRECTORY.label,
          description: 'Votre fiche dans l’annuaire GoFounders.',
          features: ['Fiche avec votre métier, votre zone et votre site', 'Contactable par tous les membres', 'Sans engagement'],
          ...(this.isPro() ? { product: 'PRO_DIRECTORY' as const, cta: 'Activer ma fiche' } : { link: { href: '/inscription', label: 'Créer un compte professionnel' } }),
        },
        {
          title: 'Compte pro',
          price: OFFER_PRICES.PRO_ACCOUNT.label,
          description: 'Pour les cabinets qui accompagnent plusieurs cessions sur GoFounders.',
          features: ["Fiche dans l'annuaire, mise en avant", 'Publication de plusieurs annonces pour vos clients', 'Contact direct des repreneurs', 'Sans engagement'],
          ...(this.isPro() ? { product: 'PRO_ACCOUNT' as const, cta: 'Activer le compte pro' } : { link: { href: '/inscription', label: 'Créer un compte professionnel' } }),
        },
      ] as RepriseOffer[],
    },
  ]);

  private isPro(): boolean {
    return this.auth.currentUser()?.profileType === 'pro';
  }

  isOwned(product: AccountProduct): boolean {
    const user = this.auth.currentUser();

    switch (product) {
      case 'MA_ACCESS':
        return !!user?.maAccess;
      case 'MA_PLUS':
        return hasBuyerPlus(user);
      case 'PRO_DIRECTORY':
        return isActiveUntil(user?.proDirectoryUntil);
      case 'PRO_ACCOUNT':
        return isActiveUntil(user?.proAccountUntil);
      default:
        return false;
    }
  }

  async buy(product: AccountProduct): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/connexion'], { queryParams: { returnUrl: '/tarifs' } });
      return;
    }

    this.busyProduct.set(product);

    try {
      const result = await this.payment.purchase(product);
      this.statusIsError.set(!result.success);
      this.statusMessage.set(result.message);
    } finally {
      this.busyProduct.set(null);
    }
  }

  async sendPremium(): Promise<void> {
    if (!this.auth.isAuthenticated()) {
      await this.router.navigate(['/connexion'], { queryParams: { returnUrl: '/tarifs' } });
      return;
    }

    this.premiumSending.set(true);

    try {
      const result = await this.payment.requestPremium(this.premiumTopic(), this.premiumMessage().trim(), this.premiumPhone().trim() || undefined);
      this.premiumResultIsError.set(!result.success);
      this.premiumResult.set(result.message);

      if (result.success) {
        this.premiumMessage.set('');
      }
    } finally {
      this.premiumSending.set(false);
    }
  }

  readonly plans: Plan[] = [
    {
      name: 'FREE',
      price: '0€',
      period: 'gratuit',
      description: 'Pour rejoindre la communauté et se faire connaître',
      features: [
        { text: 'Profil complet et visible', included: true },
        { text: 'Recherche et profils illimités', included: true },
        { text: 'Score de compatibilité', included: true },
        { text: 'Réponses illimitées à vos conversations', included: true },
        { text: 'Porteur de projet : vous pouvez écrire à 3 nouveaux associés par mois', included: true },
        { text: 'Associé : vous écrivez à autant de projets que vous voulez', included: true },
        { text: 'Raisons détaillées du score', included: false },
        { text: 'Assistant IA personnel', included: false },
      ],
      highlights: ['Gratuit pour les associés', 'Recherche illimitée', 'Réponses illimitées'],
      cta: 'Créer mon profil',
      href: '/inscription',
      reassurance: '',
      variant: 'free',
    },
    {
      name: 'PRO',
      price: '49€',
      period: '/mois',
      badge: 'Porteurs de projet',
      description: 'Trouvez votre associé plus vite',
      features: [
        { text: 'Tout de FREE, plus :', included: true },
        { text: 'Contacts illimités', included: true },
        { text: 'Matching intelligent : pourquoi chaque profil vous correspond', included: true },
        { text: 'Assistant IA personnel', included: true },
        { text: 'Recherche avancée (mots-clés, compétences, score minimum)', included: true },
        { text: 'Projet mis en avant dans les résultats', included: true },
      ],
      highlights: ['Contacts illimités', 'Matching intelligent', 'Assistant IA'],
      cta: 'Passer en PRO',
      href: '/abonnement',
      reassurance: 'Sans engagement',
      variant: 'pro',
    },
    {
      name: 'PREMIUM',
      price: 'Sur devis',
      period: '',
      description: 'On vous présente les bonnes personnes',
      features: [
        { text: 'Tout de PRO, plus :', included: true },
        { text: "Présentations qualifiées d'associés", included: true },
        { text: 'Mise en relation avec des investisseurs', included: true },
        { text: 'Mise en relation avec des experts juridiques partenaires', included: true },
        { text: 'Un interlocuteur dédié', included: true },
      ],
      highlights: ['Accompagnement', 'Investisseurs', 'Experts partenaires'],
      cta: 'Premier échange gratuit',
      href: '/abonnement',
      reassurance: 'Réponse sous 48 h',
      variant: 'premium',
    },
  ];

  readonly comparisonRows: string[][] = [
    ['Profil et recherche', 'Illimités', 'Illimités', 'Illimités'],
    ['Porteur de projet : écrire à de nouveaux associés', '3 par mois', 'Sans limite', 'Sans limite'],
    ['Associé : écrire à de nouveaux porteurs de projet', 'Sans limite', 'Sans limite', 'Sans limite'],
    ['Répondre dans vos conversations', 'Sans limite', 'Sans limite', 'Sans limite'],
    ['Score de compatibilité', '✓', '✓', '✓'],
    ['Matching intelligent (raisons détaillées)', '✗', '✓', '✓'],
    ['Assistant IA personnel', '✗', '✓', '✓'],
    ['Recherche avancée', '✗', '✓', '✓'],
    ['Projet mis en avant dans les résultats', '✗', '✓', '✓'],
    ["Présentations qualifiées d'associés", '✗', '✗', '✓'],
    ['Mise en relation investisseurs et experts juridiques partenaires', '✗', '✗', '✓'],
    ['Interlocuteur dédié', '✗', '✗', '✓'],
    ['Support', 'Email', 'Email prioritaire', 'Interlocuteur dédié'],
  ];

  planHref(plan: Plan): string {
    if (this.auth.isAuthenticated()) {
      return plan.variant === 'free' ? '/dashboard' : '/abonnement';
    }

    return plan.href;
  }
}
