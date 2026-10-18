import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { passwordPolicyValidator } from '../../../core/validators/password-policy.validator';
import { PasswordCriteriaComponent } from '../../../shared/components/password-criteria/password-criteria.component';

// Page ouverte par le lien de l'email « Mot de passe oublié » : Supabase lit le jeton dans l'URL
// et ouvre une session de récupération, qui permet de définir le nouveau mot de passe.
@Component({
  selector: 'app-reinitialiser',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PasswordCriteriaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex min-h-screen items-center justify-center bg-white px-4 py-12 sm:px-8">
      <div class="w-full max-w-md">
        <div class="mb-10 text-center">
          <h1 class="mb-2 text-3xl font-bold text-primary sm:text-4xl">Nouveau mot de passe</h1>
          <p class="text-muted-foreground">Choisissez le mot de passe de votre compte GoFounders.</p>
        </div>

        <div class="rounded-2xl border-2 border-border bg-white p-6 shadow-lg sm:p-10">
          @switch (state()) {
            @case ('loading') {
              <p class="text-center text-muted-foreground" role="status">Vérification du lien…</p>
            }
            @case ('invalid') {
              <p class="mb-6 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
                Ce lien a expiré ou a déjà été utilisé. Refaites une demande depuis la page de connexion.
              </p>
              <a routerLink="/connexion" class="block w-full rounded-lg bg-accent py-3 text-center font-bold text-white hover:bg-accent/90">
                Retour à la connexion
              </a>
            }
            @case ('ready') {
              <div [formGroup]="form">
                <label class="mb-2 block text-sm font-semibold" for="new-password">Nouveau mot de passe</label>
                <div class="relative">
                  <input
                    id="new-password"
                    [type]="isPasswordVisible() ? 'text' : 'password'"
                    formControlName="password"
                    autocomplete="new-password"
                    (keyup.enter)="submit()"
                    aria-describedby="new-password-criteria"
                    class="w-full rounded-lg border border-border bg-secondary py-3 pl-4 pr-24 outline-none transition-colors focus:border-accent"
                  >
                  <button
                    type="button"
                    (click)="isPasswordVisible.set(!isPasswordVisible())"
                    [attr.aria-pressed]="isPasswordVisible()"
                    aria-controls="new-password"
                    class="absolute inset-y-0 right-0 px-4 text-sm font-semibold text-muted-foreground hover:text-primary"
                  >
                    {{ isPasswordVisible() ? 'Masquer' : 'Afficher' }}
                  </button>
                </div>
                <app-password-criteria id="new-password-criteria" [password]="form.controls.password.value" />
              </div>

              @if (errorMessage()) {
                <p class="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">{{ errorMessage() }}</p>
              }

              <button
                type="button"
                (click)="submit()"
                [disabled]="isSubmitting() || form.invalid"
                class="mt-6 w-full rounded-lg bg-accent py-4 text-lg font-bold text-white shadow-lg transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {{ isSubmitting() ? 'Enregistrement…' : 'Enregistrer le mot de passe' }}
              </button>
            }
          }
        </div>
      </div>
    </div>
  `,
})
export class ReinitialiserComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly state = signal<'loading' | 'invalid' | 'ready'>('loading');
  readonly isPasswordVisible = signal(false);
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal('');
  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, passwordPolicyValidator]],
  });

  async ngOnInit(): Promise<void> {
    this.state.set((await this.auth.hasRecoverySession()) ? 'ready' : 'invalid');
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');

    try {
      const result = await this.auth.updatePassword(this.form.controls.password.value);

      if (!result.success) {
        this.errorMessage.set(result.message ?? 'Impossible de modifier le mot de passe.');
        return;
      }

      // Déconnexion de la session de récupération : l'utilisateur se reconnecte avec le nouveau mot de passe.
      await this.auth.signOut({ reinitialisation: '1' });
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
