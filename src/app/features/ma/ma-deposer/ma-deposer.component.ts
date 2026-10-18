import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MaService } from '../../../core/services/ma.service';
import { AiService, MaListingDraft } from '../../../core/services/ai.service';

@Component({
  selector: 'app-ma-deposer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pb-12 pt-20">
      <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-10 text-center">
          <h1 class="mb-2 text-4xl font-bold">Déposer une annonce M&A</h1>
          <p class="text-muted-foreground">Publication gratuite pendant le lancement. Votre annonce reste anonymisée.</p>
        </div>

        <div class="mb-8">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-sm font-semibold text-muted-foreground">Étape {{ currentStep() }} sur {{ totalSteps }}</span>
            <span class="text-sm font-semibold text-amber-600">{{ progressPercent() }}%</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-muted">
            <div class="h-full rounded-full bg-amber-500 transition-all duration-300" [style.width]="progressPercent() + '%'"></div>
          </div>
        </div>

        <div class="rounded-2xl border border-border bg-white p-6 shadow-lg sm:p-10">
          @if (!checkoutRequested()) {
            <div class="space-y-8">
              @if (currentStep() === 1) {
                <div class="rounded-2xl border-2 border-accent/20 bg-accent/[0.04] p-5">
                  <div class="flex flex-wrap items-center gap-2">
                    <svg class="text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9z"/>
                    </svg>
                    <h2 class="text-lg font-bold text-primary">Préparer mon annonce avec l'IA</h2>
                  </div>
                  <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
                    Décrivez votre entreprise comme à un ami : activité, chiffres, clients, raison de la vente. L'IA rédige une annonce anonymisée,
                    remplit le formulaire et vous signale ce qui pourrait permettre de vous reconnaître. Vous relisez et modifiez tout avant de publier.
                  </p>
                  <label for="ai-description" class="sr-only">Description libre de votre entreprise</label>
                  <textarea
                    id="ai-description"
                    rows="5"
                    maxlength="6000"
                    [value]="aiInput()"
                    (input)="aiInput.set($any($event.target).value)"
                    class="mt-3 w-full resize-y rounded-xl border border-border bg-white px-4 py-3 text-sm outline-none focus:border-accent"
                    placeholder="Ex. : Boutique Shopify de décoration créée en 2021, 180 k€ de CA l'an dernier, environ 25 % de marge, 3 000 clients dont 40 % reviennent. Je vends pour me consacrer à un nouveau projet, idéalement entre 150 et 220 k€."
                  ></textarea>
                  <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p class="text-xs text-muted-foreground">Votre texte sert uniquement à préparer l'annonce, il n'est pas publié tel quel.</p>
                    <button
                      type="button"
                      (click)="prepareWithAi()"
                      [disabled]="aiLoading() || aiInput().trim().length < 40"
                      class="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {{ aiLoading() ? 'Préparation…' : 'Préparer mon annonce' }}
                    </button>
                  </div>
                  @if (aiError()) {
                    <p class="mt-3 text-sm text-destructive" role="alert">{{ aiError() }}</p>
                  }
                  @if (aiDetails().length > 0) {
                    <div class="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm" role="status">
                      <div class="mb-2 font-semibold text-amber-900">Attention : ces éléments de votre texte pourraient permettre de vous reconnaître</div>
                      <ul class="space-y-1 text-amber-900/85">
                        @for (detail of aiDetails(); track detail.excerpt) {
                          <li>« {{ detail.excerpt }} » : {{ detail.reason }}</li>
                        }
                      </ul>
                      <p class="mt-2 text-xs text-amber-900/70">L'annonce proposée ci-dessous les a retirés. Vérifiez qu'il n'en reste aucun avant de publier.</p>
                    </div>
                  } @else if (aiApplied()) {
                    <p class="mt-3 text-sm text-emerald-700" role="status">Annonce préparée : relisez les champs ci-dessous et à chaque étape.</p>
                  }
                </div>
              }
              @switch (currentStep()) {
                @case (1) {
                  <div>
                    <h2 class="mb-3 text-2xl font-bold">1. Informations générales</h2>
                    <p class="mb-6 text-muted-foreground">Décrivez rapidement l'activité que vous souhaitez mettre en vente.</p>
                    <div class="grid gap-4 sm:grid-cols-2">
                      <label class="space-y-2">
                        <span class="text-sm font-semibold">Secteur</span>
                        <input type="text" [value]="sector()" (input)="sector.set($any($event.target).value)" placeholder="E-commerce, SaaS, Agence…" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
                      </label>
                      <label class="space-y-2">
                        <span class="text-sm font-semibold">Région</span>
                        <input type="text" [value]="region()" (input)="region.set($any($event.target).value)" placeholder="Île-de-France, France entière…" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
                      </label>
                      <label class="space-y-2 sm:col-span-2">
                        <span class="text-sm font-semibold">Accroche publique <span class="font-normal text-muted-foreground">(visible par tous, sans détail identifiant)</span></span>
                        <textarea rows="2" maxlength="220" [value]="teaser()" (input)="teaser.set($any($event.target).value)" placeholder="Boutique en ligne de décoration rentable, clientèle fidèle." class="w-full resize-none rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500"></textarea>
                      </label>
                      <label class="space-y-2 sm:col-span-2">
                        <span class="text-sm font-semibold">Description détaillée <span class="font-normal text-muted-foreground">(réservée aux repreneurs avec un accès)</span></span>
                        <textarea rows="5" maxlength="1500" [value]="details()" (input)="details.set($any($event.target).value)" placeholder="Activité, clients, modèle économique, équipe, raison de la cession." class="w-full resize-y rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500"></textarea>
                      </label>
                      <label class="space-y-2 sm:col-span-2">
                        <span class="text-sm font-semibold">Raison de la cession</span>
                        <input type="text" maxlength="400" [value]="saleReason()" (input)="saleReason.set($any($event.target).value)" placeholder="Nouveau projet, départ à la retraite…" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
                      </label>
                    </div>
                  </div>
                }
                @case (2) {
                  <div>
                    <h2 class="mb-3 text-2xl font-bold">2. Indicateurs clés</h2>
                    <p class="mb-6 text-muted-foreground">Renseignez quelques repères financiers simples pour cadrer l'opportunité.</p>
                    <div class="grid gap-4 sm:grid-cols-3">
                      <label class="space-y-2">
                        <span class="text-sm font-semibold">CA annuel</span>
                        <input type="text" [value]="revenue()" (input)="revenue.set($any($event.target).value)" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
                      </label>
                      <label class="space-y-2">
                        <span class="text-sm font-semibold">Marge</span>
                        <input type="text" [value]="margin()" (input)="margin.set($any($event.target).value)" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
                      </label>
                      <label class="space-y-2">
                        <span class="text-sm font-semibold">Ancienneté</span>
                        <input type="text" [value]="age()" (input)="age.set($any($event.target).value)" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
                      </label>
                    </div>
                  </div>
                }
                @case (3) {
                  <div>
                    <h2 class="mb-3 text-2xl font-bold">3. Fourchette de prix</h2>
                    <p class="mb-6 text-muted-foreground">Donnez une fourchette indicative. Vous pourrez l'ajuster ensuite.</p>
                    <div class="grid gap-4 sm:grid-cols-2">
                      <label class="space-y-2">
                        <span class="text-sm font-semibold">Prix minimum</span>
                        <input type="text" [value]="priceMin()" (input)="priceMin.set($any($event.target).value)" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
                      </label>
                      <label class="space-y-2">
                        <span class="text-sm font-semibold">Prix maximum</span>
                        <input type="text" [value]="priceMax()" (input)="priceMax.set($any($event.target).value)" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
                      </label>
                    </div>
                    <p class="mt-4 text-xs text-muted-foreground">Estimation indicative, non contractuelle.</p>
                  </div>
                }
                @case (4) {
                  <div>
                    <h2 class="mb-3 text-2xl font-bold">4. Confidentialité</h2>
                    <p class="mb-6 text-muted-foreground">Le détail complet restera réservé aux comptes avec accès M&A.</p>
                    <div class="rounded-2xl border border-border bg-secondary/50 p-5">
                      <ul class="space-y-3 text-sm text-foreground/80">
                        <li class="flex items-start gap-2">
                          <span class="mt-1 h-2 w-2 rounded-full bg-amber-500"></span>
                          <span>Les visiteurs sans accès repreneur voient une version anonymisée.</span>
                        </li>
                        <li class="flex items-start gap-2">
                          <span class="mt-1 h-2 w-2 rounded-full bg-amber-500"></span>
                          <span>Seuls les repreneurs disposant d'un accès M&A voient le dossier complet et vos coordonnées.</span>
                        </li>
                        <li class="flex items-start gap-2">
                          <span class="mt-1 h-2 w-2 rounded-full bg-amber-500"></span>
                          <span>Vous gardez la main sur les informations sensibles communiquées ensuite.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                }
                @case (5) {
                  <div>
                    <h2 class="mb-3 text-2xl font-bold">5. Aperçu et publication</h2>
                    <p class="mb-6 text-muted-foreground">
                      Relisez votre annonce avant de la publier.
                    </p>
                    <div class="rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
                      <div class="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Résumé</div>
                      <div class="space-y-2 text-sm text-foreground/80">
                        <div><strong>Accroche :</strong> {{ teaser() || 'À compléter' }}</div>
                        <div><strong>Secteur :</strong> {{ sector() || 'À préciser' }}</div>
                        <div><strong>Fourchette :</strong> {{ priceMin() || '...' }} - {{ priceMax() || '...' }}</div>
                      </div>
                    </div>
                    <div class="mt-5 rounded-2xl border border-border bg-secondary/50 p-5">
                      <div class="mb-2 text-sm font-bold text-foreground">Publication gratuite</div>
                      <p class="text-sm leading-relaxed text-muted-foreground">
                        Offre de lancement : la publication ne coûte rien. Votre annonce apparaît anonymisée sur la marketplace ;
                        seuls les repreneurs avec un accès M&A voient le dossier complet et peuvent vous contacter.
                      </p>
                    </div>
                  </div>
                }
              }

              <div class="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" (click)="previousStep()" [disabled]="currentStep() === 1" class="rounded-lg border border-border px-5 py-3 font-semibold transition-colors hover:border-amber-500 disabled:cursor-not-allowed disabled:opacity-40">
                  Retour
                </button>

                @if (currentStep() < totalSteps) {
                  <button type="button" (click)="nextStep()" class="rounded-lg bg-amber-500 px-5 py-3 font-semibold text-white transition-colors hover:bg-amber-600">
                    Continuer
                  </button>
                } @else {
                  <button type="button" (click)="submitListing()" [disabled]="isSubmitting()" class="rounded-lg bg-amber-500 px-5 py-3 font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60">
                    {{ finalActionLabel() }}
                  </button>
                }
              </div>
            </div>
          } @else {
            <div class="text-center">
              @if (createdListingId()) {
                <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                  </svg>
                </div>
                <h2 class="mb-3 text-3xl font-bold">Annonce publiée</h2>
                <p class="mx-auto mb-8 max-w-xl leading-relaxed text-muted-foreground">
                  Votre annonce a bien été enregistrée dans Supabase. Elle apparaît maintenant dans la marketplace M&A.
                </p>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                  <a routerLink="/dashboard" class="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-600">
                    Mon tableau de bord
                  </a>
                  <a routerLink="/ma" class="rounded-lg border border-border px-6 py-3 font-semibold transition-colors hover:border-amber-500">
                    Retour aux annonces
                  </a>
                </div>
              } @else {
                <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <h2 class="mb-3 text-3xl font-bold">La publication a échoué</h2>
                <p class="mx-auto mb-8 max-w-xl leading-relaxed text-muted-foreground" role="alert">
                  Votre annonce n'a pas pu être enregistrée. Vérifiez votre connexion puis réessayez.
                </p>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                  <button type="button" (click)="checkoutRequested.set(false)" class="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-600">
                    Revenir à mon annonce
                  </button>
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class MaDeposerComponent {
  private readonly auth = inject(AuthService);
  private readonly maService = inject(MaService);
  private readonly ai = inject(AiService);

  readonly totalSteps = 5;
  readonly currentStep = signal(1);
  readonly checkoutRequested = signal(false);
  readonly isSubmitting = signal(false);
  readonly createdListingId = signal('');

  readonly sector = signal('');
  readonly region = signal('');
  readonly teaser = signal('');
  readonly details = signal('');
  readonly saleReason = signal('');
  readonly revenue = signal('');
  readonly margin = signal('');
  readonly age = signal('');
  readonly priceMin = signal('');
  readonly priceMax = signal('');

  // Préparation de l'annonce par l'IA (backend/app/ma_ai.py).
  readonly aiInput = signal('');
  readonly aiLoading = signal(false);
  readonly aiError = signal('');
  readonly aiApplied = signal(false);
  readonly aiDetails = signal<MaListingDraft['identifying_details']>([]);

  readonly progressPercent = computed(() => Math.round((this.currentStep() / this.totalSteps) * 100));
  readonly finalActionLabel = computed(() => (this.isSubmitting() ? 'Publication…' : 'Publier gratuitement'));

  nextStep(): void {
    this.currentStep.update(step => Math.min(step + 1, this.totalSteps));
  }

  previousStep(): void {
    this.currentStep.update(step => Math.max(step - 1, 1));
  }

  async submitListing(): Promise<void> {
    const user = this.auth.currentUser();

    if (!user || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);

    try {
      const listingId = await this.maService.createListing({
        ownerId: user.uid,
        sector: this.sector().trim() || 'Secteur à préciser',
        region: this.region().trim() || 'France',
        type: 'cession',
        revenue: this.parseNumber(this.revenue()),
        margin: this.parseNumber(this.margin()),
        age: this.parseNumber(this.age()),
        priceMin: this.parseNumber(this.priceMin()),
        priceMax: this.parseNumber(this.priceMax()),
        saleReason: this.saleReason().trim() || 'Cession à qualifier avec le repreneur.',
        description: this.buildDescription(),
        publicSummary: this.teaser().trim() || undefined,
        contactInfo: user.email,
        status: 'active',
      });

      if (listingId) {
        this.createdListingId.set(listingId);
      }

      this.checkoutRequested.set(true);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async prepareWithAi(): Promise<void> {
    if (this.aiLoading()) {
      return;
    }

    this.aiLoading.set(true);
    this.aiError.set('');

    try {
      const draft = await this.ai.draftMaListing(this.aiInput().trim());
      this.sector.set(draft.sector);
      this.region.set(draft.region);
      this.teaser.set(draft.teaser);
      this.details.set(draft.description);
      this.saleReason.set(draft.sale_reason ?? '');
      this.revenue.set(this.formatEuros(draft.revenue));
      this.margin.set(draft.margin === null ? '' : `${draft.margin} %`);
      this.age.set(draft.age === null ? '' : `${draft.age} ans`);
      this.priceMin.set(this.formatEuros(draft.price_min));
      this.priceMax.set(this.formatEuros(draft.price_max));
      this.aiDetails.set(draft.identifying_details);
      this.aiApplied.set(true);
    } catch (error) {
      this.aiError.set(error instanceof Error ? error.message : "L'IA est indisponible pour le moment.");
    } finally {
      this.aiLoading.set(false);
    }
  }

  private formatEuros(value: number | null): string {
    if (value === null) {
      return '';
    }

    return value >= 1_000_000
      ? `${(value / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} M€`
      : `${Math.round(value / 1_000).toLocaleString('fr-FR')} k€`;
  }

  private buildDescription(): string {
    const details = this.details().trim();

    if (details) {
      return details;
    }

    return `${this.sector().trim() || 'Activité'} : CA annuel ${this.revenue() || 'à préciser'}, marge ${this.margin() || 'à préciser'}, ancienneté ${this.age() || 'à préciser'}.`;
  }

  private parseNumber(value: string): number {
    const normalizedValue = value
      .replace(/\s/g, '')
      .replace(',', '.')
      .toLowerCase();
    const numberValue = Number.parseFloat(normalizedValue.replace(/[^0-9.]/g, ''));

    if (Number.isNaN(numberValue)) {
      return 0;
    }

    if (normalizedValue.includes('m€') || normalizedValue.includes('m')) {
      return Math.round(numberValue * 1_000_000);
    }

    if (normalizedValue.includes('k€') || normalizedValue.includes('k')) {
      return Math.round(numberValue * 1_000);
    }

    return Math.round(numberValue);
  }
}
