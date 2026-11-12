import { ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, OnInit, computed, inject, input, signal, viewChild } from '@angular/core';
import { SuccessStoriesService, SuccessStory } from '../../../core/services/success-stories.service';

// Ventes réussies : témoignages réels validés par un admin, en bandeau horizontal qui défile en boucle.
// Ne s'affiche pas tant qu'il n'y en a aucun.
@Component({
  selector: 'app-success-stories',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (stories().length > 0) {
      <section class="overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20" [class]="background()" aria-labelledby="success-stories-title">
        <div class="mx-auto max-w-[78rem]">
          <div>
            <h2 id="success-stories-title" class="text-center text-3xl text-primary sm:text-4xl">Ce que pensent nos membres</h2>
          </div>

          <!-- Boucle infinie : les avis défilent en continu (liste répétée, sans retour visible au début).
               Défilement à la main possible (doigt, trackpad) ; pause au survol ou au toucher. -->
          <div
            #track
            class="scrollbar-none -mx-4 mt-6 flex gap-4 overflow-x-auto px-4 pb-6 pt-2 sm:mt-8 sm:gap-6"
            tabindex="0"
            role="region"
            aria-label="Témoignages de vendeurs, faire défiler horizontalement"
            (scroll)="wrap()"
            (mouseenter)="pause()"
            (mouseleave)="resume(0)"
            (focusin)="pause()"
            (focusout)="resume(0)"
            (touchstart)="pause()"
            (touchend)="resume(1500)"
          >
            @for (item of loop(); track $index) {
              <figure
                class="lift flex w-[85%] flex-shrink-0 flex-col rounded-2xl bg-white p-6 shadow-lg ring-1 ring-border hover:shadow-xl sm:w-[23rem] sm:p-7"
                [attr.aria-hidden]="item.copy ? 'true' : null"
              >
                <div class="flex items-start justify-between gap-3">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" class="text-accent/25" aria-hidden="true"><path d="M9.6 6C6.5 7.3 4.5 10 4.5 13.4V18h5.6v-5.6H7.4c.1-2 1.2-3.5 3.2-4.4L9.6 6zm9 0c-3.1 1.3-5.1 4-5.1 7.4V18h5.6v-5.6h-2.7c.1-2 1.2-3.5 3.2-4.4L18.6 6z"/></svg>
                  <span class="tabular rounded-full bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700">{{ priceLabel(item.story) }}</span>
                </div>
                <blockquote class="mt-3 flex-1 text-base leading-relaxed text-foreground/85">« {{ item.story.quote }} »</blockquote>
                <figcaption class="mt-6 flex items-center gap-3 border-t border-border pt-4">
                  <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white" aria-hidden="true">{{ item.story.author_label.charAt(0) }}</span>
                  <span class="min-w-0">
                    <span class="block font-semibold leading-snug text-primary">{{ item.story.author_label }}</span>
                    <span class="mt-0.5 block text-sm text-muted-foreground">
                      {{ item.story.sector }}, {{ item.story.region }}@if (item.story.months_to_sell !== null) { · {{ delayLabel(item.story.months_to_sell) }}}
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
  private readonly zone = inject(NgZone);

  readonly limit = input(6);
  readonly background = input('bg-white');
  readonly stories = signal<SuccessStory[]>([]);

  // Liste répétée pour la boucle : assez de copies pour couvrir l'écran ; les copies sont ignorées
  // par les lecteurs d'écran.
  readonly loop = computed(() => {
    const stories = this.stories();
    if (stories.length < 2) {
      return stories.map(story => ({ story, copy: false }));
    }

    const copies = stories.length < 4 ? 4 : 2;
    return Array.from({ length: copies }, (_, copy) => stories.map(story => ({ story, copy: copy > 0 }))).flat();
  });

  private readonly track = viewChild<ElementRef<HTMLElement>>('track');
  private frame = 0;
  private resumeTimer: ReturnType<typeof setTimeout> | undefined;
  private paused = false;
  private position = 0;
  private lastTime = 0;
  // Vitesse du défilement automatique, en pixels par seconde.
  private readonly speed = 35;

  ngOnInit(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.frame);
    clearTimeout(this.resumeTimer);
  }

  // Ramène le défilement dans la première copie dès qu'il en sort : la boucle ne se voit pas.
  // Le défilement automatique gère lui-même la boucle ; ceci couvre le défilement à la main.
  wrap(): void {
    const track = this.track()?.nativeElement;
    const period = this.period();
    if (!track || period <= 0 || !this.paused) {
      return;
    }

    if (track.scrollLeft >= period) {
      track.scrollLeft -= period;
    } else if (track.scrollLeft <= 0) {
      track.scrollLeft += period;
    }

    this.position = track.scrollLeft;
  }

  pause(): void {
    clearTimeout(this.resumeTimer);
    this.paused = true;
  }

  resume(delay: number): void {
    clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => {
      this.position = this.track()?.nativeElement.scrollLeft ?? this.position;
      this.paused = false;
    }, delay);
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

  // Largeur d'une copie de la liste (distance entre le premier avis et sa première copie).
  private period(): number {
    const track = this.track()?.nativeElement;
    const count = this.stories().length;
    const cards = track?.children;
    if (!track || !cards || cards.length <= count) {
      return 0;
    }

    return (cards[count] as HTMLElement).offsetLeft - (cards[0] as HTMLElement).offsetLeft;
  }

  private startAutoplay(): void {
    const reduced = typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || this.stories().length < 2) {
      return;
    }

    // Hors de la détection de changements d'Angular : une image par rafraîchissement d'écran.
    this.zone.runOutsideAngular(() => {
      const tick = (time: number) => {
        const track = this.track()?.nativeElement;
        const elapsed = this.lastTime ? Math.min(time - this.lastTime, 100) : 0;
        this.lastTime = time;

        if (track && !this.paused) {
          const period = this.period();
          this.position += (this.speed * elapsed) / 1000;
          if (period > 0 && this.position >= period) {
            this.position -= period;
          }
          track.scrollLeft = this.position;
        }

        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    });
  }
}
