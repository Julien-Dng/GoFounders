import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-connexion',
  standalone: true,
  imports: [RouterLink, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white flex items-center justify-center px-8 py-12">
      <div class="w-full max-w-md">

        <div class="text-center mb-10 animate-fade-in-up">
          <h1 class="text-4xl font-bold text-primary mb-2">Bon retour !</h1>
          <p class="text-muted-foreground">Connectez-vous à votre compte GoFounders</p>
        </div>

        <div class="bg-white rounded-2xl border-2 border-border p-10 shadow-lg animate-fade-in-scale delay-100">
          @if (returnUrl()) {
            <div class="mb-6 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent">
              Connectez-vous pour accéder à la page demandée.
            </div>
          }

          <div class="mb-5">
            <label class="block text-sm font-semibold mb-2" for="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              [value]="email()"
              (input)="onEmailInput($event)"
              placeholder="vous@exemple.fr"
              class="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
            >
          </div>

          <div class="mb-4">
            <label class="block text-sm font-semibold mb-2" for="login-password">Mot de passe</label>
            <input
              id="login-password"
              type="password"
              [value]="password()"
              (input)="onPasswordInput($event)"
              (keyup.enter)="handleLogin()"
              placeholder="••••••••"
              class="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
            >
          </div>

          <div class="text-right mb-6">
            <a href="#" class="text-sm text-accent hover:underline">Mot de passe oublié ?</a>
          </div>

          @if (errorMessage()) {
            <div class="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {{ errorMessage() }}
            </div>
          }

          <button
            (click)="handleLogin()"
            [disabled]="isSubmitting()"
            [ngClass]="isSubmitting() ? 'opacity-70 cursor-wait' : ''"
            class="w-full py-4 bg-accent text-white rounded-lg font-bold text-lg shadow-lg hover:bg-accent/90 transition-colors"
          >
            {{ isSubmitting() ? 'Connexion...' : 'Se connecter' }}
          </button>

          <p class="mt-4 text-center text-sm text-muted-foreground">
            Sans page demandée, la connexion redirige vers le dashboard.
          </p>
        </div>

        <p class="text-center text-sm text-muted-foreground mt-6 animate-fade-in delay-300">
          Pas encore de compte ?
          <a
            routerLink="/inscription"
            [queryParams]="returnUrl() ? { returnUrl: returnUrl() } : null"
            class="text-accent font-semibold hover:underline"
          >S'inscrire gratuitement</a>
        </p>

      </div>
    </div>
  `
})
export class ConnexionComponent {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly returnUrl = signal<string | null>(this.route.snapshot.queryParamMap.get('returnUrl'));
  readonly email = signal('');
  readonly password = signal('');
  readonly errorMessage = signal('');
  readonly isSubmitting = signal(false);

  onEmailInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.email.set(input?.value ?? '');
  }

  onPasswordInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.password.set(input?.value ?? '');
  }

  async handleLogin(): Promise<void> {
    this.errorMessage.set('');

    if (!this.email().trim() || !this.password().trim()) {
      this.errorMessage.set('Renseignez votre email et votre mot de passe.');
      return;
    }

    this.isSubmitting.set(true);

    try {
      const result = await this.auth.signIn(
        {
          email: this.email(),
          password: this.password(),
        },
        this.returnUrl()
      );

      if (!result.success) {
        this.errorMessage.set(result.message ?? 'Connexion impossible.');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
