import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { SuccessStoriesService, SuccessStory } from '../../../core/services/success-stories.service';

// Ventes réussies : témoignages réels validés par un admin. Ne s'affiche pas tant qu'il n'y en a aucun.
@Component({
  selector: 'app-success-stories',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (stories().length > 0) {
      <section class="px-4 py-16 sm:px-6 lg:px-8 lg:py-20" [class]="background()" aria-labelledby="success-stories-title">
        <div class="mx-auto max-w-[1200px]">
          <h2 id="success-stories-title" class="text-3xl text-primary sm:text-4xl">Ils ont vendu leur entreprise</h2>
          <p class="mt-3 max-w-[60ch] text-[15px] leading-relaxed text-muted-foreground">
            {{ salesCount() }} vente{{ salesCount() > 1 ? 's' : '' }} conclue{{ salesCount() > 1 ? 's' : '' }} sur GoFounders. Témoignages et prix publiés avec l'accord des vendeurs.
          </p>
          <div class="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
            @for (story of stories(); track story.id) {
              <figure class="flex flex-col border-t-2 border-primary pt-5">
                <p class="text-sm text-muted-foreground">{{ story.sector }}, {{ story.region }}</p>
                <p class="font-display tabular mt-2 text-3xl font-semibold text-amber-600">{{ priceLabel(story) }}</p>
                @if (story.months_to_sell !== null) {
                  <p class="mt-1 text-sm text-muted-foreground">{{ delayLabel(story.months_to_sell) }}</p>
                }
                <blockquote class="mt-4 flex-1 text-[15px] leading-relaxed text-foreground/85">« {{ story.quote }} »</blockquote>
                <figcaption class="mt-4 text-sm font-semibold text-primary">{{ story.author_label }}</figcaption>
              </figure>
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
