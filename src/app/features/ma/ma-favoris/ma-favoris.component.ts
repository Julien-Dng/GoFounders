import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaListingData } from '../../../core/data/mock-platform.data';
import { FavoritesService } from '../../../core/services/favorites.service';
import { MaService } from '../../../core/services/ma.service';
import { FavoriteButtonComponent } from '../../../shared/components/favorite-button/favorite-button.component';
import { MesEntreprisesTabsComponent } from '../../../shared/components/mes-entreprises-tabs/mes-entreprises-tabs.component';
import { VerifiedBadgeComponent } from '../../../shared/components/verified-badge/verified-badge.component';

// « Mes entreprises > Favoris » : les entreprises mises de côté, du plus récent au plus ancien. Seules les annonces encore en
// ligne s'affichent ; le cédant ne sait pas qui suit son annonce (supabase/2026-11-16-favoris.sql).
@Component({
  selector: 'app-ma-favoris',
  standalone: true,
  imports: [RouterLink, FavoriteButtonComponent, VerifiedBadgeComponent, MesEntreprisesTabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-4xl">
        <app-mes-entreprises-tabs />
        <p class="mb-6 mt-5 text-muted-foreground">Les entreprises que vous avez mises de côté. Le cédant ne sait pas que vous suivez son annonce</p>

        @if (!loaded()) {
          <p class="py-16 text-center text-muted-foreground" role="status">Chargement…</p>
        } @else if (items().length === 0) {
          <div class="rounded-2xl bg-white p-10 text-center shadow-lg ring-1 ring-border">
            <h2 class="text-2xl text-primary">Aucune entreprise en favori</h2>
            <p class="mx-auto mt-3 max-w-[48ch] text-base leading-relaxed text-muted-foreground">
              Touchez le cœur sur une annonce pour la retrouver ici et comparer plus tard
            </p>
            <a routerLink="/ma" class="mt-6 inline-block rounded-lg bg-accent px-6 py-3.5 font-semibold text-white transition-colors hover:bg-accent/90">Explorer les entreprises</a>
          </div>
        } @else {
          <p class="mb-3 text-sm text-muted-foreground" role="status">{{ items().length }} entreprise{{ items().length > 1 ? 's' : '' }}</p>
          <ul class="space-y-3">
            @for (item of items(); track item.id) {
              <li class="group relative flex items-start gap-4 rounded-2xl bg-white p-5 shadow-md ring-1 ring-border transition-shadow hover:shadow-lg">
                <div class="min-w-0 flex-1">
                  <p class="text-sm text-muted-foreground">{{ item.sector }} · {{ item.region }}</p>
                  <h2 class="mt-1 text-lg font-bold leading-snug text-primary group-hover:text-accent">
                    <a [routerLink]="['/ma/annonce', item.id]" class="after:absolute after:inset-0 after:rounded-2xl focus:outline-none focus-visible:underline">{{ item.title || item.sector + ', ' + item.region }}</a>
                    @if (item.verified) { <app-verified-badge [size]="20" class="ml-1" /> }
                  </h2>
                  <p class="tabular mt-2 text-sm text-muted-foreground">
                    CA {{ item.revenue }} · Prix <span class="font-semibold text-amber-600">{{ item.priceMin }} à {{ item.priceMax }}</span>
                  </p>
                </div>
                <app-favorite-button [listingId]="item.id" [label]="item.title || item.sector" />
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class MaFavorisComponent implements OnInit {
  private readonly favorites = inject(FavoritesService);
  private readonly ma = inject(MaService);

  private readonly cards = signal<MaListingData[]>([]);
  readonly loaded = signal(false);
  // Ordre des favoris ; une annonce retirée des favoris disparaît aussitôt de la liste.
  readonly items = computed(() => {
    const byId = new Map(this.cards().map(card => [card.id, card]));
    return this.favorites.orderedIds().map(id => byId.get(id)).filter((card): card is MaListingData => !!card);
  });

  async ngOnInit(): Promise<void> {
    const [cards] = await Promise.all([this.ma.getListingCards(), this.favorites.ensureLoaded()]);
    this.cards.set(cards);
    this.loaded.set(true);
  }
}
