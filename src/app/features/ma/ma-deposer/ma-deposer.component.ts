import { FEATURES } from '../../../core/config/features';
import { ChangeDetectionStrategy, Component, WritableSignal, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { MaService } from '../../../core/services/ma.service';
import { canPublishMa } from '../../../core/models/user.model';
import { AiService, MaListingDraft } from '../../../core/services/ai.service';
import {
  ACQUISITION_CHANNELS,
  INCLUDED_ASSETS,
  LISTING_TYPES,
  ListingType,
  RevenuePoint,
  labelOf,
  lastGrowth,
  revenueSeries,
} from '../../../core/ma/listing-options';
import { formatMultiple } from '../../../core/ma/listing-metrics';

@Component({
  selector: 'app-ma-deposer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pb-12 pt-20">
      <div class="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="mb-10 text-center">
          <h1 class="mb-2 text-4xl">{{ editingId() ? 'Modifier mon annonce' : 'Déposer une annonce' }}</h1>
          <p class="text-muted-foreground">{{ editingId() ? 'Après modification, votre annonce repasse en relecture avant d’être de nouveau visible (en général sous 24 h ouvrées).' : 'Publication gratuite pendant le lancement. Votre annonce reste anonymisée et elle est relue par notre équipe avant sa mise en ligne.' }}</p>
        </div>

        <div class="mb-8">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-sm font-semibold text-muted-foreground">Étape {{ currentStep() }} sur {{ totalSteps }}</span>
            <span class="text-sm font-semibold text-accent">{{ progressPercent() }}%</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-muted">
            <div class="h-full rounded-full bg-accent transition-all duration-300" [style.width]="progressPercent() + '%'"></div>
          </div>
        </div>

        <div class="rounded-2xl bg-white shadow-lg ring-1 ring-border p-6 sm:p-10">
          @if (!canPublish()) {
            <div class="text-center">
              <h2 class="mb-2 text-2xl font-semibold">{{ proAccountOffered ? 'Compte pro requis' : 'Bientôt pour les cabinets' }}</h2>
              <p class="mx-auto mb-6 max-w-xl text-muted-foreground">
                @if (proAccountOffered) {
                  Pour publier des annonces pour vos clients et contacter les repreneurs, activez un compte pro.
                } @else {
                  La publication d'annonces pour le compte de vos clients sera bientôt proposée aux cabinets. Écrivez-nous si vous êtes intéressé.
                }
              </p>
              @if (proAccountOffered) {
                <a routerLink="/tarifs" fragment="pros" class="rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent/90">Voir les offres professionnelles</a>
              } @else {
                <a routerLink="/contact" class="rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent/90">Nous contacter</a>
              }
            </div>
          } @else if (!checkoutRequested()) {
            <div class="space-y-8">
              @if (currentStep() === 1) {
                <div class="rounded-2xl border border-accent/20 bg-accent/[0.04] p-5">
                  <div class="flex flex-wrap items-center gap-2">
                    <svg class="text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="m12 3-1.9 5.1L5 10l5.1 1.9L12 17l1.9-5.1L19 10l-5.1-1.9z"/>
                    </svg>
                    <h2 class="text-lg font-semibold text-primary">Préparer mon annonce avec l'IA</h2>
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
                    <p class="text-sm text-muted-foreground">Votre texte sert uniquement à préparer l'annonce, il n'est pas publié tel quel.</p>
                    <button
                      type="button"
                      (click)="prepareWithAi()"
                      [disabled]="aiLoading() || aiInput().trim().length < 40"
                      class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
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
                      <p class="mt-2 text-sm text-amber-900/70">L'annonce proposée ci-dessous les a retirés. Vérifiez qu'il n'en reste aucun avant de publier.</p>
                    </div>
                  } @else if (aiApplied()) {
                    <p class="mt-3 text-sm text-emerald-700" role="status">Annonce préparée : relisez les champs ci-dessous et à chaque étape.</p>
                  }
                </div>
              }
              @switch (currentStep()) {
                @case (1) {
                  <div>
                    <h2 class="mb-2 text-2xl">1. Informations générales</h2>
                    <p class="mb-6 text-muted-foreground">Décrivez rapidement l'activité que vous souhaitez mettre en vente.</p>
                    <div class="grid gap-5 sm:grid-cols-2">
                      <label class="space-y-2">
                        <span class="font-semibold">Secteur</span>
                        <input type="text" [value]="sector()" (input)="sector.set($any($event.target).value)" placeholder="Boulangerie, plomberie, e-commerce, agence…" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20">
                      </label>
                      <label class="space-y-2">
                        <span class="font-semibold">Région</span>
                        <input type="text" [value]="region()" (input)="region.set($any($event.target).value)" placeholder="Île-de-France, France entière…" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20">
                      </label>
                      <fieldset class="sm:col-span-2">
                        <legend class="mb-2 font-semibold">Type de cession</legend>
                        <div class="grid gap-3 sm:grid-cols-3">
                          @for (option of listingTypes; track option.value) {
                            <label class="flex cursor-pointer flex-col rounded-xl p-4 ring-1 transition-colors" [class]="listingType() === option.value ? 'bg-accent/[0.06] ring-2 ring-accent' : 'bg-white ring-border hover:ring-accent/40'">
                              <span class="flex items-center gap-2 font-semibold text-primary">
                                <input type="radio" name="listing-type" [value]="option.value" [checked]="listingType() === option.value" (change)="listingType.set(option.value)" class="accent-[#1D4ED8]">
                                {{ option.label }}
                              </span>
                              <span class="mt-1 text-sm text-muted-foreground">{{ option.hint }}</span>
                            </label>
                          }
                        </div>
                      </fieldset>
                      <label class="space-y-2 sm:col-span-2">
                        <span class="font-semibold">Accroche publique <span class="font-normal text-muted-foreground">(visible par tous, sans détail identifiant)</span></span>
                        <textarea rows="2" maxlength="220" [value]="teaser()" (input)="teaser.set($any($event.target).value)" placeholder="Boutique en ligne de décoration rentable, clientèle fidèle." class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-none"></textarea>
                      </label>
                      <label class="space-y-2 sm:col-span-2">
                        <span class="font-semibold">Description détaillée <span class="font-normal text-muted-foreground">(réservée aux repreneurs avec un accès)</span></span>
                        <textarea rows="5" maxlength="1500" [value]="details()" (input)="details.set($any($event.target).value)" placeholder="Activité, clients, modèle économique, organisation." class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-y"></textarea>
                      </label>
                      <label class="space-y-2 sm:col-span-2">
                        <span class="font-semibold">Raison de la cession <span class="font-normal text-muted-foreground">(réservée aux repreneurs avec un accès)</span></span>
                        <input type="text" maxlength="400" [value]="saleReason()" (input)="saleReason.set($any($event.target).value)" placeholder="Nouveau projet, départ à la retraite…" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20">
                      </label>
                    </div>
                  </div>
                }
                @case (2) {
                  <div>
                    <h2 class="mb-2 text-2xl">2. Chiffres clés</h2>
                    <p class="mb-6 text-muted-foreground">Les repreneurs regardent d'abord le chiffre d'affaires, la marge et leur évolution. Les chiffres des années précédentes sont facultatifs mais rassurent beaucoup.</p>
                    <div class="grid gap-5 sm:grid-cols-2">
                      <label class="space-y-2">
                        <span class="font-semibold">Dernier exercice</span>
                        <select [value]="revenueYear()" (change)="revenueYear.set(+$any($event.target).value)" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20">
                          @for (year of yearOptions; track year) {
                            <option [value]="year" [selected]="year === revenueYear()">{{ year }}</option>
                          }
                        </select>
                      </label>
                      <label class="space-y-2">
                        <span class="font-semibold">Chiffre d'affaires {{ revenueYear() }}</span>
                        <input type="text" inputmode="decimal" [value]="revenue()" (input)="revenue.set($any($event.target).value)" placeholder="Ex. 280 k€" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 tabular">
                      </label>
                      <label class="space-y-2">
                        <span class="font-semibold">Marge nette</span>
                        <input type="text" inputmode="decimal" [value]="margin()" (input)="margin.set($any($event.target).value)" placeholder="Ex. 22 %" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 tabular">
                      </label>
                      <label class="space-y-2">
                        <span class="font-semibold">Ancienneté</span>
                        <input type="text" inputmode="numeric" [value]="age()" (input)="age.set($any($event.target).value)" placeholder="Ex. 5 ans" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 tabular">
                      </label>
                    </div>

                    <fieldset class="mt-8">
                      <legend class="font-semibold">Chiffre d'affaires des années précédentes <span class="font-normal text-muted-foreground">(facultatif)</span></legend>
                      <div class="mt-3 grid gap-4 sm:grid-cols-3">
                        @for (year of historyYears(); track year; let index = $index) {
                          <label class="space-y-2">
                            <span class="text-sm font-semibold text-muted-foreground">{{ year }}</span>
                            <input type="text" inputmode="decimal" [value]="history()[index]" (input)="setHistory(index, $any($event.target).value)" placeholder="Ex. 230 k€" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 tabular">
                          </label>
                        }
                      </div>
                      @if (growthPreview() !== null) {
                        <p class="mt-3 text-base" [class]="growthPreview()! >= 0 ? 'text-emerald-700' : 'text-destructive'">
                          {{ growthPreview()! >= 0 ? '+' : '' }}{{ growthPreview() }} % de chiffre d'affaires sur le dernier exercice
                        </p>
                      }
                    </fieldset>

                    <div class="mt-8 grid gap-5 sm:grid-cols-2">
                      <label class="space-y-2">
                        <span class="font-semibold">Personnes dans l'équipe <span class="font-normal text-muted-foreground">(hors vous)</span></span>
                        <input type="number" min="0" max="10000" inputmode="numeric" [value]="teamSize()" (input)="teamSize.set($any($event.target).value)" placeholder="Ex. 2" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 tabular">
                      </label>
                      <label class="space-y-2">
                        <span class="font-semibold">Votre temps par semaine <span class="font-normal text-muted-foreground">(heures)</span></span>
                        <input type="number" min="0" max="100" inputmode="numeric" [value]="ownerHours()" (input)="ownerHours.set($any($event.target).value)" placeholder="Ex. 20" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 tabular">
                      </label>
                    </div>
                  </div>
                }
                @case (3) {
                  <div>
                    <h2 class="mb-2 text-2xl">3. Activité et ce qui est vendu</h2>
                    <p class="mb-6 text-muted-foreground">Ce qui est inclus dans la vente et d'où viennent vos clients. Tout est facultatif et reste anonyme.</p>

                    <fieldset>
                      <legend class="font-semibold">Ce qui est inclus dans la vente</legend>
                      <div class="mt-3 grid gap-2 sm:grid-cols-2">
                        @for (asset of assetOptions; track asset.value) {
                          <label class="flex cursor-pointer items-center gap-3 rounded-lg px-4 py-3 ring-1 transition-colors" [class]="includedAssets().includes(asset.value) ? 'bg-accent/[0.06] ring-accent' : 'bg-white ring-border hover:ring-accent/40'">
                            <input type="checkbox" [checked]="includedAssets().includes(asset.value)" (change)="toggle(includedAssets, asset.value)" class="h-4 w-4 accent-[#1D4ED8]">
                            <span>{{ asset.label }}</span>
                          </label>
                        }
                      </div>
                    </fieldset>

                    <fieldset class="mt-8">
                      <legend class="font-semibold">Canaux d'acquisition</legend>
                      <div class="mt-3 flex flex-wrap gap-2">
                        @for (channel of channelOptions; track channel.value) {
                          <button type="button" (click)="toggle(channels, channel.value)" [attr.aria-pressed]="channels().includes(channel.value)" class="rounded-full px-4 py-2 text-sm font-semibold transition-colors" [class]="channels().includes(channel.value) ? 'bg-primary text-white' : 'bg-white text-primary ring-1 ring-border hover:ring-accent/40'">{{ channel.label }}</button>
                        }
                      </div>
                    </fieldset>

                    <div class="mt-8 grid gap-5 sm:grid-cols-2">
                      <label class="space-y-2">
                        <span class="font-semibold">Visiteurs du site par mois <span class="font-normal text-muted-foreground">(si votre activité est en ligne)</span></span>
                        <input type="number" min="0" inputmode="numeric" [value]="monthlyVisitors()" (input)="monthlyVisitors.set($any($event.target).value)" placeholder="Ex. 12000" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 tabular">
                      </label>
                    </div>

                    <label class="mt-8 block space-y-2">
                      <span class="font-semibold">Pistes de croissance <span class="font-normal text-muted-foreground">(réservées aux repreneurs avec un accès)</span></span>
                      <textarea rows="4" maxlength="1500" [value]="growthNotes()" (input)="growthNotes.set($any($event.target).value)" placeholder="Ce que vous n'avez pas eu le temps de faire : nouveaux marchés, publicité, nouvelles offres…" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 resize-y"></textarea>
                    </label>
                  </div>
                }
                @case (4) {
                  <div>
                    <h2 class="mb-2 text-2xl">4. Fourchette de prix</h2>
                    <p class="mb-6 text-muted-foreground">Donnez une fourchette indicative. <a routerLink="/estimation" class="font-semibold text-accent underline-offset-4 hover:underline">Estimer la valeur de mon entreprise</a></p>
                    <div class="grid gap-5 sm:grid-cols-2">
                      <label class="space-y-2">
                        <span class="font-semibold">Prix minimum</span>
                        <input type="text" inputmode="decimal" [value]="priceMin()" (input)="priceMin.set($any($event.target).value)" placeholder="Ex. 350 k€" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 tabular">
                      </label>
                      <label class="space-y-2">
                        <span class="font-semibold">Prix maximum</span>
                        <input type="text" inputmode="decimal" [value]="priceMax()" (input)="priceMax.set($any($event.target).value)" placeholder="Ex. 420 k€" class="w-full rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 tabular">
                      </label>
                    </div>
                    @if (multiplePreview()) {
                      <p class="mt-4 text-base text-foreground/85">Soit environ <strong class="tabular">{{ multiplePreview() }}</strong> votre bénéfice annuel, l'indicateur que les repreneurs comparent en premier.</p>
                    }
                    <p class="mt-2 text-sm text-muted-foreground">Estimation indicative, non contractuelle.</p>
                  </div>
                }
                @case (5) {
                  <div>
                    <h2 class="mb-2 text-2xl">5. Confidentialité</h2>
                    <p class="mb-6 text-muted-foreground">Ce que voient les visiteurs, et ce qui reste réservé.</p>
                    <div class="grid gap-4 sm:grid-cols-2">
                      <div class="rounded-xl bg-secondary p-5">
                        <p class="font-semibold text-primary">Visible par tous</p>
                        <ul class="mt-2 space-y-1.5 text-base text-foreground/85">
                          <li>Secteur, région, type de cession</li>
                          <li>Accroche publique</li>
                          <li>Chiffres, évolution, équipe, ce qui est inclus, canaux</li>
                          <li>Fourchette de prix</li>
                        </ul>
                      </div>
                      <div class="rounded-xl bg-primary p-5 text-white">
                        <p class="font-semibold">Réservé aux repreneurs qui débloquent votre dossier</p>
                        <ul class="mt-2 space-y-1.5 text-base text-white/80">
                          <li>Description détaillée</li>
                          <li>Raison de la cession et pistes de croissance</li>
                          <li>Vos coordonnées et la messagerie</li>
                        </ul>
                      </div>
                    </div>
                    <p class="mt-4 text-base text-muted-foreground">Le nom de l'entreprise n'apparaît nulle part : vous le communiquez vous-même, au repreneur de votre choix.</p>

                    <label for="contact-info" class="mt-6 block font-semibold text-primary">Coordonnées transmises aux repreneurs</label>
                    <p class="mt-1 text-sm text-muted-foreground">
                      Visibles uniquement par les repreneurs qui acceptent l'engagement de confidentialité et débloquent votre dossier (50 €).
                      Vous êtes prévenu à chaque ouverture. Ils peuvent aussi vous écrire dans la messagerie.
                    </p>
                    <textarea id="contact-info" rows="3" maxlength="500" [value]="contactInfo()" (input)="contactInfo.set($any($event.target).value)" placeholder="Ex. Jean D., 06 12 34 56 78, jean@exemple.fr, disponible le soir" class="mt-2 w-full resize-y rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"></textarea>
                  </div>
                }
                @case (6) {
                  <div>
                    <h2 class="mb-2 text-2xl">6. Aperçu et publication</h2>
                    <p class="mb-6 text-muted-foreground">Relisez votre annonce avant de la publier.</p>
                    <div class="rounded-2xl bg-secondary p-6">
                      <p class="text-sm font-semibold text-muted-foreground">{{ listingTypeLabel() }} · {{ region() || 'Région à préciser' }}</p>
                      <p class="mt-1 text-xl font-bold text-primary">{{ sector() || 'Secteur à préciser' }}</p>
                      <p class="mt-2 text-base text-foreground/80">{{ teaser() || 'Accroche à compléter' }}</p>
                      <dl class="tabular mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div><dt class="text-sm text-muted-foreground">CA {{ revenueYear() }}</dt><dd class="font-bold text-primary">{{ revenue() || '–' }}</dd></div>
                        <div><dt class="text-sm text-muted-foreground">Marge</dt><dd class="font-bold text-primary">{{ margin() || '–' }}</dd></div>
                        <div><dt class="text-sm text-muted-foreground">Équipe</dt><dd class="font-bold text-primary">{{ teamSize() !== '' ? teamSize() + ' pers.' : '–' }}</dd></div>
                        <div><dt class="text-sm text-muted-foreground">Prix</dt><dd class="font-bold text-amber-600">{{ priceMin() || '…' }} à {{ priceMax() || '…' }}</dd></div>
                      </dl>
                      @if (includedAssets().length > 0) {
                        <p class="mt-4 text-sm text-muted-foreground">Inclus : {{ includedLabels() }}</p>
                      }
                    </div>
                    <div class="mt-5 rounded-2xl bg-white p-5 ring-1 ring-border">
                      <p class="font-semibold text-primary">Publication gratuite</p>
                      <p class="mt-1 text-base leading-relaxed text-muted-foreground">
                        Offre de lancement : la publication ne coûte rien. Votre annonce apparaît anonymisée sur la marketplace ;
                        seuls les repreneurs avec un accès voient le dossier complet et peuvent vous contacter.
                      </p>
                    </div>
                  </div>
                }
              }

              <div class="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" (click)="previousStep()" [disabled]="currentStep() === 1" class="rounded-lg border border-border px-5 py-3 font-semibold transition-colors hover:border-primary disabled:cursor-not-allowed disabled:opacity-40">
                  Retour
                </button>

                @if (currentStep() < totalSteps) {
                  <button type="button" (click)="nextStep()" class="rounded-lg bg-accent px-5 py-3 font-semibold text-white transition-colors hover:bg-accent/90">
                    Continuer
                  </button>
                } @else {
                  <button type="button" (click)="submitListing()" [disabled]="isSubmitting()" class="rounded-lg bg-accent px-5 py-3 font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60">
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
                <h2 class="mb-3 text-3xl font-semibold">{{ editingId() ? 'Modifications enregistrées' : 'Annonce envoyée' }}</h2>
                <p class="mx-auto mb-8 max-w-xl leading-relaxed text-muted-foreground">
                  Notre équipe relit votre annonce avant {{ editingId() ? 'de la remettre en ligne' : 'sa mise en ligne' }}, en général sous 24 h ouvrées :
                  nous vérifions qu'elle est sérieuse et qu'elle ne permet pas de vous reconnaître. Vous serez prévenu dès qu'elle sera visible.
                </p>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                  <a routerLink="/dashboard" class="rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent/90">
                    Mon tableau de bord
                  </a>
                  <a routerLink="/ma/mes-annonces" class="rounded-lg border border-border px-6 py-3 font-semibold transition-colors hover:border-primary">
                    Mettre en avant ou faire vérifier
                  </a>
                </div>
              } @else {
                <div class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <h2 class="mb-3 text-3xl font-semibold">La publication a échoué</h2>
                <p class="mx-auto mb-8 max-w-xl leading-relaxed text-muted-foreground" role="alert">
                  Votre annonce n'a pas pu être enregistrée. Vérifiez votre connexion puis réessayez.
                </p>
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
                  <button type="button" (click)="checkoutRequested.set(false)" class="rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent/90">
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
  // Compte pro des cabinets proposé ou non (features.ts) : sinon, message « bientôt ».
  readonly proAccountOffered = FEATURES.proAccount;
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly maService = inject(MaService);
  private readonly ai = inject(AiService);

  readonly totalSteps = 6;
  readonly currentStep = signal(1);
  readonly checkoutRequested = signal(false);
  readonly canPublish = computed(() => canPublishMa(this.auth.currentUser()));
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

  // Annonce enrichie (supabase/2026-10-26-annonces-enrichies.sql), tout est facultatif.
  readonly listingTypes = LISTING_TYPES;
  readonly assetOptions = INCLUDED_ASSETS;
  readonly channelOptions = ACQUISITION_CHANNELS;
  private readonly thisYear = new Date().getFullYear();
  readonly yearOptions = [this.thisYear, this.thisYear - 1, this.thisYear - 2];
  readonly listingType = signal<ListingType>('cession');
  readonly revenueYear = signal(this.thisYear - 1);
  // Chiffre d'affaires des trois années précédant le dernier exercice, de la plus récente à la plus ancienne.
  readonly history = signal<string[]>(['', '', '']);
  readonly historyYears = computed(() => [1, 2, 3].map(offset => this.revenueYear() - offset));
  readonly teamSize = signal('');
  readonly ownerHours = signal('');
  readonly includedAssets = signal<string[]>([]);
  readonly channels = signal<string[]>([]);
  readonly monthlyVisitors = signal('');
  readonly growthNotes = signal('');

  readonly listingTypeLabel = computed(() => labelOf(LISTING_TYPES, this.listingType()));
  readonly includedLabels = computed(() => this.includedAssets().map(value => INCLUDED_ASSETS.find(asset => asset.value === value)?.label ?? value).join(', '));
  private readonly historyPoints = computed<RevenuePoint[]>(() =>
    this.history()
      .map((value, index) => ({ year: this.historyYears()[index], revenue: this.parseNumber(value) }))
      .filter((point, index) => this.history()[index].trim() !== '' && point.revenue > 0)
  );
  readonly growthPreview = computed(() =>
    lastGrowth(revenueSeries(this.historyPoints(), this.revenueYear(), this.revenue().trim() ? this.parseNumber(this.revenue()) : null))
  );
  readonly multiplePreview = computed(() => {
    const profit = (this.parseNumber(this.revenue()) * this.parseNumber(this.margin())) / 100;
    const prices = [this.priceMin(), this.priceMax()].filter(value => value.trim()).map(value => this.parseNumber(value));
    const price = prices.length ? prices.reduce((sum, value) => sum + value, 0) / prices.length : 0;
    return profit > 0 && price > 0 ? formatMultiple(price / profit) : '';
  });

  // Préparation de l'annonce par l'IA (backend/app/ma_ai.py).
  readonly aiInput = signal('');
  readonly aiLoading = signal(false);
  readonly aiError = signal('');
  readonly aiApplied = signal(false);
  readonly aiDetails = signal<MaListingDraft['identifying_details']>([]);

  constructor() {
    // Chiffres venus de l'estimation gratuite (/estimation).
    const params = this.route.snapshot.queryParamMap;
    const amount = (key: string): number | null => (params.get(key) && Number.isFinite(Number(params.get(key))) ? Number(params.get(key)) : null);
    this.sector.set(params.get('secteur') ?? '');
    this.revenue.set(this.formatEuros(amount('ca')));
    this.margin.set(params.get('marge') ?? '');
    this.age.set(params.get('anciennete') ?? '');
    this.priceMin.set(this.formatEuros(amount('prixMin')));
    this.priceMax.set(this.formatEuros(amount('prixMax')));

    const editing = params.get('modifier');
    if (editing) {
      this.editingId.set(editing);
      void this.loadForEdit(editing);
    }
  }

  readonly progressPercent = computed(() => Math.round((this.currentStep() / this.totalSteps) * 100));
  readonly finalActionLabel = computed(() =>
    this.isSubmitting() ? 'Envoi…' : this.editingId() ? 'Enregistrer les modifications' : 'Envoyer pour publication (gratuit)'
  );

  // Modification d'une annonce existante (/ma/deposer?modifier=<id>), réservée à son propriétaire.
  readonly editingId = signal<string | null>(null);
  // Coordonnées montrées aux repreneurs qui ont débloqué le dossier (par défaut : l'e-mail du compte).
  readonly contactInfo = signal('');

  private async loadForEdit(listingId: string): Promise<void> {
    const row = await this.maService.getMyListingRow(listingId);

    if (!row) {
      this.editingId.set(null);
      return;
    }

    this.contactInfo.set(row.contact_info ?? '');
    this.sector.set(row.sector);
    this.region.set(row.region);
    this.listingType.set(row.type);
    this.teaser.set(row.public_summary ?? '');
    this.details.set(row.confidential_description ?? '');
    this.saleReason.set(row.sale_reason ?? '');
    this.revenue.set(this.formatEuros(row.revenue));
    this.margin.set(row.margin === null ? '' : `${row.margin} %`);
    this.age.set(row.age === null ? '' : `${row.age} ans`);
    this.priceMin.set(this.formatEuros(row.price_min));
    this.priceMax.set(this.formatEuros(row.price_max));

    if (row.revenue_year && this.yearOptions.includes(row.revenue_year)) {
      this.revenueYear.set(row.revenue_year);
    }

    const history = row.revenue_history ?? [];
    this.history.set(this.historyYears().map(year => this.formatEuros(history.find(point => point.year === year)?.revenue ?? null)));
    this.teamSize.set(row.team_size === null || row.team_size === undefined ? '' : String(row.team_size));
    this.ownerHours.set(row.owner_hours_per_week === null || row.owner_hours_per_week === undefined ? '' : String(row.owner_hours_per_week));
    this.monthlyVisitors.set(row.monthly_visitors === null || row.monthly_visitors === undefined ? '' : String(row.monthly_visitors));
    this.includedAssets.set(row.included_assets ?? []);
    this.channels.set(row.acquisition_channels ?? []);
    this.growthNotes.set(row.growth_notes ?? '');
  }

  nextStep(): void {
    this.currentStep.update(step => Math.min(step + 1, this.totalSteps));
  }

  previousStep(): void {
    this.currentStep.update(step => Math.max(step - 1, 1));
  }

  setHistory(index: number, value: string): void {
    this.history.update(current => current.map((entry, position) => (position === index ? value : entry)));
  }

  toggle(list: WritableSignal<string[]>, value: string): void {
    list.update(current => (current.includes(value) ? current.filter(entry => entry !== value) : [...current, value]));
  }

  private optionalInteger(value: string, max: number): number | null {
    if (String(value).trim() === '') {
      return null;
    }

    const number = Math.round(Number(value));
    return Number.isFinite(number) && number >= 0 ? Math.min(number, max) : null;
  }

  async submitListing(): Promise<void> {
    const user = this.auth.currentUser();

    if (!user || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);

    try {
      const editing = this.editingId();
      const payload = {
        sector: this.sector().trim() || 'Secteur à préciser',
        region: this.region().trim() || 'France',
        type: this.listingType(),
        revenue: this.parseNumber(this.revenue()),
        margin: this.parseNumber(this.margin()),
        age: this.parseNumber(this.age()),
        priceMin: this.parseNumber(this.priceMin()),
        priceMax: this.parseNumber(this.priceMax()),
        saleReason: this.saleReason().trim() || 'Cession à qualifier avec le repreneur.',
        description: this.buildDescription(),
        publicSummary: this.teaser().trim() || undefined,
        contactInfo: this.contactInfo().trim() || user.email,
        enrichment: {
          revenueYear: this.revenue().trim() ? this.revenueYear() : null,
          revenueHistory: this.historyPoints(),
          includedAssets: this.includedAssets(),
          monthlyVisitors: this.optionalInteger(this.monthlyVisitors(), 100_000_000),
          acquisitionChannels: this.channels(),
          teamSize: this.optionalInteger(this.teamSize(), 10_000),
          ownerHoursPerWeek: this.optionalInteger(this.ownerHours(), 100),
          growthNotes: this.growthNotes().trim(),
        },
      };

      if (editing) {
        if (await this.maService.updateListing(editing, payload)) {
          this.createdListingId.set(editing);
        }
      } else {
        const listingId = await this.maService.createListing({ ...payload, ownerId: user.uid, status: 'active' });

        if (listingId) {
          this.createdListingId.set(listingId);
        }
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
      if (draft.revenue_year && this.yearOptions.includes(draft.revenue_year)) {
        this.revenueYear.set(draft.revenue_year);
      }
      if (draft.revenue_history?.length) {
        this.history.set(this.historyYears().map(year => this.formatEuros(draft.revenue_history!.find(point => point.year === year)?.revenue ?? null)));
      }
      if (draft.included_assets?.length) {
        this.includedAssets.set(draft.included_assets);
      }
      if (draft.acquisition_channels?.length) {
        this.channels.set(draft.acquisition_channels);
      }
      if (draft.monthly_visitors !== null && draft.monthly_visitors !== undefined) {
        this.monthlyVisitors.set(String(draft.monthly_visitors));
      }
      if (draft.team_size !== null && draft.team_size !== undefined) {
        this.teamSize.set(String(draft.team_size));
      }
      if (draft.owner_hours_per_week !== null && draft.owner_hours_per_week !== undefined) {
        this.ownerHours.set(String(draft.owner_hours_per_week));
      }
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
