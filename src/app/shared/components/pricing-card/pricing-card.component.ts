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

      @if (badge) {
        <div class="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white text-accent rounded-full text-sm font-semibold shadow-lg flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m2 4 3 12h14l3-12-6 5-4-5-4 5-6-5z"/>
            <path d="M5 20h14"/>
          </svg>
          {{ badge }}
        </div>
      }

      <div class="mb-8">
        <div class="text-sm font-semibold mb-2 opacity-90">{{ name }}</div>
        <div class="flex items-end gap-1 mb-2">
          <span class="text-5xl font-bold">{{ price }}</span>
          <span class="text-lg opacity-70 mb-2">{{ period }}</span>
        </div>
        <p class="opacity-80">{{ description }}</p>
      </div>

      <div class="flex-1 mb-8">
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

      <a [routerLink]="href" [ngClass]="buttonClasses" class="pricing-card-cta block w-full rounded-full py-4 text-center font-semibold transition-all hover:scale-105 active:scale-95">
        {{ cta }}
      </a>

    </div>
  `
})
export class PricingCardComponent {
  @Input() name = '';
  @Input() price = '';
  @Input() period = '';
  @Input() description = '';
  @Input() badge = '';
  @Input() features: PricingFeature[] = [];
  @Input() cta = '';
  @Input() href = '/inscription';
  @Input() variant: 'free' | 'pro' | 'premium' = 'free';

  get cardClasses(): Record<string, boolean> {
    return {
      'bg-accent border-accent shadow-2xl text-white scale-105': this.variant === 'pro',
      'bg-primary border-primary shadow-lg text-white': this.variant === 'premium',
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
}
