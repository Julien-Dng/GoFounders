import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

// En-tête commun de « Mes entreprises » : favoris, dossiers débloqués (achats à l'unité) et annonces publiées.
@Component({
  selector: 'app-mes-entreprises-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="text-3xl font-semibold text-primary sm:text-4xl">Mes entreprises</h1>
    <nav class="mt-5 flex gap-1 overflow-x-auto border-b border-border" aria-label="Mes entreprises">
      @for (tab of tabs; track tab.path) {
        <a [routerLink]="tab.path" routerLinkActive="border-accent text-primary" [routerLinkActiveOptions]="{ exact: true }"
           #active="routerLinkActive" [attr.aria-current]="active.isActive ? 'page' : null"
           class="-mb-px whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
          {{ tab.label }}
        </a>
      }
    </nav>
  `,
})
export class MesEntreprisesTabsComponent {
  readonly tabs = [
    { path: '/ma/favoris', label: 'Favoris' },
    { path: '/ma/dossiers', label: 'Dossiers débloqués' },
    { path: '/ma/mes-annonces', label: 'Mes annonces' },
  ];
}
