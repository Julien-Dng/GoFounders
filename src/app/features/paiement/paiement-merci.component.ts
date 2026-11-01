import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

// Retour de Stripe Checkout. Les droits sont accordés par le webhook Stripe, qui peut arriver
// quelques secondes après : le profil est relu plusieurs fois avant d'afficher la suite.
@Component({
  selector: 'app-paiement-merci',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[40rem] rounded-xl bg-white shadow-lg ring-1 ring-border p-8 text-center">
        @if (checking()) {
          <h1 class="text-3xl text-primary">Paiement reçu, activation en cours…</h1>
          <p class="mt-3 text-base text-muted-foreground">Nous attendons la confirmation de Stripe. Cela prend en général quelques secondes.</p>
        } @else {
          <h1 class="text-3xl text-primary">Merci, votre paiement est confirmé</h1>
          <p class="mt-3 text-base text-muted-foreground">
            Votre offre est active. Un reçu vous a été envoyé par e-mail par Stripe. Vous retrouvez vos factures dans « Mon abonnement ».
          </p>
          <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a routerLink="/dashboard" class="rounded-lg bg-primary px-5 py-3 font-medium text-white transition-colors hover:bg-primary/90">Aller au tableau de bord</a>
            <a routerLink="/ma" class="rounded-lg border border-primary px-5 py-3 font-medium text-primary transition-colors hover:bg-primary hover:text-white">Voir les annonces</a>
          </div>
          <p class="mt-6 text-sm text-muted-foreground">Votre offre n'apparaît pas encore ? Rechargez la page dans une minute ou écrivez-nous.</p>
        }
      </div>
    </div>
  `,
})
export class PaiementMerciComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly checking = signal(true);

  ngOnInit(): void {
    void this.refreshProfile();
  }

  private async refreshProfile(): Promise<void> {
    for (const delay of [0, 2000, 4000, 8000]) {
      await new Promise(resolve => setTimeout(resolve, delay));
      await this.auth.reloadCurrentProfile();
    }

    this.checking.set(false);
  }
}
