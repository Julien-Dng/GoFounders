import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgClass } from '@angular/common';

interface ChatMessage {
  type: 'user' | 'ai';
  text: string;
  actions?: Array<{ label: string; emoji: string }>;
}

@Component({
  selector: 'app-coaching-ia',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pt-20">

      <!-- HEADER -->
      <div class="bg-white border-b border-border">
        <div class="max-w-[1600px] mx-auto px-8 py-8">
          <div class="flex items-start justify-between animate-fade-in-up">
            <div>
              <h1 class="text-4xl font-bold mb-2 flex items-center gap-3">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                </svg>
                Mon Assistant GoFounders
              </h1>
              <p class="text-lg text-muted-foreground">Votre assistant personnel — il connaît votre profil et vos matches</p>
            </div>
            <div class="px-4 py-2 bg-accent/10 text-accent rounded-full flex items-center gap-2 font-semibold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m2 4 3 12h14l3-12-6 5-4-5-4 5-6-5z"/>
                <path d="M5 20h14"/>
              </svg>
              <span>PRO</span>
            </div>
          </div>
        </div>
      </div>

      <!-- MAIN LAYOUT -->
      <div class="max-w-[1600px] mx-auto px-8 py-8">
        <div class="grid grid-cols-12 gap-8 relative">

          <!-- LEFT COLUMN -->
          <div class="col-span-3">
            <div
              class="bg-card rounded-2xl border border-border p-6 sticky top-28 animate-fade-in-up delay-100"
              [class.blur-sm]="!isProUser()"
            >
              <h2 class="text-xl font-bold mb-6">Ce que je sais sur vous</h2>

              <div class="mb-6 pb-6 border-b border-border">
                <h3 class="text-sm font-bold text-muted-foreground uppercase mb-3">Votre profil</h3>
                <div class="space-y-2 text-sm">
                  @for (info of profileInfo; track info) {
                    <div class="flex items-center gap-2">
                      <div class="w-1.5 h-1.5 bg-accent rounded-full"></div>
                      <span>{{ info }}</span>
                    </div>
                  }
                </div>
              </div>

              <div class="mb-6 pb-6 border-b border-border">
                <h3 class="text-sm font-bold text-muted-foreground uppercase mb-3">Vos matches</h3>
                <div class="text-sm">
                  <div class="font-semibold mb-1">8 matches actifs</div>
                  <div class="text-muted-foreground">2 nouveaux cette semaine</div>
                </div>
              </div>

              <div class="mb-6 pb-6 border-b border-border">
                <h3 class="text-sm font-bold text-muted-foreground uppercase mb-3">Votre activité</h3>
                <div class="text-sm">
                  <div class="flex items-center gap-2 mb-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                    </svg>
                    <span>Profil consulté 24 fois ce mois</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                      <polyline points="16 7 22 7 22 13"/>
                    </svg>
                    <span>+12% vs mois dernier</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 class="text-sm font-bold text-muted-foreground uppercase mb-3">Questions suggérées</h3>
                <div class="space-y-2">
                  @for (q of suggestedQuestions; track q) {
                    <button class="w-full text-left px-4 py-2.5 bg-white hover:bg-accent/5 border border-border hover:border-accent rounded-lg text-sm transition-all group">
                      <span class="group-hover:text-accent">{{ q }}</span>
                    </button>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- RIGHT COLUMN - Chat Interface -->
          <div class="col-span-9">
            <div
              class="bg-white rounded-2xl border border-border shadow-lg flex flex-col h-[calc(100vh-240px)] animate-fade-in-up delay-200"
              [class.blur-sm]="!isProUser()"
            >
              <!-- Chat History -->
              <div class="flex-1 overflow-y-auto p-8 space-y-6">
                @for (msg of chatHistory; track $index) {
                  <div class="flex gap-4" [ngClass]="msg.type === 'user' ? 'justify-end' : 'justify-start'">

                    @if (msg.type === 'ai') {
                      <div class="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center flex-shrink-0">
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
                        <div class="flex flex-wrap gap-2 mt-3">
                          @for (action of msg.actions; track action.label) {
                            <button class="flex items-center gap-2 px-4 py-2 bg-white border border-border hover:border-accent rounded-lg text-sm font-medium transition-all hover:bg-accent/5 group">
                              <span>{{ action.emoji }}</span>
                              <span class="group-hover:text-accent">{{ action.label }}</span>
                            </button>
                          }
                        </div>
                      }
                    </div>

                    @if (msg.type === 'user') {
                      <div class="w-10 h-10 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">MJ</div>
                    }
                  </div>
                }
              </div>

              <!-- Input Bar -->
              <div class="border-t border-border p-6">
                <div class="flex gap-3">
                  <input
                    type="text"
                    [value]="message()"
                    (input)="message.set($any($event.target).value)"
                    (keyup.enter)="handleSend()"
                    placeholder="Posez votre question à votre assistant..."
                    class="flex-1 px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
                  >
                  <button
                    (click)="handleSend()"
                    [disabled]="!message().trim()"
                    [ngClass]="message().trim()
                      ? 'px-6 py-3 rounded-lg font-semibold flex items-center gap-2 bg-accent text-white transition-all hover:scale-105 active:scale-95'
                      : 'px-6 py-3 rounded-lg font-semibold flex items-center gap-2 bg-muted text-muted-foreground cursor-not-allowed'"
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

          <!-- LOCKED OVERLAY -->
          @if (!isProUser()) {
            <div class="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <div class="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-accent p-12 shadow-2xl max-w-xl pointer-events-auto text-center animate-fade-in-scale">
                <div class="w-20 h-20 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m2 4 3 12h14l3-12-6 5-4-5-4 5-6-5z"/>
                    <path d="M5 20h14"/>
                  </svg>
                </div>
                <h2 class="text-3xl font-bold mb-4">Fonctionnalité PRO</h2>
                <p class="text-lg text-muted-foreground mb-8 leading-relaxed">
                  Votre assistant connaît votre profil et vos données pour vous donner des conseils vraiment personnalisés
                </p>
                <button class="w-full py-4 bg-accent text-white rounded-lg font-bold text-lg shadow-lg hover:bg-accent/90 transition-colors mb-3">
                  Passer en PRO — 49€/mois
                </button>
                <button (click)="isProUser.set(true)" class="text-sm text-muted-foreground hover:text-foreground">
                  Aperçu démo (pour ce test)
                </button>
              </div>
            </div>
          }

        </div>
      </div>
    </div>
  `
})
export class CoachingIaComponent {
  message = signal('');
  isProUser = signal(false);

  readonly suggestedQuestions = [
    'Pourquoi si peu de matches ?',
    'Comment améliorer mon profil ?',
    'Quel profil me correspond le mieux ?',
    'Comment aborder un premier contact ?',
  ];

  readonly profileInfo = ['Secteur: Tech / SaaS', 'Stade: MVP', 'Recherche: CTO, Développeur'];

  readonly chatHistory: ChatMessage[] = [
    { type: 'user', text: "Pourquoi je n'ai pas eu de matches cette semaine ?" },
    {
      type: 'ai',
      text: "En analysant votre profil, j'ai remarqué 3 points à améliorer : votre secteur n'est pas renseigné, vous n'avez pas de photo, et votre description fait moins de 50 mots. Les profils complets reçoivent en moyenne 4x plus de matches.",
      actions: [
        { label: 'Compléter mon profil', emoji: '👤' },
        { label: 'Voir mes matches', emoji: '🎯' },
        { label: 'En savoir plus', emoji: '✨' },
      ]
    },
  ];

  handleSend(): void {
    if (this.message().trim()) {
      console.log('Sending:', this.message());
      this.message.set('');
    }
  }
}
