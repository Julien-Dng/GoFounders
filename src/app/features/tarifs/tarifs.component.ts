import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AccountProduct, INTRO_SUMMARY, FREE_AI_ANALYSES_PER_MONTH, FREE_CONTACTS_PER_MONTH, OFFER_PRICES, PRO_TRIAL_LABEL } from '../../core/config/offers';
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
  // Paragraphe mis en valeur sous la description : ce que l'offre apporte au membre.
  benefit?: string;
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
          <h1 class="text-[2.25rem] leading-tight text-primary sm:text-5xl">Des offres adaptées à votre projet</h1>
          <p class="mt-4 text-lg leading-relaxed text-muted-foreground">
            @if (features.associates) {
              Vous cherchez une entreprise à reprendre ou des personnes avec qui entreprendre ? Un seul compte, et les offres qui correspondent à votre objectif.
            } @else {
              Publier une annonce est gratuit et nous ne prenons aucune commission sur la vente. Les repreneurs paient chaque mise en relation acceptée par un cédant.
            }
          </p>
          @if (features.associates) {
            <div class="mt-8 inline-flex w-full flex-col gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm ring-1 ring-border sm:w-auto sm:flex-row" role="tablist" aria-label="Choisissez votre objectif">
              @for (option of tabs; track option.id) {
                <button
                  type="button"
                  role="tab"
                  [id]="'onglet-' + option.id"
                  [attr.aria-selected]="tab() === option.id"
                  [attr.aria-controls]="'panneau-' + option.id"
                  (click)="selectTab(option.id)"
                  class="rounded-xl px-5 py-3 text-base font-semibold transition-colors"
                  [class]="tab() === option.id ? 'bg-primary text-white shadow' : 'text-primary hover:bg-secondary'"
                >{{ option.label }}</button>
              }
            </div>
          }
        </header>

        @if (statusMessage() && !statusProduct()) {
          <div class="mx-auto mt-8 max-w-3xl rounded-xl border px-5 py-4 text-base" [class]="statusIsError() ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'" role="status">
            {{ statusMessage() }}
          </div>
        }

        @if (tab() === 'reprise') {
        <div id="panneau-reprise" role="tabpanel" aria-labelledby="onglet-reprise">
        <section id="repreneurs" class="mt-16 scroll-mt-24" aria-labelledby="reprise-title">
          <div class="mx-auto max-w-[62ch] text-center">
            <h2 id="reprise-title" class="text-3xl text-primary sm:text-4xl">Reprendre ou céder une entreprise</h2>
            <p class="mt-3 text-lg leading-relaxed text-muted-foreground">
              Publier une annonce est gratuit, sans commission sur la vente. {{ introSummary }}
            </p>
          </div>
          <div class="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
            @for (offer of mainOffers(); track offer.title; let first = $first) {
              <div [id]="first ? 'cedants' : null" class="flex scroll-mt-24">
                <div class="flex flex-col rounded-2xl bg-white p-7 shadow-lg" [class]="first ? 'w-full ring-1 ring-border' : 'w-full ring-2 ring-accent'">
                  <h3 class="text-lg font-bold text-primary">{{ offer.title }}</h3>
                  <p class="tabular mt-3 text-[2rem] font-extrabold leading-tight tracking-tight text-primary">{{ offer.price }}</p>
                  <p class="mt-2 text-base text-muted-foreground">{{ offer.description }}</p>
                  @if (offer.benefit) {
                    <p class="mt-2 text-base font-semibold text-primary">{{ offer.benefit }}</p>
                  }
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
                        <button type="button" (click)="buy(offer.product)" [disabled]="busyProduct() === offer.product" class="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-60">
                          {{ busyProduct() === offer.product ? 'Activation…' : (offer.cta ?? 'Activer') }}
                        </button>
                        @if (statusProduct() === offer.product && statusMessage()) {
                          <p class="mt-3 text-sm font-medium" [class]="statusIsError() ? 'text-red-700' : 'text-emerald-700'" role="status">{{ statusMessage() }}</p>
                        }
                      }
                    } @else if (offer.link) {
                      <a [routerLink]="offer.link.href" [fragment]="offer.link.fragment" class="block w-full rounded-lg px-4 py-3 text-center font-semibold transition-colors" [class]="first ? 'bg-primary text-white hover:bg-primary/90' : 'bg-accent text-white hover:bg-accent/90'">{{ offer.link.label }}</a>
                    }
                  </div>
                </div>
              </div>
            }
          </div>

          @if (extraOffers().length > 0) {
            <div class="mx-auto mt-12 max-w-4xl">
              <h3 class="text-center text-xl font-bold text-primary">Options pour donner plus de visibilité à votre annonce</h3>
              <div class="mt-6 grid gap-4 md:grid-cols-2">
                @for (offer of extraOffers(); track offer.title) {
                  <div class="flex flex-col rounded-2xl bg-white p-6 ring-1 ring-border">
                    <div class="flex items-baseline justify-between gap-3">
                      <h4 class="text-lg font-bold text-primary">{{ offer.title }}</h4>
                      <p class="tabular flex-shrink-0 font-extrabold text-primary">{{ offer.price }}</p>
                    </div>
                    <p class="mt-2 text-base text-muted-foreground">{{ offer.description }}</p>
                    @if (offer.benefit) {
                      <p class="mt-2 text-base font-semibold text-primary">{{ offer.benefit }}</p>
                    }
                    <span class="flex-1" aria-hidden="true"></span>
                    @if (offer.product) {
                      <button type="button" (click)="buy(offer.product)" [disabled]="busyProduct() === offer.product" class="mt-4 font-semibold text-accent underline-offset-4 hover:underline disabled:opacity-60">{{ offer.cta ?? 'Activer' }}</button>
                    } @else if (offer.link) {
                      <a [routerLink]="offer.link.href" class="mt-4 font-semibold text-accent underline-offset-4 hover:underline">{{ offer.link.label }} →</a>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </section>

        </div>
        }

        @if (tab() === 'associes' && features.associates) {
        <div id="panneau-associes" role="tabpanel" aria-labelledby="onglet-associes">
          <section id="associes" class="mt-16 scroll-mt-24" aria-labelledby="associes-title">
            <div class="mx-auto max-w-[62ch] text-center">
              <h2 id="associes-title" class="text-3xl text-primary sm:text-4xl">Trouver un associé, créer une équipe</h2>
              <p class="mt-3 text-lg leading-relaxed text-muted-foreground">
                Présentez votre projet et trouvez les compétences qui vous manquent, ou rejoignez un projet qui vous correspond.
              </p>
            </div>
            <p class="mx-auto mt-8 max-w-3xl rounded-xl bg-emerald-50 px-5 py-4 text-center text-base font-medium text-emerald-900 ring-1 ring-emerald-200">
              Vous souhaitez rejoindre un projet ? Créez votre profil et échangez gratuitement, sans limite.
            </p>

            <div class="mt-10 grid gap-6 md:grid-cols-3">
              @for (plan of plans; track plan.name) {
                <div class="flex flex-col rounded-2xl bg-white p-7 shadow-lg" [class]="plan.variant === 'pro' ? 'ring-2 ring-accent' : 'ring-1 ring-border'">
                  <h3 class="text-lg font-bold text-primary">{{ plan.name }}</h3>
                  <p class="tabular mt-3 text-[2rem] font-extrabold leading-tight tracking-tight text-primary">{{ plan.price }}<span class="text-base font-normal text-muted-foreground">{{ plan.period === '/mois' ? ' par mois' : '' }}</span></p>
                  <p class="mt-2 text-base text-muted-foreground">{{ plan.description }}</p>
                  <ul class="mt-5 flex-1 space-y-2.5 border-t border-border pt-5 text-base text-foreground/85">
                    @for (feature of plan.highlights; track feature) {
                      <li class="flex gap-2.5">
                        <svg class="mt-1 flex-shrink-0 text-accent" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        <span>{{ feature }}</span>
                      </li>
                    }
                  </ul>
                  <div class="mt-7">
                    @if (plan.variant === 'premium') {
                      <button type="button" (click)="askAccompaniment()" class="block w-full rounded-lg border border-primary px-4 py-3 text-center font-semibold text-primary transition-colors hover:bg-primary hover:text-white">{{ plan.cta }}</button>
                    } @else {
                      <a [routerLink]="planHref(plan)" [queryParams]="planParams(plan)" class="block w-full rounded-lg px-4 py-3 text-center font-semibold transition-colors" [class]="plan.variant === 'pro' ? 'bg-accent text-white hover:bg-accent/90' : 'border border-primary text-primary hover:bg-primary hover:text-white'">{{ plan.cta }}</a>
                    }
                    @if (plan.reassurance) {
                      <p class="mt-2 text-center text-sm text-muted-foreground">{{ plan.reassurance }}</p>
                    }
                  </div>
                </div>
              }
            </div>

            <h3 class="mt-14 text-center text-2xl text-primary">Le détail des formules</h3>

            <!-- Téléphones : on choisit une formule, et on voit tout ce qu'elle comprend (une seule colonne). -->
            <div class="mt-6 sm:hidden">
              <div class="grid grid-cols-3 gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-border" role="tablist" aria-label="Formule à détailler">
                @for (plan of plans; track plan.name; let index = $index) {
                  <button
                    type="button"
                    role="tab"
                    [attr.aria-selected]="detailPlan() === index"
                    (click)="detailPlan.set(index)"
                    class="rounded-lg px-1 py-2.5 text-[0.8rem] font-semibold leading-tight transition-colors min-[400px]:text-sm"
                    [class]="detailPlan() === index ? 'bg-primary text-white' : 'text-primary'"
                  >{{ plan.name }}</button>
                }
              </div>

              <div class="mt-4 rounded-2xl bg-white p-5 shadow-lg ring-1 ring-border" role="tabpanel">
                <div class="flex items-baseline justify-between gap-3 border-b border-border pb-4">
                  <p class="text-lg font-bold text-primary">{{ plans[detailPlan()].name }}</p>
                  <p class="tabular text-lg font-extrabold text-primary">{{ plans[detailPlan()].price }}<span class="text-sm font-normal text-muted-foreground">{{ plans[detailPlan()].period === '/mois' ? ' / mois' : '' }}</span></p>
                </div>
                <ul class="mt-2 divide-y divide-border">
                  @for (row of comparisonRows; track $index) {
                    <li class="flex items-start gap-3 py-3">
                      @if (row[detailPlan() + 1] === '✗') {
                        <span class="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground" aria-hidden="true">–</span>
                        <span class="text-base text-muted-foreground line-through decoration-muted-foreground/40">{{ row[0] }}</span>
                        <span class="sr-only">Non inclus</span>
                      } @else {
                        <svg class="mt-0.5 flex-shrink-0 text-emerald-600" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        <span class="text-base text-foreground/85">
                          {{ row[0] }}
                          @if (row[detailPlan() + 1] !== '✓') {
                            <span class="mt-0.5 block text-sm font-semibold text-primary">{{ row[detailPlan() + 1] }}</span>
                          }
                        </span>
                      }
                    </li>
                  }
                </ul>
              </div>
            </div>

            <div class="relative mt-6 hidden overflow-x-auto rounded-2xl bg-white p-4 shadow-lg ring-1 ring-border sm:block sm:p-6">
              <table class="tabular w-full min-w-[680px] border-collapse text-left text-base">
                <caption class="sr-only">Comparaison des formules Découverte, Projet PRO et Accompagnement</caption>
                <thead>
                  <tr class="border-b border-primary align-bottom">
                    <th scope="col" class="w-[34%] py-4 pr-4 font-medium text-muted-foreground">Formule</th>
                    @for (plan of plans; track plan.name) {
                      <th scope="col" class="w-[22%] px-4 py-4">
                        <span class="block font-semibold text-primary">{{ plan.name }}</span>
                        <span class="mt-1 block text-sm font-normal text-muted-foreground">{{ plan.price }}{{ plan.period === '/mois' ? ' par mois' : '' }}</span>
                      </th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of comparisonRows; track $index) {
                    <tr class="border-b border-border last:border-b-0">
                      <th scope="row" class="py-3.5 pr-4 font-normal text-foreground/85">{{ row[0] }}</th>
                      @for (cell of row.slice(1); track $index) {
                        <td class="px-4 py-3.5 text-foreground/85">
                          @if (cell === '✓') {
                            Inclus
                          } @else if (cell === '✗') {
                            <span class="text-muted-foreground" aria-hidden="true">–</span><span class="sr-only">Non inclus</span>
                          } @else {
                            {{ cell }}
                          }
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        </div>
        }

        <section id="premium" class="mt-20 grid scroll-mt-24 gap-8 overflow-hidden rounded-3xl bg-white p-6 shadow-lg ring-1 ring-border sm:p-10 lg:grid-cols-12" aria-labelledby="premium-title">
          <div class="lg:col-span-4">
            <h2 id="premium-title" class="text-3xl text-primary sm:text-4xl">Accompagnement</h2>
            <p class="mt-3 max-w-[40ch] text-base leading-relaxed text-muted-foreground">
              @if (tab() === 'associes') {
                Recherche menée avec vous, présentation de profils qualifiés, mise en relation avec des investisseurs et nos experts partenaires.
                Forfait sur devis.
              } @else {
                Préparation du dossier de cession, présentation de repreneurs ou de cédants qualifiés, mise en relation avec nos experts partenaires.
                Forfait sur devis, sans commission sur la vente.
              }
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

        @if (prosGroup(); as group) {
          <section id="pros" class="mt-20 scroll-mt-24" aria-labelledby="pros-title">
            <div class="mx-auto max-w-[60ch] text-center">
              <h2 id="pros-title" class="text-3xl text-primary sm:text-4xl">Vous êtes un professionnel ?</h2>
              <p class="mt-3 text-lg leading-relaxed text-muted-foreground">{{ group.description }}</p>
            </div>
            <div class="mx-auto mt-10 grid gap-6" [class]="group.offers.length > 1 ? 'max-w-4xl md:grid-cols-2' : 'max-w-md'">
              @for (offer of group.offers; track offer.title) {
                <div class="flex flex-col rounded-2xl bg-white p-7 shadow-lg ring-1 ring-border">
                  <h3 class="text-lg font-bold text-primary">{{ offer.title }}</h3>
                  <p class="tabular mt-3 text-[2rem] font-extrabold leading-tight tracking-tight text-primary">{{ offer.price }}</p>
                  <p class="mt-2 text-base text-muted-foreground">{{ offer.description }}</p>
                  @if (offer.benefit) {
                    <p class="mt-2 text-base font-semibold text-primary">{{ offer.benefit }}</p>
                  }
                  <ul class="mt-5 flex-1 space-y-2.5 border-t border-border pt-5 text-base text-foreground/85">
                    @for (feature of offer.features; track feature) {
                      <li class="flex gap-2.5"><span class="text-accent" aria-hidden="true">✓</span><span>{{ feature }}</span></li>
                    }
                  </ul>
                  <div class="mt-7">
                    @if (offer.product) {
                      @if (isOwned(offer.product)) {
                        <p class="rounded-lg bg-emerald-50 py-3 text-center font-semibold text-emerald-800">Actif sur votre compte</p>
                      } @else {
                        <button type="button" (click)="buy(offer.product)" [disabled]="busyProduct() === offer.product" class="w-full rounded-lg bg-primary px-4 py-3 font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-60">{{ busyProduct() === offer.product ? 'Activation…' : (offer.cta ?? 'Activer') }}</button>
                        @if (statusProduct() === offer.product && statusMessage()) {
                          <p class="mt-3 text-sm font-medium" [class]="statusIsError() ? 'text-red-700' : 'text-emerald-700'" role="status">{{ statusMessage() }}</p>
                        }
                      }
                    } @else if (offer.link) {
                      <a [routerLink]="offer.link.href" class="block w-full rounded-lg bg-primary px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-primary/90">{{ offer.link.label }}</a>
                    }
                  </div>
                </div>
              }
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
  readonly introSummary = INTRO_SUMMARY;
  // Deux univers d'offres, un seul compte : l'onglet ne fait que filtrer ce qui est présenté.
  readonly tabs = [
    { id: 'reprise' as const, label: 'Reprendre ou céder une entreprise' },
    { id: 'associes' as const, label: 'Trouver un associé / créer une équipe' },
  ];
  private readonly fragment = toSignal(this.route.fragment, { initialValue: this.route.snapshot.fragment });
  readonly tab = signal<'reprise' | 'associes'>(this.tabFor(this.route.snapshot.fragment, this.route.snapshot.queryParamMap.get('offre')));
  private readonly topicEffect = effect(() => {
    if (this.tab() === 'associes' && this.premiumTopic() === 'cession') {
      this.premiumTopic.set('associes');
    }
  }, { allowSignalWrites: true });
  private readonly fragmentEffect = effect(() => {
    const fragment = this.fragment();
    if (fragment === 'associes' || fragment === 'repreneurs' || fragment === 'cedants' || fragment === 'ma-access') {
      this.tab.set(this.tabFor(fragment, null));
    }
  }, { allowSignalWrites: true });

  // Téléphones : formule affichée dans « Le détail des formules » (Projet PRO par défaut).
  readonly detailPlan = signal(1);
  readonly busyProduct = signal<AccountProduct | null>(null);
  readonly statusProduct = signal<AccountProduct | null>(null);
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
    .filter(group => group.id !== 'pros')
    .map(group => ({
      ...group,
      offers: group.offers.filter(offer =>
        !(offer.product === 'MA_PLUS' && !FEATURES.buyerPlus)
        && !((offer.title === 'Mise en avant' || offer.title === 'Dossier vérifié') && !FEATURES.sellerPaidOffers)
      ),
    })));

  // Onglet reprise : les deux offres principales côte à côte (céder, reprendre), puis les options.
  readonly mainOffers = computed(() => {
    const groups = this.offerGroups();
    const seller = groups.find(group => group.id === 'cedants')?.offers[0];
    const buyer = groups.find(group => group.id === 'repreneurs')?.offers[0];
    return [seller, buyer].filter((offer): offer is RepriseOffer => !!offer);
  });
  readonly extraOffers = computed(() => this.offerGroups().flatMap(group => group.offers.slice(1)));

  readonly prosGroup = computed(() => {
    const group = FEATURES.pros ? this.allOfferGroups().find(item => item.id === 'pros') : undefined;
    return group ? { ...group, offers: group.offers.filter(offer => offer.product !== 'PRO_ACCOUNT' || FEATURES.proAccount) } : null;
  });

  private readonly allOfferGroups = computed(() => [
    {
      id: 'repreneurs',
      title: 'Repreneurs',
      description: 'Débloquez le dossier complet et le contact du cédant des entreprises qui vous intéressent, une par une.',
      offers: [
        {
          title: 'Reprendre une entreprise',
          price: `${OFFER_PRICES.INTRO.label} par entreprise`,
          description: 'Un paiement unique par dossier, sans abonnement.',
          features: [
            'Compte repreneur gratuit, annonces anonymisées visibles par tous',
            'Engagement de confidentialité accepté en ligne, une fois par dossier',
            `${OFFER_PRICES.INTRO.label} : dossier complet, coordonnées du cédant et messagerie, ouverts aussitôt, sans attendre son accord`,
            `Analyse du dossier par l'IA (jusqu'à ${FREE_AI_ANALYSES_PER_MONTH} par mois)`,
            'Sans abonnement ni commission sur la vente',
          ],
          link: { href: '/ma', label: 'Voir les annonces' },
        },
        {
          title: 'Accès repreneur Plus',
          price: OFFER_PRICES.MA_PLUS.label,
          description: 'Pour les repreneurs actifs qui ne veulent rater aucune opportunité.',
          features: [
            "Tout l'accès repreneur, plus :",
            "Analyses de dossier par l'IA illimitées",
            'Alertes sur les nouvelles annonces qui correspondent à votre recherche',
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
          title: 'Céder mon entreprise',
          price: 'Gratuit',
          description: 'Publication gratuite pendant le lancement, sans commission sur la vente.',
          features: ["Annonce anonymisée, préparée avec l'IA et relue par notre équipe avant publication", 'Vos coordonnées ne sont visibles que des repreneurs qui ont payé l’accès à votre dossier', 'Chaque repreneur accepte un engagement de confidentialité', 'Estimation gratuite de la valeur de votre entreprise'],
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
          description: "Nous comparons les chiffres de votre annonce à vos justificatifs.",
          benefit: "Des chiffres vérifiés rassurent les repreneurs. Plus de contacts, une négociation plus solide.",
          features: [
            "Chiffre d'affaires et bénéfice annoncés rapprochés de vos justificatifs : derniers bilans ou liasses fiscales, tableau de bord Stripe ou Shopify sur 12 mois",
            'Badge « Dossier vérifié » sur l’annonce',
            "Le badge atteste la concordance des chiffres avec les justificatifs fournis, pas la valeur de l'entreprise",
          ],
          link: { href: '/ma/mes-annonces', label: 'Faire vérifier mon dossier' },
        },
      ] as RepriseOffer[],
    },
    {
      id: 'pros',
      title: 'Professionnels',
      description: `Experts-comptables, avocats, notaires et cabinets de cession : soyez visibles auprès des cédants et des repreneurs. ${PRO_TRIAL_LABEL}, sans engagement.`,
      offers: [
        {
          title: 'Annuaire des professionnels',
          price: OFFER_PRICES.PRO_DIRECTORY.label,
          description: `Votre fiche dans l’annuaire GoFounders. ${PRO_TRIAL_LABEL}.`,
          features: ['Fiche avec votre métier, votre zone et votre site', 'Contactable par tous les membres', `${PRO_TRIAL_LABEL}, puis ${OFFER_PRICES.PRO_DIRECTORY.label}`, 'Sans engagement : résiliable à tout moment, même pendant l’essai'],
          ...(this.isPro() ? { product: 'PRO_DIRECTORY' as const, cta: 'Essayer gratuitement 1 mois' } : { link: { href: '/inscription', label: 'Créer un compte professionnel' } }),
        },
        {
          title: 'Compte pro',
          price: OFFER_PRICES.PRO_ACCOUNT.label,
          description: `Pour les cabinets qui accompagnent plusieurs cessions sur GoFounders. ${PRO_TRIAL_LABEL}.`,
          features: ["Fiche dans l'annuaire, mise en avant", 'Publication de plusieurs annonces pour vos clients', 'Contact direct des repreneurs', `${PRO_TRIAL_LABEL}, puis ${OFFER_PRICES.PRO_ACCOUNT.label}, sans engagement`],
          ...(this.isPro() ? { product: 'PRO_ACCOUNT' as const, cta: 'Essayer gratuitement 1 mois' } : { link: { href: '/inscription', label: 'Créer un compte professionnel' } }),
        },
      ] as RepriseOffer[],
    },
  ]);

  private tabFor(fragment: string | null, offre: string | null): 'reprise' | 'associes' {
    return FEATURES.associates && (fragment === 'associes' || offre === 'associes') ? 'associes' : 'reprise';
  }

  selectTab(tab: 'reprise' | 'associes'): void {
    this.tab.set(tab);
    this.premiumTopic.set(tab === 'associes' ? 'associes' : 'cession');
    this.statusMessage.set('');
    void this.router.navigate([], { relativeTo: this.route, fragment: tab === 'associes' ? 'associes' : undefined, replaceUrl: true });
  }

  // Formule Accompagnement : formulaire de devis plus bas, sujet « associés » présélectionné.
  askAccompaniment(): void {
    this.premiumTopic.set('associes');
    document.getElementById('premium')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  planParams(plan: Plan): Record<string, string> | null {
    return !this.auth.isAuthenticated() && plan.variant === 'free' ? { profil: 'entrepreneur' } : null;
  }

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
    // Le message s'affiche sous le bouton cliqué, sinon il resterait hors de vue en haut de page.
    this.statusProduct.set(product);
    this.statusMessage.set('');

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
      name: 'Découverte',
      price: 'Gratuit',
      period: 'gratuit',
      description: 'Créer son profil et découvrir les projets et associés',
      features: [],
      highlights: [
        'Profil, présentation de votre projet et recherche',
        'Réponses illimitées dans vos conversations',
        'Score de compatibilité avec chaque profil',
        `Porteur de projet : ${FREE_CONTACTS_PER_MONTH} nouveaux contacts par mois`,
        'Rejoindre un projet : gratuit et sans limite',
      ],
      cta: 'Créer mon profil',
      href: '/inscription',
      reassurance: '',
      variant: 'free',
    },
    {
      name: 'Projet PRO',
      price: OFFER_PRICES.PRO.label.replace(' / mois', ''),
      period: '/mois',
      description: 'Contacter davantage de profils et développer son équipe',
      features: [],
      highlights: [
        'Nouveaux contacts illimités',
        'Recherche avancée (mots-clés, compétences, score minimum)',
        'Matching intelligent : pourquoi chaque profil vous correspond',
        'Projet mis en avant dans les résultats',
        ...(FEATURES.assistant ? ['Assistant IA personnel'] : []),
      ],
      cta: 'Développer mon équipe',
      href: '/abonnement',
      reassurance: 'Sans engagement',
      variant: 'pro',
    },
    {
      name: 'Accompagnement',
      price: 'Sur devis',
      period: '',
      description: 'Être accompagné dans sa recherche',
      features: [],
      highlights: [
        'Présentations de profils qualifiés',
        'Mise en relation avec des investisseurs et des experts juridiques partenaires',
        'Un interlocuteur dédié',
      ],
      cta: 'Parler de mon projet',
      href: '/tarifs',
      reassurance: 'Premier échange gratuit',
      variant: 'premium',
    },
  ];

  readonly comparisonRows: string[][] = [
    ['Profil, présentation du projet et recherche', '✓', '✓', '✓'],
    ['Rejoindre un projet (écrire à des porteurs de projet)', 'Sans limite', 'Sans limite', 'Sans limite'],
    ['Porteur de projet : écrire à de nouveaux associés', `${FREE_CONTACTS_PER_MONTH} par mois`, 'Sans limite', 'Sans limite'],
    ['Répondre dans vos conversations', 'Sans limite', 'Sans limite', 'Sans limite'],
    ['Score de compatibilité', '✓', '✓', '✓'],
    ['Matching intelligent (raisons du score)', '✗', '✓', '✓'],
    ['Recherche avancée', '✗', '✓', '✓'],
    ['Projet mis en avant dans les résultats', '✗', '✓', '✓'],
    ...(FEATURES.assistant ? [['Assistant IA personnel', '✗', '✓', '✓']] : []),
    ['Présentations de profils qualifiés', '✗', '✗', '✓'],
    ['Mise en relation investisseurs et experts juridiques partenaires', '✗', '✗', '✓'],
    ['Interlocuteur dédié', '✗', '✗', '✓'],
  ];

  planHref(plan: Plan): string {
    if (this.auth.isAuthenticated()) {
      return plan.variant === 'free' ? '/dashboard' : '/abonnement';
    }

    return plan.href;
  }
}
