import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-notification-menu',
  standalone: true,
  imports: [NgClass, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <button
        type="button"
        (click)="toggleMenu($event)"
        class="group relative rounded-lg p-2 transition-colors hover:bg-secondary"
        aria-haspopup="menu"
        [attr.aria-expanded]="isMenuOpen()"
        aria-label="Ouvrir les notifications"
      >
        <svg
          class="text-muted-foreground transition-colors group-hover:text-accent"
          [class.bell-ring]="unreadCount() > 0"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/>
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
        </svg>
        @if (unreadCount() > 0) {
          <span class="absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold leading-none text-white">
            {{ unreadCount() }}
          </span>
        }
      </button>

      @if (isMenuOpen()) {
        <div
          class="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-border bg-white shadow-2xl"
          role="menu"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between border-b border-border bg-secondary/60 px-4 py-4">
            <div>
              <div class="font-semibold text-primary">Notifications</div>
              <div class="text-xs text-muted-foreground">{{ unreadCount() }} nouvelle(s)</div>
            </div>
            <a routerLink="/dashboard" class="text-xs font-semibold text-accent hover:underline" (click)="closeMenu()">
              Voir le tableau de bord
            </a>
          </div>

          <div class="max-h-[24rem] overflow-y-auto p-2">
            @for (notification of notifications(); track notification.id) {
              <a
                [routerLink]="notification.href"
                [queryParams]="notification.queryParams ?? null"
                class="flex gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-secondary"
                [ngClass]="notification.unread ? 'bg-accent/5' : ''"
                role="menuitem"
                (click)="handleNotificationClick(notification.id)"
              >
                <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground" aria-hidden="true">
                  @switch (notification.kind) {
                    @case ('message') {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    }
                    @case ('match') {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="8"/>
                        <circle cx="12" cy="12" r="4"/>
                        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                      </svg>
                    }
                    @case ('profile') {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21a8 8 0 0 0-16 0"/>
                        <circle cx="12" cy="8" r="4"/>
                      </svg>
                    }
                    @case ('ma') {
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 3v18h18"/>
                        <path d="m7 14 4-4 3 3 5-7"/>
                      </svg>
                    }
                  }
                </span>

                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-3">
                    <h3 class="truncate text-sm font-semibold text-primary">{{ notification.title }}</h3>
                    <span class="flex-shrink-0 text-xs text-muted-foreground">{{ notification.time }}</span>
                  </div>
                  <p class="mt-1 text-sm leading-relaxed text-muted-foreground">{{ notification.description }}</p>
                </div>

                @if (notification.unread) {
                  <span class="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-accent" aria-hidden="true"></span>
                }
              </a>
            }
          </div>
        </div>
      }
    </div>
  `
})
export class NotificationMenuComponent {
  private readonly notificationService = inject(NotificationService);

  readonly isMenuOpen = signal(false);
  readonly notifications = this.notificationService.notifications;
  readonly unreadCount = computed(() => this.notificationService.unreadCount());

  @HostListener('document:click')
  handleDocumentClick(): void {
    this.closeMenu();
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    this.closeMenu();
  }

  toggleMenu(event: Event): void {
    event.stopPropagation();
    const shouldOpen = !this.isMenuOpen();
    this.isMenuOpen.set(shouldOpen);

    if (shouldOpen) {
      this.notificationService.markAllAsRead();
    }
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  handleNotificationClick(notificationId: string): void {
    this.notificationService.markAsRead(notificationId);
    this.closeMenu();
  }
}
