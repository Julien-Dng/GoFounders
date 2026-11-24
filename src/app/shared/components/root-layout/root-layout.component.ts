import { animate, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { isMemberAreaUrl } from '../../../core/config/member-area';
import { AuthService } from '../../../core/services/auth.service';
import { MemberShellComponent } from '../member-shell/member-shell.component';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-root-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, MemberShellComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('routeFade', [
      transition('* <=> *', [
        style({ opacity: 0, transform: 'translateY(6px)' }),
        animate('180ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <!-- Espace membre : bandeau bleu à gauche ; pages publiques : barre du haut (même connecté). -->
    @if (inMemberArea()) {
      <app-member-shell />
    } @else {
      <app-navbar />
    }

    <main [@routeFade]="routeAnimationState(outlet)" [class]="inMemberArea() ? 'lg:pl-64' : ''">
      <router-outlet #outlet="outlet" />
    </main>
  `
})
export class RootLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd), map(event => event.urlAfterRedirects)),
    { initialValue: this.router.url },
  );
  readonly inMemberArea = computed(() => this.auth.isAuthenticated() && isMemberAreaUrl(this.url()));

  protected routeAnimationState(outlet: RouterOutlet): string {
    if (!outlet.isActivated) {
      return 'root-idle';
    }

    return outlet.activatedRoute?.snapshot.url.map(segment => segment.path).join('/') || 'root-home';
  }
}
