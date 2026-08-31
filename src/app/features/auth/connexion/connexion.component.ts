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

          @if (infoMessage()) {
            <div class="mb-6 rounded-xl border border-success/20 bg-success/5 px-4 py-3 text-sm text-success">
              {{ infoMessage() }}
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
            <div class="relative">
              <input
                id="login-password"
                [type]="isPasswordVisible() ? 'text' : 'password'"
                [value]="password()"
                (input)="onPasswordInput($event)"
                (keyup.enter)="handleLogin()"
                placeholder="••••••••"
                class="w-full rounded-lg border border-border bg-secondary py-3 pl-4 pr-12 outline-none transition-colors focus:border-accent"
              >
              <button
                type="button"
                (click)="togglePasswordVisibility()"
                [attr.aria-label]="isPasswordVisible() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                [attr.aria-pressed]="isPasswordVisible()"
                aria-controls="login-password"
                class="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
              >
                @if (isPasswordVisible()) {
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="h-5 w-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
                    <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9 5 9 5a15.7 15.7 0 0 1-2.1 2.7" />
                    <path d="M6.6 6.6C4.3 8.1 3 10 3 10s3.5 5 9 5a9.8 9.8 0 0 0 3.4-.6" />
                  </svg>
                } @else {
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="h-5 w-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                }
              </button>
            </div>
          </div>

          <div class="mb-6 text-right">
            <a href="mailto:support@gofounders.fr?subject=Mot%20de%20passe%20oublie" class="text-sm text-accent hover:underline">
              Mot de passe oublié ? Contactez le support
            </a>
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
  readonly infoMessage = signal(this.route.snapshot.queryParamMap.get('confirmation') === '1'
    ? "Compte cree. Confirmez votre email si Supabase vous l'envoie, puis connectez-vous."
    : ''
  );
  readonly email = signal(this.route.snapshot.queryParamMap.get('email') ?? '');
  readonly password = signal('');
  readonly isPasswordVisible = signal(false);
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

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update((isVisible) => !isVisible);
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
