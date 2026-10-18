import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ModeratedListing, ModerationAction, ModerationFilter, ModerationService } from '../../core/services/moderation.service';

// Admins : relecture des annonces M&A publiées (elles sont en ligne dès leur publication).
// Les droits sont contrôlés par Supabase, cette page ne fait qu'afficher et transmettre les décisions.
@Component({
  selector: 'app-admin-annonces',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-5xl">
        <h1 class="text-3xl font-bold text-primary">Modération des annonces</h1>

        @if (!isAdmin()) {
          <p class="mt-4 text-muted-foreground">Page réservée aux administrateurs.</p>
        } @else {
          <p class="mt-2 max-w-3xl text-sm text-muted-foreground">
            Les annonces sont en ligne dès leur publication. Vérifiez qu'elles sont sérieuses et bien anonymisées
            (pas de nom d'entreprise, d'adresse ou de coordonnées dans le résumé public). Un retrait masque l'annonce
            et envoie le motif au vendeur.
          </p>

          <div class="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Filtrer les annonces">
            @for (tab of tabs; track tab.value) {
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="filter() === tab.value"
                (click)="setFilter(tab.value)"
                [class]="filter() === tab.value
                  ? 'rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white'
                  : 'rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:border-primary'"
              >{{ tab.label }}</button>
            }
          </div>

          @if (message()) {
            <div class="mt-6 rounded-xl border px-5 py-4 text-sm" [class]="messageIsError() ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'" role="status">{{ message() }}</div>
          }

          @if (isLoading()) {
            <p class="mt-6 text-muted-foreground">Chargement…</p>
          } @else if (listings().length === 0) {
            <div class="mt-6 rounded-2xl border border-border bg-white p-10 text-center text-muted-foreground">Aucune annonce dans cette liste.</div>
          } @else {
            <ul class="mt-6 space-y-6">
              @for (listing of listings(); track listing.id) {
                <li class="rounded-2xl border border-border bg-white p-6 shadow-sm">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div class="flex flex-wrap items-center gap-2">
                        <h2 class="text-lg font-bold">{{ listing.sector }} · {{ listing.region }}</h2>
                        <span [class]="statusClass(listing)">{{ statusLabel(listing) }}</span>
                      </div>
                      <p class="mt-1 text-xs text-muted-foreground">
                        Publiée le {{ formatDate(listing.created_at) }} par {{ listing.owner_name ?? 'compte supprimé' }}
                        @if (listing.reviewed_at) {
                          · relue le {{ formatDate(listing.reviewed_at) }}
                        }
                      </p>
                    </div>
                    <a [routerLink]="['/ma/annonce', listing.id]" class="flex-shrink-0 text-sm font-semibold text-accent hover:underline">Voir l'annonce</a>
                  </div>

                  <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                    <div><dt class="text-xs font-semibold uppercase text-muted-foreground">CA</dt><dd>{{ money(listing.revenue) }}</dd></div>
                    <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Marge</dt><dd>{{ listing.margin ?? '–' }} %</dd></div>
                    <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Ancienneté</dt><dd>{{ listing.age ?? '–' }} ans</dd></div>
                    <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Prix</dt><dd>{{ money(listing.price_min) }} – {{ money(listing.price_max) }}</dd></div>
                  </dl>

                  <div class="mt-4 space-y-3 text-sm">
                    <div>
                      <div class="text-xs font-semibold uppercase text-muted-foreground">Résumé public (visible par tous)</div>
                      <p class="mt-1 whitespace-pre-line">{{ listing.public_summary }}</p>
                    </div>
                    <div>
                      <div class="text-xs font-semibold uppercase text-muted-foreground">Dossier confidentiel</div>
                      <p class="mt-1 whitespace-pre-line text-foreground/80">{{ listing.confidential_description || '–' }}</p>
                    </div>
                    <div class="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div class="text-xs font-semibold uppercase text-muted-foreground">Raison de la vente</div>
                        <p class="mt-1 text-foreground/80">{{ listing.sale_reason || '–' }}</p>
                      </div>
                      <div>
                        <div class="text-xs font-semibold uppercase text-muted-foreground">Contact</div>
                        <p class="mt-1 text-foreground/80">{{ listing.contact_info || '–' }}</p>
                      </div>
                    </div>
                    @if (listing.moderation_note) {
                      <p class="rounded-lg bg-secondary/70 px-3 py-2 text-xs"><span class="font-semibold">Note de modération :</span> {{ listing.moderation_note }}</p>
                    }
                  </div>

                  <label class="mb-1 mt-5 block text-sm font-semibold" [attr.for]="'note-' + listing.id">Motif envoyé au vendeur (obligatoire pour un retrait)</label>
                  <input
                    [id]="'note-' + listing.id"
                    type="text"
                    maxlength="500"
                    [value]="notes()[listing.id] ?? ''"
                    (input)="setNote(listing.id, $any($event.target).value)"
                    placeholder="Ex. Le résumé public cite le nom de la boutique"
                    class="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent"
                  >
                  <div class="mt-3 flex flex-wrap gap-2">
                    @if (listing.status === 'active') {
                      @if (!listing.reviewed_at) {
                        <button type="button" (click)="act(listing, 'approve')" [disabled]="busy()" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Marquer comme relue</button>
                      }
                      <button type="button" (click)="act(listing, 'withdraw')" [disabled]="busy() || (notes()[listing.id] ?? '').trim().length < 5" class="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-destructive hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50">Retirer l'annonce</button>
                    } @else {
                      <button type="button" (click)="act(listing, 'restore')" [disabled]="busy()" class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50">Remettre en ligne</button>
                    }
                  </div>
                </li>
              }
            </ul>
          }
        }
      </div>
    </div>
  `,
})
export class AdminAnnoncesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly moderation = inject(ModerationService);

  readonly tabs: Array<{ value: ModerationFilter; label: string }> = [
    { value: 'to_review', label: 'À relire' },
    { value: 'active', label: 'En ligne' },
    { value: 'withdrawn', label: 'Retirées' },
    { value: 'all', label: 'Toutes' },
  ];

  readonly isAdmin = this.auth.isAdmin;
  readonly filter = signal<ModerationFilter>('to_review');
  readonly listings = signal<ModeratedListing[]>([]);
  readonly notes = signal<Record<string, string | undefined>>({});
  readonly isLoading = signal(true);
  readonly busy = signal(false);
  readonly message = signal('');
  readonly messageIsError = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  setFilter(filter: ModerationFilter): void {
    this.filter.set(filter);
    this.message.set('');
    void this.load();
  }

  setNote(listingId: string, value: string): void {
    this.notes.update(current => ({ ...current, [listingId]: value }));
  }

  async act(listing: ModeratedListing, action: ModerationAction): Promise<void> {
    this.busy.set(true);

    try {
      const result = await this.moderation.moderate(listing.id, action, this.notes()[listing.id] ?? '');
      this.messageIsError.set(!result.success);
      this.message.set(result.message);

      if (result.success) {
        this.setNote(listing.id, '');
        await this.load();
      }
    } finally {
      this.busy.set(false);
    }
  }

  statusLabel(listing: ModeratedListing): string {
    if (listing.withdrawn_by_admin) {
      return 'Retirée par la modération';
    }

    if (listing.status !== 'active') {
      return listing.status === 'sold' ? 'Vendue' : 'Retirée par le vendeur';
    }

    return listing.reviewed_at ? 'En ligne · relue' : 'En ligne · à relire';
  }

  statusClass(listing: ModeratedListing): string {
    const base = 'rounded-full px-2.5 py-0.5 text-xs font-semibold';

    if (listing.status !== 'active') {
      return `${base} bg-secondary text-foreground/80`;
    }

    return listing.reviewed_at ? `${base} bg-emerald-100 text-emerald-800` : `${base} bg-amber-100 text-amber-900`;
  }

  money(value: number | null): string {
    return value === null ? '–' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private async load(): Promise<void> {
    await this.auth.ensureSessionReady();

    if (!this.isAdmin()) {
      this.isLoading.set(false);
      return;
    }

    this.isLoading.set(true);
    this.listings.set(await this.moderation.list(this.filter()));
    this.isLoading.set(false);
  }
}
