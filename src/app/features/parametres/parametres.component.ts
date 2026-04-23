import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

@Component({
  selector: 'app-parametres',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pt-20 pb-12">
      <div class="max-w-3xl mx-auto px-8 py-8">

        <div class="mb-8 animate-fade-in-up">
          <h1 class="text-4xl font-bold mb-2">Paramètres</h1>
          <p class="text-muted-foreground">Gérez vos préférences et votre compte</p>
        </div>

        <div class="space-y-4 animate-fade-in-up delay-100">

          @for (section of sections; track section.title) {
            <div class="bg-white rounded-2xl border border-border p-6 shadow-sm">
              <h2 class="text-lg font-bold mb-4">{{ section.title }}</h2>
              <div class="space-y-3">
                @for (item of section.items; track item) {
                  <div class="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span class="text-sm">{{ item }}</span>
                    <button class="text-xs text-accent font-semibold hover:underline">Modifier</button>
                  </div>
                }
              </div>
            </div>
          }

          <div class="bg-white rounded-2xl border border-destructive/20 p-6 shadow-sm">
            <h2 class="text-lg font-bold text-destructive mb-4">Zone de danger</h2>
            <button class="px-4 py-2 border border-destructive text-destructive rounded-lg text-sm font-semibold hover:bg-destructive/5 transition-colors">
              Supprimer mon compte
            </button>
          </div>

        </div>
      </div>
    </div>
  `
})
export class ParametresComponent {
  readonly sections = [
    { title: 'Compte', items: ['Email', 'Mot de passe', 'Authentification à deux facteurs'] },
    { title: 'Notifications', items: ['Nouveaux matches', 'Messages', 'Newsletters'] },
    { title: 'Confidentialité', items: ['Visibilité du profil', 'Profil confidentiel (NDA)'] },
  ];
}
