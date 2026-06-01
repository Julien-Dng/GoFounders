import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { ConversationMessage, findConversationById, findMarketplaceProfileById } from '../../../core/data/mock-platform.data';

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pt-20">
      <div class="mx-auto flex h-full w-full max-w-4xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-6 flex items-center gap-4">
          <a routerLink="/messages" class="rounded-lg p-2 transition-colors hover:bg-border" aria-label="Retour aux messages">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </a>
          <div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary font-bold text-white">{{ participantInitials() }}</div>
          <div class="min-w-0">
            <div class="truncate font-bold">{{ participantName() }}</div>
            <div class="text-xs font-medium" [class.text-green-500]="isOnline()" [class.text-muted-foreground]="!isOnline()">
              {{ isOnline() ? 'En ligne' : 'Disponible sur la plateforme' }}
            </div>
          </div>
        </div>

        <div class="flex h-[calc(100vh-220px)] flex-col rounded-2xl border border-border bg-white shadow-lg">
          <div class="flex-1 overflow-y-auto p-6">
            @if (currentMessages().length > 0) {
              <div class="space-y-4">
                @for (msg of currentMessages(); track msg.id) {
                  <div class="flex" [class.justify-end]="msg.senderId === 'me'">
                    <div
                      class="max-w-xs rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-md"
                      [class.bg-accent]="msg.senderId === 'me'"
                      [class.text-white]="msg.senderId === 'me'"
                      [class.bg-secondary]="msg.senderId !== 'me'"
                    >
                      {{ msg.content }}
                      <div class="mt-1 text-right text-xs opacity-60">{{ msg.time }}</div>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div class="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
                <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <h3 class="mb-1 text-base font-semibold text-foreground/70">Commencez la conversation</h3>
                <p class="max-w-md text-sm">Aucun message n'a encore été échangé avec ce profil. Envoyez le premier message pour lancer le contact.</p>
              </div>
            }
          </div>

          <div class="flex gap-3 border-t border-border p-4">
            <input
              type="text"
              [value]="newMessage()"
              (input)="newMessage.set($any($event.target).value)"
              (keyup.enter)="sendMessage()"
              placeholder="Votre message..."
              class="flex-1 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            >
            <button
              type="button"
              (click)="sendMessage()"
              [disabled]="!newMessage().trim()"
              class="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Envoyer
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ConversationComponent {
  private readonly route = inject(ActivatedRoute);

  readonly newMessage = signal('');
  readonly localMessages = signal<ConversationMessage[]>([]);

  private readonly conversationId = toSignal(
    this.route.params.pipe(map((params: Record<string, string>) => params['id'] ?? '')),
    { initialValue: '' }
  );

  readonly baseConversation = computed(() => findConversationById(this.conversationId()));
  readonly fallbackProfile = computed(() => findMarketplaceProfileById(this.conversationId()));
  readonly participantName = computed(() =>
    this.baseConversation()?.participantName ?? this.fallbackProfile()?.displayName ?? 'Conversation'
  );
  readonly participantInitials = computed(() =>
    this.baseConversation()?.participantInitials ?? this.fallbackProfile()?.initials ?? 'GF'
  );
  readonly isOnline = computed(() => this.baseConversation()?.isOnline ?? true);
  readonly currentMessages = computed(() => [
    ...(this.baseConversation()?.messages ?? []),
    ...this.localMessages(),
  ]);

  sendMessage(): void {
    const content = this.newMessage().trim();

    if (!content) {
      return;
    }

    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

    this.localMessages.update(messages => [
      ...messages,
      { id: `local-${Date.now()}`, senderId: 'me', content, time },
    ]);

    this.newMessage.set('');
  }
}
