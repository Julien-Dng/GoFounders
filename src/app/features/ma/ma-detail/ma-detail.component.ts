import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-ma-detail',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pt-20 pb-12">
      <div class="max-w-4xl mx-auto px-8 py-8">
        <a routerLink="/ma" class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Retour aux annonces
        </a>
        <div class="bg-white rounded-2xl border border-border p-10 shadow-lg animate-fade-in-up">
          <p class="text-muted-foreground text-center py-12">Détail de l'annonce M&A — à venir</p>
        </div>
      </div>
    </div>
  `
})
export class MaDetailComponent {}
