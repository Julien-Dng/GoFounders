import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

// En-tête commun de « Mes entreprises » : dossiers débloqués (achats à l'unité) et annonces à vendre. Les favoris
// sont regroupés à part, dans « Mes favoris ».
@Component({
  selector: 'app-mes-entreprises-tabs',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-3xl font-semibold text-primary sm:text-4xl">Mes entreprises</h1>
        <p class="mt-2 text-muted-foreground">Retrouvez vos dossiers débloqués et vos annonces</p>
      </div>
      <a routerLink="/ma/deposer" class="rounded-lg bg-accent px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent/90">Déposer une annonce</a>
    </div>
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
    { path: '/ma/dossiers', label: 'Dossiers débloqués' },
    { path: '/ma/mes-annonces', label: 'Mes annonces' },
  ];
}
