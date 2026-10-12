import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MaService } from '../../../core/services/ma.service';

@Component({
  selector: 'app-ma-deposer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pb-12 pt-20">
      <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-10 text-center">
          <h1 class="mb-2 text-4xl font-bold">Céder mon entreprise</h1>
          <p class="text-muted-foreground">Le dépôt est gratuit. Seul un teaser anonymisé est public.</p>
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
              @switch (currentStep()) {
                @case (1) {
                  <div>
                    <h2 class="mb-3 text-2xl font-bold">1. Informations générales</h2>
                    <p class="mb-6 text-muted-foreground">Décrivez rapidement l'activité que vous souhaitez mettre en vente.</p>
                    <div class="grid gap-4 sm:grid-cols-2">
                      <label class="space-y-2">
                        <span class="text-sm font-semibold">Nom de l'activité</span>
                        <input type="text" [value]="companyName()" placeholder="Ex. : Boutique Shopify de déco" (input)="companyName.set($any($event.target).value)" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
                      </label>
                      <label class="space-y-2">
                        <span class="text-sm font-semibold">Secteur</span>
                        <input type="text" [value]="sector()" placeholder="Ex. : E-commerce, SaaS…" (input)="sector.set($any($event.target).value)" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
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
                        <input type="text" [value]="revenue()" placeholder="Ex. : 180 k€" (input)="revenue.set($any($event.target).value)" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
                      </label>
                      <label class="space-y-2">
                        <span class="text-sm font-semibold">Marge</span>
                        <input type="text" [value]="margin()" placeholder="Ex. : 25 %" (input)="margin.set($any($event.target).value)" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
                      </label>
                      <label class="space-y-2">
                        <span class="text-sm font-semibold">Ancienneté</span>
                        <input type="text" [value]="age()" placeholder="Ex. : 4 ans" (input)="age.set($any($event.target).value)" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
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
                        <input type="text" [value]="priceMin()" placeholder="Ex. : 150 k€" (input)="priceMin.set($any($event.target).value)" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
                      </label>
                      <label class="space-y-2">
                        <span class="text-sm font-semibold">Prix maximum</span>
                        <input type="text" [value]="priceMax()" placeholder="Ex. : 220 k€" (input)="priceMax.set($any($event.target).value)" class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none focus:border-amber-500">
                      </label>
                    </div>
                    <p class="mt-4 text-xs text-muted-foreground">Estimation indicative, non contractuelle.</p>
                  </div>
                }
                @case (4) {
                  <div>
                    <h2 class="mb-3 text-2xl font-bold">4. Confidentialité</h2>
                    <p class="mb-6 text-muted-foreground">Le détail complet reste réservé aux repreneurs avec un accès validé.</p>
                    <div class="rounded-2xl border border-border bg-secondary/50 p-5">
                      <ul class="space-y-3 text-sm text-foreground/80">
                        <li class="flex items-start gap-2">
                          <span class="mt-1 h-2 w-2 rounded-full bg-amber-500"></span>
                          <span>Les visiteurs sans accès one-shot voient une version anonymisée.</span>
                        </li>
                        <li class="flex items-start gap-2">
                          <span class="mt-1 h-2 w-2 rounded-full bg-amber-500"></span>
                          <span>Vous choisissez les repreneurs avec qui vous échangez.</span>
                        </li>
                        <li class="flex items-start gap-2">
                          <span class="mt-1 h-2 w-2 rounded-full bg-amber-500"></span>
                          <span>Vous gardez la main sur les informations sensibles communiquées ensuite.</span>
                        </li>
                      </ul>
                    </div>
                    <div class="mt-5 rounded-2xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
                      <div class="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Résumé</div>
                      <div class="space-y-2 text-sm text-foreground/80">
                        <div><strong>Activité :</strong> {{ companyName() || 'Votre annonce' }}</div>
                        <div><strong>Secteur :</strong> {{ sector() || 'À préciser' }}</div>
                        <div><strong>Fourchette :</strong> {{ priceMin() || '...' }} - {{ priceMax() || '...' }}</div>
                      </div>
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
                  Votre annonce a bien été enregistrée. Son teaser anonymisé apparaît maintenant dans les annonces.
                </p>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                  <a [routerLink]="['/ma/annonce', createdListingId()]" class="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-600">
                    Voir le dossier
                  </a>
                  <a routerLink="/ma" class="rounded-lg border border-border px-6 py-3 font-semibold transition-colors hover:border-amber-500">
                    Retour aux annonces
                  </a>
                </div>
              } @else {
                <h2 class="mb-3 text-3xl font-bold">La publication n'a pas abouti</h2>
                <p class="mx-auto mb-8 max-w-xl leading-relaxed text-muted-foreground">
                  Votre annonce n'a pas pu être enregistrée. Réessayez dans quelques instants ou contactez-nous.
                </p>
                <button type="button" (click)="checkoutRequested.set(false)" class="rounded-lg bg-amber-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-600">
                  Revenir à mon annonce
                </button>
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

  readonly totalSteps = 4;
  readonly currentStep = signal(1);
  readonly checkoutRequested = signal(false);
  readonly isSubmitting = signal(false);
  readonly createdListingId = signal('');

  readonly companyName = signal('');
  readonly sector = signal('');
  readonly revenue = signal('');
  readonly margin = signal('');
  readonly age = signal('');
  readonly priceMin = signal('');
  readonly priceMax = signal('');

  readonly progressPercent = computed(() => Math.round((this.currentStep() / this.totalSteps) * 100));
  readonly finalActionLabel = computed(() => this.isSubmitting() ? 'Publication…' : "Publier l'annonce");

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
        sector: this.sector().trim() || 'Commerce local',
        region: user.location || 'France',
        type: 'cession',
        revenue: this.parseNumber(this.revenue()),
        margin: this.parseNumber(this.margin()),
        age: this.parseNumber(this.age()),
        priceMin: this.parseNumber(this.priceMin()),
        priceMax: this.parseNumber(this.priceMax()),
        saleReason: 'Cession à qualifier avec le repreneur.',
        description: this.buildDescription(),
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

  private buildDescription(): string {
    return `${this.companyName().trim() || 'Annonce M&A'} - ${this.sector().trim() || 'secteur à préciser'}. CA annuel ${this.revenue() || 'à préciser'}, marge ${this.margin() || 'à préciser'}, ancienneté ${this.age() || 'à préciser'}.`;
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
