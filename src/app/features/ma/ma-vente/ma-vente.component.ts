import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { MaListing } from '../../../core/models/ma-listing.model';
import { MaService } from '../../../core/services/ma.service';
import { MySuccessStory, PriceDisplay, SuccessStoriesService } from '../../../core/services/success-stories.service';

const RANGES: Array<[number, string]> = [
  [50000, 'Moins de 50 k€'],
  [100000, '50 à 100 k€'],
  [250000, '100 à 250 k€'],
  [500000, '250 à 500 k€'],
  [1000000, '500 k€ à 1 M€'],
];

// « J'ai vendu » : le vendeur déclare la vente et propose un témoignage (publié après validation d'un admin).
@Component({
  selector: 'app-ma-vente',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-3xl">
        <a routerLink="/ma/statistiques" class="text-sm font-semibold text-accent hover:underline">← Mes statistiques</a>
        <h1 class="mt-3 text-3xl font-bold text-primary sm:text-4xl">J'ai vendu mon entreprise</h1>

        @if (isLoading()) {
          <p class="mt-6 text-muted-foreground">Chargement…</p>
        } @else if (!listing()) {
          <div class="mt-6 rounded-2xl border border-border bg-white p-10 text-center text-muted-foreground">Annonce introuvable.</div>
        } @else if (existing()) {
          <div class="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <p class="font-semibold">{{ listing()!.sector }} · {{ listing()!.region }}</p>
            <p class="mt-2 text-sm text-foreground/80">{{ statusLabel(existing()!) }}</p>
            @if (existing()!.admin_note && existing()!.status === 'rejected') {
              <p class="mt-2 text-sm text-destructive">Motif : {{ existing()!.admin_note }}</p>
            }
            <button type="button" (click)="remove(existing()!)" [disabled]="busy()" class="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-destructive hover:text-destructive disabled:opacity-50">Retirer mon témoignage</button>
          </div>
        } @else if (done()) {
          <div class="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900" role="status">{{ message() }}</div>
        } @else {
          <p class="mt-2 text-muted-foreground">
            Félicitations ! Votre annonce « {{ listing()!.sector }} · {{ listing()!.region }} » passera en « vendue ».
            Votre témoignage aide les prochains cédants et repreneurs à faire confiance à la plateforme.
          </p>

          <section class="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <label class="block text-sm font-semibold" for="sale-price">Prix de vente final (€)</label>
            <input id="sale-price" type="number" min="1" step="1000" inputmode="numeric" [value]="salePrice() ?? ''" (input)="onPrice($event)" class="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-accent" placeholder="Ex. 180000">

            <fieldset class="mt-5">
              <legend class="text-sm font-semibold">Affichage du prix dans le témoignage</legend>
              <div class="mt-2 space-y-2">
                @for (option of displayOptions; track option.value) {
                  <label class="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3 text-sm" [class.border-accent]="priceDisplay() === option.value">
                    <input type="radio" name="price-display" class="mt-0.5" [checked]="priceDisplay() === option.value" (change)="priceDisplay.set(option.value)">
                    <span><span class="font-semibold">{{ option.label }}</span><br><span class="text-muted-foreground">{{ option.help }}</span></span>
                  </label>
                }
              </div>
            </fieldset>

            <label class="mt-5 block text-sm font-semibold" for="story-quote">Votre témoignage</label>
            <textarea id="story-quote" rows="4" maxlength="600" [value]="quote()" (input)="quote.set($any($event.target).value)" class="mt-1 w-full resize-y rounded-lg border border-border px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Comment s'est passée la vente ? Combien de repreneurs, en combien de temps, ce qui vous a aidé…"></textarea>
            <p class="mt-1 text-xs text-muted-foreground">{{ quote().trim().length }} / 600 caractères (20 minimum). Ne citez ni le nom de l'entreprise ni celui du repreneur.</p>

            <label class="mt-5 block text-sm font-semibold" for="story-author">Signature</label>
            <input id="story-author" type="text" maxlength="60" [value]="authorLabel()" (input)="authorLabel.set($any($event.target).value)" class="mt-1 w-full rounded-lg border border-border px-3 py-2.5 text-sm outline-none focus:border-accent" placeholder="Ex. Julie, fondatrice d'une boutique en ligne">

            <div class="mt-6 rounded-xl bg-secondary/60 p-4">
              <div class="text-xs font-semibold uppercase text-muted-foreground">Aperçu</div>
              <div class="mt-2 text-sm font-semibold">{{ listing()!.sector }} · {{ listing()!.region }}</div>
              <div class="mt-1 text-xl font-bold text-amber-600">{{ previewPrice() }}</div>
              <p class="mt-2 text-sm italic text-foreground/80">« {{ quote().trim() || 'Votre témoignage' }} »</p>
              <p class="mt-2 text-sm font-semibold text-primary">{{ authorLabel().trim() || 'Votre signature' }}</p>
            </div>

            <label class="mt-5 flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" class="mt-0.5" [checked]="consent()" (change)="consent.set(!consent())">
              <span>J'accepte que GoFounders publie ce témoignage, avec le prix selon mon choix, le secteur et la région de l'annonce. Je peux le retirer à tout moment.</span>
            </label>

            @if (message() && !done()) {
              <p class="mt-4 text-sm text-destructive" role="alert">{{ message() }}</p>
            }

            <button type="button" (click)="submit()" [disabled]="!canSubmit() || busy()" class="mt-5 w-full rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50">
              Déclarer la vente
            </button>
          </section>
        }
      </div>
    </div>
  `,
})
export class MaVenteComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly maService = inject(MaService);
  private readonly stories = inject(SuccessStoriesService);

  private readonly listingId = toSignal(this.route.params.pipe(map((params: Record<string, string>) => params['id'] ?? '')), { initialValue: '' });

  readonly displayOptions: Array<{ value: PriceDisplay; label: string; help: string }> = [
    { value: 'range', label: 'Une fourchette', help: 'Ex. « 100 à 250 k€ ». Le prix exact reste privé.' },
    { value: 'exact', label: 'Le prix exact', help: 'Le plus convaincant pour les futurs cédants.' },
    { value: 'hidden', label: 'Ne pas afficher le prix', help: 'Le témoignage indique « Confidentiel ».' },
  ];

  readonly listing = signal<MaListing | null>(null);
  readonly existing = signal<MySuccessStory | null>(null);
  readonly isLoading = signal(true);
  readonly salePrice = signal<number | null>(null);
  readonly priceDisplay = signal<PriceDisplay>('range');
  readonly quote = signal('');
  readonly authorLabel = signal('');
  readonly consent = signal(false);
  readonly busy = signal(false);
  readonly done = signal(false);
  readonly message = signal('');

  readonly canSubmit = computed(() =>
    (this.salePrice() ?? 0) > 0 && this.quote().trim().length >= 20 && this.authorLabel().trim().length >= 2 && this.consent()
  );
  readonly previewPrice = computed(() => {
    const price = this.salePrice();

    if (!price || this.priceDisplay() === 'hidden') {
      return 'Confidentiel';
    }

    if (this.priceDisplay() === 'exact') {
      return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(price);
    }

    return RANGES.find(([limit]) => price < limit)?.[1] ?? 'Plus de 1 M€';
  });

  ngOnInit(): void {
    void this.load();
  }

  onPrice(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.salePrice.set(Number.isFinite(value) && value > 0 ? value : null);
  }

  statusLabel(story: MySuccessStory): string {
    switch (story.status) {
      case 'approved':
        return 'Votre témoignage est publié dans les ventes réussies.';
      case 'rejected':
        return "Votre témoignage n'a pas été publié.";
      default:
        return "Vente déclarée. Votre témoignage est en cours de relecture par l'équipe.";
    }
  }

  async submit(): Promise<void> {
    const price = this.salePrice();

    if (!this.canSubmit() || !price) {
      return;
    }

    this.busy.set(true);

    try {
      const result = await this.stories.submit({
        listingId: this.listingId(),
        salePrice: price,
        priceDisplay: this.priceDisplay(),
        quote: this.quote(),
        authorLabel: this.authorLabel(),
        consent: this.consent(),
      });
      this.message.set(result.message);
      this.done.set(result.success);
    } finally {
      this.busy.set(false);
    }
  }

  async remove(story: MySuccessStory): Promise<void> {
    this.busy.set(true);

    try {
      const result = await this.stories.deleteMine(story.id);

      if (result.success) {
        this.existing.set(null);
        this.done.set(true);
      }

      this.message.set(result.message);
    } finally {
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    const [listings, mine] = await Promise.all([this.maService.getMyListings(), this.stories.getMine()]);
    this.listing.set(listings.find(listing => listing.id === this.listingId()) ?? null);
    this.existing.set(mine.find(story => story.listing_id === this.listingId()) ?? null);
    this.isLoading.set(false);
  }
}
