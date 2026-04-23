import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!isHidden()) {
      <nav class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
        <div class="max-w-[1400px] mx-auto px-8 h-20 flex items-center justify-between">

          <a routerLink="/" class="flex items-center gap-3 group">
            <div class="w-10 h-10 bg-accent rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shadow-md">
              <span class="text-white font-bold text-lg">G</span>
            </div>
            <span class="text-2xl font-bold text-primary">GoFounders</span>
          </a>

          <div class="flex items-center gap-8">
            @for (link of navLinks; track link.href) {
              <a
                [routerLink]="link.href"
                routerLinkActive="!text-accent"
                class="text-base font-medium transition-colors relative py-2 text-foreground/70 hover:text-accent"
              >{{ link.label }}</a>
            }
          </div>

          <div class="flex items-center gap-3">
            <a routerLink="/connexion" class="px-5 py-2 text-foreground font-medium hover:text-accent transition-colors cursor-pointer">
              Connexion
            </a>
            <a routerLink="/inscription" class="px-6 py-2.5 bg-accent text-white rounded-lg font-semibold shadow-md hover:bg-accent/90 transition-all hover:scale-105 active:scale-95 cursor-pointer">
              S'inscrire
            </a>
          </div>

        </div>
      </nav>
    }
  `
})
export class NavbarComponent {
  private router = inject(Router);

  readonly navLinks = [
    { href: '/recherche', label: 'Trouver un associé' },
    { href: '/ma', label: 'M&A' },
    { href: '/tarifs', label: 'Tarifs' },
  ];

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  isHidden = computed(() => {
    const url = this.currentUrl() ?? '';
    return url.startsWith('/dashboard') || url === '/assistant' || url.startsWith('/coaching-ia');
  });
}
