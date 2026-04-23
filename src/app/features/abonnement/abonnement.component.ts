import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-abonnement',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pt-20 pb-12">
      <div class="max-w-3xl mx-auto px-8 py-8">

        <div class="mb-8 animate-fade-in-up">
          <h1 class="text-4xl font-bold mb-2">Mon abonnement</h1>
          <p class="text-muted-foreground">Gérez votre abonnement GoFounders</p>
        </div>

        <div class="bg-white rounded-2xl border border-border p-10 shadow-lg animate-fade-in-up delay-100">
          <div class="flex items-center justify-between mb-8 pb-8 border-b border-border">
            <div>
              <div class="text-sm text-muted-foreground mb-1">Plan actuel</div>
              <div class="text-2xl font-bold">FREE</div>
            </div>
            <a routerLink="/tarifs" class="px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:bg-accent/90 transition-colors">
              Upgrader
            </a>
          </div>
          <p class="text-muted-foreground text-center py-6">Gestion Stripe — à venir</p>
        </div>

      </div>
    </div>
  `
})
export class AbonnementComponent {}
