import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FEATURES } from '../../core/config/features';
import { AuthService } from '../../core/services/auth.service';
import { Plan } from '../../core/models/user.model';
import { PaymentService } from '../../core/services/payment.service';
import { OFFER_PRICES } from '../../core/config/offers';
import { SupabaseService } from '../../core/services/supabase.service';

interface PaymentRow {
  id: string;
  product: string;
  amount_cents: number | null;
  created_at: string;
  listing_id: string | null;
  listing_title: string | null;
}

@Component({
  selector: 'app-abonnement',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pt-20 pb-12">
      <div class="mx-auto max-w-[62rem] px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-8">
          <h1 class="mb-2 text-4xl font-semibold">Offre et facturation</h1>
          <p class="text-muted-foreground">Votre formule, vos paiements et vos factures</p>
        </div>

        @if (statusMessage()) {
          <div class="mb-6 rounded-2xl border border-accent/20 bg-accent/10 px-5 py-4 text-sm font-semibold text-accent">
            {{ statusMessage() }}
          </div>
        }

        <div class="divide-y divide-border rounded-lg border border-border bg-white px-6">
@if (features.associates) {
          <section class="grid gap-4 py-6 sm:grid-cols-[1fr_16rem] sm:items-center sm:gap-8" aria-labelledby="abo-plan">
            <div>
              <p class="text-sm text-muted-foreground">Votre plan actuel</p>
              <h2 id="abo-plan" class="mt-1 text-2xl text-primary">{{ currentPlan() }}</h2>
              <p class="mt-2 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
                PRO : contacts illimités, raisons détaillées de chaque score de compatibilité, recherche avancée et projet mis en avant. {{ proPrice }}, sans engagement
              </p>
            </div>
            <button type="button" (click)="activatePlan('PRO')" class="w-full rounded-lg bg-primary px-5 py-3 font-medium text-white transition-colors hover:bg-primary/90">
              {{ isSimulation ? 'Activer PRO (paiement simulé)' : 'Passer en PRO' }}
            </button>
          </section>
          }

          <section class="grid gap-4 py-6 sm:grid-cols-[1fr_16rem] sm:items-center sm:gap-8" aria-labelledby="abo-premium">
            <div>
              <p class="text-sm text-muted-foreground">Accompagnement</p>
              <h2 id="abo-premium" class="mt-1 text-2xl text-primary">PREMIUM, sur devis</h2>
              <p class="mt-2 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
                {{ features.associates ? 'On vous présente les bonnes personnes : associés qualifiés, investisseurs, experts juridiques partenaires, avec un interlocuteur dédié.' : 'Préparation de votre cession ou de votre reprise avec nos experts partenaires, et un interlocuteur dédié jusqu’à la signature.' }}
              </p>
            </div>
            @if (isSimulation) {
              <button type="button" (click)="activatePlan('PREMIUM')" class="w-full rounded-lg border border-primary px-5 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white">
                Activer PREMIUM (paiement simulé)
              </button>
            } @else {
              <a routerLink="/tarifs" fragment="premium" class="block w-full rounded-lg border border-primary px-5 py-3 text-center font-medium text-primary transition-colors hover:bg-primary hover:text-white">
                Demander un premier échange gratuit
              </a>
            }
          </section>

          <section class="grid gap-4 py-6 sm:grid-cols-[1fr_16rem] sm:items-center sm:gap-8" aria-labelledby="abo-ma">
            <div>
              <p class="text-sm text-muted-foreground">Reprise d'entreprise</p>
              <h2 id="abo-ma" class="mt-1 text-2xl text-primary">Mise en relation, {{ introPrice }} par entreprise</h2>
              <p class="mt-2 max-w-[60ch] text-base leading-relaxed text-muted-foreground">{{ maDescription }}</p>
            </div>
            <div>
              <a routerLink="/ma" class="block w-full rounded-lg bg-primary px-5 py-3 text-center font-medium text-white transition-colors hover:bg-primary/90">Voir les annonces</a>
              <a routerLink="/ma/deposer" class="mt-2 block text-center text-sm font-semibold text-accent hover:underline">Publier une annonce gratuitement</a>
              @if (hasMaAccess()) {
                <p class="mt-2 text-center text-sm text-muted-foreground">Ancien accès repreneur actif jusqu’au {{ maAccessEnd() }}</p>
              }
            </div>
          </section>

          <section class="py-6" aria-labelledby="abo-paiements">
            <h2 id="abo-paiements" class="text-lg font-semibold text-primary">Historique des paiements</h2>
            @if (payments().length === 0) {
              <p class="mt-2 text-sm text-muted-foreground">Aucun paiement pour le moment</p>
            } @else {
              <ul class="mt-3 divide-y divide-border rounded-xl ring-1 ring-border">
                @for (item of payments(); track item.id) {
                  <li class="flex items-center justify-between gap-4 px-4 py-3">
                    <span class="min-w-0">
                      <span class="block truncate font-medium text-primary">{{ paymentLabel(item) }}</span>
                      <span class="block text-sm text-muted-foreground">{{ formatDate(item.created_at) }}</span>
                    </span>
                    <span class="tabular flex-shrink-0 font-semibold text-primary">{{ amount(item.amount_cents) }}</span>
                  </li>
                }
              </ul>
            }
            <p class="mt-3 text-sm text-muted-foreground">
              Les dossiers d'entreprise achetés se retrouvent dans
              <a routerLink="/ma/dossiers" class="font-semibold text-accent hover:underline">Mes entreprises</a>
            </p>
          </section>
        </div>

        @if (!isSimulation) {
          <div class="mt-6 flex flex-col gap-3 rounded-lg bg-white shadow-lg ring-1 ring-border p-5 sm:flex-row sm:items-center sm:justify-between">
            <p class="text-base text-muted-foreground">Moyens de paiement, factures, résiliation : tout se gère dans l'espace sécurisé de Stripe</p>
            <button type="button" (click)="openPortal()" class="flex-shrink-0 rounded-lg border border-primary px-5 py-2.5 font-medium text-primary transition-colors hover:bg-primary hover:text-white">Gérer mes abonnements et factures</button>
          </div>
        }

        @if (isSimulation) {
        <div class="mt-6 rounded-lg bg-white shadow-lg ring-1 ring-border p-5 text-sm text-muted-foreground">
          <strong class="text-primary">Mode démonstration :</strong>
          les boutons ci-dessus simulent l'état après paiement. Le paiement réel par Stripe s'active avec paymentMode: 'stripe' (voir backend/README.md).
        </div>
        }

        <div class="mt-6">
          <a routerLink="/tarifs" class="font-semibold text-accent hover:underline">Retour aux tarifs</a>
        </div>
      </div>
    </div>
  `,
})
export class AbonnementComponent {
  readonly proPrice = OFFER_PRICES.PRO.label;
  readonly introPrice = OFFER_PRICES.INTRO.label;
  readonly features = FEATURES;
  private readonly auth = inject(AuthService);
  private readonly payment = inject(PaymentService);
  private readonly supabase = inject(SupabaseService);

  constructor() {
    void this.loadPayments();
  }

  // Historique de ses paiements (list_my_payments, 2026-11-17-visibilite-contact.sql) ; vide en mode démo.
  readonly payments = signal<PaymentRow[]>([]);

  private async loadPayments(): Promise<void> {
    if (!this.supabase.isConfigured) {
      return;
    }
    const { data, error } = await this.supabase.client.rpc('list_my_payments');
    this.payments.set(error ? [] : ((data ?? []) as PaymentRow[]));
  }

  paymentLabel(item: PaymentRow): string {
    const labels: Record<string, string> = {
      INTRO: 'Dossier et contact du cédant',
      PRO: 'Offre PRO',
      PREMIUM: 'Accompagnement PREMIUM',
      MA_ACCESS: 'Accès repreneur (ancienne offre)',
      MA_PLUS: 'Accès repreneur Plus',
      FEATURE_7D: 'Mise en avant de l’annonce (7 jours)',
      FEATURE_30D: 'Mise en avant de l’annonce (30 jours)',
      VERIFICATION: 'Dossier vérifié',
      PRO_DIRECTORY: 'Fiche annuaire des pros',
      PRO_ACCOUNT: 'Compte professionnel',
    };
    const label = labels[item.product] ?? item.product;
    return item.listing_title ? `${label} · ${item.listing_title}` : label;
  }

  amount(cents: number | null): string {
    return cents === null ? '—' : (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR');
  }

  readonly isSimulation = this.payment.isSimulation;
  readonly maAccessEnd = computed(() => {
    const expiresAt = this.auth.currentUser()?.maAccessExpiresAt;
    return expiresAt ? new Date(expiresAt).toLocaleDateString('fr-FR') : 'sans limite';
  });
  // Même règle pour tous les membres : l'offre PRO ne débloque pas les dossiers de cession.
  readonly maDescription = `Publier une annonce est gratuit. Pour chaque entreprise qui vous intéresse, débloquez le dossier complet et le contact du cédant pour ${OFFER_PRICES.INTRO.label}, sans abonnement, que vous soyez en FREE ou en PRO.`;
  readonly currentPlan = computed(() => this.auth.currentUser()?.plan ?? 'FREE');
  readonly hasMaAccess = computed(() => this.auth.hasMaAccess());
  readonly statusMessage = signal('');

  async activatePlan(plan: Exclude<Plan, 'FREE'>): Promise<void> {
    const result = await this.payment.purchase(plan);
    this.statusMessage.set(result.message);
  }

  async openPortal(): Promise<void> {
    const result = await this.payment.openBillingPortal();

    if (!result.success) {
      this.statusMessage.set(result.message);
    }
  }

}
