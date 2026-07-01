import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import {
  ConversationMessage,
  MarketplaceProfile,
  findMarketplaceProfileById
} from '../../core/data/mock-platform.data';
import { AuthService } from '../../core/services/auth.service';
import { ConversationThread, MessagingService } from '../../core/services/messaging.service';

interface ConversationPreview {
  id: string;
  participantProfileId: string;
  name: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
  profile?: MarketplaceProfile;
  messages: ConversationMessage[];
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mt-20 h-[calc(100vh-80px)] bg-secondary px-4 py-4 sm:px-6 lg:px-8">
      <div class="mx-auto flex h-full w-full max-w-[1500px]">

      <!-- ZONE DE CHAT -->
      <div class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">

        <!-- Top bar : infos conversation -->
        <div class="flex flex-shrink-0 items-center gap-3 border-b border-border bg-white px-4 py-3">
          @if (selectedConv()) {
            <div class="w-9 h-9 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {{ selectedConv()!.initials }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-bold text-sm">{{ selectedConv()!.name }}</div>
              <div class="text-xs text-green-500 font-medium flex items-center gap-1">
                <span class="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                En ligne
              </div>
            </div>
          } @else {
            <span class="text-muted-foreground text-sm">Sélectionnez une conversation</span>
          }
        </div>

        <!-- Messages -->
        @if (selectedConv()) {
          <div class="flex-1 overflow-y-auto bg-secondary/20 p-4 sm:p-5 space-y-3">
            @for (msg of activeMessages(); track msg.id) {
              <div class="flex" [class.justify-end]="msg.senderId === 'me'">
                <div
                  class="max-w-xs rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-md sm:max-w-md"
                  [ngClass]="msg.senderId === 'me'
                    ? 'text-white rounded-br-sm bubble-me'
                    : 'bg-white border border-border rounded-bl-sm'"
                >
                  {{ msg.content }}
                  <div class="text-xs mt-1 opacity-60 text-right">{{ msg.time }}</div>
                </div>
              </div>
            }
          </div>

          <!-- Barre de saisie -->
          <div class="bg-white border-t border-border p-3 flex-shrink-0 sm:p-4">
            <div class="flex items-center gap-2">

              <input #fileInput type="file" accept="image/*,.pdf,.doc,.docx" class="hidden" (change)="onFileSelected($event)">
              <button
                type="button"
                (click)="fileInput.click()"
                class="p-2.5 text-muted-foreground hover:text-accent hover:bg-secondary rounded-lg transition-colors flex-shrink-0"
                aria-label="Joindre un fichier"
                title="Joindre un fichier ou une photo"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>

              <input
                type="text"
                [value]="newMessage()"
                (input)="newMessage.set($any($event.target).value)"
                (keyup.enter)="sendMessage()"
                placeholder="Votre message..."
                class="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-xl focus:border-accent outline-none transition-colors text-sm min-w-0"
              >

              <div class="relative flex-shrink-0">
                <button
                  type="button"
                  (click)="toggleEmojiPicker($event)"
                  class="p-2.5 text-muted-foreground hover:text-accent hover:bg-secondary rounded-lg transition-colors"
                  aria-label="Ajouter un emoji"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 13s1.5 2 4 2 4-2 4-2"/>
                    <line x1="9" y1="9" x2="9.01" y2="9"/>
                    <line x1="15" y1="9" x2="15.01" y2="9"/>
                  </svg>
                </button>
                @if (emojiPickerOpen()) {
                  <div
                    class="absolute bottom-full right-0 mb-2 bg-white rounded-xl border border-border shadow-2xl p-3 w-56 z-50"
                    (click)="$event.stopPropagation()"
                  >
                    <div class="grid grid-cols-8 gap-1">
                      @for (emoji of emojis; track emoji) {
                        <button
                          type="button"
                          (click)="insertEmoji(emoji)"
                          class="w-7 h-7 flex items-center justify-center text-base hover:bg-secondary rounded transition-colors"
                        >{{ emoji }}</button>
                      }
                    </div>
                  </div>
                }
              </div>

              <button
                type="button"
                (click)="sendMessage()"
                [disabled]="!newMessage().trim()"
                class="px-5 py-2.5 bg-accent text-white rounded-xl font-semibold text-sm hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                Envoyer
              </button>

            </div>
          </div>

        } @else {
          <div class="flex-1 flex flex-col items-center justify-center bg-secondary/20 text-muted-foreground select-none">
            <div class="w-20 h-20 bg-border/50 rounded-full flex items-center justify-center mb-5">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="opacity-40">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 class="text-base font-semibold text-foreground/40 mb-1">Aucune conversation ouverte</h3>
            <p class="text-sm text-foreground/30">Sélectionnez un contact dans la liste à droite</p>
          </div>
        }

      </div>

      <div class="ml-3 flex w-72 flex-shrink-0 gap-3 xl:w-[37rem]">
        <!-- MINI PROFIL -->
        <aside class="order-2 hidden h-full w-72 flex-shrink-0 overflow-hidden rounded-2xl border border-border bg-white shadow-sm xl:block">
          @if (selectedConv()) {
            <div class="bg-gradient-to-br from-accent to-primary px-5 pb-12 pt-6 text-white">
              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-lg font-bold ring-4 ring-white/15">
                {{ selectedProfile()?.initials ?? selectedConv()!.initials }}
              </div>
            </div>

            <div class="-mt-8 px-5 pb-5 text-center">
              <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary text-lg font-bold text-white shadow-lg ring-4 ring-white">
                {{ selectedProfile()?.initials ?? selectedConv()!.initials }}
              </div>
              <h3 class="text-base font-bold">{{ selectedProfile()?.displayName ?? selectedConv()!.name }}</h3>
              <p class="mt-1 text-xs font-medium text-muted-foreground">{{ selectedProfile()?.title ?? 'Profil GoFounders' }}</p>

              <div class="mt-4 grid grid-cols-2 gap-2 text-left">
                <div class="rounded-xl bg-secondary p-3">
                  <div class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Match</div>
                  <div class="mt-1 text-lg font-bold text-accent">{{ selectedProfile()?.match ?? 0 }}%</div>
                </div>
                <div class="rounded-xl bg-secondary p-3">
                  <div class="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Ville</div>
                  <div class="mt-1 truncate text-sm font-bold">{{ selectedProfile()?.location ?? 'France' }}</div>
                </div>
              </div>

              <div class="mt-4 rounded-xl border border-border bg-background/60 p-3 text-left">
                <div class="mb-2 flex items-center gap-2 text-xs font-semibold text-green-600">
                  <span class="h-2 w-2 rounded-full bg-green-500"></span>
                  {{ selectedProfile()?.availabilityLabel ?? 'Disponible pour échanger' }}
                </div>
                <p class="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {{ selectedProfile()?.bio ?? 'Profil disponible pour échanger sur une opportunité GoFounders.' }}
                </p>
              </div>

              <div class="mt-4 flex flex-wrap justify-center gap-1.5">
                @for (skill of selectedProfileSkills(); track skill) {
                  <span class="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">{{ skill }}</span>
                }
              </div>
            </div>
          } @else {
            <div class="p-5 text-center">
              <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21a8 8 0 0 0-16 0"/>
                  <circle cx="12" cy="8" r="4"/>
                </svg>
              </div>
              <h3 class="text-sm font-bold">Profil du contact</h3>
              <p class="mt-1 text-xs leading-relaxed text-muted-foreground">Sélectionnez une conversation pour afficher le contexte du profil.</p>
            </div>
          }
        </aside>

        <!-- LISTE DES CONVERSATIONS -->
        <aside class="order-1 flex min-h-0 w-72 flex-shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm">

        <div class="border-b border-border px-4 py-4">
          <h2 class="text-lg font-bold">Messages</h2>
          <p class="text-xs text-muted-foreground mt-0.5">{{ conversations().length }} conversation(s) active(s)</p>
        </div>

        <div class="overflow-y-auto flex-1">
          @for (conv of conversations(); track conv.id) {
            <button
              type="button"
              (click)="selectConversation(conv)"
              class="w-full flex items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors"
              [ngClass]="selectedConv()?.id === conv.id
                ? 'bg-accent/5 border-l-4 border-l-accent'
                : 'hover:bg-secondary'"
            >
              <div class="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {{ conv.initials }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-0.5">
                  <span class="font-semibold text-sm truncate">{{ conv.name }}</span>
                  <span class="text-xs text-muted-foreground flex-shrink-0 ml-2">{{ conv.time }}</span>
                </div>
                <p class="text-xs text-muted-foreground truncate">{{ conv.lastMessage }}</p>
              </div>
              @if (conv.unread > 0) {
                <span class="w-5 h-5 bg-accent text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0 ml-1">
                  {{ conv.unread }}
                </span>
              }
            </button>
          } @empty {
            <div class="text-center py-12 text-muted-foreground px-6">
              <p class="font-semibold text-sm mb-1">Aucun message</p>
              <p class="text-xs">Contactez un profil depuis la recherche pour démarrer</p>
            </div>
          }
        </div>

      </aside>
      </div>

      </div>
    </div>

  `
})
export class MessagesComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly messagingService = inject(MessagingService);

  readonly conversations = signal<ConversationPreview[]>([]);

  private readonly requestedConversationId = toSignal(
    this.route.queryParamMap.pipe(map(params => params.get('conversation'))),
    { initialValue: null }
  );

  readonly selectedConversationId = signal<string | null>(null);
  readonly selectedConv = computed(() => {
    const activeId = this.requestedConversationId() ?? this.selectedConversationId();
    return activeId ? this.conversations().find(conv => conv.id === activeId) ?? null : null;
  });
  readonly selectedProfile = computed(() => {
    const activeConversation = this.selectedConv();
    return activeConversation?.profile ?? findMarketplaceProfileById(activeConversation?.participantProfileId ?? '');
  });
  readonly selectedProfileSkills = computed(() => this.selectedProfile()?.skills.slice(0, 4) ?? []);
  readonly newMessage = signal('');
  readonly emojiPickerOpen = signal(false);

  readonly localMessages = signal<Record<string, ConversationMessage[]>>({});
  readonly activeMessages = computed<ConversationMessage[]>(() => {
    const activeId = this.selectedConv()?.id;
    return activeId ? this.localMessages()[activeId] ?? [] : [];
  });

  readonly emojis = ['😀', '😊', '😂', '❤️', '👍', '🎉', '🙏', '🤝', '💡', '🚀', '✅', '👋', '🔥', '💪', '🙌', '😎'];

  ngOnInit(): void {
    void this.loadConversations();
  }

  @HostListener('document:click')
  closeEmojiPicker(): void {
    this.emojiPickerOpen.set(false);
  }

  selectConversation(conv: ConversationPreview): void {
    this.selectedConversationId.set(conv.id);
    this.markConversationAsRead(conv.id);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { conversation: conv.id },
      queryParamsHandling: 'merge',
    });
    this.emojiPickerOpen.set(false);
  }

  toggleEmojiPicker(event: Event): void {
    event.stopPropagation();
    this.emojiPickerOpen.update(v => !v);
  }

  insertEmoji(emoji: string): void {
    this.newMessage.update(v => v + emoji);
    this.emojiPickerOpen.set(false);
  }

  async sendMessage(): Promise<void> {
    const content = this.newMessage().trim();
    const activeId = this.selectedConv()?.id;
    const user = this.auth.currentUser();

    if (!content || !activeId || !user) {
      return;
    }

    const message = await this.messagingService.sendThreadMessage(activeId, user.uid, content);

    if (!message) {
      return;
    }

    this.localMessages.update(messagesByConversation => ({
      ...messagesByConversation,
      [activeId]: [...(messagesByConversation[activeId] ?? []), message],
    }));
    this.conversations.update(conversations => conversations.map(conversation =>
      conversation.id === activeId
        ? { ...conversation, lastMessage: message.content, time: message.time }
        : conversation
    ));
    this.newMessage.set('');
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      console.log('Fichier sélectionné :', file.name);
    }
  }

  private async loadConversations(): Promise<void> {
    await this.auth.ensureSessionReady();
    const user = this.auth.currentUser();

    if (!user) {
      return;
    }

    const requestedConversationOrProfileId = this.requestedConversationId();
    let threads = await this.messagingService.getConversationThreads(user);
    let selectedConversationId = requestedConversationOrProfileId;

    if (
      requestedConversationOrProfileId &&
      !threads.some(thread => thread.id === requestedConversationOrProfileId)
    ) {
      const createdConversationId = await this.messagingService.ensureConversationWithProfile(user, requestedConversationOrProfileId);

      if (createdConversationId) {
        selectedConversationId = createdConversationId;
        threads = await this.messagingService.getConversationThreads(user);
        await this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { conversation: createdConversationId },
          queryParamsHandling: 'merge',
        });
      }
    }

    this.conversations.set(threads.map(thread => this.toPreview(thread)));
    this.localMessages.set(threads.reduce<Record<string, ConversationMessage[]>>((messagesByConversation, thread) => {
      messagesByConversation[thread.id] = [...thread.messages];
      return messagesByConversation;
    }, {}));

    if (selectedConversationId) {
      this.selectedConversationId.set(selectedConversationId);
      this.markConversationAsRead(selectedConversationId);
    }
  }

  private markConversationAsRead(conversationId: string): void {
    const user = this.auth.currentUser();

    if (!user) {
      return;
    }

    this.conversations.update(conversations => conversations.map(conversation =>
      conversation.id === conversationId ? { ...conversation, unread: 0 } : conversation
    ));
    void this.messagingService.markAsRead(conversationId, user.uid);
  }

  private toPreview(thread: ConversationThread): ConversationPreview {
    return {
      id: thread.id,
      participantProfileId: thread.participantProfileId,
      name: thread.participantName,
      initials: thread.participantInitials,
      lastMessage: thread.lastMessage,
      time: thread.time,
      unread: thread.unread,
      profile: thread.profile,
      messages: thread.messages,
    };
  }
}
