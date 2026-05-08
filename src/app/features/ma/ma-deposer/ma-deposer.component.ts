import { ChangeDetectionStrategy, Component, signal, computed } from '@angular/core';

@Component({
  selector: 'app-ma-deposer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pt-20 pb-12">
      <div class="max-w-3xl mx-auto px-8 py-8">

        <div class="text-center mb-10 animate-fade-in-up">
          <h1 class="text-4xl font-bold mb-2">Déposer une annonce M&A</h1>
          <p class="text-muted-foreground">Accès one-shot — 149€</p>
        </div>

        <!-- Progress -->
        <div class="mb-8 animate-fade-in-up delay-100">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold text-muted-foreground">Étape {{ currentStep() }} sur {{ totalSteps }}</span>
            <span class="text-sm font-semibold text-amber-600">{{ progressPercent() }}%</span>
          </div>
          <div class="h-2 bg-muted rounded-full overflow-hidden">
            <div class="h-full bg-amber-500 rounded-full transition-all duration-400" [style.width]="progressPercent() + '%'"></div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-border p-10 shadow-lg animate-fade-in-up delay-200">
          <p class="text-muted-foreground text-center py-12">Wizard de dépôt d'annonce — à venir</p>
        </div>

      </div>
    </div>
  `
})
export class MaDeposerComponent {
  readonly totalSteps = 5;
  currentStep = signal(1);
  progressPercent = computed(() => Math.round((this.currentStep() / this.totalSteps) * 100));
}
