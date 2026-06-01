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
            class="rounded-full border border-border object-cover shadow-sm"
          >
        } @else {
          <div
            [ngClass]="avatarClass"
            class="flex items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary font-bold text-white shadow-md"
          >
            {{ initials() }}
          </div>
        }
      </button>

      @if (isMenuOpen()) {
        <div
          class="absolute right-0 z-50 mt-3 w-64 overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
          role="menu"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center gap-3 border-b border-border bg-secondary/60 px-4 py-4">
            @if (photoUrl()) {
              <img
                [src]="photoUrl()"
                [alt]="'Photo de profil de ' + displayName()"
                class="h-11 w-11 rounded-full border border-border object-cover shadow-sm"
              >
            } @else {
              <div class="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary font-bold text-white shadow-md">
                {{ initials() }}
              </div>
            }

            <div class="min-w-0">
              <div class="truncate font-semibold text-primary">{{ displayName() }}</div>
              <div class="mt-1 text-xs text-muted-foreground">{{ planLabel() }}</div>
            </div>
          </div>

          <div class="p-2">
            <a
              [routerLink]="profileLink()"
              class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              role="menuitem"
              (click)="closeMenu()"
            >
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21a8 8 0 0 0-16 0"/>
                  <circle cx="12" cy="8" r="4"/>
                </svg>
              </span>
              <span>Voir le profil</span>
            </a>

            <a
              routerLink="/parametres"
              class="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              role="menuitem"
              (click)="closeMenu()"
            >
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 10.09 3H10a2 2 0 1 1 4 0h-.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09A1.65 1.65 0 0 0 21 10.09V10a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </span>
              <span>Paramètres</span>
            </a>

            <div class="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-secondary">
              <div class="flex items-center gap-3">
                <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground" aria-hidden="true">
                  @if (isDark()) {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>
                    </svg>
                  } @else {
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="4"/>
                      <path d="M12 2v2"/>
                      <path d="M12 20v2"/>
                      <path d="m4.93 4.93 1.41 1.41"/>
                      <path d="m17.66 17.66 1.41 1.41"/>
                      <path d="M2 12h2"/>
                      <path d="M20 12h2"/>
                      <path d="m6.34 17.66-1.41 1.41"/>
                      <path d="m19.07 4.93-1.41 1.41"/>
                    </svg>
                  }
                </span>
                <span class="text-sm font-medium text-foreground">Mode sombre</span>
              </div>
              <button
                type="button"
                (click)="toggleDarkMode($event)"
                role="switch"
                [attr.aria-checked]="isDark()"
                aria-label="Activer ou désactiver le mode sombre"
                class="relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors duration-300 focus:outline-none"
                [class.bg-accent]="isDark()"
                [class.bg-gray-200]="!isDark()"
              >
                <span
                  class="mt-0.5 inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-300"
                  [class.translate-x-4]="isDark()"
                  [class.translate-x-0.5]="!isDark()"
                ></span>
              </button>
            </div>

            <div class="my-1 border-t border-border"></div>

            <button
              type="button"
              class="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-destructive transition-colors hover:bg-destructive/5"
              role="menuitem"
              (click)="openLogoutConfirm()"
            >
              <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <path d="m16 17 5-5-5-5"/>
                  <path d="M21 12H9"/>
                </svg>
              </span>
              <span>Se déconnecter</span>
            </button>
          </div>
        </div>
      }
    </div>

    @if (isLogoutConfirmOpen()) {
      <div
        class="fixed inset-0 z-[80] flex items-center justify-center bg-primary/25 p-6 backdrop-blur-sm"
        (click)="cancelLogout()"
      >
        <div
          class="w-full max-w-md rounded-3xl border border-border bg-white p-7 shadow-2xl"
          (click)="$event.stopPropagation()"
        >
          <div class="mb-5 flex items-center gap-3">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <path d="m16 17 5-5-5-5"/>
                <path d="M21 12H9"/>
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-bold text-primary">Se déconnecter ?</h3>
              <p class="text-sm text-muted-foreground">Votre session actuelle sera fermée.</p>
            </div>
          </div>

          <p class="mb-6 text-sm leading-relaxed text-foreground/80">
            Êtes-vous sûr de vouloir vous déconnecter maintenant ?
          </p>

          <div class="flex items-center justify-end gap-3">
            <button
              type="button"
              class="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold transition-colors hover:border-accent"
              (click)="cancelLogout()"
            >
              Annuler
            </button>
            <button
              type="button"
              class="rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity hover:opacity-90"
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
  readonly profileLink = computed(() => this.userId() ? ['/profil', this.userId()] : ['/dashboard']);
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
