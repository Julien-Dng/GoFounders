import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BUSINESS_KIND_LABELS,
  BusinessKind,
  FounderDependence,
  Growth,
  Recurring,
  estimateValue,
} from '../../core/valuation/valuation';
import { FooterComponent } from '../../shared/components/footer/footer.component';

// Estimation gratuite de la valeur d'une entreprise (outil d'acquisition des cédants).
// Calcul par règles dans core/valuation/valuation.ts, affiché en toute transparence.
@Component({
  selector: 'app-estimation',
  standalone: true,
  imports: [RouterLink, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white">
      <section class="px-4 pb-16 pt-24 sm:px-6 lg:px-8 lg:pt-32">
        <div class="mx-auto max-w-[78rem]">
          <header class="max-w-[60ch]">
            <h1 class="text-[2.25rem] leading-tight text-primary sm:text-5xl">Combien vaut votre entreprise ?</h1>
            <p class="mt-4 text-lg leading-relaxed text-muted-foreground">
              Une première fourchette en deux minutes, gratuite et sans inscription. Le calcul est expliqué ligne par ligne.
            </p>
          </header>

          <div class="mt-10 grid gap-10 lg:grid-cols-12">
            <div class="space-y-6 lg:col-span-7">
              <div>
                <label for="est-kind" class="mb-1.5 block font-medium text-primary">Type d'activité</label>
                <select id="est-kind" [value]="kind()" (change)="kind.set($any($event.target).value)" class="w-full rounded border border-input bg-white px-3 py-3 text-base outline-none focus:border-accent">
                  @for (option of kindOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </div>

              <div class="grid gap-6 sm:grid-cols-2">
                <div>
                  <label for="est-revenue" class="mb-1.5 block font-medium text-primary">Chiffre d'affaires annuel (€)</label>
                  <input id="est-revenue" type="number" min="0" step="1000" inputmode="numeric" [value]="revenue() || ''" (input)="revenue.set(toNumber($event))" placeholder="Ex. 280000" class="tabular w-full rounded border border-input bg-white px-3 py-3 text-base outline-none focus:border-accent">
                </div>
                <div>
                  <label for="est-margin" class="mb-1.5 block font-medium text-primary">Marge nette (%)</label>
                  <input id="est-margin" type="number" min="-100" max="100" step="1" inputmode="decimal" [value]="margin() || ''" (input)="margin.set(toNumber($event))" placeholder="Ex. 22" class="tabular w-full rounded border border-input bg-white px-3 py-3 text-base outline-none focus:border-accent">
                  <p class="mt-1 text-sm text-muted-foreground">Bénéfice net divisé par le chiffre d'affaires.</p>
                </div>
              </div>

              <div class="grid gap-6 sm:grid-cols-2">
                <div>
                  <label for="est-age" class="mb-1.5 block font-medium text-primary">Ancienneté (années)</label>
                  <input id="est-age" type="number" min="0" max="100" step="1" inputmode="numeric" [value]="age()" (input)="age.set(toNumber($event))" class="tabular w-full rounded border border-input bg-white px-3 py-3 text-base outline-none focus:border-accent">
                </div>
                <div>
                  <label for="est-growth" class="mb-1.5 block font-medium text-primary">Évolution du chiffre d'affaires</label>
                  <select id="est-growth" [value]="growth()" (change)="growth.set($any($event.target).value)" class="w-full rounded border border-input bg-white px-3 py-3 text-base outline-none focus:border-accent">
                    <option value="baisse">En baisse</option>
                    <option value="stable">Stable (moins de 10 % par an)</option>
                    <option value="croissance">En croissance (10 à 30 % par an)</option>
                    <option value="forte">Forte croissance (plus de 30 % par an)</option>
                  </select>
                </div>
              </div>

              <div class="grid gap-6 sm:grid-cols-2">
                <div>
                  <label for="est-recurring" class="mb-1.5 block font-medium text-primary">Revenus récurrents</label>
                  <select id="est-recurring" [value]="recurring()" (change)="recurring.set($any($event.target).value)" class="w-full rounded border border-input bg-white px-3 py-3 text-base outline-none focus:border-accent">
                    <option value="faible">Moins de 25 % (ventes ponctuelles)</option>
                    <option value="moyenne">25 à 60 % (abonnements, clients fidèles)</option>
                    <option value="forte">Plus de 60 % (abonnements, contrats)</option>
                  </select>
                </div>
                <div>
                  <label for="est-founder" class="mb-1.5 block font-medium text-primary">Votre rôle au quotidien</label>
                  <select id="est-founder" [value]="founder()" (change)="founder.set($any($event.target).value)" class="w-full rounded border border-input bg-white px-3 py-3 text-base outline-none focus:border-accent">
                    <option value="forte">Je fais presque tout moi-même</option>
                    <option value="moyenne">J'ai de l'aide, mais je reste indispensable</option>
                    <option value="faible">L'activité tourne sans moi (équipe, process)</option>
                  </select>
                </div>
              </div>
            </div>

            <aside class="lg:col-span-5" aria-live="polite">
              <div class="rounded-xl border border-border bg-secondary p-6 lg:sticky lg:top-24">
                @if (result(); as estimate) {
                  <p class="text-muted-foreground">Valeur estimée de votre entreprise</p>
                  <p class="tabular mt-2 text-[2.5rem] font-semibold leading-tight tracking-tight text-amber-600">{{ euros(estimate.valueLow) }} à {{ euros(estimate.valueHigh) }}</p>
                  <p class="mt-2 text-sm text-muted-foreground">Estimation indicative, non contractuelle.</p>

                  <dl class="tabular mt-6 space-y-2 border-t border-border pt-5 text-base">
                    <div class="flex justify-between gap-4"><dt class="text-muted-foreground">Bénéfice net annuel</dt><dd class="font-semibold text-primary">{{ euros(estimate.netProfit) }}</dd></div>
                    <div class="flex justify-between gap-4"><dt class="text-muted-foreground">Multiple appliqué</dt><dd class="font-semibold text-primary">{{ multiple(estimate.multipleLow) }} à {{ multiple(estimate.multipleHigh) }}</dd></div>
                  </dl>

                  <div class="mt-5 border-t border-border pt-5">
                    <p class="font-medium text-primary">Ce qui joue sur le multiple</p>
                    <ul class="mt-2 space-y-1.5 text-base">
                      @for (factor of estimate.factors; track factor.label) {
                        <li class="flex justify-between gap-4">
                          <span class="text-foreground/85">{{ factor.label }}</span>
                          <span class="tabular flex-shrink-0 font-medium" [class.text-emerald-700]="factor.effect > 0" [class.text-destructive]="factor.effect < 0" [class.text-muted-foreground]="factor.effect === 0">{{ effect(factor.effect) }}</span>
                        </li>
                      }
                    </ul>
                  </div>

                  <a [routerLink]="'/ma/deposer'" [queryParams]="depositParams()" class="mt-6 block rounded bg-accent px-5 py-3.5 text-center font-medium text-white transition-colors hover:bg-accent/90">
                    Déposer mon annonce avec ces chiffres
                  </a>
                  <p class="mt-2 text-center text-sm text-muted-foreground">Gratuit, anonyme, sans commission sur la vente.</p>
                  <a routerLink="/tarifs" fragment="premium" class="mt-4 block text-center font-medium text-accent underline-offset-4 hover:underline">Être accompagné par un professionnel</a>
                } @else {
                  <p class="font-medium text-primary">Votre estimation s'affiche ici</p>
                  <p class="mt-2 text-base leading-relaxed text-muted-foreground">
                    Indiquez votre chiffre d'affaires et une marge nette positive. Pour une entreprise qui ne dégage pas encore de bénéfice,
                    la valeur dépend surtout de sa croissance et de ses actifs : un professionnel vous aidera à l'évaluer.
                  </p>
                }
              </div>
            </aside>
          </div>

          <section class="mt-16 max-w-[70ch] border-t border-border pt-8" aria-labelledby="method-title">
            <h2 id="method-title" class="text-2xl text-primary">Comment ce calcul fonctionne</h2>
            <p class="mt-3 text-base leading-relaxed text-muted-foreground">
              Les petites entreprises se vendent le plus souvent sur la base d'un multiple de leur bénéfice annuel. Nous partons d'une fourchette
              courante pour votre type d'activité, puis nous l'ajustons selon la croissance, la part de revenus récurrents, l'ancienneté et votre place
              dans l'entreprise. Le résultat est un ordre de grandeur pour préparer une discussion, pas une évaluation : seul un expert-comptable ou
              un conseil en cession, à partir de vos comptes, peut fixer un prix. GoFounders n'assure pas de conseil financier.
            </p>
          </section>
        </div>
      </section>
      <app-footer />
    </div>
  `,
})
export class EstimationComponent {
  readonly kindOptions = (Object.keys(BUSINESS_KIND_LABELS) as BusinessKind[]).map(value => ({ value, label: BUSINESS_KIND_LABELS[value] }));

  readonly kind = signal<BusinessKind>('saas');
  readonly revenue = signal(0);
  readonly margin = signal(0);
  readonly age = signal(3);
  readonly growth = signal<Growth>('stable');
  readonly recurring = signal<Recurring>('moyenne');
  readonly founder = signal<FounderDependence>('moyenne');

  readonly result = computed(() =>
    estimateValue({
      kind: this.kind(),
      revenue: this.revenue(),
      marginPercent: this.margin(),
      ageYears: this.age(),
      growth: this.growth(),
      recurring: this.recurring(),
      founderDependence: this.founder(),
    })
  );

  // Préremplit le dépôt d'annonce (/ma/deposer) avec les chiffres saisis.
  readonly depositParams = computed(() => {
    const estimate = this.result();
    return {
      secteur: BUSINESS_KIND_LABELS[this.kind()],
      ca: this.revenue() || null,
      marge: this.margin() || null,
      anciennete: this.age() || null,
      prixMin: estimate?.valueLow ?? null,
      prixMax: estimate?.valueHigh ?? null,
    };
  });

  toNumber(event: Event): number {
    const value = Number((event.target as HTMLInputElement).value);
    return Number.isFinite(value) ? value : 0;
  }

  euros(value: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
  }

  multiple(value: number): string {
    return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}×`;
  }

  effect(value: number): string {
    if (value === 0) {
      return 'neutre';
    }

    return `${value > 0 ? '+' : '−'}${Math.abs(value).toLocaleString('fr-FR', { maximumFractionDigits: 1 })}×`;
  }
}
