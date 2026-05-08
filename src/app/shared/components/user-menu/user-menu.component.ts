import { DOCUMENT, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, Input, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-user-menu',
  standalone: true,
  imports: [NgClass, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <button
        type="button"
        [ngClass]="buttonClass"
        class="inline-flex items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-accent/20"
        aria-haspopup="menu"
        [attr.aria-expanded]="isMenuOpen()"
        aria-label="Ouvrir le menu utilisateur"
        (click)="toggleMenu($event)"
      >
        @if (photoUrl()) {
          <img
            [src]="photoUrl()"
            [alt]="'Photo de profil de ' + displayName()"
            [ngClass]="avatarClass"
            class="rounded-full object-cover border border-border shadow-sm"
          >
        } @else {
          <div
            [ngClass]="avatarClass"
            class="rounded-full bg-gradient-to-br from-accent to-primary text-white font-bold flex items-center justify-center shadow-md"
          >
            {{ initials() }}
          </div>
        }
      </button>

      @if (isMenuOpen()) {
        <div
          class="absolute right-0 mt-3 w-64 overflow-hidden rounded-2xl border border-border bg-white shadow-2xl z-50"
          role="menu"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center gap-3 border-b border-border px-4 py-4 bg-secondary/60">
            @if (photoUrl()) {
              <img
                [src]="photoUrl()"
                [alt]="'Photo de profil de ' + displayName()"
                class="h-11 w-11 rounded-full object-cover border border-border shadow-sm"
              >
            } @else {
              <div class="h-11 w-11 rounded-full bg-gradient-to-br from-accent to-primary text-white font-bold flex items-center justify-center shadow-md">
                {{ initials() }}
              </div>
            }

            <div class="min-w-0">
              <div class="font-semibold text-primary truncate">{{ displayName() }}</div>
              <div class="text-xs text-muted-foreground mt-1">{{ planLabel() }}</div>
            </div>
          </div>

          <div class="p-2">
            <a
              [routerLink]="['/profil', userId()]"
              class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              role="menuitem"
              (click)="closeMenu()"
            >
              <span class="text-base">👤</span>
              <span>Voir le profil</span>
            </a>

            <a
              routerLink="/parametres"
              class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
              role="menuitem"
              (click)="closeMenu()"
            >
              <span class="text-base">⚙️</span>
              <span>Paramètres</span>
            </a>

            <!-- Dark mode toggle -->
            <div class="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-secondary transition-colors">
              <div class="flex items-center gap-3">
                <span class="text-base leading-none">{{ isDark() ? '🌙' : '☀️' }}</span>
                <span class="text-sm font-medium text-foreground">Mode sombre</span>
              </div>
              <button
                type="button"
                (click)="toggleDarkMode($event)"
                role="switch"
                [attr.aria-checked]="isDark()"
                aria-label="Activer/désactiver le mode sombre"
                class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-300 focus:outline-none"
                [class.bg-accent]="isDark()"
                [class.bg-gray-200]="!isDark()"
              >
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300 mt-0.5"
                  [class.translate-x-4]="isDark()"
                  [class.translate-x-0.5]="!isDark()"
                ></span>
              </button>
            </div>

            <div class="my-1 border-t border-border"></div>

            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
              role="menuitem"
              (click)="openLogoutConfirm()"
            >
              <span class="text-base">↪</span>
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      }
    </div>

    @if (isLogoutConfirmOpen()) {
      <div
        class="fixed inset-0 z-[80] flex items-center justify-center bg-primary/25 backdrop-blur-sm p-6"
        (click)="cancelLogout()"
      >
        <div
          class="w-full max-w-md rounded-3xl border border-border bg-white p-7 shadow-2xl"
          (click)="$event.stopPropagation()"
        >
          <div class="mb-5 flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <span class="text-xl">↪</span>
            </div>
            <div>
              <h3 class="text-xl font-bold text-primary">Se déconnecter ?</h3>
              <p class="text-sm text-muted-foreground">Votre session actuelle sera fermée.</p>
            </div>
          </div>

          <p class="text-sm leading-relaxed text-foreground/80 mb-6">
            Êtes-vous sûr de vouloir vous déconnecter maintenant ?
          </p>

          <div class="flex items-center justify-end gap-3">
            <button
              type="button"
              class="px-4 py-2.5 rounded-xl border border-border text-sm font-semibold hover:border-accent transition-colors"
              (click)="cancelLogout()"
            >
              Annuler
            </button>
            <button
              type="button"
              class="px-4 py-2.5 rounded-xl bg-destructive text-white text-sm font-semibold shadow-md hover:opacity-90 transition-opacity"
              (click)="confirmLogout()"
            >
              Oui, me déconnecter
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class UserMenuComponent {
  private readonly auth = inject(AuthService);
  private readonly doc = inject(DOCUMENT);

  @Input() avatarClass = 'h-11 w-11';
  @Input() buttonClass = '';

  readonly isDark = signal(typeof localStorage !== 'undefined' && localStorage.getItem('gofounders.dark') === 'true');

  readonly isMenuOpen = signal(false);
  readonly isLogoutConfirmOpen = signal(false);
  readonly currentUser = this.auth.currentUser;
  readonly photoUrl = computed(() => this.currentUser()?.photoURL ?? '');
  readonly initials = this.auth.initials;
  readonly displayName = computed(() => this.currentUser()?.displayName ?? 'Mon compte');
  readonly userId = computed(() => this.currentUser()?.uid ?? '');
  readonly planLabel = computed(() => `Plan ${this.currentUser()?.plan ?? 'FREE'}`);

  @HostListener('document:click')
  handleDocumentClick(): void {
    this.closeMenu();
  }

  toggleDarkMode(event: Event): void {
    event.stopPropagation();
    const next = !this.isDark();
    this.isDark.set(next);
    this.doc.documentElement.classList.toggle('dark', next);
    localStorage.setItem('gofounders.dark', String(next));
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    this.isMenuOpen.update(isOpen => !isOpen);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  openLogoutConfirm(): void {
    this.closeMenu();
    this.isLogoutConfirmOpen.set(true);
  }

  cancelLogout(): void {
    this.isLogoutConfirmOpen.set(false);
  }

  async confirmLogout(): Promise<void> {
    this.isLogoutConfirmOpen.set(false);
    await this.auth.signOut();
  }
}
