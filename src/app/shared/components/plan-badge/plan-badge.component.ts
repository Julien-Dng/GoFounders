import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { Plan } from '../../../core/models/user.model';

@Component({
  selector: 'app-plan-badge',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
      [ngClass]="{
        'bg-muted text-muted-foreground': plan === 'FREE',
        'bg-accent/10 text-accent': plan === 'PRO',
        'bg-primary text-white': plan === 'PREMIUM'
      }"
    >
      @if (plan !== 'FREE') {
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m2 4 3 12h14l3-12-6 5-4-5-4 5-6-5z"/>
          <path d="M5 20h14"/>
        </svg>
      }
      {{ plan }}
    </span>
  `
})
export class PlanBadgeComponent {
  @Input({ required: true }) plan!: Plan;
}
