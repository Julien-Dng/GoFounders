import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { SuccessStoriesService, SuccessStory } from '../../../core/services/success-stories.service';

// Ventes réussies : témoignages réels validés par un admin. Ne s'affiche pas tant qu'il n'y en a aucun.
@Component({
  selector: 'app-success-stories',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (stories().length > 0) {
      <section class="px-4 py-16 sm:px-6 lg:px-8" [class]="background()" aria-labelledby="success-stories-title">
        <div class="mx-auto max-w-[1200px]">
          <div class="mb-10 text-center">
            <h2 id="success-stories-title" class="text-3xl font-bold text-primary sm:text-4xl">Ils ont vendu sur GoFounders</h2>
            <p class="mt-3 text-muted-foreground">
              {{ salesCount() }} vente{{ salesCount() > 1 ? 's' : '' }} conclue{{ salesCount() > 1 ? 's' : '' }} sur la plateforme. Témoignages et prix publiés avec l'accord des vendeurs.
            </p>
          </div>
          <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            @for (story of stories(); track story.id) {
              <article class="flex flex-col rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Vendue</span>
                  <span class="text-sm font-semibold text-foreground">{{ story.sector }} · {{ story.region }}</span>
                </div>
                <div class="mt-4">
                  <div class="text-xs font-semibold uppercase text-muted-foreground">Prix de vente</div>
                  <div class="mt-1 text-2xl font-bold text-amber-600">{{ priceLabel(story) }}</div>
                  @if (story.months_to_sell !== null) {
                    <div class="mt-1 text-xs text-muted-foreground">{{ delayLabel(story.months_to_sell) }}</div>
                  }
                </div>
                <blockquote class="mt-4 flex-1 text-sm italic leading-relaxed text-foreground/80">« {{ story.quote }} »</blockquote>
                <p class="mt-4 text-sm font-semibold text-primary">{{ story.author_label }}</p>
              </article>
            }
          </div>
        </div>
      </section>
    }
  `,
})
export class SuccessStoriesComponent implements OnInit {
  private readonly service = inject(SuccessStoriesService);

  readonly limit = input(6);
  readonly background = input('bg-white');
  readonly stories = signal<SuccessStory[]>([]);
  readonly salesCount = signal(0);

  ngOnInit(): void {
    void this.load();
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
    const [stories, count] = await Promise.all([this.service.list(this.limit()), this.service.countCompletedSales()]);
    this.stories.set(stories);
    this.salesCount.set(Math.max(count, stories.length));
  }
}
