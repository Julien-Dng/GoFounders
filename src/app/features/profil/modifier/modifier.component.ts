import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-modifier-profil',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pt-20 pb-12">
      <div class="max-w-3xl mx-auto px-8">
        <div class="mb-8 animate-fade-in-up">
          <h1 class="text-4xl font-bold mb-2">Modifier mon profil</h1>
          <p class="text-muted-foreground">Complétez votre profil pour obtenir plus de matches</p>
        </div>

        <div class="bg-white rounded-2xl border border-border p-8 shadow-lg animate-fade-in-up delay-100">
          <p class="text-muted-foreground text-center py-12">Formulaire d'édition de profil — à venir</p>
        </div>
      </div>
    </div>
  `
})
export class ModifierComponent {}
