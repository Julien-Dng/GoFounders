import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationMenuComponent } from '../../shared/components/notification-menu/notification-menu.component';
import { UserMenuComponent } from '../../shared/components/user-menu/user-menu.component';

type SidebarIcon = 'home' | 'search' | 'user' | 'messages' | 'ma' | 'sparkles' | 'credit-card' | 'settings';
type StatIcon = 'views' | 'messages' | 'target';
type QuickActionIcon = 'target' | 'user' | 'chart';

interface SidebarItem {
  id: string;
  label: string;
  icon: SidebarIcon;
  path: string;
  badge: number | null;
}

interface StatItem {
  label: string;
  value: string;
  icon: StatIcon;
}

interface QuickActionItem {
  label: string;
  icon: QuickActionIcon;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, NotificationMenuComponent, UserMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen bg-secondary">
      <aside class="fixed bottom-0 left-0 top-0 flex w-60 flex-col border-r border-primary-foreground/10 bg-primary text-primary-foreground">
        <div class="border-b border-primary-foreground/10 p-6">
          <a routerLink="/dashboard" class="flex items-center gap-3">
            <div class="brand-logo-mark h-11 w-11">
              <img
                src="/assets/images/gofounders-logo.png"
                alt="Logo GoFounders"
                class="h-full w-full object-contain"
              >
            </div>
            <span class="text-xl font-bold">GoFounders</span>
          </a>
        </div>

        <nav class="flex-1 space-y-1 p-4">
          @for (item of sidebarItems(); track item.id) {
            <a
              [routerLink]="item.path"
              routerLinkActive="!bg-primary-foreground/20 !text-primary-foreground"
              [routerLinkActiveOptions]="{ exact: true }"
              class="group relative flex w-full items-center gap-3 rounded-lg px-4 py-3 text-primary-foreground/70 transition-all hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-current transition-colors group-hover:bg-white/10" aria-hidden="true">
                @switch (item.icon) {
                  @case ('home') {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 10.5 12 3l9 7.5"/>
                      <path d="M5 9.5V21h14V9.5"/>
                    </svg>
                  }
                  @case ('search') {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="11" cy="11" r="7"/>
                      <path d="m20 20-3.5-3.5"/>
                    </svg>
                  }
                  @case ('user') {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21a8 8 0 0 0-16 0"/>
                      <circle cx="12" cy="8" r="4"/>
                    </svg>
                  }
                  @case ('messages') {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  }
                  @case ('ma') {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M3 3v18h18"/>
                      <path d="m7 14 4-4 3 3 5-7"/>
                    </svg>
                  }
                  @case ('sparkles') {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9z"/>
                      <path d="M5 3v4"/>
                      <path d="M19 17v4"/>
                      <path d="M3 5h4"/>
                      <path d="M17 19h4"/>
                    </svg>
                  }
                  @case ('credit-card') {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <path d="M2 10h20"/>
                    </svg>
                  }
                  @case ('settings') {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="3"/>
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 10.09 3H10a2 2 0 1 1 4 0h-.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09A1.65 1.65 0 0 0 21 10.09V10a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                    </svg>
                  }
                }
              </span>
              <span class="text-sm font-medium">{{ item.label }}</span>
              @if (item.badge) {
                <span class="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
                  {{ item.badge }}
                </span>
              }
            </a>
          }
        </nav>

        <div class="border-t border-primary-foreground/10 p-4">
          <div class="cursor-pointer rounded-lg bg-primary-foreground/5 p-3 transition-colors hover:bg-primary-foreground/10">
            <div class="flex items-center gap-3">
              @if (photoUrl()) {
                <img
                  [src]="photoUrl()"
                  [alt]="'Photo de profil de ' + displayName()"
                  class="h-10 w-10 flex-shrink-0 rounded-full border border-primary-foreground/10 object-cover shadow-sm"
                >
              } @else {
                <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary font-bold text-white">
                  {{ initials() }}
                </div>
              }

              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-semibold">{{ displayName() }}</div>
                <div class="flex items-center gap-1.5">
                  <span class="rounded bg-muted/20 px-2 py-0.5 text-xs text-muted">{{ planLabel() }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div class="ml-60 flex flex-1 flex-col">
        <header class="sticky top-0 z-40 border-b border-border bg-white">
          <div class="flex h-16 items-center justify-between px-8">
            <div class="max-w-xl flex-1">
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" placeholder="Rechercher des profils, compétences..." class="w-full rounded-lg border border-transparent bg-secondary py-2 pl-10 pr-4 outline-none transition-colors focus:border-accent">
              </div>
            </div>
            <div class="flex items-center gap-4">
              <app-notification-menu />
              <app-user-menu avatarClass="h-10 w-10" />
            </div>
          </div>
        </header>

        <div class="p-8">
          <div class="grid grid-cols-12 gap-6">
            <div class="col-span-3 space-y-6">
              <div class="animate-fade-in-up rounded-2xl border border-border bg-white p-6 shadow-sm">
                <h3 class="mb-4 text-lg font-bold">Mon profil</h3>
                <div class="mb-4">
                  <div class="mb-2 flex items-center justify-between">
                    <span class="text-sm text-muted-foreground">Complétion</span>
                    <span class="text-sm font-bold text-accent">65%</span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-secondary">
                    <div class="h-full rounded-full bg-accent" style="width: 65%"></div>
                  </div>
                </div>
                <p class="mb-4 text-sm text-muted-foreground">Complétez votre profil pour augmenter vos chances de match.</p>
                <a routerLink="/profil/modifier" class="block w-full rounded-lg border-2 border-border py-2 text-center text-sm font-semibold transition-colors hover:border-accent">
                  Compléter mon profil
                </a>
              </div>

              <div class="animate-fade-in-up delay-100 rounded-2xl bg-gradient-to-br from-accent to-primary p-6 text-white shadow-lg">
                <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m2 4 3 12h14l3-12-6 5-4-5-4 5-6-5z"/>
                    <path d="M5 20h14"/>
                  </svg>
                </div>
                <h3 class="mb-2 text-lg font-bold">Passez en PRO</h3>
                <p class="mb-4 text-sm leading-relaxed opacity-90">Débloquez l'IA de matching, les messages illimités et davantage de visibilité.</p>
                <a routerLink="/tarifs" class="block w-full rounded-lg bg-white py-2.5 text-center font-semibold text-accent shadow-md transition-colors hover:bg-white/95">Découvrir PRO</a>
              </div>
            </div>

            <div class="col-span-6 space-y-6">
              <div class="animate-fade-in-up delay-100 rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div class="mb-6 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                    </svg>
                    <h2 class="text-xl font-bold">Vos matches du jour</h2>
                  </div>
                  <a routerLink="/recherche" class="text-sm font-semibold text-accent hover:underline">Voir tous</a>
                </div>

                <div class="space-y-4">
                  @for (match of matches; track $index) {
                    <div class="group flex items-center gap-4 rounded-xl border border-transparent bg-secondary p-4 transition-colors hover:border-accent/20 hover:bg-accent/5">
                      <div class="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary font-bold text-white">
                        {{ match.avatar }}
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="mb-1 flex items-center gap-2">
                          <h3 class="font-bold">{{ match.name }}</h3>
                          <span class="rounded bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">{{ match.stage }}</span>
                        </div>
                        <div class="mb-1 text-sm text-muted-foreground">{{ match.role }}</div>
                        <div class="truncate text-sm text-foreground/70">{{ match.project }}</div>
                      </div>
                      <div class="flex flex-shrink-0 items-center gap-3">
                        <div class="flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1.5 text-accent">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                          </svg>
                          <span class="text-sm font-bold">{{ match.compatibility }}%</span>
                        </div>
                        <a [routerLink]="['/profil', match.id]" class="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white opacity-0 transition-opacity hover:bg-primary/90 group-hover:opacity-100">
                          Voir le profil
                        </a>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="animate-fade-in-up delay-200 rounded-2xl border border-border bg-white p-6 shadow-sm">
                <h2 class="mb-6 text-xl font-bold">Activité récente</h2>
                <div class="space-y-4">
                  @for (activity of activities; track $index) {
                    <div class="flex items-start gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
                      <div class="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-accent"></div>
                      <div class="flex-1">
                        <p class="text-sm font-medium text-foreground">{{ activity.text }}</p>
                        <p class="mt-1 text-xs text-muted-foreground">{{ activity.time }}</p>
                      </div>
                      <svg width="16" height="16" class="mt-1 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="col-span-3 space-y-6">
              <div class="animate-fade-in-up delay-200 rounded-2xl border-2 border-accent/20 bg-gradient-to-br from-accent/10 to-primary/10 p-6">
                <div class="mb-4 flex items-center gap-2">
                  <div class="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                    </svg>
                  </div>
                  <h3 class="font-bold">Assistant IA</h3>
                </div>
                <p class="mb-4 text-sm text-foreground/80">Bonjour {{ firstName() }}.<br>Que puis-je faire pour vous aujourd'hui ?</p>
                <div class="space-y-2">
                  @for (action of quickActions; track action.label) {
                    <a [routerLink]="action.path" class="group flex w-full items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5 text-left text-sm font-medium transition-all hover:border-accent/30 hover:bg-accent/5">
                      <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/10 text-accent" aria-hidden="true">
                        @switch (action.icon) {
                          @case ('target') {
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                              <circle cx="12" cy="12" r="8"/>
                              <circle cx="12" cy="12" r="4"/>
                              <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                            </svg>
                          }
                          @case ('user') {
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M20 21a8 8 0 0 0-16 0"/>
                              <circle cx="12" cy="8" r="4"/>
                            </svg>
                          }
                          @case ('chart') {
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M3 3v18h18"/>
                              <path d="m7 14 4-4 3 3 5-7"/>
                            </svg>
                          }
                        }
                      </span>
                      <span class="flex-1">{{ action.label }}</span>
                      <svg width="14" height="14" class="text-muted-foreground transition-colors group-hover:text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </a>
                  }
                </div>
              </div>

              <div class="animate-fade-in-up delay-300 rounded-2xl border border-border bg-white p-6 shadow-sm">
                <h3 class="mb-4 text-lg font-bold">Statistiques</h3>
                <div class="space-y-4">
                  @for (stat of stats; track stat.label) {
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-muted-foreground" aria-hidden="true">
                          @switch (stat.icon) {
                            @case ('views') {
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/>
                                <circle cx="12" cy="12" r="3"/>
                              </svg>
                            }
                            @case ('messages') {
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                              </svg>
                            }
                            @case ('target') {
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="8"/>
                                <circle cx="12" cy="12" r="4"/>
                                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                              </svg>
                            }
                          }
                        </span>
                        <span class="text-sm text-muted-foreground">{{ stat.label }}</span>
                      </div>
                      <span class="text-lg font-bold text-accent">{{ stat.value }}</span>
                    </div>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <a
        [routerLink]="floatingBubbleLink()"
        class="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-2xl shadow-accent/30 transition-all hover:scale-110 hover:bg-accent/90 active:scale-90"
        [attr.aria-label]="floatingBubbleLabel()"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        @if (floatingBubbleBadge() > 0) {
          <span class="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white">{{ floatingBubbleBadge() }}</span>
        }
      </a>
    </div>
  `
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);

  readonly currentUser = this.auth.currentUser;
  readonly displayName = computed(() => this.currentUser()?.displayName ?? 'Mon compte');
  readonly firstName = computed(() => this.displayName().split(' ')[0] || 'membre');
  readonly photoUrl = computed(() => this.currentUser()?.photoURL ?? '');
  readonly initials = this.auth.initials;
  readonly planLabel = computed(() => this.currentUser()?.plan ?? 'FREE');
  readonly floatingBubbleLink = computed(() => '/messages');
  readonly floatingBubbleLabel = computed(() => 'Ouvrir les messages');
  readonly floatingBubbleBadge = computed(() => 0);
  readonly ownProfilePath = computed(() => {
    const uid = this.currentUser()?.uid ?? '';
    return uid ? `/profil/${uid}` : '/dashboard';
  });

  readonly sidebarItems = computed<SidebarItem[]>(() => [
    { id: 'accueil', label: 'Accueil', icon: 'home', path: '/dashboard', badge: null },
    { id: 'recherche', label: 'Recherche', icon: 'search', path: '/recherche', badge: null },
    { id: 'profil', label: 'Mon profil', icon: 'user', path: this.ownProfilePath(), badge: null },
    { id: 'messages', label: 'Messages', icon: 'messages', path: '/messages', badge: null },
    { id: 'ma', label: 'M&A', icon: 'ma', path: '/ma', badge: null },
    { id: 'assistant', label: 'Assistant IA', icon: 'sparkles', path: '/coaching-ia', badge: null },
    { id: 'abonnement', label: 'Abonnement', icon: 'credit-card', path: '/abonnement', badge: null },
    { id: 'parametres', label: 'Paramètres', icon: 'settings', path: '/parametres', badge: null },
  ]);

  readonly matches = [
    { id: 'talent-sophie-martin', name: 'Sophie Martin', role: 'CTO freelance', avatar: 'SM', stage: 'MVP', compatibility: 94, project: 'SaaS B2B pour la logistique' },
    { id: 'talent-marc-laurent', name: 'Marc Laurent', role: 'Développeur full-stack', avatar: 'ML', stage: 'Idée', compatibility: 87, project: 'Marketplace locale bio' },
  ];

  readonly activities = [
    { text: '3 personnes ont consulté votre profil', time: 'Il y a 2 h', type: 'view' },
    { text: 'Nouveau match disponible', time: 'Il y a 5 h', type: 'match' },
    { text: 'Votre profil a été mis en avant', time: 'Il y a 2 j', type: 'boost' },
  ];

  readonly stats: StatItem[] = [
    { label: 'Vues profil', value: '127', icon: 'views' },
    { label: 'Messages reçus', value: '0', icon: 'messages' },
    { label: 'Matches', value: '24', icon: 'target' },
  ];

  readonly quickActions: Array<QuickActionItem & { path: string }> = [
    { label: 'Analyser mes matches', icon: 'target', path: '/recherche' },
    { label: 'Améliorer mon profil', icon: 'user', path: '/profil/modifier' },
    { label: 'Comprendre mes statistiques', icon: 'chart', path: '/dashboard' },
  ];
}
