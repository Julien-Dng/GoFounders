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
        <h1 class="text-2xl font-semibold text-primary sm:text-4xl">Mes entreprises</h1>
        <p class="mt-2 text-muted-foreground">Retrouvez vos dossiers débloqués et vos annonces</p>
      </div>
      <div class="flex items-center gap-4">
        <a routerLink="/ma/deposer" class="rounded-lg bg-accent px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent/90">Déposer une annonce</a>
        <a routerLink="/ma" class="text-sm font-semibold text-accent hover:underline sm:hidden">Explorer les entreprises&nbsp;<span aria-hidden="true">→</span></a>
      </div>
    </div>
    <nav class="mt-5 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Mes entreprises">
      @for (tab of tabs; track tab.path) {
        <a [routerLink]="tab.path" routerLinkActive="border-accent text-primary" [routerLinkActiveOptions]="{ exact: true }"
           #active="routerLinkActive" [attr.aria-current]="active.isActive ? 'page' : null"
           class="-mb-px flex-1 whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-center sm:flex-none text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
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
