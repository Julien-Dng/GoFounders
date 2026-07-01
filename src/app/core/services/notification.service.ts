import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

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

interface SupabaseNotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);

  readonly notifications = signal<NotificationItem[]>([]);
  readonly unreadCount = computed(() => this.notifications().filter(notification => notification.unread).length);

  constructor() {
    void this.loadNotifications();
  }

  markAsRead(notificationId: string): void {
    this.notifications.update(items =>
      items.map(item => item.id === notificationId ? { ...item, unread: false } : item)
    );
    void this.persistReadNotification(notificationId);
  }

  markAllAsRead(): void {
    if (this.unreadCount() === 0) {
      return;
    }

    this.notifications.update(items =>
      items.map(item => ({ ...item, unread: false }))
    );
    void this.persistReadNotifications();
  }

  private async loadNotifications(): Promise<void> {
    await this.auth.ensureSessionReady();

    const user = this.auth.currentUser();

    if (!this.supabase.isConfigured || !user) {
      this.notifications.set([]);
      return;
    }

    const { data, error } = await this.supabase.client
      .from('notifications')
      .select('*')
      .eq('user_id', user.uid)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      this.notifications.set([]);
      return;
    }

    const notifications = ((data ?? []) as SupabaseNotificationRow[]).map(row => this.mapNotificationRow(row));
    this.notifications.set(notifications);
  }

  private async persistReadNotification(notificationId: string): Promise<void> {
    const user = this.auth.currentUser();

    if (!this.supabase.isConfigured || !user) {
      return;
    }

    await this.supabase.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.uid);
  }

  private async persistReadNotifications(): Promise<void> {
    const user = this.auth.currentUser();

    if (!this.supabase.isConfigured || !user) {
      return;
    }

    const unreadIds = this.notifications()
      .filter(notification => !notification.unread)
      .map(notification => notification.id);

    if (unreadIds.length === 0) {
      return;
    }

    await this.supabase.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
      .eq('user_id', user.uid);
  }

  private mapNotificationRow(row: SupabaseNotificationRow): NotificationItem {
    const parsedLink = this.parseLink(row.link_url);

    return {
      id: row.id,
      kind: this.inferKind(parsedLink.href),
      title: row.title,
      description: row.body,
      time: this.formatRelativeTime(row.created_at),
      href: parsedLink.href,
      queryParams: parsedLink.queryParams,
      unread: row.read_at === null,
    };
  }

  private parseLink(linkUrl: string | null): { href: string; queryParams?: Record<string, string> } {
    if (!linkUrl) {
      return { href: '/dashboard' };
    }

    const [href, rawQuery] = linkUrl.split('?');

    if (!rawQuery) {
      return { href };
    }

    const queryParams: Record<string, string> = {};
    new URLSearchParams(rawQuery).forEach((value, key) => {
      queryParams[key] = value;
    });

    return { href, queryParams };
  }

  private inferKind(href: string): NotificationKind {
    if (href.startsWith('/messages')) {
      return 'message';
    }

    if (href.startsWith('/recherche')) {
      return 'match';
    }

    if (href.startsWith('/ma')) {
      return 'ma';
    }

    return 'profile';
  }

  private formatRelativeTime(value: string): string {
    const createdAt = new Date(value);
    const diffMs = Date.now() - createdAt.getTime();

    if (Number.isNaN(diffMs)) {
      return '';
    }

    const diffMinutes = Math.max(0, Math.round(diffMs / 60_000));

    if (diffMinutes < 1) {
      return 'A l’instant';
    }

    if (diffMinutes < 60) {
      return `Il y a ${diffMinutes} min`;
    }

    const diffHours = Math.round(diffMinutes / 60);

    if (diffHours < 24) {
      return `Il y a ${diffHours} h`;
    }

    return createdAt.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }
}
