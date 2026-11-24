import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs';
import { FEATURES } from '../../../core/config/features';
import { AuthService } from '../../../core/services/auth.service';
import { MessagingService } from '../../../core/services/messaging.service';
import { MaService } from '../../../core/services/ma.service';
import { MatchingService } from '../../../core/services/matching.service';
import { MaListingData, MarketplaceProfile } from '../../../core/data/mock-platform.data';
import { NotificationMenuComponent } from '../notification-menu/notification-menu.component';
import { UserMenuComponent } from '../user-menu/user-menu.component';

type ShellIcon = 'home' | 'heart' | 'users' | 'search' | 'building' | 'messages' | 'user' | 'card' | 'settings' | 'shield';

interface ShellItem {
  id: string;
  label: string;
  icon: ShellIcon;
  path: string;
  // Préfixes d'URL qui rendent l'entrée active (sous-pages comprises).
  match: string[];
  badge?: number;
}

// Espace membre : bandeau bleu marine à gauche (ordinateur) ou tiroir (mobile), et une barre haute avec les
// notifications et le compte. Les pages gardent leur propre contenu ; la barre haute fait 64 px comme celle du site.
@Component({
  selector: 'app-member-shell',
  standalone: true,
  imports: [RouterLink, NotificationMenuComponent, UserMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Barre haute : menu (mobile), notifications, compte -->
    <header class="fixed left-0 right-0 top-0 z-[90] flex h-16 items-center gap-3 border-b border-border bg-white px-4 sm:px-6 lg:left-64">
      <button type="button" (click)="drawerOpen.set(true)" class="-ml-1 rounded-lg p-1.5 text-muted-foreground hover:text-primary lg:hidden" aria-label="Ouvrir le menu" [attr.aria-expanded]="drawerOpen()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
      <a routerLink="/dashboard" class="flex items-center gap-2 lg:hidden">
        <span class="brand-logo-mark h-8 w-8"><img src="/assets/images/gofounders-logo-256.png" alt="" class="h-full w-full object-contain"></span>
        <span class="font-display text-lg font-bold text-primary">GoFounders</span>
      </a>
      <!-- Recherche globale : entreprises, noms des projets et des associés, pages de l'espace membre. -->
      <div class="relative ml-2 hidden max-w-md flex-1 md:block" (focusin)="openSearch()">
        <label for="global-search" class="sr-only">Rechercher sur GoFounders</label>
        <svg class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input id="global-search" type="search" autocomplete="off" [value]="query()" (input)="query.set($any($event.target).value); openSearch()" (keydown.enter)="goFirst()"
               placeholder="Rechercher une entreprise, un projet, une page…" role="combobox" [attr.aria-expanded]="searchOpen() && !!query().trim()" aria-controls="global-search-results"
               class="h-10 w-full rounded-lg border border-transparent bg-secondary pl-10 pr-3 text-sm outline-none transition-colors focus:border-accent focus:bg-white">
        @if (searchOpen() && query().trim()) {
          <div id="global-search-results" class="absolute left-0 right-0 top-full z-10 mt-2 max-h-[26rem] overflow-y-auto rounded-xl bg-white p-2 shadow-xl ring-1 ring-border" role="listbox">
            @for (group of results(); track group.label) {
              <p class="px-2 pb-1 pt-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{{ group.label }}</p>
              @for (item of group.items; track item.link) {
                <a [routerLink]="item.link" (click)="closeSearch()" role="option" class="block rounded-lg px-2 py-2 hover:bg-secondary">
                  <span class="block truncate text-sm font-semibold text-primary">{{ item.title }}</span>
                  @if (item.subtitle) { <span class="block truncate text-xs text-muted-foreground">{{ item.subtitle }}</span> }
                </a>
              }
            } @empty {
              <p class="px-2 py-3 text-sm text-muted-foreground">Aucun résultat pour « {{ query().trim() }} »</p>
            }
            @if (associatesEnabled) {
              <a routerLink="/recherche" (click)="closeSearch()" class="mt-1 block rounded-lg border-t border-border px-2 pb-1 pt-2.5 text-sm font-semibold text-accent hover:underline">Explorer les associés et projets <span aria-hidden="true">→</span></a>
            }
          </div>
        }
      </div>
      <a routerLink="/" class="ml-auto hidden text-sm font-semibold text-muted-foreground transition-colors hover:text-primary lg:inline">Voir le site</a>
      <div class="ml-auto flex items-center gap-3 sm:ml-4">
        <app-notification-menu />
        <app-user-menu avatarClass="h-10 w-10" />
      </div>
    </header>

    <!-- Bandeau (ordinateur) et tiroir (mobile) -->
    @if (drawerOpen()) {
      <div class="fixed inset-0 z-[110] bg-primary/40 lg:hidden" (click)="drawerOpen.set(false)" aria-hidden="true"></div>
    }
    <aside class="fixed bottom-0 left-0 top-0 z-[120] flex w-64 flex-col bg-primary text-white transition-transform lg:z-[95] lg:translate-x-0"
           [class]="drawerOpen() ? 'translate-x-0' : '-translate-x-full'" aria-label="Espace membre">
      <div class="flex h-16 items-center justify-between border-b border-white/10 px-5">
        <a routerLink="/dashboard" class="flex items-center gap-2.5">
          <span class="brand-logo-mark h-9 w-9"><img src="/assets/images/gofounders-logo-256.png" alt="Logo GoFounders" class="h-full w-full object-contain"></span>
          <span class="font-display text-xl font-bold">GoFounders</span>
        </a>
        <button type="button" (click)="drawerOpen.set(false)" class="rounded-lg p-1 text-white/70 hover:text-white lg:hidden" aria-label="Fermer le menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </div>

      <nav class="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navigation de l'espace membre">
        @for (item of items(); track item.id) {
          <a [routerLink]="item.path" (click)="drawerOpen.set(false)" [attr.aria-current]="isActive(item) ? 'page' : null"
             class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.95rem] font-medium transition-colors"
             [class]="isActive(item) ? 'bg-accent text-white' : 'text-white/75 hover:bg-white/10 hover:text-white'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              @switch (item.icon) {
                @case ('home') { <path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/> }
                @case ('heart') { <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.8 1.3-1.7 2.9-2.8 4.9-2.8 3.5 0 5.6 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/> }
                @case ('users') { <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/> }
                @case ('search') { <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/> }
                @case ('building') { <rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3"/> }
                @case ('messages') { <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/> }
                @case ('user') { <path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/> }
                @case ('card') { <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/> }
                @case ('settings') { <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/> }
                @case ('shield') { <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/> }
              }
            </svg>
            <span class="flex-1">{{ item.label }}</span>
            @if (item.badge) {
              <span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-primary">{{ item.badge }}<span class="sr-only"> non lus</span></span>
            }
          </a>
        }
      </nav>

      <a [routerLink]="profilePath()" (click)="drawerOpen.set(false)" class="m-3 flex items-center gap-3 rounded-xl border-t border-white/10 bg-white/5 p-3 transition-colors hover:bg-white/10">
        <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/15 font-semibold">{{ initials() }}</span>
        <span class="min-w-0">
          <span class="block truncate text-sm font-semibold">{{ displayName() }}</span>
          <span class="mt-0.5 inline-block rounded bg-accent px-1.5 py-0.5 text-xs font-bold">{{ plan() }}</span>
        </span>
      </a>
    </aside>
  `,
})
export class MemberShellComponent {
  private readonly auth = inject(AuthService);
  private readonly messaging = inject(MessagingService);
  private readonly router = inject(Router);
  private readonly ma = inject(MaService);
  private readonly matching = inject(MatchingService);

  readonly drawerOpen = signal(false);
  private readonly url = toSignal(
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), map(event => event.urlAfterRedirects)),
    { initialValue: this.router.url },
  );

  readonly displayName = computed(() => this.auth.currentUser()?.displayName ?? 'Mon compte');
  readonly initials = this.auth.initials;
  readonly plan = computed(() => this.auth.currentUser()?.plan ?? 'FREE');
  readonly profilePath = computed(() => {
    const uid = this.auth.currentUser()?.uid;
    return uid ? `/profil/${uid}` : '/profil/modifier';
  });

  readonly items = computed<ShellItem[]>(() => {
    const items: ShellItem[] = [
      { id: 'dashboard', label: 'Tableau de bord', icon: 'home', path: '/dashboard', match: ['/dashboard'] },
      { id: 'favoris', label: 'Mes favoris', icon: 'heart', path: '/favoris', match: ['/favoris', '/ma/favoris'] },
      ...(FEATURES.associates ? [{ id: 'associes', label: 'Associés & projets', icon: 'users' as const, path: '/recherche', match: ['/recherche'] }] : []),
      { id: 'reprendre', label: 'Entreprises à reprendre', icon: 'search', path: '/ma', match: ['/ma/annonce'] },
      { id: 'entreprises', label: 'Mes entreprises', icon: 'building', path: '/mes-entreprises', match: ['/mes-entreprises', '/ma/dossiers', '/ma/mes-annonces', '/ma/statistiques', '/ma/deposer', '/ma/vendue'] },
      { id: 'messages', label: 'Messages', icon: 'messages', path: '/messages', match: ['/messages'], badge: this.messaging.unreadCount() || undefined },
      { id: 'profil', label: 'Mon profil', icon: 'user', path: this.profilePath(), match: [this.profilePath(), '/profil/modifier', '/profil/associe', '/mon-projet'] },
      { id: 'facturation', label: 'Offre et facturation', icon: 'card', path: '/abonnement', match: ['/abonnement', '/paiement'] },
      { id: 'parametres', label: 'Paramètres', icon: 'settings', path: '/parametres', match: ['/parametres'] },
    ];
    if (this.auth.isAdmin()) {
      items.push({ id: 'admin', label: 'Administration', icon: 'shield', path: '/admin/annonces', match: ['/admin'] });
    }
    return items;
  });

  isActive(item: ShellItem): boolean {
    const path = this.url().split(/[?#]/)[0];
    if (item.id === 'reprendre' && path === '/ma') {
      return true;
    }
    // Fiche d'un autre membre : rattachée à « Associés & projets ».
    if (item.id === 'associes' && path.startsWith('/profil/') && !['/profil/modifier', '/profil/associe', this.profilePath()].includes(path)) {
      return true;
    }
    return item.match.some(prefix => path === prefix || path.startsWith(prefix + '/'));
  }

  @HostListener('document:keydown.escape')
  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.searchOpen.set(false);
  }

  // Recherche globale ------------------------------------------------------------------------------------------
  readonly associatesEnabled = FEATURES.associates;
  readonly query = signal('');
  readonly searchOpen = signal(false);
  private readonly searchListings = signal<MaListingData[]>([]);
  private readonly searchProfiles = signal<MarketplaceProfile[]>([]);
  private searchLoaded = false;

  readonly results = computed<Array<{ label: string; items: Array<{ title: string; subtitle: string; link: string }> }>>(() => {
    const words = this.normalize(this.query()).split(/\s+/).filter(Boolean);
    if (!words.length) {
      return [];
    }
    const matches = (text: string) => words.every(word => this.normalize(text).includes(word));
    const pages = this.items()
      .filter(item => matches(item.label))
      .map(item => ({ title: item.label, subtitle: '', link: item.path }));
    const listings = this.searchListings()
      .filter(listing => matches([listing.title, listing.sector, listing.region].filter(Boolean).join(' ')))
      .slice(0, 5)
      .map(listing => ({ title: listing.title || `${listing.sector}, ${listing.region}`, subtitle: `${listing.sector} · ${listing.region}`, link: `/ma/annonce/${listing.id}` }));
    // Noms et intitulés seulement : la recherche par compétences reste la recherche avancée de l'offre PRO.
    const projects = this.searchProfiles()
      .filter(profile => profile.profileType === 'entrepreneur' && matches(profile.displayName))
      .slice(0, 4)
      .map(profile => ({ title: profile.displayName, subtitle: [profile.sector, profile.location].filter(Boolean).join(' · '), link: `/profil/${profile.id}` }));
    const associates = this.searchProfiles()
      .filter(profile => profile.profileType === 'talent' && matches([profile.displayName, profile.title].join(' ')))
      .slice(0, 4)
      .map(profile => ({ title: profile.title || profile.displayName, subtitle: [profile.displayName, profile.location].filter(Boolean).join(' · '), link: `/profil/${profile.id}` }));
    return [
      { label: 'Entreprises', items: listings },
      { label: 'Projets', items: projects },
      { label: 'Associés', items: associates },
      { label: 'Pages', items: pages },
    ].filter(group => group.items.length > 0);
  });

  async openSearch(): Promise<void> {
    this.searchOpen.set(true);
    if (this.searchLoaded) {
      return;
    }
    this.searchLoaded = true;
    const [listings, profiles] = await Promise.all([
      this.ma.getListingCards(),
      FEATURES.associates ? this.matching.getMarketplaceProfilesForSearch() : Promise.resolve<MarketplaceProfile[]>([]),
    ]);
    this.searchListings.set(listings);
    this.searchProfiles.set(profiles);
  }

  closeSearch(): void {
    this.searchOpen.set(false);
    this.query.set('');
  }

  goFirst(): void {
    const first = this.results()[0]?.items[0];
    if (first) {
      void this.router.navigateByUrl(first.link);
      this.closeSearch();
    }
  }

  @HostListener('document:click', ['$event'])
  closeOnOutside(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (this.searchOpen() && !target?.closest('#global-search, #global-search-results')) {
      this.searchOpen.set(false);
    }
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
}
