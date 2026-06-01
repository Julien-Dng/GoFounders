import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Plan } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-locked-overlay',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="absolute inset-0 flex items-center justify-center z-20 bg-background/60 backdrop-blur-sm rounded-2xl">
      <div class="locked-upgrade-panel bg-white/95 backdrop-blur-md rounded-2xl border-2 border-accent p-10 shadow-2xl max-w-md text-center animate-fade-in-scale">
        <div class="locked-upgrade-icon w-16 h-16 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mx-auto mb-5 shadow-lg">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 class="text-2xl font-bold mb-3 text-primary dark:text-foreground">Fonctionnalité {{ requiredPlan }}</h2>
        <p class="text-muted-foreground mb-6 leading-relaxed">{{ description }}</p>
        <a
          routerLink="/tarifs"
          class="locked-upgrade-cta block w-full py-3 bg-accent text-white rounded-lg font-bold shadow-lg shadow-accent/20 hover:bg-accent/90 transition-colors mb-3"
        >
          Passer en {{ requiredPlan }} — {{ requiredPlan === 'PRO' ? '49€/mois' : 'Sur mesure' }}
        </a>
        <button
          type="button"
          (click)="previewDemo()"
          class="locked-demo-link text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Aperçu démo (pour ce test)
        </button>
      </div>
    </div>
  `
})
export class LockedOverlayComponent {
  private readonly auth = inject(AuthService);

  @Input() requiredPlan: Plan = 'PRO';
  @Input() description = 'Passez à un abonnement supérieur pour accéder à cette fonctionnalité.';

  previewDemo(): void {
    const demoPlan: Exclude<Plan, 'FREE'> = this.requiredPlan === 'PREMIUM' ? 'PREMIUM' : 'PRO';
    void this.auth.grantDemoPlan(demoPlan);
  }
}
