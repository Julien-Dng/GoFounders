import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { Plan } from '../../core/models/user.model';

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
              Passez en PRO pour débloquer les messages illimités, le matching IA et la recherche avancée.
            </p>

            <button
              type="button"
              (click)="activatePlan('PRO')"
              class="w-full rounded-full bg-accent px-6 py-3 font-bold text-white shadow-lg shadow-accent/20 transition-all hover:scale-[1.02] hover:bg-accent/90 active:scale-95"
            >
              Activer PRO en démo
            </button>
          </section>

          <section class="rounded-2xl border border-primary bg-primary p-8 text-white shadow-2xl">
            <div class="mb-6 flex items-start justify-between gap-4">
              <div>
                <div class="mb-1 text-sm text-white/70">Premium</div>
                <div class="text-3xl font-bold">Sur mesure</div>
              </div>
              <span class="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/80">Accompagnement</span>
            </div>

            <p class="mb-6 text-sm leading-relaxed text-white/75">
              Pour présenter le parcours en soutenance, vous pouvez activer un état PREMIUM de démonstration.
            </p>

            <button
              type="button"
              (click)="activatePlan('PREMIUM')"
              class="w-full rounded-full bg-white px-6 py-3 font-bold text-primary shadow-xl transition-all hover:scale-[1.02] hover:bg-white/95 active:scale-95"
            >
              Activer PREMIUM en démo
            </button>
          </section>

          <section class="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-white p-8 shadow-lg">
            <div class="mb-6 flex items-start justify-between gap-4">
              <div>
                <div class="mb-1 text-sm text-amber-700">Accès M&A</div>
                <div class="text-3xl font-bold text-primary">149€</div>
              </div>
              <span class="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700">One-shot</span>
            </div>

            <p class="mb-6 text-sm leading-relaxed text-muted-foreground">
              Accès indépendant de l'abonnement pour consulter les dossiers complets et déposer une annonce.
            </p>

            <button
              type="button"
              (click)="activateMaAccess()"
              class="w-full rounded-full bg-amber-500 px-6 py-3 font-bold text-white shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] hover:bg-amber-600 active:scale-95"
              [disabled]="hasMaAccess()"
            >
              {{ hasMaAccess() ? 'Accès M&A déjà actif' : "Activer l'accès M&A en démo" }}
            </button>
          </section>
        </div>

        <div class="mt-8 rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground shadow-sm">
          <strong class="text-primary">Note projet :</strong>
          les boutons ci-dessus simulent l'état après paiement. Le branchement Stripe réel viendra ensuite via Checkout + webhook.
        </div>

        <div class="mt-6">
          <a routerLink="/tarifs" class="font-semibold text-accent hover:underline">Retour aux tarifs</a>
        </div>
      </div>
    </div>
  `,
})
export class AbonnementComponent {
  private readonly auth = inject(AuthService);

  readonly currentPlan = computed(() => this.auth.currentUser()?.plan ?? 'FREE');
  readonly hasMaAccess = computed(() => this.auth.hasMaAccess());
  readonly statusMessage = signal('');

  async activatePlan(plan: Exclude<Plan, 'FREE'>): Promise<void> {
    const success = await this.auth.grantDemoPlan(plan);
    this.statusMessage.set(success ? `Plan ${plan} activé en démonstration.` : "Impossible d'activer ce plan pour le moment.");
  }

  async activateMaAccess(): Promise<void> {
    const success = await this.auth.grantMaAccess();
    this.statusMessage.set(success ? "Accès M&A activé en démonstration." : "Impossible d'activer l'accès M&A pour le moment.");
  }
}
