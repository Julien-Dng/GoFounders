import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ListingProduct, OFFER_PRICES } from '../../../core/config/offers';
import { MaListing } from '../../../core/models/ma-listing.model';
import { canPublishMa, isActiveUntil } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { MaService, VerificationRequest } from '../../../core/services/ma.service';
import { PaymentService } from '../../../core/services/payment.service';

// Annonces du vendeur (ou du cabinet avec un compte pro) : mise en avant et dossier vérifié.
@Component({
  selector: 'app-ma-mes-annonces',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-5xl">
        <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-primary sm:text-4xl">Mes annonces</h1>
            <p class="mt-2 text-muted-foreground">Donnez plus de visibilité et de crédibilité à vos annonces.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <a routerLink="/ma/statistiques" class="rounded-lg border border-border bg-white px-5 py-3 text-center text-sm font-semibold transition-colors hover:border-amber-500">Mes statistiques</a>
            @if (canPublish()) {
              <a routerLink="/ma/deposer" class="rounded-lg bg-amber-500 px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-amber-600">Déposer une annonce</a>
            }
          </div>
        </div>

        @if (message()) {
          <div class="mb-6 rounded-xl border px-5 py-4 text-sm" [class]="messageIsError() ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'" role="status">{{ message() }}</div>
        }

        @if (!canPublish()) {
          <div class="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <h2 class="mb-1 text-lg font-bold">Compte pro requis</h2>
            <p class="text-sm">Pour publier des annonces pour vos clients, activez un compte pro.</p>
            <a routerLink="/tarifs" fragment="pros" class="mt-3 inline-block text-sm font-semibold text-amber-700 hover:underline">Voir les offres professionnelles</a>
          </div>
        } @else if (isLoading()) {
          <p class="text-muted-foreground">Chargement…</p>
        } @else if (listings().length === 0) {
          <div class="rounded-2xl border border-border bg-white p-10 text-center">
            <p class="text-muted-foreground">Vous n'avez pas encore d'annonce.</p>
          </div>
        } @else {
          <ul class="space-y-6">
            @for (listing of listings(); track listing.id) {
              <li class="rounded-2xl border border-border bg-white p-6 shadow-sm">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <h2 class="text-lg font-bold">{{ listing.sector }} · {{ listing.region }}</h2>
                      @if (isFeatured(listing)) {
                        <span class="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-white">En vedette jusqu'au {{ formatDate(listing.featuredUntil!) }}</span>
                      }
                      @if (listing.verified) {
                        <span class="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-semibold text-white">Dossier vérifié</span>
                      }
                    </div>
                    <p class="mt-1 text-sm text-muted-foreground">{{ listing.description }}</p>
                  </div>
                  <a [routerLink]="['/ma/annonce', listing.id]" class="flex-shrink-0 text-sm font-semibold text-accent hover:underline">Voir l'annonce</a>
                </div>

                <div class="mt-5 grid gap-4 md:grid-cols-2">
                  <div class="rounded-xl bg-secondary/60 p-4">
                    <h3 class="font-semibold">Mise en avant</h3>
                    <p class="mt-1 text-xs text-muted-foreground">Votre annonce en tête de liste avec le badge « En vedette ».</p>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <button type="button" (click)="buy('FEATURE_7D', listing)" [disabled]="busy()" class="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold transition-colors hover:border-amber-500 disabled:opacity-50">7 jours · {{ prices.FEATURE_7D.amount }} €</button>
                      <button type="button" (click)="buy('FEATURE_30D', listing)" [disabled]="busy()" class="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50">30 jours · {{ prices.FEATURE_30D.amount }} €</button>
                    </div>
                  </div>

                  <div class="rounded-xl bg-secondary/60 p-4">
                    <h3 class="font-semibold">Dossier vérifié · {{ prices.VERIFICATION.amount }} €</h3>
                    @if (listing.verified) {
                      <p class="mt-1 text-sm text-emerald-700">Votre annonce affiche le badge « Dossier vérifié ».</p>
                    } @else if (pendingRequest(listing.id)) {
                      <p class="mt-1 text-sm text-foreground/80">Demande envoyée le {{ formatDate(pendingRequest(listing.id)!.created_at) }}, en cours d'examen par l'équipe.</p>
                    } @else {
                      @if (lastRejected(listing.id); as rejected) {
                        <p class="mt-1 text-xs text-destructive">Précédente demande non validée{{ rejected.admin_note ? ' : ' + rejected.admin_note : '.' }}</p>
                      }
                      <p class="mt-1 text-xs text-muted-foreground">
                        Indiquez où trouver vos justificatifs : captures de votre tableau de bord Stripe ou Shopify sur 12 mois, derniers bilans
                        (par exemple un lien de partage Drive). Un membre de l'équipe les contrôle sous 3 jours ouvrés.
                      </p>
                      <label class="sr-only" [attr.for]="'evidence-' + listing.id">Justificatifs</label>
                      <textarea
                        [id]="'evidence-' + listing.id"
                        rows="3"
                        maxlength="3000"
                        [value]="evidence()[listing.id] ?? ''"
                        (input)="setEvidence(listing.id, $any($event.target).value)"
                        class="mt-2 w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600"
                        placeholder="Lien vers vos justificatifs et précisions utiles"
                      ></textarea>
                      <button type="button" (click)="requestVerification(listing)" [disabled]="busy() || (evidence()[listing.id] ?? '').trim().length < 20" class="mt-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">
                        Demander la vérification
                      </button>
                    }
                  </div>
                </div>
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class MaMesAnnoncesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly maService = inject(MaService);
  private readonly payment = inject(PaymentService);

  readonly prices = OFFER_PRICES;
  readonly listings = signal<MaListing[]>([]);
  readonly requests = signal<VerificationRequest[]>([]);
  readonly evidence = signal<Record<string, string | undefined>>({});
  readonly isLoading = signal(true);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly messageIsError = signal(false);
  readonly canPublish = computed(() => canPublishMa(this.auth.currentUser()));

  ngOnInit(): void {
    void this.load();
  }

  isFeatured(listing: MaListing): boolean {
    return isActiveUntil(listing.featuredUntil);
  }

  pendingRequest(listingId: string): VerificationRequest | undefined {
    return this.requests().find(request => request.listing_id === listingId && request.status === 'pending');
  }

  lastRejected(listingId: string): VerificationRequest | undefined {
    return this.requests().find(request => request.listing_id === listingId && request.status === 'rejected');
  }

  setEvidence(listingId: string, value: string): void {
    this.evidence.update(current => ({ ...current, [listingId]: value }));
  }

  async buy(product: ListingProduct, listing: MaListing): Promise<void> {
    await this.run(() => this.payment.purchaseForListing(product, listing.id));
  }

  async requestVerification(listing: MaListing): Promise<void> {
    await this.run(() => this.payment.purchaseForListing('VERIFICATION', listing.id, this.evidence()[listing.id]?.trim()));
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private async run(action: () => Promise<{ success: boolean; message: string }>): Promise<void> {
    this.busy.set(true);

    try {
      const result = await action();
      this.messageIsError.set(!result.success);
      this.message.set(result.message);

      if (result.success) {
        await this.load();
      }
    } finally {
      this.busy.set(false);
    }
  }

  private async load(): Promise<void> {
    const [listings, requests] = await Promise.all([this.maService.getMyListings(), this.maService.getMyVerificationRequests()]);
    this.listings.set(listings);
    this.requests.set(requests);
    this.isLoading.set(false);
  }
}
