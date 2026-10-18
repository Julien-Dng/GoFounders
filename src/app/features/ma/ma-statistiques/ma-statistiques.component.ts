import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { DailyViews, ProStats, SellerStats, StatsService } from '../../../core/services/stats.service';

const EMPTY_STATS: SellerStats = { listings: [], daily: [], contacts: { contacts_total: 0, contacts_period: 0 } };

// Tableau de bord du vendeur : vues de ses annonces, dossiers consultés par les repreneurs, contacts reçus.
@Component({
  selector: 'app-ma-statistiques',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-5xl">
        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 class="text-3xl font-bold text-primary sm:text-4xl">Mes statistiques</h1>
            <p class="mt-2 text-muted-foreground">L'intérêt suscité par vos annonces auprès des repreneurs.</p>
          </div>
          <div class="flex gap-2" role="group" aria-label="Période">
            @for (option of periods; track option) {
              <button
                type="button"
                (click)="setPeriod(option)"
                [attr.aria-pressed]="days() === option"
                [class]="days() === option
                  ? 'rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white'
                  : 'rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:border-primary'"
              >{{ option }} jours</button>
            }
          </div>
        </div>

        @if (!isLoading() && proStats(); as pro) {
          <section class="mb-6 rounded-2xl border border-border bg-white p-6 shadow-sm" aria-labelledby="pro-stats-title">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
              <h2 id="pro-stats-title" class="text-lg font-bold">Votre fiche dans l'annuaire</h2>
              @if (!pro.is_listed) {
                <a routerLink="/tarifs" fragment="pros" class="text-sm font-semibold text-accent hover:underline">Apparaître dans l'annuaire</a>
              }
            </div>
            @if (pro.is_listed) {
              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                <div class="rounded-xl bg-secondary/60 p-4">
                  <div class="text-sm font-semibold text-muted-foreground">Vues de votre fiche</div>
                  <div class="mt-1 text-3xl font-bold text-primary">{{ pro.profile_views_period }}</div>
                  <div class="text-xs text-muted-foreground">sur {{ days() }} jours · {{ pro.profile_views_total }} au total</div>
                </div>
                <div class="rounded-xl bg-secondary/60 p-4">
                  <div class="text-sm font-semibold text-muted-foreground">Clics vers votre site</div>
                  <div class="mt-1 text-3xl font-bold text-primary">{{ pro.website_clicks_period }}</div>
                  <div class="text-xs text-muted-foreground">sur {{ days() }} jours · {{ pro.website_clicks_total }} au total</div>
                </div>
              </div>
              <p class="mt-3 text-xs text-muted-foreground">Les messages reçus sont comptés dans « Contacts reçus ».</p>
            } @else {
              <p class="mt-2 text-sm text-muted-foreground">Votre fiche n'est pas visible dans l'annuaire. Activez l'offre Annuaire ou Compte pro pour être trouvé par les cédants et les repreneurs.</p>
            }
          </section>
        }

        @if (isLoading()) {
          <p class="text-muted-foreground">Chargement…</p>
        } @else if (stats().listings.length === 0) {
          <div class="rounded-2xl border border-border bg-white p-10 text-center">
            <p class="text-muted-foreground">Vous n'avez pas encore d'annonce.</p>
            <p class="mt-1 text-sm text-muted-foreground">Contacts reçus sur {{ days() }} jours : {{ stats().contacts.contacts_period }} ({{ stats().contacts.contacts_total }} au total).</p>
            <a routerLink="/ma/deposer" class="mt-4 inline-block rounded-lg bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600">Déposer une annonce</a>
          </div>
        } @else {
          <div class="grid gap-4 sm:grid-cols-3">
            @for (tile of tiles(); track tile.label) {
              <div class="rounded-2xl border border-border bg-white p-5 shadow-sm">
                <div class="text-sm font-semibold text-muted-foreground">{{ tile.label }}</div>
                <div class="mt-2 text-4xl font-bold text-primary">{{ tile.value }}</div>
                <div class="mt-1 text-xs text-muted-foreground">{{ tile.detail }}</div>
              </div>
            }
          </div>

          <section class="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm" aria-labelledby="chart-title">
            <div class="flex items-baseline justify-between gap-3">
              <h2 id="chart-title" class="text-lg font-bold">Vues de vos annonces par jour</h2>
              <span class="h-5 text-sm text-foreground/80" aria-live="polite">{{ hoveredLabel() }}</span>
            </div>

            <div class="mt-4 flex gap-3">
              <div class="flex h-40 flex-col justify-between text-right text-xs text-muted-foreground" aria-hidden="true">
                <span>{{ chartMax() }}</span>
                <span>0</span>
              </div>
              <div class="min-w-0 flex-1">
                <div
                  class="flex h-40 items-end gap-[2px] border-b border-border"
                  role="img"
                  [attr.aria-label]="chartSummary()"
                  (mouseleave)="hovered.set(null)"
                >
                  @for (point of stats().daily; track point.day; let index = $index) {
                    <div
                      class="flex h-full flex-1 cursor-default items-end"
                      (mouseenter)="hovered.set(index)"
                    >
                      <div
                        class="w-full rounded-t-[4px] transition-colors"
                        [class]="hovered() === index ? 'bg-primary' : 'bg-accent'"
                        [style.height.%]="barHeight(point)"
                        [style.min-height.px]="point.page_views > 0 ? 2 : 0"
                      ></div>
                    </div>
                  }
                </div>
                <div class="mt-2 flex justify-between text-xs text-muted-foreground" aria-hidden="true">
                  <span>{{ shortDate(firstDay()) }}</span>
                  <span>{{ shortDate(lastDay()) }}</span>
                </div>
              </div>
            </div>

            <details class="mt-4 text-sm">
              <summary class="cursor-pointer font-semibold text-accent">Voir les données</summary>
              <div class="mt-3 max-h-64 overflow-y-auto">
                <table class="w-full text-left text-sm">
                  <thead class="text-xs uppercase text-muted-foreground">
                    <tr><th class="py-1 pr-4">Jour</th><th class="py-1 pr-4">Vues</th><th class="py-1">Dossiers consultés</th></tr>
                  </thead>
                  <tbody>
                    @for (point of stats().daily; track point.day) {
                      <tr class="border-t border-border"><td class="py-1 pr-4">{{ shortDate(point.day) }}</td><td class="py-1 pr-4">{{ point.page_views }}</td><td class="py-1">{{ point.dossier_views }}</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </details>
          </section>

          <section class="mt-6 rounded-2xl border border-border bg-white p-6 shadow-sm">
            <h2 class="text-lg font-bold">Détail par annonce</h2>
            <div class="mt-4 overflow-x-auto">
              <table class="w-full min-w-[520px] text-left text-sm">
                <thead class="text-xs uppercase text-muted-foreground">
                  <tr>
                    <th class="py-2 pr-4">Annonce</th>
                    <th class="py-2 pr-4">Statut</th>
                    <th class="py-2 pr-4">Vues ({{ days() }} j)</th>
                    <th class="py-2 pr-4">Dossiers ({{ days() }} j)</th>
                    <th class="py-2">Depuis la publication</th>
                  </tr>
                </thead>
                <tbody>
                  @for (listing of stats().listings; track listing.listing_id) {
                    <tr class="border-t border-border">
                      <td class="py-3 pr-4"><a [routerLink]="['/ma/annonce', listing.listing_id]" class="font-semibold text-accent hover:underline">{{ listing.sector }} · {{ listing.region }}</a></td>
                      <td class="py-3 pr-4">{{ statusLabel(listing.status) }}</td>
                      <td class="py-3 pr-4">{{ listing.page_views_period }}</td>
                      <td class="py-3 pr-4">{{ listing.dossier_views_period }}</td>
                      <td class="py-3 text-muted-foreground">{{ listing.page_views_total }} vues · {{ listing.dossier_views_total }} dossiers</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <p class="mt-4 text-xs text-muted-foreground">
              Une vue est comptée au plus une fois par jour pour un membre connecté ; vos propres visites ne sont pas comptées.
              « Dossier consulté » : un repreneur avec un accès en cours a ouvert le dossier complet.
            </p>
          </section>
        }
      </div>
    </div>
  `,
})
export class MaStatistiquesComponent implements OnInit {
  private readonly statsService = inject(StatsService);
  private readonly auth = inject(AuthService);

  readonly periods = [7, 30, 90];
  readonly days = signal(30);
  readonly stats = signal<SellerStats>(EMPTY_STATS);
  readonly isLoading = signal(true);
  readonly hovered = signal<number | null>(null);
  // Professionnels uniquement : statistiques de la fiche annuaire.
  readonly proStats = signal<ProStats | null>(null);

  readonly tiles = computed(() => {
    const { listings, contacts } = this.stats();
    const pageViews = listings.reduce((total, listing) => total + listing.page_views_period, 0);
    const dossierViews = listings.reduce((total, listing) => total + listing.dossier_views_period, 0);
    const days = this.days();

    return [
      { label: 'Vues des annonces', value: pageViews, detail: `sur ${days} jours` },
      { label: 'Dossiers consultés', value: dossierViews, detail: `par des repreneurs, sur ${days} jours` },
      { label: 'Contacts reçus', value: contacts.contacts_period, detail: `sur ${days} jours · ${contacts.contacts_total} au total` },
    ];
  });

  readonly firstDay = computed(() => this.stats().daily.at(0)?.day);
  readonly lastDay = computed(() => this.stats().daily.at(-1)?.day);
  readonly chartMax = computed(() => Math.max(1, ...this.stats().daily.map(point => point.page_views)));
  readonly hoveredLabel = computed(() => {
    const index = this.hovered();
    const point = index === null ? undefined : this.stats().daily[index];
    return point ? `${this.shortDate(point.day)} : ${point.page_views} vue${point.page_views > 1 ? 's' : ''}, ${point.dossier_views} dossier${point.dossier_views > 1 ? 's' : ''}` : '';
  });
  readonly chartSummary = computed(() => {
    const total = this.stats().daily.reduce((sum, point) => sum + point.page_views, 0);
    return `Vues par jour sur ${this.days()} jours : ${total} au total, maximum ${this.chartMax()} en une journée.`;
  });

  ngOnInit(): void {
    void this.load();
  }

  setPeriod(days: number): void {
    this.days.set(days);
    void this.load();
  }

  barHeight(point: DailyViews): number {
    return (point.page_views / this.chartMax()) * 100;
  }

  shortDate(day: string | undefined): string {
    return day ? new Date(`${day}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
  }

  statusLabel(status: string): string {
    return status === 'active' ? 'En ligne' : status === 'sold' ? 'Vendue' : 'Retirée';
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    this.hovered.set(null);
    const isPro = this.auth.currentUser()?.profileType === 'pro';
    const [stats, proStats] = await Promise.all([
      this.statsService.getSellerStats(this.days()),
      isPro ? this.statsService.getProStats(this.days()) : Promise.resolve(null),
    ]);
    this.stats.set(stats);
    this.proStats.set(proStats);
    this.isLoading.set(false);
  }
}
