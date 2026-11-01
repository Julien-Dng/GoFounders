import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { CONTACT_TOPICS, ContactService, InboxItem, InboxStatus } from '../../core/services/contact.service';

type InboxFilter = 'open' | 'all' | 'contact' | 'premium';

// Admins : messages du formulaire de contact et demandes de devis PREMIUM. Droits contrôlés par Supabase.
@Component({
  selector: 'app-admin-messages',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-4xl">
        <h1 class="text-3xl text-primary">Messages reçus</h1>

        @if (!isAdmin()) {
          <p class="mt-4 text-muted-foreground">Page réservée aux administrateurs.</p>
        } @else {
          <p class="mt-2 text-base text-muted-foreground">Formulaire de contact et demandes de devis PREMIUM. Répondez par email, puis changez le statut.</p>

          <div class="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filtrer les messages">
            @for (option of filters; track option.value) {
              <button type="button" (click)="filter.set(option.value)" [attr.aria-pressed]="filter() === option.value" class="rounded-full px-4 py-2 text-sm font-semibold transition-colors" [class]="filter() === option.value ? 'bg-primary text-white' : 'bg-white text-primary ring-1 ring-border hover:text-accent'">
                {{ option.label }}
              </button>
            }
          </div>

          @if (visible().length === 0) {
            <div class="mt-6 rounded-2xl bg-white p-10 text-center text-muted-foreground shadow-lg ring-1 ring-border">Aucun message.</div>
          } @else {
            <ul class="mt-6 space-y-4">
              @for (item of visible(); track item.kind + item.id) {
                <li class="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-border">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div class="min-w-0">
                      <div class="flex flex-wrap items-center gap-2">
                        <span class="rounded-full px-2.5 py-0.5 text-sm font-semibold" [class]="item.kind === 'premium' ? 'bg-accent/10 text-accent' : 'bg-secondary text-primary'">{{ item.kind === 'premium' ? 'Devis PREMIUM' : 'Contact' }}</span>
                        <span class="text-sm font-semibold text-muted-foreground">{{ topicLabel(item) }}</span>
                        <span class="rounded-full px-2.5 py-0.5 text-sm font-semibold" [class]="statusClass(item.status)">{{ statusLabel(item.status) }}</span>
                      </div>
                      <h2 class="mt-2 font-bold text-primary">{{ item.name ?? 'Membre supprimé' }}@if (item.role) {<span class="font-normal text-muted-foreground"> · {{ item.role }}</span>}</h2>
                      <p class="text-sm text-muted-foreground">
                        {{ formatDate(item.created_at) }}
                        @if (item.email) { · <a [href]="replyLink(item)" class="font-semibold text-accent hover:underline">{{ item.email }}</a> }
                        @if (item.phone) { · {{ item.phone }} }
                      </p>
                    </div>
                  </div>
                  <p class="mt-4 whitespace-pre-line rounded-xl bg-secondary p-4 text-base leading-relaxed text-foreground/85">{{ item.message }}</p>
                  <div class="mt-4 flex flex-wrap gap-2">
                    @if (item.email) {
                      <a [href]="replyLink(item)" class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">Répondre par email</a>
                    }
                    @if (item.status !== 'contacted') {
                      <button type="button" (click)="setStatus(item, 'contacted')" [disabled]="busy()" class="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary ring-1 ring-border hover:text-accent disabled:opacity-50">Marquer répondu</button>
                    }
                    @if (item.status !== 'closed') {
                      <button type="button" (click)="setStatus(item, 'closed')" [disabled]="busy()" class="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary ring-1 ring-border hover:text-accent disabled:opacity-50">Clore</button>
                    } @else {
                      <button type="button" (click)="setStatus(item, 'new')" [disabled]="busy()" class="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-primary ring-1 ring-border hover:text-accent disabled:opacity-50">Rouvrir</button>
                    }
                  </div>
                </li>
              }
            </ul>
          }
        }
      </div>
    </div>
  `,
})
export class AdminMessagesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly contact = inject(ContactService);

  readonly isAdmin = this.auth.isAdmin;
  readonly items = signal<InboxItem[]>([]);
  readonly busy = signal(false);
  readonly filter = signal<InboxFilter>('open');
  readonly filters: Array<{ value: InboxFilter; label: string }> = [
    { value: 'open', label: 'À traiter' },
    { value: 'contact', label: 'Contact' },
    { value: 'premium', label: 'Devis PREMIUM' },
    { value: 'all', label: 'Tout' },
  ];

  readonly visible = computed(() => {
    const filter = this.filter();
    return this.items().filter(item =>
      filter === 'all' ? true : filter === 'open' ? item.status !== 'closed' : item.kind === filter
    );
  });

  ngOnInit(): void {
    void this.load();
  }

  async setStatus(item: InboxItem, status: InboxStatus): Promise<void> {
    this.busy.set(true);

    try {
      if (await this.contact.setStatus(item, status)) {
        this.items.update(items => items.map(current => (current.kind === item.kind && current.id === item.id ? { ...current, status } : current)));
      }
    } finally {
      this.busy.set(false);
    }
  }

  topicLabel(item: InboxItem): string {
    if (item.kind === 'premium') {
      const labels: Record<string, string> = { cession: 'Céder', reprise: 'Reprendre', associes: 'Associés', autre: 'Autre' };
      return labels[item.topic] ?? item.topic;
    }

    return CONTACT_TOPICS.find(topic => topic.value === item.topic)?.label ?? item.topic;
  }

  statusLabel(status: InboxStatus): string {
    return status === 'new' ? 'Nouveau' : status === 'contacted' ? 'Répondu' : 'Clos';
  }

  statusClass(status: InboxStatus): string {
    return status === 'new' ? 'bg-amber-50 text-amber-800' : status === 'contacted' ? 'bg-emerald-50 text-emerald-800' : 'bg-secondary text-muted-foreground';
  }

  replyLink(item: InboxItem): string {
    const subject = encodeURIComponent(`GoFounders : votre ${item.kind === 'premium' ? 'demande de devis' : 'message'}`);
    return `mailto:${item.email}?subject=${subject}`;
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  private async load(): Promise<void> {
    await this.auth.ensureSessionReady();

    if (this.isAdmin()) {
      this.items.set(await this.contact.listInbox());
    }
  }
}
