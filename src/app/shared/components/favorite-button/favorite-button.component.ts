import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FavoriteKind, FavoritesService } from '../../../core/services/favorites.service';

// Cœur « Ajouter aux favoris ». Placé au-dessus du lien qui couvre une carte (relative z-10).
@Component({
  selector: 'app-favorite-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="button" (click)="toggle($event)" [attr.aria-pressed]="active()"
            [attr.aria-label]="active() ? 'Retirer « ' + label() + ' » de mes favoris' : 'Ajouter « ' + label() + ' » à mes favoris'"
            [title]="active() ? 'Retirer de mes favoris' : 'Ajouter à mes favoris'"
            class="relative z-10 inline-flex items-center gap-2 rounded-full border bg-white font-semibold transition-colors disabled:opacity-60"
            [class]="(active() ? 'border-rose-200 text-rose-600 hover:bg-rose-50' : 'border-border text-primary/70 hover:border-rose-200 hover:text-rose-600')
                     + (withText() ? ' px-4 py-2 text-sm' : ' h-10 w-10 justify-center')"
            [disabled]="busy()">
      <svg width="20" height="20" viewBox="0 0 24 24" [attr.fill]="active() ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.8 1.3-1.7 2.9-2.8 4.9-2.8 3.5 0 5.6 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"/>
      </svg>
      @if (withText()) {
        <span>{{ active() ? 'Dans mes favoris' : 'Ajouter aux favoris' }}</span>
      }
    </button>
    @if (error()) {
      <span class="sr-only" role="alert">{{ error() }}</span>
    }
  `,
})
export class FavoriteButtonComponent implements OnInit {
  private readonly favorites = inject(FavoritesService);

  // Identifiant de l'élément : annonce, projet ou profil d'associé selon kind.
  readonly listingId = input.required<string>();
  readonly kind = input<FavoriteKind>('listing');
  readonly label = input('cet élément');
  readonly withText = input(false);

  readonly busy = signal(false);
  readonly error = signal('');
  readonly active = computed(() => this.favorites.isFavorite(this.listingId(), this.kind()));

  ngOnInit(): void {
    void this.favorites.ensureLoaded();
  }

  async toggle(event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.busy.set(true);
    try {
      const result = await this.favorites.toggle(this.listingId(), this.kind());
      this.error.set(result.success ? '' : result.message);
    } finally {
      this.busy.set(false);
    }
  }
}
