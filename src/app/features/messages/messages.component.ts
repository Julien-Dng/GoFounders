import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, signal } from '@angular/core';

interface ConversationPreview {
  id: string;
  name: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
}

interface ChatMsg {
  id: string;
  senderId: 'me' | 'other';
  content: string;
  time: string;
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex mt-20 h-[calc(100vh-80px)] px-48">

      <!-- ZONE DE CHAT -->
      <div class="flex-1 flex flex-col min-w-0">

        <!-- Top bar : infos conversation -->
        <div class="bg-white border-b border-border px-5 py-4 flex items-center gap-4 flex-shrink-0">
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
          <div class="flex-1 overflow-y-auto p-6 space-y-4 bg-secondary/20">
            @for (msg of messages(); track msg.id) {
              <div class="flex" [class.justify-end]="msg.senderId === 'me'">
                <div
                  class="max-w-sm px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-md"
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
          <div class="bg-white border-t border-border p-4 flex-shrink-0">
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

      <!-- LISTE DES CONVERSATIONS (droite) -->
      <aside class="w-80 bg-white border-l border-border flex flex-col flex-shrink-0">

        <div class="px-5 py-5 border-b border-border">
          <h2 class="text-lg font-bold">Messages</h2>
          <p class="text-xs text-muted-foreground mt-0.5">{{ conversations.length }} conversation(s) active(s)</p>
        </div>

        <div class="overflow-y-auto flex-1">
          @for (conv of conversations; track conv.id) {
            <button
              type="button"
              (click)="selectConversation(conv)"
              class="w-full flex items-center gap-3 px-5 py-4 border-b border-border text-left transition-colors"
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

  `
})
export class MessagesComponent {
  readonly selectedConv = signal<ConversationPreview | null>(null);
  readonly newMessage = signal('');
  readonly emojiPickerOpen = signal(false);

  readonly messages = signal<ChatMsg[]>([
    { id: '1', senderId: 'other', content: 'Bonjour ! Votre profil m\'intéresse beaucoup.', time: '14:30' },
    { id: '2', senderId: 'me', content: 'Merci ! Je serais ravi d\'en discuter.', time: '14:31' },
    { id: '3', senderId: 'other', content: 'Quand êtes-vous disponible pour un appel ?', time: '14:32' },
  ]);

  readonly emojis = ['😀', '😊', '😂', '❤️', '👍', '🎉', '🙏', '🤝', '💡', '🚀', '✅', '👋', '🔥', '💪', '🙌', '😎'];

  readonly conversations: ConversationPreview[] = [
    { id: '1', name: 'Sophie Bernard', initials: 'SB', lastMessage: 'Bonjour, votre profil m\'intéresse beaucoup !', time: '14:32', unread: 2 },
    { id: '2', name: 'Marc Dupont', initials: 'MD', lastMessage: 'Quand êtes-vous disponible pour un call ?', time: 'Hier', unread: 0 },
  ];

  @HostListener('document:click')
  closeEmojiPicker(): void {
    this.emojiPickerOpen.set(false);
  }

  selectConversation(conv: ConversationPreview): void {
    this.selectedConv.set(conv);
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

  sendMessage(): void {
    const content = this.newMessage().trim();
    if (!content) return;
    const now = new Date();
    const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    this.messages.update(msgs => [...msgs, { id: String(Date.now()), senderId: 'me', content, time }]);
    this.newMessage.set('');
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      console.log('Fichier sélectionné :', file.name);
    }
  }
}
