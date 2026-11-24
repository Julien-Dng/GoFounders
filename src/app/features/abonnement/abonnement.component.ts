import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FEATURES } from '../../core/config/features';
import { AuthService } from '../../core/services/auth.service';
import { Plan } from '../../core/models/user.model';
import { PaymentService } from '../../core/services/payment.service';
import { FREE_CONTACTS_PER_MONTH, OFFER_PRICES } from '../../core/config/offers';
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
    <div class="min-h-screen bg-secondary px-4 pb-14 pt-24 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[62rem]">
        <div class="mb-8">
          <h1 class="mb-2 text-3xl font-semibold text-primary sm:text-4xl">Offre et facturation</h1>
          <p class="text-muted-foreground">Votre formule, vos paiements et vos factures</p>
        </div>

        @if (statusMessage()) {
          <div class="mb-6 rounded-2xl border border-accent/20 bg-accent/10 px-5 py-4 text-sm font-semibold text-accent">
            {{ statusMessage() }}
          </div>
        }

        <div class="space-y-6">
          @if (features.associates) {
            <div class="grid gap-6 md:grid-cols-2">
              <section class="rounded-2xl bg-white p-6 shadow-md ring-1 ring-border" aria-labelledby="abo-plan">
                <div class="flex items-center justify-between gap-3">
                  <h2 id="abo-plan" class="text-xl text-primary">Votre offre : {{ currentPlan() }}</h2>
                  @if (currentPlan() === 'FREE') {
                    <span class="rounded-md bg-secondary px-2 py-0.5 text-sm font-semibold text-muted-foreground">Gratuit</span>
                  }
                </div>
                <ul class="mt-4 space-y-2 text-base text-foreground/85">
                  <li class="flex gap-2"><span class="text-accent" aria-hidden="true">✓</span>{{ currentPlan() === 'FREE' ? freeContacts + ' nouveaux contacts par mois (porteur de projet)' : 'Nouveaux contacts illimités' }}</li>
                  <li class="flex gap-2"><span class="text-accent" aria-hidden="true">✓</span>Réponses illimitées</li>
                  <li class="flex gap-2"><span class="text-accent" aria-hidden="true">✓</span>Écrire en tant qu'associé : gratuit et illimité</li>
                </ul>
              </section>

              <section class="rounded-2xl bg-accent/[0.06] p-6 ring-1 ring-accent/20" aria-labelledby="abo-pro">
                <h2 id="abo-pro" class="text-xl text-primary">PRO · {{ proPrice }}</h2>
                <ul class="mt-4 space-y-2 text-base text-foreground/85">
                  <li class="flex gap-2"><span class="text-accent" aria-hidden="true">✓</span>Nouveaux contacts illimités</li>
                  <li class="flex gap-2"><span class="text-accent" aria-hidden="true">✓</span>Raisons détaillées de chaque score et recherche avancée</li>
                  <li class="flex gap-2"><span class="text-accent" aria-hidden="true">✓</span>Projet mis en avant dans les résultats</li>
                </ul>
                @if (currentPlan() === 'FREE') {
                  <button type="button" (click)="activatePlan('PRO')" class="mt-5 w-full rounded-lg bg-accent px-5 py-3 font-semibold text-white transition-colors hover:bg-accent/90">
                    {{ isSimulation ? 'Activer PRO (paiement simulé)' : 'Passer en PRO' }}
                  </button>
                } @else {
                  <p class="mt-5 text-sm font-semibold text-accent">Votre offre actuelle est {{ currentPlan() }}</p>
                }
                <p class="mt-3 text-sm text-muted-foreground">Sans engagement. PRO n'inclut pas les dossiers d'entreprise</p>
              </section>
            </div>
          }

          <section class="rounded-2xl bg-white p-6 shadow-md ring-1 ring-border" aria-labelledby="abo-unite">
            <h2 id="abo-unite" class="text-xl text-primary">Achats à l'unité</h2>
            <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="flex items-start gap-3">
                <svg class="mt-0.5 flex-shrink-0 text-muted-foreground" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>
                <div>
                  <p class="font-semibold text-primary">Dossiers d'entreprise · {{ introPrice }} par dossier</p>
                  <p class="text-sm text-muted-foreground">Dossier complet et contact du cédant, sans abonnement, en FREE comme en PRO</p>
                  @if (hasMaAccess()) {
                    <p class="mt-1 text-sm text-muted-foreground">Ancien accès repreneur actif jusqu’au {{ maAccessEnd() }}</p>
                  }
                </div>
              </div>
              <a routerLink="/ma/dossiers" class="flex-shrink-0 text-sm font-semibold text-accent hover:underline">Mes dossiers débloqués <span aria-hidden="true">→</span></a>
            </div>
          </section>

          <section class="rounded-2xl bg-white p-6 shadow-md ring-1 ring-border" aria-labelledby="abo-paiements">
            <h2 id="abo-paiements" class="text-xl text-primary">Factures et reçus</h2>
            @if (payments().length === 0) {
              <div class="py-6 text-center">
                <p class="font-semibold text-primary">Aucun paiement pour le moment</p>
                <p class="mt-1 text-sm text-muted-foreground">Vos paiements apparaîtront ici après un achat ou un abonnement</p>
              </div>
            } @else {
              <ul class="mt-4 divide-y divide-border rounded-xl ring-1 ring-border">
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
            @if (!isSimulation) {
              <div class="mt-4 flex flex-col items-center gap-2 text-center">
                <button type="button" (click)="openPortal()" class="rounded-lg bg-accent px-5 py-2.5 font-semibold text-white transition-colors hover:bg-accent/90">Gérer la facturation</button>
                <p class="text-sm text-muted-foreground">Moyens de paiement, factures et résiliation, dans l'espace sécurisé de Stripe</p>
              </div>
            }
          </section>

          <p class="text-sm text-muted-foreground">
            Besoin d'un accompagnement humain ?
            @if (isSimulation) {
              <button type="button" (click)="activatePlan('PREMIUM')" class="font-semibold text-accent hover:underline">Activer PREMIUM (paiement simulé)</button>
            } @else {
              <a routerLink="/tarifs" fragment="premium" class="font-semibold text-accent hover:underline">PREMIUM, sur devis <span aria-hidden="true">→</span></a>
            }
          </p>
        </div>

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
  readonly freeContacts = FREE_CONTACTS_PER_MONTH;
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
