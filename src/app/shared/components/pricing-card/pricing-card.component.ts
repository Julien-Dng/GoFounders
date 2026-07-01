import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';

export interface PricingFeature {
  text: string;
  included: boolean;
}

@Component({
  selector: 'app-pricing-card',
  standalone: true,
  imports: [NgClass, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [ngClass]="cardClasses" class="relative rounded-2xl p-8 border-2 transition-all h-full flex flex-col hover:-translate-y-2 duration-300">
      @if (variant === 'premium') {
        <div class="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
          <div class="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-300/25 blur-3xl"></div>
          <div class="absolute -bottom-24 left-8 h-48 w-48 rounded-full bg-accent/20 blur-3xl"></div>
        </div>
        <div class="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/80 to-transparent"></div>
      }

      @if (badge) {
        <div class="absolute -top-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-accent shadow-[0_14px_22px_rgba(15,31,61,0.34),0_0_0_5px_rgba(255,255,255,0.42),0_0_34px_rgba(37,99,235,0.42)] ring-1 ring-accent/10">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m2 4 3 12h14l3-12-6 5-4-5-4 5-6-5z"/>
            <path d="M5 20h14"/>
          </svg>
          {{ badge }}
        </div>
      }

      <div class="relative z-10 mb-8">
        <div [ngClass]="labelClasses" class="mb-2 text-sm font-semibold opacity-90">{{ name }}</div>
        <div class="flex items-end gap-1 mb-2">
          <span [ngClass]="priceClasses" class="text-5xl font-bold">{{ price }}</span>
          <span class="text-lg opacity-70 mb-2">{{ period }}</span>
        </div>
        <p class="opacity-80">{{ description }}</p>

        @if (highlights.length > 0) {
          <div class="mt-5 flex flex-wrap gap-2">
            @for (highlight of highlights; track highlight) {
              <span [ngClass]="highlightClasses" class="rounded-full px-3 py-1 text-xs font-bold">
                {{ highlight }}
              </span>
            }
          </div>
        }
      </div>

      <div class="pricing-feature-panel relative z-10 mb-6 flex-1" [ngClass]="featurePanelClasses">
        <ul class="space-y-3">
          @for (feature of features; track $index) {
            <li class="flex items-start gap-3">
              @if (feature.included) {
                <svg class="mt-0.5 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              } @else {
                <svg class="mt-0.5 flex-shrink-0 opacity-30" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              }
              <span [class.opacity-50]="!feature.included">{{ feature.text }}</span>
            </li>
          }
        </ul>
      </div>

      <a [routerLink]="href" [ngClass]="buttonClasses" class="pricing-card-cta relative z-10 block w-full rounded-full py-4 text-center font-semibold transition-all hover:scale-105 active:scale-95">
        {{ cta }}
      </a>

      @if (reassurance) {
        <p [ngClass]="reassuranceClasses" class="relative z-10 mt-3 text-center text-xs font-semibold opacity-80">{{ reassurance }}</p>
      }

    </div>
  `,
  styles: [`
    .pricing-feature-panel {
      border-radius: 1.15rem;
      overflow: hidden;
    }
  `]
})
export class PricingCardComponent {
  @Input() name = '';
  @Input() price = '';
  @Input() period = '';
  @Input() description = '';
  @Input() badge = '';
  @Input() highlights: string[] = [];
  @Input() features: PricingFeature[] = [];
  @Input() cta = '';
  @Input() href = '/inscription';
  @Input() reassurance = '';
  @Input() variant: 'free' | 'pro' | 'premium' = 'free';

  get cardClasses(): Record<string, boolean> {
    return {
      'bg-accent border-accent shadow-2xl text-white scale-105': this.variant === 'pro',
      'bg-gradient-to-br from-[#0F1F3D] via-[#132C58] to-[#050B18] border-amber-300/50 shadow-[0_30px_80px_rgba(15,31,61,0.40),0_0_42px_rgba(251,191,36,0.14)] text-white': this.variant === 'premium',
      'bg-card border-border shadow-lg': this.variant === 'free',
    };
  }

  get buttonClasses(): Record<string, boolean> {
    return {
      'pricing-card-cta-pro': this.variant === 'pro',
      'pricing-card-cta-premium': this.variant === 'premium',
      'pricing-card-cta-free': this.variant === 'free',
    };
  }

  get highlightClasses(): Record<string, boolean> {
    return {
      'bg-white/20 text-white ring-1 ring-white/25': this.variant === 'pro',
      'bg-amber-300/15 text-amber-50 ring-1 ring-amber-200/25': this.variant === 'premium',
      'bg-accent/10 text-accent ring-1 ring-accent/10': this.variant === 'free',
    };
  }

  get featurePanelClasses(): Record<string, boolean> {
    return {
      'mx-auto w-full max-w-[24rem] bg-white/10 p-5 text-white shadow-inner ring-1 ring-white/15': this.variant === 'pro',
      'bg-white/[0.055] p-4 text-white shadow-inner ring-1 ring-amber-200/15': this.variant === 'premium',
    };
  }

  get labelClasses(): Record<string, boolean> {
    return {
      'text-amber-100': this.variant === 'premium',
    };
  }

  get priceClasses(): Record<string, boolean> {
    return {
      'bg-gradient-to-r from-white via-amber-100 to-amber-300 bg-clip-text text-transparent drop-shadow-[0_10px_24px_rgba(251,191,36,0.12)]': this.variant === 'premium',
    };
  }

  get reassuranceClasses(): Record<string, boolean> {
    return {
      'text-amber-100': this.variant === 'premium',
    };
  }
}
