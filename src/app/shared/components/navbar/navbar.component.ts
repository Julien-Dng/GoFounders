import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { UserMenuComponent } from '../user-menu/user-menu.component';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, UserMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!isHidden()) {
      <nav class="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">

          <!-- Hamburger aligné avec la flèche retour (left-6 = 24px du bord) -->
          @if (auth.isAuthenticated()) {
            <button
              type="button"
              (click)="toggleDrawer($event)"
              class="absolute left-6 top-0 h-20 flex items-center px-1 text-muted-foreground hover:text-foreground transition-colors z-10"
              aria-label="Menu de navigation"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          }

        <div class="max-w-[1400px] mx-auto h-20 flex items-center pl-16">

          <!-- Logo -->
          <a [routerLink]="logoLink()" class="flex items-center gap-3 group px-4">
            <div class="w-10 h-10 bg-accent rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shadow-md">
              <span class="text-white font-bold text-lg">G</span>
            </div>
            <span class="text-2xl font-bold text-primary">GoFounders</span>
          </a>

          <!-- Nav links (center) -->
          <div class="flex items-center gap-8 flex-1 justify-center">
            @for (link of navLinks; track link.href) {
              <a
                [routerLink]="link.href"
                routerLinkActive="!text-accent"
                class="text-base font-medium transition-colors py-2 text-foreground/70 hover:text-accent"
              >{{ link.label }}</a>
            }
          </div>

          <!-- Right actions -->
          <div class="flex items-center gap-3 px-8">
            @if (auth.isAuthenticated()) {

              <a routerLink="/dashboard" class="px-5 py-2 text-foreground font-medium hover:text-accent transition-colors cursor-pointer">
                Dashboard
              </a>
              <button class="relative p-2 hover:bg-secondary rounded-lg transition-colors" aria-label="Notifications">
                <svg class="bell-ring" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                </svg>
                <span class="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] bg-accent text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
                  {{ notifCount }}
                </span>
              </button>
              <app-user-menu avatarClass="h-11 w-11" />

            } @else {
              <a routerLink="/connexion" class="px-5 py-2 text-foreground font-medium hover:text-accent transition-colors cursor-pointer">
                Connexion
              </a>
              <a routerLink="/inscription" class="px-6 py-2.5 bg-accent text-white rounded-lg font-semibold shadow-md hover:bg-accent/90 transition-all hover:scale-105 active:scale-95 cursor-pointer">
                S'inscrire
              </a>
            }
          </div>

        </div>
      </nav>

      <!-- OVERLAY drawer -->
      @if (drawerOpen()) {
        <div
          class="fixed inset-0 bg-black/25 backdrop-blur-[1px] z-40"
          (click)="drawerOpen.set(false)"
        ></div>
      }

      <!-- DRAWER -->
      <aside
        class="fixed top-20 left-0 bottom-0 w-64 bg-white border-r border-border shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out"
        [style.transform]="drawerOpen() ? 'translateX(0)' : 'translateX(-100%)'"
      >
        <div class="flex items-center justify-between px-5 py-4 border-b border-border">
          <span class="font-bold text-base">Navigation</span>
          <button
            type="button"
            (click)="drawerOpen.set(false)"
            class="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary transition-colors"
            aria-label="Fermer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto p-3 space-y-0.5">
          @for (item of navItems; track item.id) {
            <a
              [routerLink]="item.path"
              routerLinkActive="bg-accent/10 text-accent"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              (click)="drawerOpen.set(false)"
              class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-foreground/70 hover:bg-secondary hover:text-foreground transition-all"
            >
              <span class="text-lg w-6 text-center">{{ item.emoji }}</span>
              <span class="text-sm font-medium flex-1">{{ item.label }}</span>
              @if (item.badge) {
                <span class="w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {{ item.badge }}
                </span>
              }
            </a>
          }
        </div>

        <div class="p-4 border-t border-border">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {{ auth.initials() }}
            </div>
            <div class="min-w-0">
              <div class="text-sm font-semibold truncate">{{ auth.currentUser()?.displayName ?? 'Mon compte' }}</div>
              <span class="text-xs text-muted-foreground">{{ auth.currentUser()?.plan ?? 'FREE' }}</span>
            </div>
          </div>
        </div>
      </aside>
    }
  `
})
export class NavbarComponent {
  private readonly router = inject(Router);
  private readonly doc = inject(DOCUMENT);
  protected readonly auth = inject(AuthService);

  readonly drawerOpen = signal(false);
  readonly notifCount = 3;

  constructor() {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem('gofounders.dark') === 'true';
    if (saved) this.doc.documentElement.classList.add('dark');
  }

  readonly navLinks = [
    { href: '/recherche', label: 'Recherche' },
    { href: '/ma', label: 'M&A' },
    { href: '/tarifs', label: 'Tarifs' },
  ];

  readonly navItems = [
    { id: 'accueil',    label: 'Accueil',     emoji: '🏠', path: '/dashboard',   badge: null, exact: true  },
    { id: 'recherche',  label: 'Recherche',    emoji: '🔍', path: '/recherche',   badge: null, exact: true  },
    { id: 'messages',   label: 'Messages',     emoji: '💬', path: '/messages',    badge: 3,    exact: false },
    { id: 'ma',         label: 'M&A',          emoji: '📈', path: '/ma',          badge: null, exact: true  },
    { id: 'assistant',  label: 'Assistant IA', emoji: '✨', path: '/coaching-ia', badge: null, exact: true  },
    { id: 'abonnement', label: 'Abonnement',   emoji: '💳', path: '/abonnement',  badge: null, exact: true  },
    { id: 'parametres', label: 'Paramètres',   emoji: '⚙️', path: '/parametres',  badge: null, exact: true  },
  ];

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  readonly isHidden = computed(() => {
    const url = this.currentUrl() ?? '';
    return url.startsWith('/dashboard') || url.startsWith('/coaching-ia');
  });

  readonly logoLink = computed(() =>
    this.auth.isAuthenticated() ? '/recherche' : '/'
  );

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.drawerOpen.set(false);
  }

  toggleDrawer(event: Event): void {
    event.stopPropagation();
    this.drawerOpen.update(v => !v);
  }

}
