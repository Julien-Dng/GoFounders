import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AccountProduct, EARLY_ACCESS_HOURS, FREE_AI_ANALYSES_PER_MONTH, OFFER_PRICES } from '../../core/config/offers';
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
    <div class="min-h-screen bg-white px-4 pb-20 pt-24 sm:px-6 lg:px-8 lg:pt-32">
      <div class="mx-auto max-w-[78rem]">
        <header class="max-w-[62ch]">
          <h1 class="text-[2.25rem] leading-tight text-primary sm:text-5xl">Tarifs</h1>
          <p class="mt-4 text-base leading-relaxed text-muted-foreground sm:text-base">
            Publier une annonce est gratuit et nous ne prenons aucune commission sur la vente. Les repreneurs paient l'accès aux dossiers,
            les professionnels leur visibilité.
          </p>
          <nav class="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-base" aria-label="Offres par profil">
            @for (anchor of anchors; track anchor.id) {
              <a routerLink="/tarifs" [fragment]="anchor.id" class="font-medium text-accent underline-offset-4 hover:underline">{{ anchor.label }}</a>
            }
          </nav>
        </header>

        @if (statusMessage()) {
          <div class="mt-8 rounded-lg border px-5 py-4 text-base" [class]="statusIsError() ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'" role="status">
            {{ statusMessage() }}
          </div>
        }

        @for (group of offerGroups(); track group.id) {
          <section [id]="group.id" class="mt-14 grid scroll-mt-24 gap-8 border-t border-primary pt-8 lg:grid-cols-12" [attr.aria-labelledby]="group.id + '-title'">
            <div class="lg:col-span-4">
              <h2 [id]="group.id + '-title'" class="text-2xl text-primary sm:text-3xl">{{ group.title }}</h2>
              <p class="mt-3 max-w-[40ch] text-base leading-relaxed text-muted-foreground">{{ group.description }}</p>
            </div>
            <div class="divide-y divide-border lg:col-span-8">
              @for (offer of group.offers; track offer.title; let first = $first) {
                <div class="grid gap-5 py-6 sm:grid-cols-[1fr_15rem] sm:gap-8" [class.pt-0]="first">
                  <div>
                    <h3 class="text-lg font-semibold text-primary">{{ offer.title }}</h3>
                    <p class="mt-1 text-base text-muted-foreground">{{ offer.description }}</p>
                    <ul class="mt-3 space-y-1.5 text-base text-foreground/85">
                      @for (feature of offer.features; track feature) {
                        <li class="flex gap-2.5"><span class="mt-[0.6rem] h-1 w-1 flex-shrink-0 rounded-full bg-foreground/50" aria-hidden="true"></span><span>{{ feature }}</span></li>
                      }
                    </ul>
                  </div>
                  <div class="sm:text-right">
                    <p class="font-display tabular text-2xl font-semibold text-primary">{{ offer.price }}</p>
                    @if (offer.product) {
                      @if (isOwned(offer.product)) {
                        <p class="mt-3 text-sm font-medium text-emerald-700">Actif sur votre compte</p>
                      } @else {
                        <button type="button" (click)="buy(offer.product)" [disabled]="busyProduct() === offer.product" class="mt-3 w-full rounded bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60">
                          {{ busyProduct() === offer.product ? 'Activation…' : (offer.cta ?? 'Activer') }}
                        </button>
                      }
                    } @else if (offer.link) {
                      <a [routerLink]="offer.link.href" [fragment]="offer.link.fragment" class="mt-3 block w-full rounded border border-primary px-4 py-2.5 text-center text-sm font-medium text-primary transition-colors hover:bg-primary hover:text-white">{{ offer.link.label }}</a>
                    }
                  </div>
                </div>
              }
            </div>
          </section>
        }

        <section id="premium" class="mt-14 grid scroll-mt-24 gap-8 border-t border-primary pt-8 lg:grid-cols-12" aria-labelledby="premium-title">
          <div class="lg:col-span-4">
            <h2 id="premium-title" class="text-2xl text-primary sm:text-3xl">Accompagnement</h2>
            <p class="mt-3 max-w-[40ch] text-base leading-relaxed text-muted-foreground">
              Préparation du dossier de cession, présentation de repreneurs ou de cédants qualifiés, mise en relation avec nos experts partenaires.
              Forfait sur devis, sans commission sur la vente.
            </p>
            <ul class="mt-4 space-y-1.5 text-base text-foreground/85">
              <li>Premier échange gratuit, devis sous 48 h ouvrées.</li>
              <li>Un interlocuteur dédié jusqu'à la signature.</li>
            </ul>
            <p class="mt-4 text-sm leading-relaxed text-muted-foreground">GoFounders n'assure pas de conseil juridique : les actes sont réalisés par nos experts partenaires.</p>
            <img src="/assets/images/provisoire/rendez-vous-repreneur.jpg" alt="Deux personnes en rendez-vous de travail" width="1400" height="933" loading="lazy" class="mt-6 hidden aspect-[3/2] w-full rounded-md object-cover lg:block">
          </div>
          <div class="rounded-lg border border-border p-6 lg:col-span-8">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="premium-topic" class="mb-1.5 block text-sm font-medium text-foreground/85">Votre besoin</label>
                <select id="premium-topic" [value]="premiumTopic()" (change)="premiumTopic.set($any($event.target).value)" class="w-full rounded border border-input bg-white px-3 py-2.5 text-base outline-none focus:border-primary">
                  <option value="cession">Céder mon entreprise</option>
                  <option value="reprise">Reprendre une entreprise</option>
                  <option value="associes">Trouver un associé</option>
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
              <button type="button" (click)="sendPremium()" [disabled]="premiumSending() || premiumMessage().trim().length < 20" class="rounded bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">
                {{ premiumSending() ? 'Envoi…' : 'Demander un devis' }}
              </button>
            </div>
            @if (premiumResult()) {
              <p class="mt-3 text-sm" [class]="premiumResultIsError() ? 'text-destructive' : 'text-emerald-700'" role="status">{{ premiumResult() }}</p>
            }
          </div>
        </section>

        <section id="associes" class="mt-14 scroll-mt-24 border-t border-primary pt-8" aria-labelledby="associes-title">
          <div class="max-w-[62ch]">
            <h2 id="associes-title" class="text-2xl text-primary sm:text-3xl">Trouver un associé</h2>
            <p class="mt-3 text-base leading-relaxed text-muted-foreground">
              Gratuit pour se faire connaître, PRO pour trouver son associé plus vite, PREMIUM pour être accompagné. Les associés n'ont pas besoin de payer.
            </p>
          </div>

          <div class="relative mt-8 overflow-x-auto">
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
      </div>
    </div>
  `
})
export class TarifsComponent {
  private readonly auth = inject(AuthService);
  private readonly payment = inject(PaymentService);
  private readonly router = inject(Router);

  readonly anchors = [
    { id: 'repreneurs', label: 'Repreneurs' },
    { id: 'cedants', label: 'Cédants' },
    { id: 'pros', label: 'Professionnels' },
    { id: 'premium', label: 'Accompagnement' },
    { id: 'associes', label: 'Trouver un associé' },
  ];

  readonly busyProduct = signal<AccountProduct | null>(null);
  readonly statusMessage = signal('');
  readonly statusIsError = signal(false);
  readonly premiumTopic = signal<PremiumTopic>('cession');
  readonly premiumMessage = signal('');
  readonly premiumPhone = signal('');
  readonly premiumSending = signal(false);
  readonly premiumResult = signal('');
  readonly premiumResultIsError = signal(false);

  readonly offerGroups = computed(() => [
    {
      id: 'repreneurs',
      title: 'Repreneurs',
      description: 'Accédez aux dossiers complets des entreprises à reprendre et contactez directement les vendeurs.',
      offers: [
        {
          title: 'Accès repreneur',
          price: OFFER_PRICES.MA_ACCESS.label,
          description: 'Pour étudier les annonces et contacter les vendeurs.',
          features: [
            'Dossiers complets de toutes les annonces',
            'Contact direct des vendeurs',
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
      description: 'Publiez gratuitement, puis donnez plus de visibilité et de crédibilité à votre annonce si vous le souhaitez.',
      offers: [
        {
          title: 'Publication',
          price: 'Gratuit',
          description: 'Offre de lancement.',
          features: ["Annonce anonymisée, préparée avec l'IA", 'Vos coordonnées réservées aux repreneurs avec un accès', 'Contact direct des repreneurs'],
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
        { text: 'Porteurs de projet : 3 nouveaux contacts par mois', included: true },
        { text: 'Associés : contacts illimités', included: true },
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
    ['Nouveaux contacts par mois', 'Porteurs de projet : 3. Associés : illimités', 'Illimités', 'Illimités'],
    ['Réponses dans vos conversations', 'Illimitées', 'Illimitées', 'Illimitées'],
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
