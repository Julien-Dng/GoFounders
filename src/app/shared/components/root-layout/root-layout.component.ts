import { animate, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';

@Component({
  selector: 'app-root-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent],
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
    <app-navbar />

    <main [@routeFade]="routeAnimationState(outlet)">
      <router-outlet #outlet="outlet" />
    </main>
  `
})
export class RootLayoutComponent {
  protected routeAnimationState(outlet: RouterOutlet): string {
    if (!outlet.isActivated) {
      return 'root-idle';
    }

    return outlet.activatedRoute?.snapshot.url.map(segment => segment.path).join('/') || 'root-home';
  }
}
