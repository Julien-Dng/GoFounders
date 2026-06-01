import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface Step {
  number: number;
  title: string;
  question: string;
  placeholder: string;
}

@Component({
  selector: 'app-pitch',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-background px-4 pb-20 pt-24 sm:px-6 lg:px-8 lg:pt-32">
      <div class="mx-auto max-w-4xl">
        <div class="mb-10 text-center animate-fade-in-up sm:mb-12">
          <div class="mb-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-accent">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
            </svg>
            <span class="text-sm font-semibold">Fonctionnalité PRO</span>
          </div>
          <h1 class="mb-4 text-4xl font-bold tracking-tight text-primary sm:text-5xl">Générateur de pitch IA</h1>
          <p class="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
            Créez un pitch convaincant en 5 étapes, avec une structure claire et réutilisable pour vos échanges investisseurs ou cofondateurs.
          </p>
        </div>

        <div class="animate-fade-in-up">
          <div class="mb-8 sm:mb-10">
            <div class="mb-3 flex items-center justify-between gap-4">
              <span class="text-sm font-semibold text-muted-foreground">Étape {{ visibleStep() }} sur {{ totalSteps }}</span>
              <span class="text-sm font-semibold text-accent">{{ progressPercent() }}% complété</span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-muted">
              <div class="h-full bg-gradient-to-r from-accent to-primary transition-all duration-400" [style.width]="progressPercent() + '%'"></div>
            </div>
          </div>

          @if (currentStep() <= totalSteps) {
            <div class="mb-6 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <div class="mb-6">
                <h2 class="mb-2 text-2xl font-bold text-primary sm:text-3xl">{{ currentStepData().title }}</h2>
                <p class="text-base text-muted-foreground sm:text-lg">{{ currentStepData().question }}</p>
              </div>
              <textarea
                [placeholder]="currentStepData().placeholder"
                rows="6"
                class="w-full resize-none rounded-xl border-2 border-input bg-secondary px-4 py-4 outline-none transition-colors focus:border-accent"
              ></textarea>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                (click)="handlePrev()"
                [disabled]="currentStep() === 1"
                class="flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold transition-all"
                [class.bg-muted]="currentStep() === 1"
                [class.cursor-not-allowed]="currentStep() === 1"
                [class.opacity-50]="currentStep() === 1"
                [class.text-muted-foreground]="currentStep() === 1"
                [class.border-2]="currentStep() > 1"
                [class.border-border]="currentStep() > 1"
                [class.bg-card]="currentStep() > 1"
                [class.hover:border-primary]="currentStep() > 1"
                [class.hover:scale-105]="currentStep() > 1"
                [class.active:scale-95]="currentStep() > 1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
                Précédent
              </button>

              <button
                (click)="handleNext()"
                class="flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-3 font-semibold text-primary-foreground shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                {{ currentStep() === totalSteps ? 'Générer mon pitch' : 'Suivant' }}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>
          } @else {
            <div class="mb-6 rounded-2xl border-2 border-accent bg-card p-6 sm:p-8">
              <div class="mb-6 flex items-start gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                  </svg>
                </div>
                <div>
                  <h2 class="text-2xl font-semibold text-primary">Votre pitch est prêt</h2>
                  <p class="text-muted-foreground">Vous pouvez maintenant le copier ou le télécharger.</p>
                </div>
              </div>

              <div class="mb-6 rounded-xl bg-background p-6">
                <pre class="whitespace-pre-wrap font-sans leading-relaxed text-foreground">{{ generatedPitch }}</pre>
              </div>

              <div class="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  (click)="downloadPitch()"
                  class="flex flex-1 items-center justify-center gap-2 rounded-full bg-accent px-6 py-4 font-semibold text-accent-foreground shadow-lg transition-all hover:scale-105 active:scale-95"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Télécharger le pitch
                </button>
                <button
                  type="button"
                  (click)="copyPitch()"
                  class="flex flex-1 items-center justify-center gap-2 rounded-full border-2 border-border bg-card px-6 py-4 font-semibold transition-all hover:border-accent hover:scale-105 active:scale-95"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                  </svg>
                  {{ copyState() }}
                </button>
              </div>

              <div class="mt-4 text-sm text-muted-foreground">
                <a routerLink="/dashboard" class="font-semibold text-accent hover:underline">Retour au dashboard</a>
              </div>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class PitchComponent {
  readonly totalSteps = 5;
  readonly currentStep = signal(1);
  readonly copyState = signal('Copier le texte');

  readonly progressPercent = computed(() =>
    Math.round((this.visibleStep() / this.totalSteps) * 100)
  );

  readonly visibleStep = computed(() =>
    Math.min(this.currentStep(), this.totalSteps)
  );

  readonly steps: Step[] = [
    {
      number: 1,
      title: 'Votre projet',
      question: 'Décrivez votre projet en quelques mots',
      placeholder: 'Ex : Une plateforme SaaS qui aide les PME à gérer leurs stocks...',
    },
    {
      number: 2,
      title: 'Votre cible',
      question: 'Qui sont vos clients idéaux ?',
      placeholder: 'Ex : Des PME de 10 à 50 employés dans le secteur du commerce...',
    },
    {
      number: 3,
      title: 'Le problème',
      question: 'Quel problème résolvez-vous ?',
      placeholder: 'Ex : Les PME perdent du temps avec des outils de gestion obsolètes...',
    },
    {
      number: 4,
      title: 'Votre solution',
      question: 'Comment résolvez-vous ce problème ?',
      placeholder: "Ex : Notre solution automatise la gestion des stocks avec de l'IA...",
    },
    {
      number: 5,
      title: 'Votre avantage',
      question: "Qu'est-ce qui vous différencie ?",
      placeholder: "Ex : Nous sommes les seuls à offrir une intégration complète avec...",
    },
  ];

  readonly currentStepData = computed(() => this.steps[this.visibleStep() - 1]);

  readonly generatedPitch = `Révolutionnez la gestion de vos stocks

Notre plateforme SaaS aide les PME de 10 à 50 employés à optimiser leur gestion des stocks grâce à l'intelligence artificielle.

Le problème : les PME perdent en moyenne 15 heures par semaine avec des outils de gestion obsolètes et inefficaces.

Notre solution : une plateforme tout-en-un qui automatise 80 % des tâches de gestion, réduit les erreurs de 95 % et permet des économies de 30 % sur les coûts opérationnels.

Notre différence : la seule solution qui s'intègre nativement avec les principaux logiciels de comptabilité français, avec un ROI démontré en moins de 3 mois.

Traction : 150 clients actifs, 98 % de satisfaction, croissance de 40 % mois après mois.

Nous recherchons un CTO passionné pour scaler notre produit à l'échelle nationale.`;

  handleNext(): void {
    if (this.currentStep() <= this.totalSteps) {
      this.currentStep.update(step => step + 1);
    }
  }

  handlePrev(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
    }
  }

  async copyPitch(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.generatedPitch);
      this.copyState.set('Texte copié');
      window.setTimeout(() => this.copyState.set('Copier le texte'), 1800);
    } catch {
      this.copyState.set('Copie indisponible');
      window.setTimeout(() => this.copyState.set('Copier le texte'), 1800);
    }
  }

  downloadPitch(): void {
    const blob = new Blob([this.generatedPitch], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'gofounders-pitch-ia.txt';
    anchor.click();
    URL.revokeObjectURL(url);
  }
}
