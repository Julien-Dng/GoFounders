import { animate, style, transition, trigger } from '@angular/animations';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
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
    <div class="min-h-screen" [@routeFade]="routeAnimationState(outlet)">
      <router-outlet #outlet="outlet" />
    </div>
  `
})
export class AppComponent {
  protected routeAnimationState(outlet: RouterOutlet): string {
    if (!outlet.isActivated) {
      return 'app-root-idle';
    }

    return outlet.activatedRoute?.snapshot.url.map(segment => segment.path).join('/') || 'app-root';
  }
}
