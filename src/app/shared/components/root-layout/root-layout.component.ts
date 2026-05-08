import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-root-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, NavbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-navbar />

    @if (auth.isAuthenticated()) {
      <a
        routerLink="/dashboard"
        class="fixed top-24 left-6 z-40 p-2.5 rounded-full bg-black/15 backdrop-blur-md text-white shadow-[0_4px_16px_rgba(0,0,0,0.18)] ring-1 ring-white/20 hover:bg-black/25 transition-all"
        aria-label="Retour au dashboard"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
      </a>
    }

    <main>
      <router-outlet />
    </main>
  `
})
export class RootLayoutComponent {
  protected readonly auth = inject(AuthService);
}
