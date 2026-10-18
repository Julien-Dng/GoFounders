import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { MaListingData } from '../../../core/data/mock-platform.data';
import { MaService } from '../../../core/services/ma.service';
import { AiService, MaListingAnalysis } from '../../../core/services/ai.service';
import { AuthService } from '../../../core/services/auth.service';
import { StatsService } from '../../../core/services/stats.service';

@Component({
  selector: 'app-ma-detail',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pb-12 pt-20">
      <div class="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <a routerLink="/ma" class="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Retour aux annonces
        </a>

        @if (listing()) {
          <div class="grid gap-8 xl:grid-cols-[1.4fr,0.8fr]">
            <div class="rounded-2xl border border-border bg-white p-8 shadow-lg">
              <div class="mb-6 flex flex-wrap items-center gap-3">
                <span class="rounded-full bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-700">{{ listing()!.sector }}</span>
                <span class="rounded-full bg-secondary px-3 py-1 text-sm font-semibold text-foreground">{{ listing()!.type }}</span>
                <span class="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">{{ listing()!.region }}</span>
              </div>

              <h1 class="mb-4 text-3xl font-bold text-primary">Annonce {{ listing()!.id }}</h1>
              <p class="mb-6 text-lg leading-relaxed text-foreground/80">{{ listing()!.description }}</p>

              <div class="mb-8 grid gap-4 sm:grid-cols-2">
                @for (highlight of listing()!.highlights; track highlight) {
                  <div class="rounded-xl border border-border bg-secondary/60 p-4">
                    <div class="mb-2 flex items-center gap-2 text-accent">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span class="text-sm font-semibold">Point clé</span>
                    </div>
                    <p class="text-sm text-foreground/80">{{ highlight }}</p>
                  </div>
                }
              </div>

              <div class="rounded-2xl border border-border bg-secondary/40 p-6">
                <h2 class="mb-4 text-xl font-bold">Raison de la cession</h2>
                <p class="leading-relaxed text-foreground/80">{{ listing()!.reason }}</p>
              </div>
            </div>

            <div class="space-y-6">
              <div class="rounded-2xl border border-border bg-white p-6 shadow-lg">
                <h2 class="mb-4 text-xl font-bold">Informations financières</h2>
                <div class="space-y-4">
                  <div class="border-b border-border pb-4">
                    <div class="mb-1 text-xs font-semibold uppercase text-muted-foreground">Chiffre d'affaires</div>
                    <div class="font-semibold text-foreground">{{ listing()!.revenue }}</div>
                  </div>
                  <div class="border-b border-border pb-4">
                    <div class="mb-1 text-xs font-semibold uppercase text-muted-foreground">Marge nette</div>
                    <div class="font-semibold text-foreground">{{ listing()!.margin }}</div>
                  </div>
                  <div class="border-b border-border pb-4">
                    <div class="mb-1 text-xs font-semibold uppercase text-muted-foreground">Ancienneté</div>
                    <div class="font-semibold text-foreground">{{ listing()!.age }}</div>
                  </div>
                  <div>
                    <div class="mb-1 text-xs font-semibold uppercase text-muted-foreground">Fourchette de prix</div>
                    <div class="text-2xl font-bold text-amber-600">{{ listing()!.priceMin }} - {{ listing()!.priceMax }}</div>
                  </div>
                </div>
                <p class="mt-4 text-xs text-muted-foreground">Estimation indicative, non contractuelle.</p>
              </div>

              <div class="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-lg">
                <h2 class="mb-3 text-xl font-bold">Passer à l'étape suivante</h2>
                <p class="mb-5 text-sm leading-relaxed text-foreground/80">
                  Vous avez accès au détail. La prochaine étape consiste à ouvrir un échange confidentiel avec le vendeur pour approfondir l'analyse.
                </p>
                <a routerLink="/messages" class="flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-3 font-semibold text-white transition-colors hover:bg-amber-600">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  Demander une mise en relation
                </a>
              </div>
            </div>
          </div>

          @if (isBuyer()) {
            <section class="mt-8 rounded-2xl border-2 border-accent/20 bg-white p-6 shadow-lg sm:p-8" aria-labelledby="analyse-title" aria-live="polite">
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div class="flex items-center gap-2">
                    <svg class="text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9z"/>
                    </svg>
                    <h2 id="analyse-title" class="text-xl font-bold text-primary">Analyse du dossier par l'IA</h2>
                  </div>
                  <p class="mt-1 max-w-2xl text-sm text-muted-foreground">
                    Points forts, points de vigilance et questions à poser au vendeur, à partir des informations de l'annonce.
                  </p>
                </div>
                @if (!analysis()) {
                  <button type="button" (click)="analyse()" [disabled]="analysing()" class="flex-shrink-0 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60">
                    {{ analysing() ? 'Analyse en cours…' : 'Analyser ce dossier' }}
                  </button>
                }
              </div>

              @if (analysisError()) {
                <p class="mt-4 text-sm text-destructive" role="alert">{{ analysisError() }}</p>
                @if (analysisError().includes('Plus')) {
                  <a routerLink="/tarifs" fragment="repreneurs" class="mt-2 inline-block text-sm font-semibold text-accent hover:underline">Découvrir l'accès Plus</a>
                }
              }

              @if (analysis(); as result) {
                <p class="mt-6 leading-relaxed text-foreground/85">{{ result.summary }}</p>
                <div class="mt-6 grid gap-6 md:grid-cols-2">
                  @for (block of analysisBlocks(); track block.title) {
                    @if (block.items.length > 0) {
                      <div class="rounded-xl border border-border bg-secondary/40 p-5">
                        <h3 class="mb-3 font-bold">{{ block.title }}</h3>
                        <ul class="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-foreground/85">
                          @for (item of block.items; track item) {
                            <li>{{ item }}</li>
                          }
                        </ul>
                      </div>
                    }
                  }
                </div>
              }

              <p class="mt-6 text-xs leading-relaxed text-muted-foreground">
                Analyse générée automatiquement à partir des seules informations de l'annonce, sans vérification. Elle ne constitue ni une
                valorisation, ni un conseil juridique, comptable ou financier : faites vérifier le dossier par un expert-comptable et un avocat
                avant toute offre.
              </p>
            </section>
          }
        } @else {
          <div class="rounded-2xl border border-border bg-white p-10 text-center shadow-lg">
            <p class="py-12 text-muted-foreground">Cette annonce n'existe pas ou n'est plus disponible.</p>
          </div>
        }
      </div>
    </div>
  `
})
export class MaDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly maService = inject(MaService);
  private readonly ai = inject(AiService);
  private readonly auth = inject(AuthService);
  private readonly stats = inject(StatsService);
  private readonly loadedListing = signal<MaListingData | undefined>(undefined);

  private readonly listingId = toSignal(
    this.route.params.pipe(map((params: Record<string, string>) => params['id'] ?? '')),
    { initialValue: '' }
  );

  readonly listing = computed(() => this.loadedListing());

  // Analyse de dossier par l'IA : réservée aux repreneurs (contrôle d'accès refait côté back).
  readonly isBuyer = computed(() => this.auth.currentUser()?.profileType === 'buyer');
  readonly analysis = signal<MaListingAnalysis | null>(null);
  readonly analysing = signal(false);
  readonly analysisError = signal('');
  readonly analysisBlocks = computed(() => {
    const result = this.analysis();
    return result
      ? [
          { title: 'Points forts', items: result.strengths },
          { title: 'Points de vigilance', items: result.risks },
          { title: 'Questions à poser au vendeur', items: result.questions },
          { title: 'À vérifier avec un professionnel', items: result.checks },
        ]
      : [];
  });

  async analyse(): Promise<void> {
    const listing = this.listing();

    if (!listing || this.analysing()) {
      return;
    }

    this.analysing.set(true);
    this.analysisError.set('');

    try {
      this.analysis.set(await this.ai.analyseMaListing(listing.id));
    } catch (error) {
      this.analysisError.set(error instanceof Error ? error.message : "L'analyse est indisponible pour le moment.");
    } finally {
      this.analysing.set(false);
    }
  }

  ngOnInit(): void {
    void this.loadListing();
  }

  private async loadListing(): Promise<void> {
    const listing = await this.maService.getListingDetail(this.listingId());
    this.loadedListing.set(listing);

    // Page protégée par l'accès repreneur : chaque ouverture est aussi une consultation du dossier.
    if (listing) {
      void this.stats.recordListingView(this.listingId(), 'page');
      void this.stats.recordListingView(this.listingId(), 'dossier');
    }
  }
}
