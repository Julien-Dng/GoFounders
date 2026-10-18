import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PendingSuccessStory, PriceDisplay, SuccessStoriesService } from '../../core/services/success-stories.service';

// Admins : relecture des ventes déclarées avant publication du témoignage. Droits contrôlés par Supabase.
@Component({
  selector: 'app-admin-temoignages',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-4xl">
        <h1 class="text-3xl font-bold text-primary">Ventes à valider</h1>

        @if (!isAdmin()) {
          <p class="mt-4 text-muted-foreground">Page réservée aux administrateurs.</p>
        } @else {
          <p class="mt-2 text-sm text-muted-foreground">
            Vérifiez que la vente est plausible (prix cohérent avec la fourchette de l'annonce, idéalement confirmée par le vendeur
            par message ou compromis) et que le témoignage ne cite ni l'entreprise ni le repreneur. Ne publiez jamais un témoignage modifié sans l'accord du vendeur.
          </p>

          @if (message()) {
            <div class="mt-6 rounded-xl border px-5 py-4 text-sm" [class]="messageIsError() ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'" role="status">{{ message() }}</div>
          }

          @if (stories().length === 0) {
            <div class="mt-6 rounded-2xl border border-border bg-white p-10 text-center text-muted-foreground">Aucune vente en attente.</div>
          } @else {
            <ul class="mt-6 space-y-6">
              @for (story of stories(); track story.id) {
                <li class="rounded-2xl border border-border bg-white p-6 shadow-sm">
                  <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 class="font-bold">{{ story.sector }} · {{ story.region }}</h2>
                      <p class="text-xs text-muted-foreground">Déclarée le {{ formatDate(story.created_at) }} par {{ story.owner_name ?? 'compte supprimé' }}</p>
                    </div>
                    <a [routerLink]="['/ma/annonce', story.listing_id]" class="text-sm font-semibold text-accent hover:underline">Voir l'annonce</a>
                  </div>
                  <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Prix déclaré</dt><dd class="font-semibold">{{ money(story.sale_price) }}</dd></div>
                    <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Fourchette de l'annonce</dt><dd>{{ money(story.price_min) }} – {{ money(story.price_max) }}</dd></div>
                    <div><dt class="text-xs font-semibold uppercase text-muted-foreground">Affichage choisi</dt><dd>{{ displayLabel(story.price_display) }}</dd></div>
                  </dl>
                  <blockquote class="mt-4 rounded-lg bg-secondary/60 p-3 text-sm italic">« {{ story.quote }} »</blockquote>
                  <p class="mt-2 text-sm font-semibold">{{ story.author_label }}</p>
                  <label class="mb-1 mt-4 block text-sm font-semibold" [attr.for]="'note-' + story.id">Note au vendeur (obligatoire en cas de refus)</label>
                  <input [id]="'note-' + story.id" type="text" maxlength="500" [value]="notes()[story.id] ?? ''" (input)="setNote(story.id, $any($event.target).value)" class="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none focus:border-accent">
                  <div class="mt-3 flex gap-2">
                    <button type="button" (click)="decide(story, true)" [disabled]="busy()" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">Publier</button>
                    <button type="button" (click)="decide(story, false)" [disabled]="busy() || !(notes()[story.id] ?? '').trim()" class="rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:border-destructive hover:text-destructive disabled:opacity-50">Refuser</button>
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
export class AdminTemoignagesComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly service = inject(SuccessStoriesService);

  readonly isAdmin = this.auth.isAdmin;
  readonly stories = signal<PendingSuccessStory[]>([]);
  readonly notes = signal<Record<string, string | undefined>>({});
  readonly busy = signal(false);
  readonly message = signal('');
  readonly messageIsError = signal(false);

  ngOnInit(): void {
    void this.load();
  }

  setNote(storyId: string, value: string): void {
    this.notes.update(current => ({ ...current, [storyId]: value }));
  }

  async decide(story: PendingSuccessStory, approve: boolean): Promise<void> {
    this.busy.set(true);

    try {
      const result = await this.service.decide(story.id, approve, this.notes()[story.id] ?? '');
      this.messageIsError.set(!result.success);
      this.message.set(result.message);

      if (result.success) {
        await this.load();
      }
    } finally {
      this.busy.set(false);
    }
  }

  displayLabel(display: PriceDisplay): string {
    return display === 'exact' ? 'Prix exact' : display === 'range' ? 'Fourchette' : 'Prix masqué';
  }

  money(value: number | null): string {
    return value === null ? '–' : new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private async load(): Promise<void> {
    await this.auth.ensureSessionReady();

    if (this.isAdmin()) {
      this.stories.set(await this.service.getPending());
    }
  }
}
