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
    <div class="min-h-screen bg-secondary px-4 pb-14 pt-20 sm:px-6 sm:pt-24 lg:px-8">
      <div class="mx-auto max-w-6xl">
        <div class="mb-6 sm:mb-8">
          <h1 class="mb-2 text-2xl font-semibold text-primary sm:text-4xl">Offre et facturation</h1>
          <p class="text-muted-foreground">Choisissez l’offre adaptée à vos besoins et gérez vos achats et factures</p>
        </div>

        @if (statusMessage()) {
          <div class="mb-6 rounded-2xl border border-accent/20 bg-accent/10 px-5 py-4 text-sm font-semibold text-accent">
            {{ statusMessage() }}
          </div>
        }

        <div class="max-w-4xl space-y-6">
          @if (features.associates) {
            <div class="space-y-3">
              <div class="grid gap-3 md:grid-cols-2 md:gap-6">
                <section class="rounded-2xl p-5 ring-1 sm:p-6" [class]="currentPlan() === 'FREE' ? 'bg-accent/[0.06] ring-accent/20' : 'bg-white shadow-md ring-border'" aria-labelledby="abo-free">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <h2 id="abo-free" class="text-xl font-bold text-primary">FREE</h2>
                      <p class="font-semibold text-primary">Gratuit</p>
                    </div>
                    @if (currentPlan() === 'FREE') {
                      <span class="flex-shrink-0 rounded-full bg-white px-3 py-1 text-sm font-semibold text-accent ring-1 ring-accent/20">Votre offre actuelle</span>
                    }
                  </div>
                  <ul class="mt-3 space-y-2 text-base text-foreground/85">
                    <li class="flex gap-2"><svg class="mt-1 flex-shrink-0 text-accent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg><span>{{ freeContacts }} nouveaux contacts par mois<span class="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pour les porteurs de projet</span></span></li>
                    <li class="flex gap-2"><svg class="mt-1 flex-shrink-0 text-accent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>Réponses illimitées</li>
                  </ul>
                </section>

                <section class="rounded-2xl p-5 ring-1 sm:p-6" [class]="currentPlan() === 'FREE' ? 'bg-white shadow-md ring-border' : 'bg-accent/[0.06] ring-accent/20'" aria-labelledby="abo-pro">
                  <div class="flex items-start justify-between gap-3">
                    <div>
                      <h2 id="abo-pro" class="text-xl font-bold text-primary">PRO</h2>
                      <p class="tabular font-semibold text-primary">{{ proPrice }}</p>
                    </div>
                    @if (currentPlan() === 'FREE') {
                      <button type="button" (click)="activatePlan('PRO')" class="flex-shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90">
                        {{ isSimulation ? 'Activer PRO (simulé)' : 'Passer en PRO' }}
                      </button>
                    } @else {
                      <span class="flex-shrink-0 rounded-full bg-white px-3 py-1 text-sm font-semibold text-accent ring-1 ring-accent/20">{{ currentPlan() === 'PRO' ? 'Votre offre actuelle' : 'Incluse' }}</span>
                    }
                  </div>
                  <ul class="mt-3 space-y-2 text-base text-foreground/85">
                    <li class="flex gap-2"><svg class="mt-1 flex-shrink-0 text-accent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>Contacts illimités</li>
                    <li class="flex gap-2"><svg class="mt-1 flex-shrink-0 text-accent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>Recherche avancée et raisons de chaque score</li>
                    <li class="flex gap-2"><svg class="mt-1 flex-shrink-0 text-accent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>Projet mis en avant dans les résultats</li>
                  </ul>
                  <p class="mt-3 text-sm text-muted-foreground">Sans engagement</p>
                </section>
              </div>
              <p class="flex gap-2 rounded-xl bg-accent/5 px-4 py-3 text-sm text-primary ring-1 ring-accent/15"><svg class="mt-0.5 flex-shrink-0 text-accent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>Pour rejoindre un projet : échanges gratuits</p>
            </div>
          }

          <section aria-labelledby="abo-unite">
            <h2 id="abo-unite" class="text-xl text-primary">Achats de dossiers</h2>
            <div class="mt-3 rounded-2xl bg-white p-5 shadow-md ring-1 ring-border sm:p-6">
              <div class="flex items-start justify-between gap-3">
                <p class="font-semibold text-primary">Dossier entreprise</p>
                <p class="tabular flex-shrink-0 font-bold text-accent">{{ introPrice }} / dossier</p>
              </div>
              <p class="mt-1 text-sm text-muted-foreground">Dossier complet et contact du cédant d'une entreprise, sans abonnement</p>
              @if (hasMaAccess()) {
                <p class="mt-1 text-sm text-muted-foreground">Ancien accès repreneur actif jusqu’au {{ maAccessEnd() }}</p>
              }
              <p class="mt-2 flex gap-2 text-sm text-muted-foreground"><svg class="mt-0.5 flex-shrink-0 text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>PRO n'inclut pas les dossiers</p>
            </div>
            <a routerLink="/ma/dossiers" class="mt-1 flex items-center gap-3 border-b border-border px-1 py-3 font-semibold text-accent hover:underline">
              <svg class="flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>
              <span class="flex-1">Mes dossiers débloqués</span>
              <span aria-hidden="true">›</span>
            </a>
          </section>

          <section aria-labelledby="abo-paiements">
            <h2 id="abo-paiements" class="text-xl text-primary">Factures et reçus</h2>
            <div class="mt-3 rounded-2xl bg-white p-5 shadow-md ring-1 ring-border sm:p-6">
              @if (payments().length === 0) {
                <div class="py-3 text-center">
                  <svg class="mx-auto text-muted-foreground" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>
                  <p class="mt-2 font-semibold text-primary">Aucune facture pour le moment</p>
                  <p class="mt-1 text-sm text-muted-foreground">Vos factures et reçus apparaîtront ici</p>
                </div>
              } @else {
                <ul class="divide-y divide-border rounded-xl ring-1 ring-border">
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
                <button type="button" (click)="openPortal()" class="mt-4 w-full rounded-lg border border-accent px-5 py-2.5 font-semibold text-accent transition-colors hover:bg-accent/5">Gérer la facturation</button>
                <p class="mt-2 text-center text-sm text-muted-foreground">Moyens de paiement, factures et résiliation, dans l'espace sécurisé de Stripe</p>
              }
            </div>
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
