import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserMenuComponent } from '../../shared/components/user-menu/user-menu.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, UserMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary flex">

      <aside class="w-60 bg-primary text-primary-foreground fixed left-0 top-0 bottom-0 flex flex-col border-r border-primary-foreground/10">
        <div class="p-6 border-b border-primary-foreground/10">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-accent rounded-lg flex items-center justify-center shadow-lg">
              <span class="text-white font-bold text-lg">G</span>
            </div>
            <span class="text-xl font-bold">GoFounders</span>
          </div>
        </div>

        <nav class="flex-1 p-4 space-y-1">
          @for (item of sidebarItems(); track item.id) {
            <a
              [routerLink]="item.path"
              routerLinkActive="!bg-primary-foreground/20 !text-primary-foreground"
              [routerLinkActiveOptions]="{ exact: true }"
              class="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground transition-all relative group"
            >
              <span class="text-lg">{{ item.emoji }}</span>
              <span class="text-sm font-medium">{{ item.label }}</span>
              @if (item.badge) {
                <span class="ml-auto w-5 h-5 bg-accent text-white rounded-full flex items-center justify-center text-xs font-bold">
                  {{ item.badge }}
                </span>
              }
            </a>
          }
        </nav>

        <div class="p-4 border-t border-primary-foreground/10">
          <div class="flex items-center gap-3 p-3 rounded-lg bg-primary-foreground/5 hover:bg-primary-foreground/10 transition-colors cursor-pointer">
            @if (photoUrl()) {
              <img
                [src]="photoUrl()"
                [alt]="'Photo de profil de ' + displayName()"
                class="w-10 h-10 rounded-full object-cover border border-primary-foreground/10 shadow-sm flex-shrink-0"
              >
            } @else {
              <div class="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {{ initials() }}
              </div>
            }

            <div class="flex-1 min-w-0">
              <div class="font-semibold text-sm truncate">{{ displayName() }}</div>
              <div class="flex items-center gap-1.5">
                <span class="text-xs px-2 py-0.5 bg-muted/20 text-muted rounded">{{ planLabel() }}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div class="ml-60 flex-1 flex flex-col">

        <header class="bg-white border-b border-border sticky top-0 z-40">
          <div class="px-8 h-16 flex items-center justify-between">
            <div class="flex-1 max-w-xl">
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input type="text" placeholder="Rechercher des profils, compétences..." class="w-full pl-10 pr-4 py-2 bg-secondary rounded-lg border border-transparent focus:border-accent outline-none transition-colors">
              </div>
            </div>
            <div class="flex items-center gap-4">
              <button class="relative p-2 hover:bg-secondary rounded-lg transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
                  <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
                </svg>
                <span class="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
              </button>
              <app-user-menu avatarClass="h-10 w-10" />
            </div>
          </div>
        </header>

        <div class="p-8">
          <div class="grid grid-cols-12 gap-6">

            <div class="col-span-3 space-y-6">
              <div class="bg-white rounded-2xl border border-border p-6 shadow-sm animate-fade-in-up">
                <h3 class="text-lg font-bold mb-4">Mon profil</h3>
                <div class="mb-4">
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-sm text-muted-foreground">Complétion</span>
                    <span class="text-sm font-bold text-accent">65%</span>
                  </div>
                  <div class="h-2 bg-secondary rounded-full overflow-hidden">
                    <div class="h-full bg-accent rounded-full" style="width: 65%"></div>
                  </div>
                </div>
                <p class="text-sm text-muted-foreground mb-4">Complétez votre profil pour augmenter vos chances de match</p>
                <button class="w-full py-2 border-2 border-border rounded-lg text-sm font-semibold hover:border-accent transition-colors">Compléter mon profil</button>
              </div>

              <div class="bg-gradient-to-br from-accent to-primary rounded-2xl p-6 text-white shadow-lg animate-fade-in-up delay-100">
                <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m2 4 3 12h14l3-12-6 5-4-5-4 5-6-5z"/>
                    <path d="M5 20h14"/>
                  </svg>
                </div>
                <h3 class="text-lg font-bold mb-2">Passez en PRO</h3>
                <p class="text-sm opacity-90 mb-4 leading-relaxed">Débloquez l'IA matching, les messages illimités et bien plus</p>
                <button class="w-full py-2.5 bg-white text-accent rounded-lg font-semibold hover:bg-white/95 transition-colors shadow-md">Découvrir PRO</button>
              </div>
            </div>

            <div class="col-span-6 space-y-6">
              <div class="bg-white rounded-2xl border border-border p-6 shadow-sm animate-fade-in-up delay-100">
                <div class="flex items-center justify-between mb-6">
                  <div class="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                    </svg>
                    <h2 class="text-xl font-bold">Vos matches du jour</h2>
                  </div>
                  <button class="text-sm text-accent font-semibold hover:underline">Voir tous</button>
                </div>

                <div class="space-y-4">
                  @for (match of matches; track $index) {
                    <div class="flex items-center gap-4 p-4 bg-secondary rounded-xl hover:bg-accent/5 transition-colors border border-transparent hover:border-accent/20 group">
                      <div class="w-14 h-14 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {{ match.avatar }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                          <h3 class="font-bold">{{ match.name }}</h3>
                          <span class="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded font-semibold">{{ match.stage }}</span>
                        </div>
                        <div class="text-sm text-muted-foreground mb-1">{{ match.role }}</div>
                        <div class="text-sm text-foreground/70 truncate">{{ match.project }}</div>
                      </div>
                      <div class="flex items-center gap-3 flex-shrink-0">
                        <div class="flex items-center gap-1 px-3 py-1.5 bg-accent/10 text-accent rounded-full">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                          </svg>
                          <span class="text-sm font-bold">{{ match.compatibility }}%</span>
                        </div>
                        <button class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/90">Voir le profil</button>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <div class="bg-white rounded-2xl border border-border p-6 shadow-sm animate-fade-in-up delay-200">
                <h2 class="text-xl font-bold mb-6">Activité récente</h2>
                <div class="space-y-4">
                  @for (activity of activities; track $index) {
                    <div class="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
                      <div class="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0"></div>
                      <div class="flex-1">
                        <p class="text-sm font-medium text-foreground">{{ activity.text }}</p>
                        <p class="text-xs text-muted-foreground mt-1">{{ activity.time }}</p>
                      </div>
                      <svg width="16" height="16" class="text-muted-foreground mt-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  }
                </div>
              </div>
            </div>

            <div class="col-span-3 space-y-6">
              <div class="bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl border-2 border-accent/20 p-6 animate-fade-in-up delay-200">
                <div class="flex items-center gap-2 mb-4">
                  <div class="w-10 h-10 bg-accent rounded-full flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                    </svg>
                  </div>
                  <h3 class="font-bold">Assistant IA</h3>
                </div>
                <p class="text-sm text-foreground/80 mb-4">Bonjour Marc 👋<br>Que puis-je faire pour vous ?</p>
                <div class="space-y-2">
                  @for (action of quickActions; track action.label) {
                    <button class="w-full flex items-center gap-2 px-3 py-2.5 bg-white hover:bg-accent/5 border border-border hover:border-accent/30 rounded-lg text-sm font-medium transition-all text-left group">
                      <span class="text-accent">{{ action.emoji }}</span>
                      <span class="flex-1">{{ action.label }}</span>
                      <svg width="14" height="14" class="text-muted-foreground group-hover:text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </button>
                  }
                </div>
              </div>

              <div class="bg-white rounded-2xl border border-border p-6 shadow-sm animate-fade-in-up delay-300">
                <h3 class="text-lg font-bold mb-4">Statistiques</h3>
                <div class="space-y-4">
                  @for (stat of stats; track stat.label) {
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="text-muted-foreground text-sm">{{ stat.emoji }}</span>
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

      <button
        (click)="toggleChat()"
        class="fixed bottom-6 right-6 w-14 h-14 bg-accent rounded-full shadow-2xl shadow-accent/30 flex items-center justify-center text-white hover:bg-accent/90 transition-all hover:scale-110 active:scale-90 z-50"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span class="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white rounded-full text-xs flex items-center justify-center font-bold">3</span>
      </button>
    </div>
  `
})
export class DashboardComponent {
  private readonly auth = inject(AuthService);

  readonly isChatOpen = signal(false);
  readonly currentUser = this.auth.currentUser;
  readonly displayName = computed(() => this.currentUser()?.displayName ?? 'Mon compte');
  readonly photoUrl = computed(() => this.currentUser()?.photoURL ?? '');
  readonly initials = this.auth.initials;
  readonly planLabel = computed(() => this.currentUser()?.plan ?? 'FREE');

  toggleChat(): void {
    this.isChatOpen.update(v => !v);
  }

  readonly sidebarItems = computed(() => [
    { id: 'accueil', label: 'Accueil', emoji: '🏠', path: '/dashboard', badge: null },
    { id: 'recherche', label: 'Recherche', emoji: '🔍', path: '/recherche', badge: null },
    { id: 'profil', label: 'Mon profil', emoji: '👤', path: `/profil/${this.currentUser()?.uid ?? ''}`, badge: null },
    { id: 'messages', label: 'Messages', emoji: '💬', badge: 3, path: '/messages' },
    { id: 'ma', label: 'M&A', emoji: '📈', path: '/ma', badge: null },
    { id: 'assistant', label: 'Assistant IA', emoji: '✨', path: '/coaching-ia', badge: null },
    { id: 'abonnement', label: 'Abonnement', emoji: '💳', path: '/abonnement', badge: null },
    { id: 'parametres', label: 'Paramètres', emoji: '⚙️', path: '/parametres', badge: null },
  ]);

  readonly matches = [
    { name: 'Sophie Bernard', role: 'CTO', avatar: 'SB', stage: 'MVP', compatibility: 94, project: 'SaaS B2B pour la logistique' },
    { name: 'Marc Laurent', role: 'Développeur full-stack', avatar: 'ML', stage: 'Idée', compatibility: 87, project: 'Marketplace locale bio' },
  ];

  readonly activities = [
    { text: '3 personnes ont consulté votre profil', time: 'Il y a 2h', type: 'view' },
    { text: 'Nouveau match disponible', time: 'Il y a 5h', type: 'match' },
    { text: 'Sophie B. a répondu à votre message', time: 'Hier', type: 'message' },
    { text: 'Votre profil a été mis en avant', time: 'Il y a 2j', type: 'boost' },
  ];

  readonly stats = [
    { label: 'Vues profil', value: '127', emoji: '👁' },
    { label: 'Messages reçus', value: '18', emoji: '✉️' },
    { label: 'Matches', value: '24', emoji: '🎯' },
  ];

  readonly quickActions = [
    { label: 'Analyser mes matches', emoji: '🎯' },
    { label: 'Améliorer mon profil', emoji: '👤' },
    { label: 'Comprendre mes statistiques', emoji: '📈' },
  ];
}
