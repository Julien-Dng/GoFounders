import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Plan } from '../../../core/models/user.model';

@Component({
  selector: 'app-locked-overlay',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="absolute inset-0 flex items-center justify-center z-20 bg-background/60 backdrop-blur-sm rounded-2xl">
      <div class="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-accent p-10 shadow-2xl max-w-md text-center animate-fade-in-scale">
        <div class="w-16 h-16 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mx-auto mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 class="text-2xl font-bold mb-3">Fonctionnalité {{ requiredPlan }}</h2>
        <p class="text-muted-foreground mb-6 leading-relaxed">{{ description }}</p>
        <a
          routerLink="/tarifs"
          class="block w-full py-3 bg-accent text-white rounded-lg font-bold shadow-lg hover:bg-accent/90 transition-colors mb-3"
        >
          Passer en {{ requiredPlan }} — {{ requiredPlan === 'PRO' ? '49€/mois' : 'Sur mesure' }}
        </a>
        @if (showDemo) {
          <button
            (click)="demoUnlock.emit()"
            class="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Aperçu démo (pour ce test)
          </button>
        }
      </div>
    </div>
  `
})
export class LockedOverlayComponent {
  @Input() requiredPlan: Plan = 'PRO';
  @Input() description = 'Passez à un abonnement supérieur pour accéder à cette fonctionnalité.';
  @Input() showDemo = true;
  @Output() demoUnlock = new EventEmitter<void>();
}
