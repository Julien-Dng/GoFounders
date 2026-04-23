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
    <div class="min-h-screen pt-32 pb-20 px-8 bg-background">
      <div class="max-w-4xl mx-auto">

        <!-- Header -->
        <div class="text-center mb-12 animate-fade-in-up">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full mb-6">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
            </svg>
            <span class="text-sm font-semibold">Fonctionnalité PRO</span>
          </div>
          <h1 class="text-5xl font-bold mb-4 tracking-tight text-primary">Générateur de Pitch IA</h1>
          <p class="text-lg text-muted-foreground">
            Créez un pitch convaincant en 5 étapes avec l'aide de l'intelligence artificielle
          </p>
        </div>

        @if (!isProUser()) {
          <!-- Locked Overlay for Free Users -->
          <div class="animate-fade-in-scale relative">
            <div class="relative overflow-hidden rounded-2xl border-2 border-border">
              <div class="absolute inset-0 z-10 bg-background/80 backdrop-blur-md flex items-center justify-center">
                <div class="text-center max-w-md p-8">
                  <div class="w-20 h-20 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <h2 class="text-3xl font-bold mb-4 text-primary">Fonctionnalité PRO</h2>
                  <p class="text-muted-foreground mb-6">
                    Le générateur de pitch IA est réservé aux abonnés PRO et PREMIUM. Passez à PRO pour créer des pitchs professionnels en quelques minutes.
                  </p>
                  <div class="space-y-3">
                    <a routerLink="/tarifs" class="w-full px-8 py-4 bg-accent text-white rounded-full font-semibold shadow-xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-all">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m2 4 3 12h14l3-12-6 5-4-5-4 5-6-5z"/>
                        <path d="M5 20h14"/>
                      </svg>
                      Passer à PRO - 49€/mois
                    </a>
                    <button (click)="isProUser.set(true)" class="w-full px-8 py-3 text-muted-foreground hover:text-foreground transition-colors text-sm">
                      Aperçu démo (pour ce test)
                    </button>
                  </div>
                </div>
              </div>
              <div class="blur-sm p-8 select-none pointer-events-none">
                <div class="bg-card rounded-xl p-6 mb-6">
                  <div class="h-8 bg-muted/30 rounded w-3/4 mb-4"></div>
                  <div class="h-32 bg-muted/30 rounded"></div>
                </div>
              </div>
            </div>
          </div>

        } @else {
          <!-- Unlocked Generator -->
          <div class="animate-fade-in-up">

            <!-- Progress Bar -->
            <div class="mb-10">
              <div class="flex items-center justify-between mb-3">
                <span class="text-sm font-semibold text-muted-foreground">Étape {{ currentStep() }} sur {{ totalSteps }}</span>
                <span class="text-sm font-semibold text-accent">{{ progressPercent() }}% complété</span>
              </div>
              <div class="h-2 bg-muted rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-accent to-primary transition-all duration-400" [style.width]="progressPercent() + '%'"></div>
              </div>
            </div>

            @if (currentStep() <= totalSteps) {
              <!-- Step Form -->
              <div class="bg-card rounded-2xl border border-border p-8 mb-6">
                <div class="mb-6">
                  <h2 class="text-3xl font-bold mb-2 text-primary">{{ currentStepData().title }}</h2>
                  <p class="text-lg text-muted-foreground">{{ currentStepData().question }}</p>
                </div>
                <textarea
                  [placeholder]="currentStepData().placeholder"
                  rows="6"
                  class="w-full px-4 py-4 bg-secondary rounded-xl border-2 border-input focus:border-accent outline-none transition-colors resize-none"
                ></textarea>
              </div>

              <!-- Navigation -->
              <div class="flex items-center justify-between">
                <button
                  (click)="handlePrev()"
                  [disabled]="currentStep() === 1"
                  class="px-6 py-3 rounded-full font-semibold flex items-center gap-2 transition-all"
                  [class.opacity-50]="currentStep() === 1"
                  [class.cursor-not-allowed]="currentStep() === 1"
                  [class.bg-muted]="currentStep() === 1"
                  [class.text-muted-foreground]="currentStep() === 1"
                  [class.bg-card]="currentStep() > 1"
                  [class.border-2]="currentStep() > 1"
                  [class.border-border]="currentStep() > 1"
                  [class.hover:border-primary]="currentStep() > 1"
                  [class.hover:scale-105]="currentStep() > 1"
                  [class.active:scale-95]="currentStep() > 1"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"/>
                  </svg>
                  Précédent
                </button>

                <button
                  (click)="handleNext()"
                  class="px-8 py-3 bg-primary text-primary-foreground rounded-full font-semibold flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  {{ currentStep() === totalSteps ? 'Générer mon pitch' : 'Suivant' }}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </button>
              </div>

            } @else {
              <!-- Generated Pitch -->
              <div class="bg-card rounded-2xl border-2 border-accent p-8 mb-6">
                <div class="flex items-center gap-3 mb-6">
                  <div class="w-12 h-12 bg-accent rounded-full flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 class="text-2xl font-semibold">Votre pitch est prêt !</h2>
                    <p class="text-muted-foreground">Généré par l'IA en quelques secondes</p>
                  </div>
                </div>
                <div class="bg-background rounded-xl p-6 mb-6">
                  <pre class="whitespace-pre-wrap font-sans text-foreground leading-relaxed">{{ generatedPitch }}</pre>
                </div>
                <div class="flex gap-4">
                  <button class="flex-1 px-6 py-4 bg-accent text-accent-foreground rounded-full font-semibold flex items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-all">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="7 10 12 15 17 10"/>
                      <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Télécharger en PDF
                  </button>
                  <button class="flex-1 px-6 py-4 bg-card border-2 border-border rounded-full font-semibold flex items-center justify-center gap-2 hover:border-accent transition-all hover:scale-105 active:scale-95">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                    Copier le texte
                  </button>
                </div>
              </div>
            }

          </div>
        }

      </div>
    </div>
  `
})
export class PitchComponent {
  readonly totalSteps = 5;
  currentStep = signal(1);
  isProUser = signal(false);

  progressPercent = computed(() => Math.round((this.currentStep() / this.totalSteps) * 100));

  readonly steps: Step[] = [
    { number: 1, title: 'Votre projet', question: 'Décrivez votre projet en quelques mots', placeholder: 'Ex: Une plateforme SaaS qui aide les PME à gérer leurs stocks...' },
    { number: 2, title: 'Votre cible', question: 'Qui sont vos clients idéaux ?', placeholder: 'Ex: PME de 10 à 50 employés dans le secteur du commerce...' },
    { number: 3, title: 'Le problème', question: 'Quel problème résolvez-vous ?', placeholder: 'Ex: Les PME perdent du temps avec des outils de gestion obsolètes...' },
    { number: 4, title: 'Votre solution', question: 'Comment résolvez-vous ce problème ?', placeholder: "Ex: Notre solution automatise la gestion des stocks avec de l'IA..." },
    { number: 5, title: 'Votre avantage', question: "Qu'est-ce qui vous différencie ?", placeholder: "Ex: Nous sommes les seuls à offrir une intégration complète avec..." },
  ];

  currentStepData = computed(() => this.steps[this.currentStep() - 1]);

  readonly generatedPitch = `🚀 Révolutionnez la gestion de vos stocks

Notre plateforme SaaS aide les PME de 10 à 50 employés à optimiser leur gestion des stocks grâce à l'intelligence artificielle.

Le problème: Les PME perdent en moyenne 15 heures par semaine avec des outils de gestion obsolètes et inefficaces.

Notre solution: Une plateforme tout-en-un qui automatise 80% des tâches de gestion, réduit les erreurs de 95% et permet des économies de 30% sur les coûts opérationnels.

Notre différence: La seule solution qui s'intègre nativement avec tous les logiciels de comptabilité français, avec un ROI démontré en moins de 3 mois.

Traction: 150 clients actifs, 98% de satisfaction, croissance de 40% MoM.

💼 Nous recherchons un CTO passionné pour scaler notre produit à l'échelle nationale.`;

  handleNext(): void {
    if (this.currentStep() <= this.totalSteps) {
      this.currentStep.update(s => s + 1);
    }
  }

  handlePrev(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }
}
