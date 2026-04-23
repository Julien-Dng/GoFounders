import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ConversationPreview {
  id: string;
  name: string;
  initials: string;
  lastMessage: string;
  time: string;
  unread: number;
}

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pt-20">
      <div class="max-w-[1400px] mx-auto px-8 py-8">

        <div class="mb-8 animate-fade-in-up">
          <h1 class="text-4xl font-bold mb-2">Messages</h1>
          <p class="text-muted-foreground">{{ conversations.length }} conversation(s) active(s)</p>
        </div>

        <div class="bg-white rounded-2xl border border-border shadow-lg overflow-hidden animate-fade-in-up delay-100">
          @for (conv of conversations; track conv.id) {
            <a
              [routerLink]="['/messages', conv.id]"
              class="flex items-center gap-4 p-5 border-b border-border hover:bg-secondary transition-colors last:border-0"
            >
              <div class="w-12 h-12 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {{ conv.initials }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-semibold">{{ conv.name }}</span>
                  <span class="text-xs text-muted-foreground">{{ conv.time }}</span>
                </div>
                <p class="text-sm text-muted-foreground truncate">{{ conv.lastMessage }}</p>
              </div>
              @if (conv.unread > 0) {
                <span class="w-5 h-5 bg-accent text-white text-xs rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  {{ conv.unread }}
                </span>
              }
            </a>
          } @empty {
            <div class="text-center py-16 text-muted-foreground">
              <p class="text-lg font-semibold mb-2">Aucun message pour l'instant</p>
              <p class="text-sm">Commencez par contacter un profil depuis la recherche</p>
            </div>
          }
        </div>

      </div>
    </div>
  `
})
export class MessagesComponent {
  readonly conversations: ConversationPreview[] = [
    { id: '1', name: 'Sophie Bernard', initials: 'SB', lastMessage: 'Bonjour, votre profil m\'intéresse beaucoup !', time: '14:32', unread: 2 },
    { id: '2', name: 'Marc Dupont', initials: 'MD', lastMessage: 'Quand êtes-vous disponible pour un call ?', time: 'Hier', unread: 0 },
  ];
}
