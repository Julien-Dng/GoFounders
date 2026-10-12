import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Plan, canAccessMaDetails, canPublishMaListing } from '../../core/models/user.model';
import { PaymentService } from '../../core/services/payment.service';

@Component({
  selector: 'app-abonnement',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pt-20 pb-12">
      <div class="mx-auto max-w-5xl px-8 py-8">
        <div class="mb-8 animate-fade-in-up">
          <h1 class="mb-2 text-4xl font-bold">Mon abonnement</h1>
          <p class="text-muted-foreground">Gérez votre abonnement GoFounders et l'accès M&A.</p>
        </div>

        @if (statusMessage()) {
          <div class="mb-6 rounded-2xl border border-accent/20 bg-accent/10 px-5 py-4 text-sm font-semibold text-accent">
            {{ statusMessage() }}
          </div>
        }

        <div class="grid gap-6 lg:grid-cols-3">
          <section class="rounded-2xl border border-border bg-white p-8 shadow-lg">
            <div class="mb-6 flex items-start justify-between gap-4">
              <div>
                <div class="mb-1 text-sm text-muted-foreground">Plan actuel</div>
                <div class="text-3xl font-bold text-primary">{{ currentPlan() }}</div>
              </div>
              <span class="rounded-full bg-secondary px-3 py-1 text-xs font-bold text-muted-foreground">Abonnement</span>
            </div>

            <p class="mb-6 text-sm leading-relaxed text-muted-foreground">
              Trouvez votre associé plus vite : contacts illimités, raisons détaillées de chaque score de compatibilité
              et assistant IA personnel. 49 €/mois, sans engagement.
            </p>

            <button
              type="button"
              (click)="activatePlan('PRO')"
              class="w-full rounded-full bg-accent px-6 py-3 font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] hover:bg-accent/90 active:scale-95"
            >
              {{ isSimulation ? 'Activer PRO (paiement simulé)' : 'Passer en PRO' }}
            </button>
          </section>

          <section class="rounded-2xl border border-primary bg-primary p-8 text-white shadow-2xl">
            <div class="mb-6 flex items-start justify-between gap-4">
              <div>
                <div class="mb-1 text-sm text-white/70">PREMIUM</div>
                <div class="text-3xl font-bold">Sur devis</div>
              </div>
              <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">Accompagnement</span>
            </div>

            <p class="mb-6 text-sm leading-relaxed text-white/75">
              On vous présente les bonnes personnes : associés et talents qualifiés, investisseurs, experts juridiques
              partenaires, avec un interlocuteur dédié.
            </p>

            @if (isSimulation) {
              <button
                type="button"
                (click)="activatePlan('PREMIUM')"
                class="w-full rounded-full bg-white px-6 py-3 font-bold text-primary shadow-xl transition-all hover:scale-[1.02] hover:bg-white/95 active:scale-95"
              >
                Activer PREMIUM (paiement simulé)
              </button>
            } @else {
              <a
                href="mailto:support@gofounders.fr?subject=Accompagnement%20PREMIUM"
                class="block w-full rounded-full bg-white px-6 py-3 text-center font-bold text-primary shadow-xl transition-all hover:scale-[1.02] hover:bg-white/95"
              >
                Demander un premier échange gratuit
              </a>
            }
          </section>

          <section class="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white p-8 shadow-lg">
            <div class="mb-6 flex items-start justify-between gap-4">
              <div>
                <div class="mb-1 text-sm text-amber-700">M&A</div>
                <div class="text-3xl font-bold text-primary">{{ isSeller() ? 'Gratuit' : '149 €' }}</div>
              </div>
              <span class="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700">{{ isSeller() ? 'Vendeurs' : '12 mois' }}</span>
            </div>

            <p class="mb-6 text-sm leading-relaxed text-muted-foreground">
              {{ maDescription() }}
            </p>

            @if (isBuyer()) {
              <button
                type="button"
                (click)="activateMaAccess()"
                class="w-full rounded-full bg-amber-500 px-6 py-3 font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] hover:bg-amber-600 active:scale-95 disabled:cursor-default disabled:hover:scale-100"
                [disabled]="hasMaAccess()"
              >
                {{ hasMaAccess() ? 'Accès actif jusqu’au ' + maAccessEnd() : isSimulation ? "Activer l'accès repreneur (paiement simulé)" : "Payer l'accès repreneur" }}
              </button>
            } @else if (isSeller()) {
              <a routerLink="/ma/deposer" class="block w-full rounded-full bg-amber-500 px-6 py-3 text-center font-bold text-white shadow-lg shadow-amber-500/20 hover:bg-amber-600">Publier mon annonce</a>
            } @else {
              <a routerLink="/ma" class="block w-full rounded-full border border-amber-300 px-6 py-3 text-center font-bold text-amber-700">Voir les annonces anonymisées</a>
            }
          </section>
        </div>

        @if (isSimulation) {
        <div class="mt-8 rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground shadow-sm">
          <strong class="text-primary">Note projet :</strong>
          les boutons ci-dessus simulent l'état après paiement. Le branchement Stripe réel viendra ensuite via Checkout + webhook.
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
  private readonly auth = inject(AuthService);
  private readonly payment = inject(PaymentService);

  readonly isSimulation = this.payment.isSimulation;
  private readonly profileType = computed(() => this.auth.currentUser()?.profileType);
  readonly isBuyer = computed(() => canAccessMaDetails(this.profileType()));
  readonly isSeller = computed(() => canPublishMaListing(this.profileType()));
  readonly maAccessEnd = computed(() => {
    const expiresAt = this.auth.currentUser()?.maAccessExpiresAt;
    return expiresAt ? new Date(expiresAt).toLocaleDateString('fr-FR') : 'sans limite';
  });
  readonly maDescription = computed(() => {
    if (this.isBuyer()) {
      return "Accès repreneur pendant 12 mois : dossiers complets, motif de cession et contact direct avec les vendeurs. Indépendant de l'abonnement.";
    }

    if (this.isSeller()) {
      return 'Offre de lancement : la publication de votre annonce anonymisée est gratuite.';
    }

    return 'Le M&A est réservé aux comptes acheteur et vendeur. Votre compte voit les annonces anonymisées.';
  });
  readonly currentPlan = computed(() => this.auth.currentUser()?.plan ?? 'FREE');
  readonly hasMaAccess = computed(() => this.auth.hasMaAccess());
  readonly statusMessage = signal('');

  async activatePlan(plan: Exclude<Plan, 'FREE'>): Promise<void> {
    const result = await this.payment.purchase(plan);
    this.statusMessage.set(result.message);
  }

  async activateMaAccess(): Promise<void> {
    const result = await this.payment.purchase('MA_ACCESS');
    this.statusMessage.set(result.message);
  }
}
