import { ChangeDetectionStrategy, Component, Output, EventEmitter, signal, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

interface WaitlistEntry {
  email: string;
  userId: string | null;
  createdAt: Date;
}

@Component({
  selector: 'app-waitlist-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary/60 backdrop-blur-sm animate-fade-in"
      (click)="onBackdropClick($event)"
    >
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-fade-in-scale">

        <!-- Header -->
        <div class="flex items-start justify-between mb-6">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold uppercase mb-3">
              <span class="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
              Bientôt disponible
            </div>
            <h2 class="text-2xl font-bold text-primary">Fonctionnalité bientôt disponible</h2>
          </div>
          <button
            (click)="close.emit()"
            class="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <!-- Body -->
        <p class="text-muted-foreground leading-relaxed mb-6">
          Nous construisons actuellement notre réseau de Business Angels et VCs partenaires.
          Rejoignez la liste d'attente pour être notifié en priorité dès l'ouverture.
        </p>

        @if (!success()) {
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                [value]="email()"
                (input)="email.set($any($event.target).value)"
                placeholder="vous@exemple.fr"
                class="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
              >
            </div>

            <button
              (click)="joinWaitlist()"
              [disabled]="loading() || !email().trim()"
              class="w-full py-4 bg-accent text-white rounded-lg font-bold shadow-lg hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              @if (loading()) {
                <svg class="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
              }
              Rejoindre la liste d'attente
            </button>

            <button (click)="close.emit()" class="w-full py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
              Fermer
            </button>
          </div>
        } @else {
          <div class="text-center py-4">
            <div class="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <p class="font-bold text-lg text-primary mb-2">✓ Vous êtes sur la liste !</p>
            <p class="text-muted-foreground text-sm">Nous vous contacterons en priorité.</p>
            <button (click)="close.emit()" class="mt-6 px-6 py-2.5 bg-secondary rounded-lg text-sm font-semibold hover:bg-border transition-colors">
              Fermer
            </button>
          </div>
        }

      </div>
    </div>
  `
})
export class WaitlistModalComponent {
  @Output() close = new EventEmitter<void>();

  private readonly auth = inject(AuthService);

  email = signal(this.auth.currentUser()?.email ?? '');
  loading = signal(false);
  success = signal(false);

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close.emit();
    }
  }

  async joinWaitlist(): Promise<void> {
    if (!this.email().trim() || this.loading()) return;

    this.loading.set(true);

    const entry: WaitlistEntry = {
      email: this.email().trim(),
      userId: this.auth.currentUser()?.uid ?? null,
      createdAt: new Date(),
    };

    try {
      // Firestore write — collection "waitlist_investors"
      // Will be wired once @angular/fire is installed:
      // await addDoc(collection(this.firestore, 'waitlist_investors'), entry);
      console.log('Waitlist entry:', entry);

      await new Promise(resolve => setTimeout(resolve, 800)); // simule latence réseau
      this.success.set(true);
    } finally {
      this.loading.set(false);
    }
  }
}
