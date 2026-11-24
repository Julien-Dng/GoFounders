import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OFFER_PRICES } from '../../../core/config/offers';
import { ListingAccessService, UnlockedListing } from '../../../core/services/listing-access.service';
import { MesEntreprisesTabsComponent } from '../../../shared/components/mes-entreprises-tabs/mes-entreprises-tabs.component';

// « Mes entreprises > Dossiers débloqués » : achats à l'unité (50 € par entreprise), distincts de l'offre FREE / PRO.
@Component({
  selector: 'app-ma-dossiers',
  standalone: true,
  imports: [RouterLink, MesEntreprisesTabsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-6xl">
        <app-mes-entreprises-tabs />
        <p class="mt-5 text-muted-foreground">
          Les entreprises dont vous avez ouvert le dossier complet et le contact du cédant ({{ introPrice }} par entreprise)
        </p>

        @if (!loaded()) {
          <p class="py-16 text-center text-muted-foreground" role="status">Chargement…</p>
        } @else if (items().length === 0) {
          <div class="mt-6 rounded-2xl bg-white p-10 text-center shadow-lg ring-1 ring-border">
            <h2 class="text-2xl text-primary">Aucun dossier débloqué</h2>
            <p class="mx-auto mt-3 max-w-[48ch] text-base leading-relaxed text-muted-foreground">
              Depuis la fiche d'une entreprise, acceptez l'engagement de confidentialité puis débloquez son dossier : il s'affichera ici
            </p>
            <a routerLink="/ma" class="mt-6 inline-block rounded-lg bg-accent px-6 py-3.5 font-semibold text-white transition-colors hover:bg-accent/90">Explorer les entreprises</a>
          </div>
        } @else {
          <ul class="mt-6 space-y-3">
            @for (item of items(); track item.listing_id) {
              <li>
                <a [routerLink]="['/ma/annonce', item.listing_id]" class="group flex items-center justify-between gap-4 rounded-2xl bg-white p-5 shadow-md ring-1 ring-border transition-shadow hover:shadow-lg">
                  <span class="min-w-0">
                    <span class="block text-sm text-muted-foreground">{{ item.sector }} · {{ item.region }}</span>
                    <span class="mt-1 block truncate text-lg font-bold text-primary group-hover:text-accent">{{ item.title }}</span>
                    <span class="mt-1 block text-sm text-muted-foreground">Débloqué le {{ formatDate(item.unlocked_at) }}@if (item.status === 'sold') { · vendue}</span>
                  </span>
                  <span class="flex-shrink-0 text-sm font-semibold text-accent">Ouvrir le dossier →</span>
                </a>
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class MaDossiersComponent implements OnInit {
  private readonly access = inject(ListingAccessService);
  readonly introPrice = OFFER_PRICES.INTRO.label;
  readonly items = signal<UnlockedListing[]>([]);
  readonly loaded = signal(false);

  async ngOnInit(): Promise<void> {
    this.items.set(await this.access.listMyUnlocked());
    this.loaded.set(true);
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }
}
