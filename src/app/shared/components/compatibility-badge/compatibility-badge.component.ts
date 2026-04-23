import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-compatibility-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/10 text-accent rounded-full">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
      </svg>
      <span class="text-sm font-bold">{{ score }}% compatible</span>
    </div>
  `
})
export class CompatibilityBadgeComponent {
  @Input({ required: true }) score!: number;
}
