import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AiAction, AiContext, AiMessage, AiService } from '../../core/services/ai.service';
import { AuthService } from '../../core/services/auth.service';

type ActionIcon = 'profile' | 'matches' | 'insights';

interface ChatAction {
  label: string;
  icon: ActionIcon;
  path: string;
}

interface ChatMessage {
  type: 'user' | 'ai';
  text: string;
  actions?: ChatAction[];
}

const ACTION_LINKS: Record<AiAction, ChatAction> = {
  completer_profil: { label: 'Compléter mon profil', icon: 'profile', path: '/profil/modifier' },
  voir_recherche: { label: 'Explorer les profils', icon: 'matches', path: '/recherche' },
  voir_messages: { label: 'Ouvrir mes messages', icon: 'matches', path: '/messages' },
  voir_ma: { label: 'Voir les annonces M&A', icon: 'insights', path: '/ma' },
  deposer_annonce: { label: 'Déposer mon annonce', icon: 'insights', path: '/ma/deposer' },
  voir_abonnement: { label: 'Mon abonnement', icon: 'insights', path: '/abonnement' },
};

@Component({
  selector: 'app-coaching-ia',
  standalone: true,
  imports: [NgClass, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pt-20">
      <div class="border-b border-border bg-white">
        <div class="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 class="mb-2 flex items-center gap-3 text-3xl font-bold sm:text-4xl">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                </svg>
                Mon Assistant GoFounders
              </h1>
              <p class="text-base text-muted-foreground sm:text-lg">Votre assistant personnel connaît votre profil, vos matches et vos signaux d'activité.</p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <a routerLink="/dashboard" class="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 10.5 12 3l9 7.5"/>
                  <path d="M5 9.5V21h14V9.5"/>
                </svg>
                Dashboard
              </a>
              <a routerLink="/messages" class="inline-flex items-center gap-2 rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-accent hover:text-accent">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
                Messages
              </a>
              <div class="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 font-semibold text-accent">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m2 4 3 12h14l3-12-6 5-4-5-4 5-6-5z"/>
                  <path d="M5 20h14"/>
                </svg>
                <span>PRO</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
        <div class="grid gap-8 xl:grid-cols-12">
          <div class="xl:col-span-3">
            <div class="sticky top-28 rounded-2xl border border-border bg-card p-6">
              <h2 class="mb-6 text-xl font-bold">Ce que je sais sur vous</h2>

              <div class="mb-6 border-b border-border pb-6">
                <h3 class="mb-3 text-sm font-bold uppercase text-muted-foreground">Votre profil</h3>
                <div class="space-y-2 text-sm">
                  @for (info of profileInfo(); track info.label) {
                    <div class="flex items-center gap-2">
                      <div class="h-1.5 w-1.5 rounded-full bg-accent"></div>
                      <span>{{ info.label }} : {{ info.value }}</span>
                    </div>
                  }
                </div>
              </div>

              <div class="mb-6 border-b border-border pb-6">
                <h3 class="mb-3 text-sm font-bold uppercase text-muted-foreground">Votre activité</h3>
                <div class="space-y-2 text-sm">
                  @for (item of activity(); track item.label) {
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-muted-foreground">{{ item.label }}</span>
                      <span class="font-semibold">{{ item.value }}</span>
                    </div>
                  } @empty {
                    <p class="text-muted-foreground">Chargement de vos données…</p>
                  }
                </div>
              </div>

              <div>
                <h3 class="mb-3 text-sm font-bold uppercase text-muted-foreground">Questions suggérées</h3>
                <div class="space-y-2">
                  @for (question of suggestedQuestions(); track question) {
                    <button type="button" (click)="ask(question)" [disabled]="isSending()" class="group w-full rounded-lg border border-border bg-white px-4 py-2.5 text-left text-sm transition-all hover:border-accent hover:bg-accent/5">
                      <span class="group-hover:text-accent">{{ question }}</span>
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>

          <div class="xl:col-span-9">
            <div class="flex h-[calc(100vh-240px)] min-h-[38rem] flex-col rounded-2xl border border-border bg-white shadow-lg">
              <div class="flex-1 overflow-y-auto p-6 sm:p-8">
                <div class="space-y-6">
                  @if (chatHistory().length === 0) {
                    <div class="rounded-2xl bg-secondary p-4 leading-relaxed text-foreground">
                      Bonjour {{ firstName() }}, je connais votre profil et votre activité sur GoFounders. Posez-moi une question ou choisissez une question suggérée.
                    </div>
                  }
                  @for (msg of chatHistory(); track $index) {
                    <div class="flex gap-4" [ngClass]="msg.type === 'user' ? 'justify-end' : 'justify-start'">
                      @if (msg.type === 'ai') {
                        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                          </svg>
                        </div>
                      }

                      <div class="max-w-2xl" [class.order-first]="msg.type === 'user'">
                        <div
                          class="rounded-2xl p-4 leading-relaxed"
                          [ngClass]="msg.type === 'user' ? 'bg-accent text-white' : 'bg-secondary text-foreground'"
                        >{{ msg.text }}</div>

                        @if (msg.actions) {
                          <div class="mt-3 flex flex-wrap gap-2">
                            @for (action of msg.actions; track action.label) {
                              <a [routerLink]="action.path" class="group flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium transition-all hover:border-accent hover:bg-accent/5">
                                <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent" aria-hidden="true">
                                  @switch (action.icon) {
                                    @case ('profile') {
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M20 21a8 8 0 0 0-16 0"/>
                                        <circle cx="12" cy="8" r="4"/>
                                      </svg>
                                    }
                                    @case ('matches') {
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="8"/>
                                        <circle cx="12" cy="12" r="4"/>
                                        <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/>
                                      </svg>
                                    }
                                    @case ('insights') {
                                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path d="M3 3v18h18"/>
                                        <path d="m7 14 4-4 3 3 5-7"/>
                                      </svg>
                                    }
                                  }
                                </span>
                                <span class="group-hover:text-accent">{{ action.label }}</span>
                              </a>
                            }
                          </div>
                        }
                      </div>

                      @if (msg.type === 'user') {
                        <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary font-bold text-white">
                          {{ userInitials() }}
                        </div>
                      }
                    </div>
                  }
                  @if (isSending()) {
                    <div class="rounded-2xl bg-secondary p-4 text-muted-foreground" aria-live="polite">L'assistant réfléchit…</div>
                  }
                </div>
              </div>

              <div class="border-t border-border p-6">
                @if (errorMessage()) {
                  <p class="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive" role="alert">{{ errorMessage() }}</p>
                }
                <div class="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    [value]="message()"
                    (input)="message.set($any($event.target).value)"
                    (keyup.enter)="handleSend()"
                    aria-label="Votre question"
                    placeholder="Posez votre question à votre assistant..."
                    class="flex-1 rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                  >
                  <button
                    type="button"
                    (click)="handleSend()"
                    [disabled]="!message().trim() || isSending()"
                    [ngClass]="message().trim() && !isSending()
                      ? 'rounded-lg bg-accent px-6 py-3 text-white transition-all hover:scale-105 hover:bg-accent/90 active:scale-95'
                      : 'cursor-not-allowed rounded-lg bg-muted px-6 py-3 text-muted-foreground'"
                    class="flex items-center justify-center gap-2 font-semibold"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                    Envoyer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CoachingIaComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly ai = inject(AiService);

  readonly message = signal('');
  readonly currentUser = this.auth.currentUser;
  readonly userInitials = computed(() => this.auth.initials() || 'GF');
  readonly firstName = computed(() => this.currentUser()?.displayName.split(' ')[0] || 'membre');

  private readonly context = signal<AiContext | null>(null);
  readonly profileInfo = computed(() => this.context()?.profile ?? []);
  readonly activity = computed(() => this.context()?.activity ?? []);
  readonly suggestedQuestions = computed(() => this.context()?.suggested_questions ?? []);

  readonly chatHistory = signal<ChatMessage[]>([]);
  readonly isSending = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    void this.loadContext();
  }

  handleSend(): void {
    void this.ask(this.message());
  }

  async ask(question: string): Promise<void> {
    const text = question.trim();

    if (!text || this.isSending()) {
      return;
    }

    this.message.set('');
    this.errorMessage.set('');
    this.chatHistory.update(history => [...history, { type: 'user', text }]);
    this.isSending.set(true);

    try {
      const answer = await this.ai.sendMessage(this.toApiHistory());
      this.chatHistory.update(history => [
        ...history,
        { type: 'ai', text: answer.reply, actions: answer.actions.map(action => ACTION_LINKS[action]) },
      ]);
    } catch (error) {
      // La question non traitée est retirée pour que l'historique reste cohérent.
      this.chatHistory.update(history => history.slice(0, -1));
      this.message.set(text);
      this.errorMessage.set(error instanceof Error ? error.message : "L'assistant est indisponible pour le moment.");
    } finally {
      this.isSending.set(false);
    }
  }

  private async loadContext(): Promise<void> {
    try {
      this.context.set(await this.ai.getContext());
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : "L'assistant est indisponible pour le moment.");
    }
  }

  private toApiHistory(): AiMessage[] {
    return this.chatHistory().map(message => ({
      role: message.type === 'user' ? 'user' : 'assistant',
      content: message.text,
    }));
  }
}
