import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

export type NotificationKind = 'message' | 'match' | 'profile' | 'ma';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  time: string;
  href: string;
  queryParams?: Record<string, string>;
  unread: boolean;
}

const READ_NOTIFICATIONS_STORAGE_KEY = 'gofounders.mock.notifications.read';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly auth = inject(AuthService);

  readonly notifications = signal<NotificationItem[]>(this.createNotifications());
  readonly unreadCount = computed(() => this.notifications().filter(notification => notification.unread).length);

  markAsRead(notificationId: string): void {
    this.notifications.update(items =>
      items.map(item => item.id === notificationId ? { ...item, unread: false } : item)
    );
    this.persistReadNotifications();
  }

  markAllAsRead(): void {
    if (this.unreadCount() === 0) {
      return;
    }

    this.notifications.update(items =>
      items.map(item => ({ ...item, unread: false }))
    );
    this.persistReadNotifications();
  }

  private createNotifications(): NotificationItem[] {
    const readNotificationIds = this.readStoredNotificationIds();
    const ownProfileHref = this.auth.currentUser()?.uid
      ? `/profil/${this.auth.currentUser()?.uid}`
      : '/dashboard';

    return [
      {
        id: 'notification-message',
        kind: 'message',
        title: 'Sophie Martin a répondu',
        description: 'Elle peut se libérer jeudi après-midi pour en parler.',
        time: '14:32',
        href: '/messages',
        queryParams: { conversation: 'talent-sophie-martin' },
        unread: !readNotificationIds.has('notification-message'),
      },
      {
        id: 'notification-match',
        kind: 'match',
        title: 'Nouveau match disponible',
        description: '3 profils correspondent particulièrement à votre projet.',
        time: 'Il y a 1 h',
        href: '/recherche',
        unread: !readNotificationIds.has('notification-match'),
      },
      {
        id: 'notification-profile',
        kind: 'profile',
        title: 'Votre profil a gagné en visibilité',
        description: '12 vues supplémentaires ont été enregistrées aujourd’hui.',
        time: 'Il y a 2 h',
        href: ownProfileHref,
        unread: !readNotificationIds.has('notification-profile'),
      },
      {
        id: 'notification-ma',
        kind: 'ma',
        title: 'Une annonce M&A correspond à vos critères',
        description: 'Nouvelle opportunité détectée sur le segment SaaS.',
        time: 'Hier',
        href: '/ma',
        unread: false,
      },
    ];
  }

  private persistReadNotifications(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const readNotificationIds = this.notifications()
      .filter(notification => !notification.unread)
      .map(notification => notification.id);

    localStorage.setItem(this.storageKey(), JSON.stringify(readNotificationIds));
  }

  private readStoredNotificationIds(): Set<string> {
    if (typeof localStorage === 'undefined') {
      return new Set();
    }

    const rawValue = localStorage.getItem(this.storageKey());

    if (!rawValue) {
      return new Set();
    }

    try {
      const parsedValue = JSON.parse(rawValue) as unknown;
      return Array.isArray(parsedValue)
        ? new Set(parsedValue.filter((item): item is string => typeof item === 'string'))
        : new Set();
    } catch {
      return new Set();
    }
  }

  private storageKey(): string {
    return `${READ_NOTIFICATIONS_STORAGE_KEY}.${this.auth.currentUser()?.uid ?? 'guest'}`;
  }
}
