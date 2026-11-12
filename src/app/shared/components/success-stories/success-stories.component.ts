import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, inject, input, signal, viewChild } from '@angular/core';
import { SuccessStoriesService, SuccessStory } from '../../../core/services/success-stories.service';

// Ventes réussies : témoignages réels validés par un admin, en carrousel horizontal qui avance seul.
// Ne s'affiche pas tant qu'il n'y en a aucun.
@Component({
  selector: 'app-success-stories',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (stories().length > 0) {
      <section class="overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20" [class]="background()" aria-labelledby="success-stories-title">
        <div class="mx-auto max-w-[78rem]">
          <div class="flex items-center justify-between gap-6">
            <h2 id="success-stories-title" class="text-3xl text-primary sm:text-4xl">Ce que pensent nos membres</h2>
          </div>

          <!-- Défilement horizontal (doigt, trackpad, flèches) ; avance seul toutes les 5 s, en pause au survol ou au toucher. -->
          <div
            #track
            class="scrollbar-none -mx-4 mt-6 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto scroll-smooth px-4 pb-6 pt-2 sm:-mx-4 sm:mt-8 sm:gap-6"
            tabindex="0"
            role="region"
            aria-label="Témoignages de vendeurs, faire défiler horizontalement"
            (mouseenter)="pause()"
            (mouseleave)="resume()"
            (focusin)="pause()"
            (focusout)="resume()"
            (touchstart)="pause()"
            (touchend)="resume()"
          >
            @for (story of stories(); track story.id) {
              <figure class="lift flex w-[85%] flex-shrink-0 snap-start flex-col rounded-2xl bg-white p-6 shadow-lg ring-1 ring-border hover:shadow-xl sm:w-[23rem] sm:p-7">
                <div class="flex items-start justify-between gap-3">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" class="text-accent/25" aria-hidden="true"><path d="M9.6 6C6.5 7.3 4.5 10 4.5 13.4V18h5.6v-5.6H7.4c.1-2 1.2-3.5 3.2-4.4L9.6 6zm9 0c-3.1 1.3-5.1 4-5.1 7.4V18h5.6v-5.6h-2.7c.1-2 1.2-3.5 3.2-4.4L18.6 6z"/></svg>
                  <span class="tabular rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">{{ priceLabel(story) }}</span>
                </div>
                <blockquote class="mt-3 flex-1 text-base leading-relaxed text-foreground/85">« {{ story.quote }} »</blockquote>
                <figcaption class="mt-6 flex items-center gap-3 border-t border-border pt-4">
                  <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white" aria-hidden="true">{{ story.author_label.charAt(0) }}</span>
                  <span class="min-w-0">
                    <span class="block font-semibold leading-snug text-primary">{{ story.author_label }}</span>
                    <span class="mt-0.5 block text-sm text-muted-foreground">
                      {{ story.sector }}, {{ story.region }}@if (story.months_to_sell !== null) { · {{ delayLabel(story.months_to_sell) }}}
                    </span>
                  </span>
                </figcaption>
              </figure>
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class SuccessStoriesComponent implements OnInit, OnDestroy {
  private readonly service = inject(SuccessStoriesService);

  readonly limit = input(6);
  readonly background = input('bg-white');
  readonly stories = signal<SuccessStory[]>([]);
  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private timer: ReturnType<typeof setInterval> | undefined;
  private paused = false;

  ngOnInit(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  // Avance (1) ou recule (-1) d'une carte ; revient au début après la dernière.
  step(direction: 1 | -1): void {
    const track = this.track()?.nativeElement;
    const card = track?.firstElementChild as HTMLElement | null;
    if (!track || !card) {
      return;
    }

    const distance = card.offsetWidth + parseFloat(getComputedStyle(track).columnGap || '0');
    const atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
    const atStart = track.scrollLeft <= 8;

    if (direction === 1 && atEnd) {
      track.scrollTo({ left: 0 });
    } else if (direction === -1 && atStart) {
      track.scrollTo({ left: track.scrollWidth });
    } else {
      track.scrollBy({ left: direction * distance });
    }
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  priceLabel(story: SuccessStory): string {
    if (story.price_exact !== null) {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(story.price_exact);
    }

    return story.price_range ?? 'Confidentiel';
  }

  delayLabel(months: number): string {
    return months < 1 ? 'Vendue en moins d’un mois' : `Vendue en ${months} mois`;
  }

  private async load(): Promise<void> {
    this.stories.set(await this.service.list(this.limit()));
    this.startAutoplay();
  }

  private startAutoplay(): void {
    const reduced = typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || this.stories().length < 2) {
      return;
    }

    clearInterval(this.timer);
    this.timer = setInterval(() => {
      const track = this.track()?.nativeElement;
      if (!this.paused && track && track.scrollWidth > track.clientWidth + 8) {
        this.step(1);
      }
    }, 5000);
  }
}
