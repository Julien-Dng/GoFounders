import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaListingData } from '../../core/data/mock-platform.data';
import { AuthService } from '../../core/services/auth.service';
import { MaService, VerificationRequest } from '../../core/services/ma.service';

// Admins : vérification manuelle des dossiers (badge « Dossier vérifié »). Les droits sont contrôlés par
// Supabase (decide_listing_verification), cette page ne fait qu'afficher.
@Component({
  selector: 'app-admin-verifications',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-4xl">
        <h1 class="text-3xl font-bold text-primary">Dossiers à vérifier</h1>

        @if (!isAdmin()) {
          <p class="mt-4 text-muted-foreground">Page réservée aux administrateurs.</p>
        } @else {
          <p class="mt-2 text-sm text-muted-foreground">
            Contrôlez la cohérence des justificatifs (chiffre d'affaires, marge, ancienneté) avec l'annonce avant de poser le badge.
          </p>

          @if (requests().length === 0) {
            <div class="mt-6 rounded-2xl border border-border bg-white p-10 text-center text-muted-foreground">Aucune demande en attente.</div>
          } @else {
            <ul class="mt-6 space-y-6">
              @for (request of requests(); track request.id) {
                <li class="rounded-2xl border border-border bg-white p-6 shadow-sm">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 class="font-bold">{{ request.listing?.sector ?? 'Annonce' }} · {{ request.listing?.region ?? '' }}</h2>
                      <p class="text-xs text-muted-foreground">Demande du {{ formatDate(request.created_at) }}</p>
                    </div>
                    <a [routerLink]="['/ma/annonce', request.listing_id]" class="text-sm font-semibold text-accent hover:underline">Voir l'annonce</a>
                  </div>
                  @if (request.listing) {
                    <p class="mt-3 text-sm text-foreground/80">
                      CA {{ request.listing.revenue }} · marge {{ request.listing.margin }} · {{ request.listing.age }} · prix {{ request.listing.priceMin }} – {{ request.listing.priceMax }}
                    </p>
                  }
                  <div class="mt-3 whitespace-pre-line rounded-lg bg-secondary/60 p-3 text-sm">{{ request.evidence }}</div>
                  <label class="mb-1 mt-4 block text-sm font-semibold" [attr.for]="'note-' + request.id">Note au cédant (facultatif, obligatoire en cas de refus)</label>
                  <input [id]="'note-' + request.id" type="text" maxlength="300" [value]="notes()[request.id] ?? ''" (input)="setNote(request.id, $any($event.target).value)" class="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent">
                  <div class="mt-3 flex gap-2">
                    <button type="button" (click)="decide(request, true)" [disabled]="busy()" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Valider le dossier</button>
                    <button type="button" (click)="decide(request, false)" [disabled]="busy() || !(notes()[request.id] ?? '').trim()" class="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-destructive hover:text-destructive disabled:opacity-50">Refuser</button>
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
export class VerificationsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly maService = inject(MaService);

  readonly isAdmin = this.auth.isAdmin;
  readonly requests = signal<Array<VerificationRequest & { listing?: MaListingData }>>([]);
  readonly notes = signal<Record<string, string | undefined>>({});
  readonly busy = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  setNote(requestId: string, value: string): void {
    this.notes.update(current => ({ ...current, [requestId]: value }));
  }

  async decide(request: VerificationRequest, approve: boolean): Promise<void> {
    this.busy.set(true);

    try {
      if (await this.maService.decideVerification(request.id, approve, this.notes()[request.id] ?? '')) {
        await this.load();
      }
    } finally {
      this.busy.set(false);
    }
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private async load(): Promise<void> {
    await this.auth.ensureSessionReady();

    if (this.isAdmin()) {
      this.requests.set(await this.maService.getPendingVerifications());
    }
  }
}
