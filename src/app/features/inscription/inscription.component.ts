import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgClass } from '@angular/common';

interface ProfileType {
  id: string;
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white flex items-center justify-center px-8 py-12">
      <div class="w-full max-w-4xl">

        <!-- Progress Bar -->
        <div class="mb-12 animate-fade-in-up">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold text-muted-foreground">Étape {{ currentStep }} sur {{ totalSteps }}</span>
            <span class="text-sm font-semibold text-accent">{{ progressPercent }}%</span>
          </div>
          <div class="h-2 bg-secondary rounded-full overflow-hidden">
            <div class="h-full bg-accent rounded-full transition-all duration-600" [style.width]="progressPercent + '%'"></div>
          </div>
        </div>

        <!-- Main Card -->
        <div class="bg-white rounded-2xl border-2 border-border p-12 shadow-lg animate-fade-in-scale delay-100">
          <h1 class="text-4xl font-bold text-primary mb-12 text-center">Vous êtes plutôt...</h1>

          <div class="grid grid-cols-2 gap-6 mb-12">
            @for (type of profileTypes; track type.id) {
              <button
                (click)="selectType(type.id)"
                [ngClass]="selectedType() === type.id
                  ? 'p-8 rounded-2xl border-2 border-accent bg-accent/5 shadow-lg text-left transition-all hover:scale-105 active:scale-95'
                  : 'p-8 rounded-2xl border-2 border-border bg-card text-left transition-all hover:scale-105 active:scale-95 hover:shadow-md'"
              >
                <div class="text-5xl mb-4">{{ type.icon }}</div>
                <h3 class="text-xl font-bold mb-2 text-primary">{{ type.title }}</h3>
                <p class="text-muted-foreground leading-relaxed">{{ type.description }}</p>

                @if (selectedType() === type.id) {
                  <div class="mt-4 flex items-center gap-2 text-accent font-semibold animate-scale-in">
                    <div class="w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 5L4.5 8.5L11 1.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </div>
                    <span class="text-sm">Sélectionné</span>
                  </div>
                }
              </button>
            }
          </div>

          <button
            (click)="handleContinue()"
            [disabled]="!selectedType()"
            [ngClass]="selectedType()
              ? 'w-full py-4 rounded-lg font-semibold text-lg bg-accent text-white shadow-lg cursor-pointer transition-all hover:bg-accent/90 hover:scale-105 active:scale-95'
              : 'w-full py-4 rounded-lg font-semibold text-lg bg-muted text-muted-foreground cursor-not-allowed opacity-50'"
          >
            Continuer
          </button>
        </div>

        <p class="text-center text-sm text-muted-foreground mt-6 animate-fade-in delay-700">
          Vous pourrez modifier ce choix plus tard dans vos paramètres
        </p>

      </div>
    </div>
  `
})
export class InscriptionComponent {
  readonly totalSteps = 3;
  readonly currentStep = 1;

  selectedType = signal<string | null>(null);

  get progressPercent(): number {
    return Math.round((this.currentStep / this.totalSteps) * 100);
  }

  readonly profileTypes: ProfileType[] = [
    { id: 'porteur', icon: '🚀', title: 'Porteur de projet', description: "J'ai une idée ou un business à développer" },
    { id: 'talent', icon: '🧑‍💻', title: 'Talent / Expert', description: 'Je propose mes compétences' },
    { id: 'both', icon: '🤝', title: 'Les deux', description: 'Je cherche et je propose' },
    { id: 'acheteur', icon: '🏢', title: 'Acheteur / Repreneur', description: "Je cherche une entreprise à acquérir" },
  ];

  selectType(id: string): void {
    this.selectedType.set(id);
  }

  handleContinue(): void {
    if (this.selectedType()) {
      console.log('Selected type:', this.selectedType());
    }
  }
}
