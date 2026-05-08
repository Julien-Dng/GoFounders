import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface MaCardData {
  id: string;
  sector: string;
  region: string;
  type: string;
  revenue: string;
  margin: string;
  age: string;
  priceRange: string;
  locked: boolean;
}

@Component({
  selector: 'app-ma-card',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-card rounded-2xl border border-border p-6 shadow-sm hover:shadow-lg transition-all duration-200 relative overflow-hidden">
      @if (card.locked) {
        <div class="absolute inset-0 bg-background/70 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
          <div class="text-center">
            <svg class="mx-auto mb-2" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            <p class="text-sm font-semibold">Accès one-shot 149€</p>
          </div>
        </div>
      }

      <div class="flex items-center justify-between mb-4">
        <span class="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase">{{ card.sector }}</span>
        <span class="text-xs text-muted-foreground">{{ card.region }}</span>
      </div>

      <div class="grid grid-cols-3 gap-3 mb-4">
        <div class="text-center p-2 bg-secondary rounded-lg">
          <div class="text-sm font-bold">{{ card.revenue }}</div>
          <div class="text-xs text-muted-foreground">CA annuel</div>
        </div>
        <div class="text-center p-2 bg-secondary rounded-lg">
          <div class="text-sm font-bold">{{ card.margin }}</div>
          <div class="text-xs text-muted-foreground">Marge</div>
        </div>
        <div class="text-center p-2 bg-secondary rounded-lg">
          <div class="text-sm font-bold">{{ card.age }}</div>
          <div class="text-xs text-muted-foreground">Ancienneté</div>
        </div>
      </div>

      <div class="flex items-center justify-between">
        <span class="text-lg font-bold text-amber-600">{{ card.priceRange }}</span>
        <a
          [routerLink]="['/ma/annonce', card.id]"
          class="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition-colors"
        >
          Voir l'annonce
        </a>
      </div>
    </div>
  `
})
export class MaCardComponent {
  @Input({ required: true }) card!: MaCardData;
}
