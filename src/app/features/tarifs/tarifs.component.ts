import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AccountProduct, EARLY_ACCESS_HOURS, FREE_AI_ANALYSES_PER_MONTH, OFFER_PRICES } from '../../core/config/offers';
import { hasBuyerPlus, isActiveUntil } from '../../core/models/user.model';
import { PaymentService, PremiumTopic } from '../../core/services/payment.service';
import { PricingCardComponent, PricingFeature } from '../../shared/components/pricing-card/pricing-card.component';
import { AuthService } from '../../core/services/auth.service';

// Offres « reprise » (refonte) : action = achat (paiement simulé tant que Stripe n'est pas branché) ou lien.
interface RepriseOffer {
  title: string;
  price: string;
  description: string;
  badge?: string;
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
  imports: [PricingCardComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1400px]">
        <div class="mb-16 text-center">
          <h1 class="mb-6 text-4xl font-bold tracking-tight text-primary sm:text-5xl lg:text-6xl">Des offres simples, sans commission</h1>
          <p class="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Publier une annonce est gratuit. Les repreneurs paient l'accès aux dossiers, les professionnels leur visibilité.
          </p>
          <nav class="mt-8 flex flex-wrap justify-center gap-2" aria-label="Offres par profil">
            @for (anchor of anchors; track anchor.id) {
              <a routerLink="/tarifs" [fragment]="anchor.id" class="rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:border-accent hover:text-accent">{{ anchor.label }}</a>
            }
          </nav>
        </div>

        @if (statusMessage()) {
          <div class="mx-auto mb-10 max-w-3xl rounded-xl border px-5 py-4 text-sm" [class]="statusIsError() ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'" role="status">
            {{ statusMessage() }}
          </div>
        }

        @for (group of offerGroups(); track group.id) {
          <section [id]="group.id" class="mb-20 scroll-mt-28" [attr.aria-labelledby]="group.id + '-title'">
            <div class="mb-8">
              <h2 [id]="group.id + '-title'" class="text-3xl font-bold text-primary">{{ group.title }}</h2>
              <p class="mt-2 max-w-3xl text-muted-foreground">{{ group.description }}</p>
            </div>
            <div class="grid gap-6" [class]="group.offers.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'">
              @for (offer of group.offers; track offer.title) {
                <div class="flex flex-col rounded-2xl border-2 bg-white p-6 shadow-sm" [class]="offer.badge ? 'border-accent' : 'border-border'">
                  @if (offer.badge) {
                    <span class="mb-3 inline-flex w-fit rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white">{{ offer.badge }}</span>
                  }
                  <h3 class="text-xl font-bold text-primary">{{ offer.title }}</h3>
                  <div class="mt-2 text-2xl font-bold text-accent">{{ offer.price }}</div>
                  <p class="mt-2 text-sm text-muted-foreground">{{ offer.description }}</p>
                  <ul class="mt-4 flex-1 space-y-2 text-sm text-foreground/85">
                    @for (feature of offer.features; track feature) {
                      <li class="flex items-start gap-2">
                        <svg class="mt-0.5 flex-shrink-0 text-accent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>{{ feature }}</span>
                      </li>
                    }
                  </ul>
                  @if (offer.product) {
                    @if (isOwned(offer.product)) {
                      <div class="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">Actif sur votre compte</div>
                    } @else {
                      <button type="button" (click)="buy(offer.product)" [disabled]="busyProduct() === offer.product" class="mt-6 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60">
                        {{ busyProduct() === offer.product ? 'Activation…' : 'Choisir cette offre' }}
                      </button>
                    }
                  } @else if (offer.link) {
                    <a [routerLink]="offer.link.href" [fragment]="offer.link.fragment" class="mt-6 rounded-lg border-2 border-border px-4 py-3 text-center text-sm font-semibold transition-colors hover:border-accent">{{ offer.link.label }}</a>
                  }
                </div>
              }
            </div>
          </section>
        }

        <section id="premium" class="mb-20 scroll-mt-28 rounded-3xl bg-primary px-6 py-10 text-primary-foreground sm:px-10" aria-labelledby="premium-title">
          <div class="grid gap-10 lg:grid-cols-2">
            <div>
              <h2 id="premium-title" class="text-3xl font-bold">Accompagnement PREMIUM</h2>
              <p class="mt-3 text-white/85">
                Pour aller vite et sereinement : préparation du dossier de cession, présentation de repreneurs ou de cédants qualifiés,
                mise en relation avec nos experts partenaires (comptables, avocats). Forfait sur devis, sans commission sur la vente.
              </p>
              <ul class="mt-5 space-y-2 text-sm text-white/85">
                <li>• Premier échange gratuit, devis sous 48 h ouvrées</li>
                <li>• Un interlocuteur dédié du premier contact à la signature</li>
                <li>• GoFounders n'assure pas de conseil juridique : les actes sont réalisés par nos experts partenaires</li>
              </ul>
            </div>
            <div class="rounded-2xl bg-white p-6 text-foreground">
              <label for="premium-topic" class="mb-1 block text-sm font-semibold">Votre besoin</label>
              <select id="premium-topic" [value]="premiumTopic()" (change)="premiumTopic.set($any($event.target).value)" class="mb-4 w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-accent">
                <option value="cession">Céder mon entreprise</option>
                <option value="reprise">Reprendre une entreprise</option>
                <option value="associes">Trouver un associé</option>
                <option value="autre">Autre</option>
              </select>
              <label for="premium-message" class="mb-1 block text-sm font-semibold">Votre situation en quelques phrases</label>
              <textarea id="premium-message" rows="4" maxlength="3000" [value]="premiumMessage()" (input)="premiumMessage.set($any($event.target).value)" class="mb-4 w-full resize-y rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-accent" placeholder="Activité, taille, calendrier souhaité…"></textarea>
              <label for="premium-phone" class="mb-1 block text-sm font-semibold">Téléphone <span class="font-normal text-muted-foreground">(facultatif)</span></label>
              <input id="premium-phone" type="tel" maxlength="30" [value]="premiumPhone()" (input)="premiumPhone.set($any($event.target).value)" class="mb-4 w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-accent">
              <button type="button" (click)="sendPremium()" [disabled]="premiumSending() || premiumMessage().trim().length < 20" class="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50">
                {{ premiumSending() ? 'Envoi…' : 'Demander un devis' }}
              </button>
              @if (premiumResult()) {
                <p class="mt-3 text-sm" [class]="premiumResultIsError() ? 'text-destructive' : 'text-emerald-700'" role="status">{{ premiumResult() }}</p>
              }
            </div>
          </div>
        </section>

        <div id="associes" class="mb-8 scroll-mt-28">
          <h2 class="text-3xl font-bold text-primary">Trouver un associé</h2>
          <p class="mt-2 max-w-3xl text-muted-foreground">Gratuit pour se faire connaître, PRO pour trouver son associé plus vite, PREMIUM pour être accompagné.</p>
        </div>

        <div class="mb-20 grid gap-8 lg:grid-cols-3">
          @for (plan of plans; track plan.name; let index = $index) {
            <div [class]="'animate-fade-in-up delay-' + ((index + 1) * 100)">
              <app-pricing-card
                [name]="plan.name"
                [price]="plan.price"
                [period]="plan.period"
                [description]="plan.description"
                [badge]="plan.badge ?? ''"
                [highlights]="plan.highlights"
                [features]="plan.features"
                [cta]="plan.cta"
                [href]="planHref(plan)"
                [reassurance]="plan.reassurance"
                [variant]="plan.variant"
              />
            </div>
          }
        </div>

        <div class="rounded-2xl border border-border bg-card p-4 sm:p-8 lg:p-12">
          <h2 class="mb-8 text-center text-3xl font-bold text-primary sm:mb-10 sm:text-4xl">Comparaison détaillée</h2>

          <div class="max-w-full overflow-hidden rounded-xl border border-border" style="contain: inline-size;">
            <div class="max-w-full overflow-x-auto overscroll-x-contain">
            <table class="w-full min-w-[1000px] table-fixed">
              <caption class="sr-only">Comparaison détaillée des formules FREE, PRO et PREMIUM</caption>
              <colgroup>
                <col class="w-[28%]" />
                <col class="w-[20%]" />
                <col class="w-[22%]" />
                <col class="w-[30%]" />
              </colgroup>
              <thead>
                <tr class="border-b-2 border-border bg-background/60">
                  <th scope="col" class="px-5 py-5 text-left text-sm font-bold uppercase tracking-wide text-primary sm:px-6">Fonctionnalité</th>
                  <th scope="col" class="px-5 py-5 text-center sm:px-6">
                    <span class="block font-bold text-primary">FREE</span>
                  </th>
                  <th scope="col" class="bg-accent/5 px-5 py-5 text-center sm:px-6">
                    <span class="block font-bold text-accent">PRO</span>
                    <span class="mt-1 block text-sm font-medium text-muted-foreground">49€/mois</span>
                  </th>
                  <th scope="col" class="px-5 py-5 text-center sm:px-6">
                    <span class="block font-bold text-primary">PREMIUM</span>
                    <span class="mt-1 block text-sm font-medium text-muted-foreground">à partir de ~199€/mois</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (row of comparisonRows; track $index) {
                  <tr class="border-b border-border transition-colors hover:bg-background/50">
                    <th scope="row" class="px-5 py-4 text-left font-semibold text-primary sm:px-6">{{ row[0] }}</th>
                    <td class="px-5 py-4 text-center sm:px-6">
                      @if (row[1] === '✓') {
                        <svg aria-hidden="true" class="mx-auto text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span class="sr-only">Inclus</span>
                      } @else if (row[1] === '✗') {
                        <svg aria-hidden="true" class="mx-auto text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        <span class="sr-only">Non inclus</span>
                      } @else {
                        {{ row[1] }}
                      }
                    </td>
                    <td class="bg-accent/[0.03] px-5 py-4 text-center sm:px-6">
                      @if (row[2] === '✓') {
                        <svg aria-hidden="true" class="mx-auto text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span class="sr-only">Inclus</span>
                      } @else if (row[2] === '✗') {
                        <svg aria-hidden="true" class="mx-auto text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        <span class="sr-only">Non inclus</span>
                      } @else {
                        {{ row[2] }}
                      }
                    </td>
                    <td class="px-5 py-4 text-center sm:px-6">
                      @if (row[3] === '✓') {
                        <svg aria-hidden="true" class="mx-auto text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span class="sr-only">Inclus</span>
                      } @else if (row[3] === '✗') {
                        <svg aria-hidden="true" class="mx-auto text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        <span class="sr-only">Non inclus</span>
                      } @else {
                        {{ row[3] }}
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
          </div>
        </div>

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
            'Paiement unique, sans abonnement',
          ],
          product: 'MA_ACCESS',
        },
        {
          title: 'Accès repreneur Plus',
          price: OFFER_PRICES.MA_PLUS.label,
          badge: 'Repreneurs actifs',
          description: 'Pour ne rater aucune opportunité.',
          features: [
            "Tout l'accès repreneur, plus :",
            "Analyses de dossier par l'IA illimitées",
            'Alertes sur les nouvelles annonces qui correspondent à votre recherche',
            `Accès anticipé : les nouvelles annonces ${EARLY_ACCESS_HOURS} h avant les autres`,
          ],
          product: 'MA_PLUS',
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
          price: `${OFFER_PRICES.FEATURE_7D.label} ou ${OFFER_PRICES.FEATURE_30D.label}`,
          description: 'Votre annonce en tête de liste avec le badge « En vedette ».',
          features: ['Affichée avant les autres annonces', 'Badge « En vedette »', 'Sans engagement'],
          link: { href: '/ma/mes-annonces', label: 'Mettre une annonce en avant' },
        },
        {
          title: 'Dossier vérifié',
          price: OFFER_PRICES.VERIFICATION.label,
          badge: 'Confiance',
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
          ...(this.isPro() ? { product: 'PRO_DIRECTORY' as const } : { link: { href: '/inscription', label: 'Créer un compte professionnel' } }),
        },
        {
          title: 'Compte pro',
          price: OFFER_PRICES.PRO_ACCOUNT.label,
          badge: 'Cabinets de cession',
          description: 'Pour accompagner plusieurs cessions sur GoFounders.',
          features: ["Fiche dans l'annuaire, mise en avant", 'Publication de plusieurs annonces pour vos clients', 'Contact direct des repreneurs', 'Sans engagement'],
          ...(this.isPro() ? { product: 'PRO_ACCOUNT' as const } : { link: { href: '/inscription', label: 'Créer un compte professionnel' } }),
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
    ['Nouveaux contacts par mois', 'Associés : illimités · Porteurs de projet : 3', 'Illimités', 'Illimités'],
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
