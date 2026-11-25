import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { FEATURES } from '../../../core/config/features';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { UserMenuComponent } from '../user-menu/user-menu.component';
import { NotificationMenuComponent } from '../notification-menu/notification-menu.component';
import { MemberNavIconComponent } from '../member-nav-icon/member-nav-icon.component';
import { MemberNavItem, buildMemberNav, isMemberNavActive } from '../../../core/config/member-nav';
import { MessagingService } from '../../../core/services/messaging.service';

type DrawerIcon = 'home' | 'search' | 'users' | 'chart' | 'credit-card';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, UserMenuComponent, NotificationMenuComponent, MemberNavIconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!isHidden()) {
      <nav class="fixed top-0 left-0 right-0 z-[100] overflow-visible border-b" [class]="onDark() ? 'border-white/10 bg-primary' : 'border-border bg-white'">

          <!-- Hamburger aligné avec la flèche retour (left-6 = 24px du bord) -->
          <button
            type="button"
            (click)="toggleDrawer($event)"
            [class]="auth.isAuthenticated()
              ? 'absolute left-4 top-0 z-10 flex h-14 items-center sm:h-16 px-1 transition-colors sm:left-6 ' + (onDark() ? 'text-white/70 hover:text-white' : 'text-muted-foreground hover:text-foreground')
              : 'absolute left-4 top-0 z-10 flex h-14 items-center sm:h-16 px-1 transition-colors lg:hidden ' + (onDark() ? 'text-white/70 hover:text-white' : 'text-muted-foreground hover:text-foreground')"
            aria-label="Menu de navigation"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

        <div class="mx-auto flex h-14 max-w-[78rem] sm:h-16 items-center overflow-visible pl-12 pr-4 sm:pl-16 md:pr-6 xl:px-0">

          <!-- Logo -->
          <a [routerLink]="logoLink()" class="group flex flex-shrink-0 items-center gap-2.5 px-2 sm:px-4 xl:px-0">
            <div class="brand-logo-mark h-8 w-8 flex-shrink-0">
              <img
                src="/assets/images/gofounders-logo-256.png"
                alt="Logo GoFounders"
                class="h-full w-full object-contain"
              >
            </div>
            <span class="font-display truncate text-xl font-bold" [class]="onDark() ? 'text-white' : 'text-primary'">GoFounders</span>
          </a>

          <!-- Nav links (center) -->
          <div class="hidden flex-1 items-center justify-center gap-5 lg:flex xl:gap-8">
            @for (link of navLinks(); track link.href) {
              <a
                [routerLink]="link.href"
                routerLinkActive="underline decoration-2 underline-offset-[22px]"
                #rla="routerLinkActive"
                class="whitespace-nowrap py-2 text-base font-semibold transition-colors"
                [class]="onDark() ? (rla.isActive ? 'text-white' : 'text-white/75 hover:text-white') : (rla.isActive ? 'text-primary' : 'text-foreground/75 hover:text-primary')"
              >@if (link.href === '/pros') {<span class="xl:hidden">Annuaire</span><span class="hidden xl:inline">{{ link.label }}</span>} @else {{{ link.label }}}</a>
            }
          </div>

          <!-- Right actions -->
          <div class="ml-auto hidden items-center gap-3 px-2 md:flex lg:ml-0 lg:pl-8 lg:pr-0">
            @if (auth.isAuthenticated()) {

              <a routerLink="/dashboard" class="px-4 py-2 text-base font-semibold transition-colors" [class]="onDark() ? 'text-white/80 hover:text-white' : 'text-foreground/80 hover:text-primary'">
                Tableau de bord
              </a>
              <a
                routerLink="/messages"
                routerLinkActive="!text-accent"
                class="hidden items-center gap-2 rounded-lg px-3 py-2 transition-colors lg:inline-flex"
                [class]="onDark() ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-foreground hover:bg-secondary hover:text-accent'"
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
              <a routerLink="/connexion" class="px-4 py-2 text-base font-semibold transition-colors" [class]="onDark() ? 'text-white/85 hover:text-white' : 'text-foreground/80 hover:text-primary'">
                Connexion
              </a>
              <a routerLink="/inscription" class="rounded-lg px-4 py-2 text-base font-semibold text-white transition-colors" [class]="onDark() ? 'bg-accent hover:bg-accent/90' : 'bg-primary hover:bg-primary/90'">
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
        class="fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-border shadow-xl z-50 flex flex-col transition-transform duration-300 ease-in-out"
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
          @if (auth.isAuthenticated()) {
            <!-- Membre : même navigation personnelle que le bandeau de l'espace membre (core/config/member-nav.ts) -->
            <nav aria-label="Mon espace" class="space-y-0.5">
              @for (item of memberItems(); track item.id) {
                <a [routerLink]="item.path" (click)="drawerOpen.set(false)" [attr.aria-current]="isMemberActive(item) ? 'page' : null"
                   class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
                   [class]="isMemberActive(item) ? 'bg-accent text-white' : 'text-foreground/75 hover:bg-secondary hover:text-foreground'">
                  <app-member-nav-icon [icon]="item.icon" />
                  <span class="flex-1">{{ item.label }}</span>
                  @if (item.badge) {
                    <span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold text-white">{{ item.badge }}<span class="sr-only"> non lus</span></span>
                  }
                </a>
              }
            </nav>
            @if (siteLinks().length) {
              <nav aria-label="Sur le site" class="mt-4 space-y-0.5 border-t border-border pt-4">
                <p class="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sur le site</p>
                @for (link of siteLinks(); track link.href) {
                  <a [routerLink]="link.href" routerLinkActive="text-accent" [routerLinkActiveOptions]="{ exact: true }" (click)="drawerOpen.set(false)"
                     class="block rounded-lg px-3 py-2 text-sm font-medium text-foreground/75 transition-colors hover:bg-secondary hover:text-foreground">{{ link.label }}</a>
                }
              </nav>
            }
          } @else {
            @for (item of navItems(); track item.id) {
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
                    @case ('users') {
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                        <circle cx="9" cy="7" r="4"/>
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                      </svg>
                    }
                    @case ('chart') {
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 3v18h18"/>
                        <path d="m7 14 4-4 3 3 5-7"/>
                      </svg>
                    }
                    @case ('credit-card') {
                      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="2"/>
                        <path d="M2 10h20"/>
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
          }
        </div>

        <div class="border-t border-border p-4">
          @if (auth.isAuthenticated()) {
            <a
              [routerLink]="profilePath()"
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
                <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white" aria-hidden="true">
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

  constructor() {
    // Mode sombre retiré : on efface un ancien choix enregistré pour revenir au thème clair.
    this.doc.documentElement.classList.remove('dark');
    try {
      localStorage.removeItem('gofounders.dark');
    } catch {
      // Stockage indisponible : rien à effacer.
    }
  }

  // Acheteurs et vendeurs n'ont pas accès à la recherche Talents & Associés.
  // « Trouver un associé » reste visible pour tous les rôles dès que le module est actif.
  private readonly hidesRecherche = computed(() => !FEATURES.associates);

  // Compte multi-usages : tout membre peut publier une annonce. Pros : « Vendre » seulement quand le compte pro
  // (publication pour leurs clients) est proposé. L'assistant IA sort de la navigation (route conservée).
  private readonly hidesVendre = computed(() => this.auth.currentUser()?.profileType === 'pro' && !FEATURES.proAccount);


  private readonly allNavLinks = [
    { href: '/ma', label: 'Annonces' },
    { href: '/ma/deposer', label: 'Vendre' },
    { href: '/recherche', label: 'Associés & équipe' },
    { href: '/pros', label: 'Annuaire des pros' },
    { href: '/tarifs', label: 'Tarifs' },
  ];

  // Visiteurs : vitrine anonyme /associes. Membres : recherche complète (consulter est ouvert à tous les membres).
  private readonly associateHref = computed(() => (this.auth.isAuthenticated() ? '/recherche' : '/associes'));

  readonly navLinks = computed(() =>
    this.allNavLinks
      .filter(link => !(link.href === '/recherche' && this.hidesRecherche()) && !(link.href === '/ma/deposer' && this.hidesVendre()) && !(link.href === '/pros' && !FEATURES.pros))
      .map(link => (link.href === '/recherche'
        ? { ...link, href: this.associateHref(), label: this.auth.isAuthenticated() ? 'Associés & projets' : link.label }
        : link))
  );

  // Visiteurs : mêmes liens que le menu ordinateur.
  private readonly allNavItems: Array<{ id: string; label: string; icon: DrawerIcon; path: string; badge: number | null; exact: boolean }> = [
    { id: 'accueil',    label: 'Accueil',      icon: 'home', path: '/',            badge: null, exact: true  },
    { id: 'ma',         label: 'Annonces',     icon: 'search', path: '/ma',          badge: null, exact: true  },
    { id: 'vendre',     label: 'Vendre',       icon: 'chart', path: '/ma/deposer',  badge: null, exact: true  },
    { id: 'recherche',  label: 'Associés & équipe', icon: 'users', path: '/associes', badge: null, exact: true  },
    { id: 'annuaire',   label: 'Annuaire des pros', icon: 'users', path: '/pros',      badge: null, exact: true  },
    { id: 'tarifs',     label: 'Tarifs',       icon: 'credit-card', path: '/tarifs',  badge: null, exact: true  },
  ];

  readonly navItems = computed(() =>
    this.allNavItems.filter(item =>
      !(item.id === 'recherche' && this.hidesRecherche())
      && !(item.id === 'vendre' && this.hidesVendre())
      && !(item.id === 'annuaire' && !FEATURES.pros)
    )
  );

  // Membre connecté : navigation personnelle partagée avec l'espace membre, puis les seuls liens du site qu'elle
  // ne contient pas déjà (Vendre, Tarifs).
  private readonly messaging = inject(MessagingService);
  readonly profilePath = computed(() => {
    const uid = this.auth.currentUser()?.uid;
    return uid ? `/profil/${uid}` : '/profil/modifier';
  });
  readonly memberItems = computed<MemberNavItem[]>(() =>
    buildMemberNav({ profilePath: this.profilePath(), isAdmin: this.auth.isAdmin(), unread: this.messaging.unreadCount() }));
  readonly siteLinks = computed(() => {
    const memberPaths = new Set(this.memberItems().map(item => item.path));
    return this.navLinks().filter(link => !memberPaths.has(link.href));
  });

  isMemberActive(item: MemberNavItem): boolean {
    return isMemberNavActive(item, this.currentUrl() ?? '', this.profilePath());
  }

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.router.url)
    ),
    { initialValue: this.router.url }
  );

  // En-têtes sombres (accueil, /ma) : la barre prend la couleur encre, comme le haut de page.
  readonly onDark = computed(() => {
    const path = (this.currentUrl() ?? '').split(/[?#]/)[0];
    return path === '/' || path === '' || path === '/ma' || path === '/associes';
  });

  readonly isHidden = computed(() => {
    const url = this.currentUrl() ?? '';
    // Le tableau de bord utilise la même barre que les autres pages ; seul l'assistant IA garde sa mise en page.
    return url.startsWith('/coaching-ia');
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
