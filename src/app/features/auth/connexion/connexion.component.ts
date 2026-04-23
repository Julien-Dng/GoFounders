import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-connexion',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white flex items-center justify-center px-8 py-12">
      <div class="w-full max-w-md">

        <div class="text-center mb-10 animate-fade-in-up">
          <h1 class="text-4xl font-bold text-primary mb-2">Bon retour !</h1>
          <p class="text-muted-foreground">Connectez-vous à votre compte GoFounders</p>
        </div>

        <div class="bg-white rounded-2xl border-2 border-border p-10 shadow-lg animate-fade-in-scale delay-100">

          <div class="mb-5">
            <label class="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              [value]="email()"
              (input)="email.set($any($event.target).value)"
              placeholder="vous@exemple.fr"
              class="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
            >
          </div>

          <div class="mb-8">
            <label class="block text-sm font-semibold mb-2">Mot de passe</label>
            <input
              type="password"
              [value]="password()"
              (input)="password.set($any($event.target).value)"
              (keyup.enter)="handleLogin()"
              placeholder="••••••••"
              class="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
            >
            <div class="text-right mt-2">
              <a href="#" class="text-sm text-accent hover:underline">Mot de passe oublié ?</a>
            </div>
          </div>

          <button
            (click)="handleLogin()"
            class="w-full py-4 bg-accent text-white rounded-lg font-bold text-lg shadow-lg hover:bg-accent/90 transition-colors"
          >
            Se connecter
          </button>

        </div>

        <p class="text-center text-sm text-muted-foreground mt-6 animate-fade-in delay-300">
          Pas encore de compte ?
          <a routerLink="/inscription" class="text-accent font-semibold hover:underline">S'inscrire gratuitement</a>
        </p>

      </div>
    </div>
  `
})
export class ConnexionComponent {
  email = signal('');
  password = signal('');

  handleLogin(): void {
    if (this.email().trim() && this.password().trim()) {
      console.log('Login:', this.email());
    }
  }
}
