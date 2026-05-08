import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ChatMsg {
  id: string;
  senderId: string;
  content: string;
  time: string;
}

@Component({
  selector: 'app-conversation',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pt-20 flex flex-col">
      <div class="max-w-3xl mx-auto w-full px-8 py-8 flex flex-col flex-1">

        <!-- Header -->
        <div class="flex items-center gap-4 mb-6 animate-fade-in-up">
          <a routerLink="/messages" class="p-2 rounded-lg hover:bg-border transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </a>
          <div class="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold">SB</div>
          <div>
            <div class="font-bold">Sophie Bernard</div>
            <div class="text-xs text-green-500 font-medium">En ligne</div>
          </div>
        </div>

        <!-- Messages -->
        <div class="bg-white rounded-2xl border border-border shadow-lg flex flex-col h-[calc(100vh-280px)] animate-fade-in-up delay-100">
          <div class="flex-1 overflow-y-auto p-6 space-y-4">
            @for (msg of messages; track msg.id) {
              <div class="flex" [class.justify-end]="msg.senderId === 'me'">
                <div
                  class="max-w-xs px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                  [class.bg-accent]="msg.senderId === 'me'"
                  [class.text-white]="msg.senderId === 'me'"
                  [class.bg-secondary]="msg.senderId !== 'me'"
                >
                  {{ msg.content }}
                  <div class="text-xs mt-1 opacity-60 text-right">{{ msg.time }}</div>
                </div>
              </div>
            }
          </div>

          <!-- Input -->
          <div class="border-t border-border p-4 flex gap-3">
            <input
              type="text"
              [value]="newMessage()"
              (input)="newMessage.set($any($event.target).value)"
              (keyup.enter)="sendMessage()"
              placeholder="Votre message..."
              class="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors text-sm"
            >
            <button
              (click)="sendMessage()"
              [disabled]="!newMessage().trim()"
              class="px-5 py-2.5 bg-accent text-white rounded-lg font-semibold text-sm hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
  newMessage = signal('');

  readonly messages: ChatMsg[] = [
    { id: '1', senderId: 'other', content: 'Bonjour ! Votre profil m\'intéresse beaucoup.', time: '14:30' },
    { id: '2', senderId: 'me', content: 'Merci ! Je serais ravi d\'en discuter.', time: '14:31' },
    { id: '3', senderId: 'other', content: 'Quand êtes-vous disponible pour un appel ?', time: '14:32' },
  ];

  sendMessage(): void {
    if (this.newMessage().trim()) {
      console.log('Send:', this.newMessage());
      this.newMessage.set('');
    }
  }
}
