import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { NotificationMenuComponent } from '../notification-menu/notification-menu.component';

type DrawerIcon = 'home' | 'search' | 'messages' | 'chart' | 'sparkles' | 'credit-card' | 'settings';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, UserMenuComponent, NotificationMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!isHidden()) {
      <nav class="fixed top-0 left-0 right-0 z-[100] overflow-visible bg-white/95 backdrop-blur-md border-b border-border shadow-sm">

          <!-- Hamburger aligné avec la flèche retour (left-6 = 24px du bord) -->
          <button
            type="button"
            (click)="toggleDrawer($event)"
            [class]="auth.isAuthenticated()
              ? 'absolute left-4 top-0 z-10 flex h-20 items-center px-1 text-muted-foreground transition-colors hover:text-foreground sm:left-6'
              : 'absolute left-4 top-0 z-10 flex h-20 items-center px-1 text-muted-foreground transition-colors hover:text-foreground md:hidden'"
            aria-label="Menu de navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

        <div class="mx-auto flex h-20 max-w-[1400px] items-center overflow-visible pl-12 pr-4 sm:pl-16 md:pr-6">

          <!-- Logo -->
          <a [routerLink]="logoLink()" class="group flex min-w-0 items-center gap-2 px-2 sm:gap-3 sm:px-4">
            <div class="brand-logo-mark h-9 w-9 flex-shrink-0 transition-transform group-hover:scale-105 sm:h-11 sm:w-11">
              <img
                src="/assets/images/gofounders-logo.png"
                alt="Logo GoFounders"
                class="h-full w-full object-contain"
              >
            </div>
            <span class="truncate text-xl font-bold text-primary sm:text-2xl">GoFounders</span>
          </a>

          <!-- Nav links (center) -->
          <div class="hidden flex-1 items-center justify-center gap-8 md:flex">
            @for (link of navLinks; track link.href) {
              <a
                [routerLink]="link.href"
                routerLinkActive="!text-accent"
                class="text-base font-medium transition-colors py-2 text-foreground/70 hover:text-accent"
              >{{ link.label }}</a>
            }
          </div>

          <!-- Right actions -->
          <div class="hidden items-center gap-3 px-2 md:flex lg:px-8">
            @if (auth.isAuthenticated()) {

              <a routerLink="/dashboard" class="px-5 py-2 text-foreground font-medium hover:text-accent transition-colors">
                Dashboard
              </a>
              <a
                routerLink="/messages"
                routerLinkActive="!text-accent"
                class="hidden items-center gap-2 rounded-lg px-3 py-2 text-foreground transition-colors hover:bg-secondary hover:text-accent lg:inline-flex"
                aria-label="Ouvrir les messages"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                <span class="hidden xl:inline">Messages</span>
              </a>
              <app-notification-menu />
              <app-user-menu avatarClass="h-11 w-11" />

            } @else {
              <a routerLink="/connexion" class="px-5 py-2 text-foreground font-medium hover:text-accent transition-colors">
                Connexion
              </a>
              <a routerLink="/inscription" class="px-6 py-2.5 bg-accent text-white rounded-lg font-semibold shadow-md hover:bg-accent/90 transition-all hover:scale-105 active:scale-95">
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
              <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-colors group-hover:text-accent" aria-hidden="true">
                @switch (item.icon) {
                  @case ('home') {
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 10.5 12 3l9 7.5"/>
                      <path d="M5 9.5V21h14V9.5"/>
                    </svg>
                  }
                  @case ('search') {
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="11" cy="11" r="7"/>
                      <path d="m20 20-3.5-3.5"/>
                    </svg>
                  }
                  @case ('messages') {
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  }
                  @case ('chart') {
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 3v18h18"/>
                      <path d="m7 14 4-4 3 3 5-7"/>
                    </svg>
                  }
                  @case ('sparkles') {
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9z"/>
                      <path d="M5 3v4"/>
                      <path d="M19 17v4"/>
                      <path d="M3 5h4"/>
                      <path d="M17 19h4"/>
                    </svg>
                  }
                  @case ('credit-card') {
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <path d="M2 10h20"/>
                    </svg>
                  }
                  @case ('settings') {
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  }
                }
              </span>
              <span class="text-sm font-medium flex-1">{{ item.label }}</span>
              @if (item.badge) {
                <span class="w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {{ item.badge }}
                </span>
              }
            </a>
          }
        </div>

        <div class="border-t border-border p-4">
          @if (auth.isAuthenticated()) {
            <a
              [routerLink]="profileLink()"
              (click)="drawerOpen.set(false)"
              class="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              [attr.aria-label]="'Voir le profil de ' + displayName()"
            >
              @if (showPhoto()) {
                <img
                  [src]="photoUrl()"
                  [alt]="'Photo de profil de ' + displayName()"
                  (error)="handlePhotoError()"
                  class="h-9 w-9 flex-shrink-0 rounded-full border border-border object-cover shadow-sm"
                >
              } @else {
                <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary text-sm font-bold text-white" aria-hidden="true">
                  {{ auth.initials() }}
                </span>
              }
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold">{{ displayName() }}</div>
                <span class="text-xs text-muted-foreground">{{ auth.currentUser()?.plan ?? 'FREE' }}</span>
              </div>
            </a>
          } @else {
            <div class="grid gap-2">
              <a routerLink="/connexion" (click)="drawerOpen.set(false)" class="rounded-xl border border-border px-4 py-2.5 text-center text-sm font-semibold">Connexion</a>
              <a routerLink="/inscription" (click)="drawerOpen.set(false)" class="rounded-xl bg-accent px-4 py-2.5 text-center text-sm font-semibold text-white">S'inscrire</a>
            </div>
          }
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
  private readonly failedPhotoUrl = signal('');

  readonly displayName = computed(() => this.auth.currentUser()?.displayName ?? 'Mon compte');
  readonly photoUrl = computed(() => this.auth.currentUser()?.photoURL?.trim() ?? '');
  readonly showPhoto = computed(() => {
    const photoUrl = this.photoUrl();
    return photoUrl.length > 0 && this.failedPhotoUrl() !== photoUrl;
  });
  readonly profileLink = computed(() => {
    const userId = this.auth.currentUser()?.uid;
    return userId ? ['/profil', userId] : ['/dashboard'];
  });

  constructor() {
    const saved = typeof localStorage !== 'undefined' && localStorage.getItem('gofounders.dark') === 'true';
    if (saved) this.doc.documentElement.classList.add('dark');
  }

  readonly navLinks = [
    { href: '/recherche', label: 'Recherche' },
    { href: '/ma', label: 'M&A' },
    { href: '/tarifs', label: 'Tarifs' },
  ];

  readonly navItems: Array<{ id: string; label: string; icon: DrawerIcon; path: string; badge: number | null; exact: boolean }> = [
    { id: 'accueil',    label: 'Accueil',     icon: 'home', path: '/dashboard',   badge: null, exact: true  },
    { id: 'recherche',  label: 'Recherche',    icon: 'search', path: '/recherche',   badge: null, exact: true  },
    { id: 'messages',   label: 'Messages',     icon: 'messages', path: '/messages',    badge: null, exact: false },
    { id: 'ma',         label: 'M&A',          icon: 'chart', path: '/ma',          badge: null, exact: true  },
    { id: 'assistant',  label: 'Assistant IA', icon: 'sparkles', path: '/coaching-ia', badge: null, exact: true  },
    { id: 'abonnement', label: 'Abonnement',   icon: 'credit-card', path: '/tarifs',      badge: null, exact: true  },
    { id: 'parametres', label: 'Paramètres',   icon: 'settings', path: '/parametres',  badge: null, exact: true  },
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
    this.auth.isAuthenticated() ? '/dashboard' : '/'
  );

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.drawerOpen.set(false);
  }

  toggleDrawer(event: Event): void {
    event.stopPropagation();
    this.drawerOpen.update(v => !v);
  }

  handlePhotoError(): void {
    this.failedPhotoUrl.set(this.photoUrl());
  }

}
