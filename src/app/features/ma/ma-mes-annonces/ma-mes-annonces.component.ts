import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ListingProduct, OFFER_PRICES } from '../../../core/config/offers';
import { MaListing } from '../../../core/models/ma-listing.model';
import { canPublishMa, isActiveUntil } from '../../../core/models/user.model';
import { AuthService } from '../../../core/services/auth.service';
import { MaService, VerificationRequest } from '../../../core/services/ma.service';
import { PaymentService } from '../../../core/services/payment.service';
import { ListingAccessService, ListingReview, ReceivedAccessRequest } from '../../../core/services/listing-access.service';
import { FEATURES } from '../../../core/config/features';
import { VerifiedBadgeComponent } from '../../../shared/components/verified-badge/verified-badge.component';

// Annonces du vendeur (ou du cabinet avec un compte pro) : relecture, demandes d'accès, modification ;
// mise en avant et dossier vérifié quand ces offres sont actives (core/config/features.ts).
@Component({
  selector: 'app-ma-mes-annonces',
  standalone: true,
  imports: [RouterLink, VerifiedBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-5xl">
        <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 class="text-3xl font-semibold text-primary sm:text-4xl">Mes annonces</h1>
            <p class="mt-2 text-muted-foreground">Suivez la relecture de vos annonces et choisissez les repreneurs qui voient votre dossier.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <a routerLink="/ma/statistiques" class="rounded-lg border border-border bg-white px-5 py-3 text-center text-sm font-semibold transition-colors hover:border-primary">Mes statistiques</a>
            @if (canPublish()) {
              <a routerLink="/ma/deposer" class="rounded-lg bg-accent px-5 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent/90">Déposer une annonce</a>
            }
          </div>
        </div>

        @if (message()) {
          <div class="mb-6 rounded-xl border px-5 py-4 text-sm" [class]="messageIsError() ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'" role="status">{{ message() }}</div>
        }

        @if (!canPublish()) {
          <div class="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <h2 class="mb-1 text-lg font-semibold">{{ proAccountOffered ? 'Compte pro requis' : 'Bientôt pour les cabinets' }}</h2>
            <p class="text-sm">{{ proAccountOffered ? 'Pour publier des annonces pour vos clients, activez un compte pro.' : 'La publication d’annonces pour le compte de vos clients sera bientôt proposée aux cabinets.' }}</p>
            <a [routerLink]="proAccountOffered ? '/tarifs' : '/contact'" [fragment]="proAccountOffered ? 'pros' : undefined" class="mt-3 inline-block text-sm font-semibold text-amber-700 hover:underline">{{ proAccountOffered ? 'Voir les offres professionnelles' : 'Nous contacter' }}</a>
          </div>
        } @else if (isLoading()) {
          <p class="text-muted-foreground">Chargement…</p>
        } @else if (listings().length === 0) {
          <div class="rounded-2xl bg-white shadow-lg ring-1 ring-border p-10 text-center">
            <p class="text-muted-foreground">Vous n'avez pas encore d'annonce.</p>
          </div>
        } @else {
          <ul class="space-y-6">
            @for (listing of listings(); track listing.id) {
              <li class="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-border">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h2 class="text-lg font-bold text-primary">{{ listing.sector }} · {{ listing.region }}</h2>
                      <span class="rounded-full px-2.5 py-0.5 text-sm font-semibold" [class]="reviewState(listing).css">{{ reviewState(listing).label }}</span>
                      @if (features.sellerPaidOffers && isFeatured(listing)) {
                        <span class="rounded-full bg-amber-50 px-2.5 py-0.5 text-sm font-semibold text-amber-800">En vedette jusqu'au {{ formatDate(listing.featuredUntil!) }}</span>
                      }
                      @if (listing.verified) {
                        <span class="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-sm font-semibold text-sky-700"><app-verified-badge [size]="16" />Dossier vérifié</span>
                      }
                    </div>
                    @if (reviewState(listing).note) {
                      <p class="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">Motif : {{ reviewState(listing).note }}</p>
                    } @else if (reviewState(listing).key === 'pending') {
                      <p class="mt-2 text-sm text-muted-foreground">Notre équipe relit votre annonce avant sa publication, en général sous 24 h ouvrées. Vous serez prévenu dès qu'elle sera en ligne.</p>
                    }
                    <p class="mt-2 line-clamp-2 text-sm text-muted-foreground">{{ listing.description }}</p>
                  </div>
                  <div class="flex flex-shrink-0 flex-wrap gap-x-4 gap-y-2">
                    <a [routerLink]="['/ma/annonce', listing.id]" class="text-sm font-semibold text-accent hover:underline">Voir</a>
                    @if (listing.status === 'active' || !reviewState(listing).note) {
                      <a routerLink="/ma/deposer" [queryParams]="{ modifier: listing.id }" class="text-sm font-semibold text-accent hover:underline">Modifier</a>
                    }
                    @if (listing.status !== 'withdrawn') {
                      <a [routerLink]="['/ma/vendue', listing.id]" class="text-sm font-semibold text-accent hover:underline">{{ listing.status === 'sold' ? 'Mon témoignage' : "J'ai vendu" }}</a>
                    }
                  </div>
                </div>

                <section class="mt-5 border-t border-border pt-5" [attr.aria-label]="'Demandes d’accès pour ' + listing.sector">
                  <h3 class="font-bold text-primary">Repreneurs qui ont ouvert votre dossier
                    @if (requestsFor(listing.id).length > 0) {
                      <span class="ml-1 rounded-full bg-accent px-2 py-0.5 text-sm font-semibold text-white">{{ requestsFor(listing.id).length }}</span>
                    }
                  </h3>
                  @if (requestsFor(listing.id).length === 0) {
                    <p class="mt-1 text-sm text-muted-foreground">Personne pour le moment. Chaque repreneur accepte un engagement de confidentialité avant d'ouvrir votre dossier ; vous êtes prévenu à chaque ouverture.</p>
                  } @else {
                    <ul class="mt-3 space-y-3">
                      @for (request of requestsFor(listing.id); track request.id) {
                        <li class="rounded-xl bg-secondary p-4">
                          <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div class="min-w-0">
                              <p class="font-semibold text-primary">
                                {{ request.buyer_name || 'Repreneur' }}
                                @if (request.buyer_verified) {
                                  <span class="ml-1 text-sm font-semibold text-emerald-700">Profil vérifié</span>
                                }
                              </p>
                              <p class="text-sm text-muted-foreground">
                                {{ buyerDetails(request) }}
                              </p>
                            </div>
                            <span class="flex-shrink-0 text-sm font-semibold text-emerald-700">Dossier ouvert</span>
                          </div>
                          @if (request.message) {
                            <p class="mt-2 whitespace-pre-line text-sm text-foreground/85">« {{ request.message }} »</p>
                          }
                          <p class="mt-2 text-sm text-muted-foreground">Engagement de confidentialité accepté le {{ formatDate(request.nda_accepted_at) }}.</p>
                        </li>
                      }
                    </ul>
                  }
                </section>

                @if (features.sellerPaidOffers) {
                <div class="mt-5 grid gap-4 border-t border-border pt-5 md:grid-cols-2">
                  <div class="rounded-xl bg-secondary/60 p-4">
                    <h3 class="font-semibold">Mise en avant</h3>
                    <p class="mt-1 text-sm text-muted-foreground">Votre annonce en tête de liste avec le badge « En vedette ».</p>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <button type="button" (click)="buy('FEATURE_7D', listing)" [disabled]="busy()" class="rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold transition-colors hover:border-primary disabled:opacity-50">7 jours · {{ prices.FEATURE_7D.amount }} €</button>
                      <button type="button" (click)="buy('FEATURE_30D', listing)" [disabled]="busy()" class="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50">30 jours · {{ prices.FEATURE_30D.amount }} €</button>
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
                        <p class="mt-1 text-sm text-destructive">Précédente demande non validée{{ rejected.admin_note ? ' : ' + rejected.admin_note : '.' }}</p>
                      }
                      <p class="mt-1 text-sm text-muted-foreground">
                        Indiquez où trouver vos justificatifs : captures de votre tableau de bord Stripe ou Shopify sur 12 mois, derniers bilans
                        (par exemple un lien de partage Drive). Un membre de l'équipe les contrôle sous 3 jours ouvrés.
                      </p>
                      <label class="sr-only" [attr.for]="'evidence-' + listing.id">Justificatifs</label>
                      <textarea [id]="'evidence-' + listing.id" rows="3" maxlength="3000" [value]="evidence()[listing.id] ?? ''" (input)="setEvidence(listing.id, $any($event.target).value)" class="mt-2 w-full resize-y rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent" placeholder="Lien vers vos justificatifs et précisions utiles"></textarea>
                      <button type="button" (click)="requestVerification(listing)" [disabled]="busy() || (evidence()[listing.id] ?? '').trim().length < 20" class="mt-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50">Demander la vérification</button>
                    }
                  </div>
                </div>
                }
              </li>
            }
          </ul>
        }
      </div>
    </div>
  `,
})
export class MaMesAnnoncesComponent implements OnInit {
  // Compte pro des cabinets proposé ou non (features.ts) : sinon, message « bientôt ».
  readonly proAccountOffered = FEATURES.proAccount;
  private readonly auth = inject(AuthService);
  private readonly maService = inject(MaService);
  private readonly payment = inject(PaymentService);
  private readonly access = inject(ListingAccessService);

  readonly prices = OFFER_PRICES;
  readonly features = FEATURES;
  readonly accessRequests = signal<ReceivedAccessRequest[]>([]);
  readonly reviews = signal<Map<string, ListingReview>>(new Map());
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

  // En ligne, en attente de relecture, refusée ou retirée par la modération (avec le motif), vendue.
  reviewState(listing: MaListing): { key: string; label: string; css: string; note: string | null } {
    const review = this.reviews().get(listing.id);

    if (listing.status === 'sold') {
      return { key: 'sold', label: 'Vendue', css: 'bg-secondary text-muted-foreground', note: null };
    }

    if (review?.withdrawn_by_admin) {
      return { key: 'withdrawn', label: 'Non publiée', css: 'bg-red-50 text-red-800', note: review.moderation_note };
    }

    if (listing.status === 'withdrawn') {
      return { key: 'withdrawn', label: 'Retirée', css: 'bg-secondary text-muted-foreground', note: null };
    }

    if (review && !review.reviewed_at) {
      return { key: 'pending', label: 'En attente de relecture', css: 'bg-amber-50 text-amber-800', note: null };
    }

    return { key: 'online', label: 'En ligne', css: 'bg-emerald-50 text-emerald-800', note: null };
  }

  // Seuls les repreneurs qui ont payé l'ouverture du dossier (engagement accepté) sont montrés au cédant.
  requestsFor(listingId: string): ReceivedAccessRequest[] {
    return this.accessRequests().filter(request => request.listing_id === listingId && request.unlocked);
  }

  pendingCount(listingId: string): number {
    return this.requestsFor(listingId).filter(request => request.status === 'pending').length;
  }

  buyerDetails(request: ReceivedAccessRequest): string {
    return [request.buyer_title, request.buyer_location, request.buyer_budget ? `Budget ${request.buyer_budget}` : null, request.buyer_sector ? `Cherche : ${request.buyer_sector}` : null]
      .filter(Boolean)
      .join(' · ') || 'Profil repreneur';
  }

  async decide(requestId: string, approve: boolean): Promise<void> {
    await this.run(() => this.access.decide(requestId, approve));
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
    const [listings, requests, accessRequests, reviews] = await Promise.all([
      this.maService.getMyListings(),
      FEATURES.sellerPaidOffers ? this.maService.getMyVerificationRequests() : Promise.resolve([]),
      this.access.listReceived(),
      this.access.myListingReviews(),
    ]);
    this.listings.set(listings);
    this.requests.set(requests);
    this.accessRequests.set(accessRequests);
    this.reviews.set(reviews);
    this.isLoading.set(false);
  }
}
