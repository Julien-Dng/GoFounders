import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { MaListingData } from '../../../core/data/mock-platform.data';
import { MaService } from '../../../core/services/ma.service';
import { AiService, MaListingAnalysis } from '../../../core/services/ai.service';
import { AuthService } from '../../../core/services/auth.service';
import { PaymentService } from '../../../core/services/payment.service';
import { StatsService } from '../../../core/services/stats.service';
import { OFFER_PRICES } from '../../../core/config/offers';
import { MA_NDA_VERSION, maNdaArticles } from '../../../core/legal/nda';
import { ListingAccessService, MyAccessRequest } from '../../../core/services/listing-access.service';
import { FEATURES } from '../../../core/config/features';
import { formatEuros, formatMultiple, listingMetrics, publishedLabel } from '../../../core/ma/listing-metrics';
import { ACQUISITION_CHANNELS, AcquisitionChannel, INCLUDED_ASSETS, IncludedAsset, labelOf, lastGrowth, revenueSeries } from '../../../core/ma/listing-options';
import { VerifiedBadgeComponent } from '../../../shared/components/verified-badge/verified-badge.component';

@Component({
  selector: 'app-ma-detail',
  standalone: true,
  imports: [RouterLink, VerifiedBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pb-28 pt-20 lg:pb-16">
      <div class="mx-auto max-w-[78rem] px-4 py-8 sm:px-6 lg:px-8">
        <a routerLink="/ma" class="inline-flex items-center gap-2 text-base text-muted-foreground transition-colors hover:text-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
          Toutes les annonces
        </a>

        @if (listing(); as item) {
          <header class="mt-6 max-w-[62ch]">
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2 text-base text-muted-foreground">
              <span>{{ item.type }}</span>
              @if (published()) {
                <span aria-hidden="true">·</span>
                <span>{{ published() }}</span>
              }
              @if (item.verified) {
                <span class="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-sm font-semibold text-sky-700"><app-verified-badge [size]="16" />Dossier vérifié</span>
              }
              @if (item.featured) {
                <span class="rounded-full border border-amber-500/40 px-2.5 py-0.5 text-sm font-medium text-amber-700">En vedette</span>
              }
            </div>
            <h1 class="mt-3 text-[2rem] leading-tight text-primary sm:text-[2.75rem]">{{ item.title || item.sector + ', ' + item.region }}@if (item.verified) { <app-verified-badge [size]="32" class="ml-2" /> }</h1>
            @if (item.title) {
              <p class="mt-2 text-base font-medium text-muted-foreground">{{ item.sector }} · {{ item.region }}</p>
            }
            <p class="mt-4 text-lg leading-relaxed text-foreground/80">{{ item.summary }}</p>
          </header>

          <dl class="tabular mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border shadow-lg ring-1 ring-border sm:grid-cols-3 lg:grid-cols-6">
            @for (figure of figures(); track figure.label) {
              <div class="bg-white p-4 sm:p-5">
                <dt class="text-sm text-muted-foreground">{{ figure.label }}</dt>
                <dd class="mt-1 text-xl font-bold text-primary sm:text-2xl lg:text-xl xl:text-2xl">{{ figure.value }}</dd>
              </div>
            }
          </dl>
          <p class="mt-2 text-sm text-muted-foreground">Chiffres déclarés par le cédant. Bénéfice et multiple calculés à partir du chiffre d'affaires, de la marge et du milieu de la fourchette de prix. Prix demandé indicatif, non contractuel.</p>

          <div class="mt-10 grid gap-10 lg:grid-cols-[1fr,22rem]">
            <div class="min-w-0 rounded-2xl bg-white p-6 shadow-lg ring-1 ring-border sm:p-8">
              @if (series().length >= 2) {
                <section class="mb-10 border-b border-border pb-8" aria-labelledby="revenue-title">
                  <div class="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <h2 id="revenue-title" class="text-2xl text-primary">Évolution du chiffre d'affaires</h2>
                    @if (growth() !== null) {
                      <p class="tabular font-bold" [class]="growth()! >= 0 ? 'text-emerald-700' : 'text-destructive'">{{ growth()! >= 0 ? '+' : '' }}{{ growth() }} % sur un an</p>
                    }
                  </div>
                  <p class="mt-1 min-h-6 text-base text-muted-foreground" aria-live="polite">{{ hoveredRevenue() || "Chiffre d'affaires annuel déclaré par le cédant" }}</p>
                  <div class="mt-3 flex h-48 items-end justify-around gap-2 border-b border-border px-2" role="img" [attr.aria-label]="seriesSummary()" (mouseleave)="hoveredYear.set(null)">
                    @for (point of series(); track point.year; let last = $last) {
                      <div class="flex h-full flex-1 cursor-default flex-col items-center justify-end" (mouseenter)="hoveredYear.set(point.year)">
                        @if (last) {
                          <span class="tabular mb-1.5 text-sm font-bold text-primary" aria-hidden="true">{{ euros(point.revenue) }}</span>
                        }
                        <div class="w-7 rounded-t-[4px] transition-colors" [class]="hoveredYear() === point.year ? 'bg-primary' : 'bg-accent'" [style.height.%]="barHeight(point.revenue)" [style.min-height.px]="point.revenue > 0 ? 2 : 0"></div>
                      </div>
                    }
                  </div>
                  <div class="mt-2 flex justify-around gap-2 px-2 text-sm text-muted-foreground" aria-hidden="true">
                    @for (point of series(); track point.year) {
                      <span class="tabular flex-1 text-center">{{ point.year }}</span>
                    }
                  </div>
                  <details class="mt-4 text-base">
                    <summary class="cursor-pointer font-semibold text-accent">Voir les données</summary>
                    <table class="tabular mt-3 w-full max-w-sm text-left">
                      <thead class="text-sm text-muted-foreground"><tr><th class="py-1 pr-4 font-semibold">Année</th><th class="py-1 font-semibold">Chiffre d'affaires</th></tr></thead>
                      <tbody>
                        @for (point of series(); track point.year) {
                          <tr class="border-t border-border"><td class="py-1.5 pr-4">{{ point.year }}</td><td class="py-1.5 font-semibold text-primary">{{ euros(point.revenue) }}</td></tr>
                        }
                      </tbody>
                    </table>
                  </details>
                </section>
              }

              @if (activityFacts().length > 0 || includedLabels().length > 0) {
                <section class="mb-10 border-b border-border pb-8" aria-labelledby="activity-title">
                  <h2 id="activity-title" class="text-2xl text-primary">L'activité en bref</h2>
                  @if (activityFacts().length > 0) {
                    <dl class="tabular mt-5 grid gap-4 sm:grid-cols-2">
                      @for (fact of activityFacts(); track fact.label) {
                        <div class="rounded-xl bg-secondary px-4 py-3">
                          <dt class="text-sm text-muted-foreground">{{ fact.label }}</dt>
                          <dd class="mt-0.5 font-bold text-primary">{{ fact.value }}</dd>
                        </div>
                      }
                    </dl>
                  }
                  @if (includedLabels().length > 0) {
                    <h3 class="mt-7 text-lg font-bold text-primary">Inclus dans la vente</h3>
                    <ul class="mt-3 grid gap-2.5 sm:grid-cols-2">
                      @for (label of includedLabels(); track label) {
                        <li class="flex gap-3 text-base text-foreground/85">
                          <svg class="mt-1 flex-shrink-0 text-emerald-700" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                          {{ label }}
                        </li>
                      }
                    </ul>
                  }
                </section>
              }

              @if (hasDossier()) {
              <section aria-labelledby="presentation-title">
                <h2 id="presentation-title" class="text-2xl text-primary">Présentation de l'activité</h2>
                <p class="mt-3 whitespace-pre-line text-lg leading-relaxed text-foreground/85">{{ item.description }}</p>
              </section>

              @if (item.highlights.length > 0) {
                <section class="mt-10 border-t border-border pt-8" aria-labelledby="highlights-title">
                  <h2 id="highlights-title" class="text-2xl text-primary">Points clés</h2>
                  <ul class="mt-4 grid gap-3 sm:grid-cols-2">
                    @for (highlight of item.highlights; track highlight) {
                      <li class="flex gap-3 text-lg text-foreground/85">
                        <svg class="mt-1.5 flex-shrink-0 text-emerald-700" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                        {{ highlight }}
                      </li>
                    }
                  </ul>
                </section>
              }

              <section class="mt-10 border-t border-border pt-8" aria-labelledby="reason-title">
                <h2 id="reason-title" class="text-2xl text-primary">Pourquoi c'est à vendre</h2>
                <p class="mt-3 whitespace-pre-line text-lg leading-relaxed text-foreground/85">{{ item.reason }}</p>
              </section>

              @if (item.growthNotes) {
                <section class="mt-10 border-t border-border pt-8" aria-labelledby="growth-title">
                  <h2 id="growth-title" class="text-2xl text-primary">Pistes de croissance</h2>
                  <p class="mt-3 whitespace-pre-line text-lg leading-relaxed text-foreground/85">{{ item.growthNotes }}</p>
                </section>
              }

              } @else {
                @if (paymentNotice()) {
                  <p class="mb-4 rounded-lg bg-accent/10 px-4 py-3 text-base font-medium text-primary" role="status">{{ paymentNotice() }}</p>
                }
                <section aria-labelledby="locked-title" class="relative min-h-[30rem] overflow-hidden rounded-xl bg-secondary">
                  <div class="space-y-3 p-6 blur-[3px] sm:p-8" aria-hidden="true">
                    @for (width of skeleton; track $index) {
                      <div class="h-3.5 rounded bg-border" [style.width.%]="width"></div>
                    }
                  </div>
                  <div class="absolute inset-0 flex items-center justify-center bg-secondary/60 p-4">
                    <div class="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-sm">
                      <h2 id="locked-title" class="text-xl text-primary">Dans le dossier complet</h2>
                      <ul class="mt-3 space-y-2 text-base text-foreground/85">
                        @for (entry of dossierContents; track entry) {
                          <li class="flex gap-2.5">
                            <svg class="mt-1 flex-shrink-0 text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            {{ entry }}
                          </li>
                        }
                      </ul>
                      @if (canRequest()) {
                        <p class="mt-4 text-base font-semibold" [class]="requestStatusCss()">{{ requestStatusText() }}</p>
                        @if (needsCommitment()) {
                          <button type="button" (click)="scrollToRequest()" class="mt-4 block w-full rounded-lg border border-primary px-5 py-3 text-center font-semibold text-primary transition-colors hover:bg-primary hover:text-white">Débloquer le dossier · {{ introPrice }}</button>
                        } @else if (needsUnlock()) {
                          <button type="button" (click)="buyAccess()" [disabled]="buying()" class="mt-4 block w-full rounded-lg bg-accent px-5 py-3.5 text-center font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60">{{ buying() ? 'Ouverture du paiement…' : unlockLabel }}</button>
                          @if (buyError()) {
                            <p class="mt-3 text-sm font-medium text-red-700" role="alert">{{ buyError() }}</p>
                          }
                        }
                      } @else if (cta()) {
                        @if (cta()!.buy) {
                          <button type="button" (click)="buyAccess()" [disabled]="buying()" class="mt-5 block w-full rounded border border-primary px-5 py-3 text-center font-medium text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-wait disabled:opacity-60">{{ buying() ? 'Ouverture du paiement…' : cta()!.label }}</button>
                        @if (buyError()) {
                          <p class="mt-3 text-sm font-medium text-red-700" role="alert">{{ buyError() }}</p>
                        }
                        } @else {
                          <a [routerLink]="cta()!.link" [queryParams]="cta()!.params" [fragment]="cta()!.fragment" class="mt-5 block rounded border border-primary px-5 py-3 text-center font-medium text-primary transition-colors hover:bg-primary hover:text-white">{{ cta()!.label }}</a>
                        }
                      } @else {
                        <p class="mt-4 text-base text-muted-foreground">{{ lockedMessage() }}</p>
                      }
                    </div>
                  </div>
                </section>

                @if (needsCommitment()) {
                  <section id="demande-acces" class="mt-8 scroll-mt-24 rounded-xl bg-secondary p-6" aria-labelledby="request-title">
                    <h2 id="request-title" class="text-2xl text-primary">Débloquer le dossier et le contact</h2>
                    <p class="mt-2 text-base text-muted-foreground">
                      Acceptez l'engagement de confidentialité envers le cédant, puis payez {{ introPrice }} : le dossier complet,
                      ses coordonnées et la messagerie avec lui s'ouvrent aussitôt, sans attendre son accord
                    </p>
                    <label for="request-message" class="mb-1.5 mt-5 block font-semibold text-primary">Un mot pour le cédant <span class="font-normal text-muted-foreground">(facultatif)</span></label>
                    <textarea id="request-message" rows="5" maxlength="1500" [value]="requestMessage()" (input)="requestMessage.set($any($event.target).value)" class="w-full resize-y rounded-lg border border-input bg-white px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder="Parcours, budget et financement envisagés, pourquoi cette entreprise vous intéresse, délai souhaité."></textarea>
                    <p class="mt-1 text-sm text-muted-foreground">Le cédant est prévenu de votre accès et voit votre nom, votre profil repreneur et ce message</p>

                    <details class="mt-5 rounded-lg bg-white p-4 ring-1 ring-border" [open]="ndaOpen()" (toggle)="ndaOpen.set($any($event.target).open)">
                      <summary class="cursor-pointer font-semibold text-primary">Lire l'engagement de confidentialité</summary>
                      <div class="mt-3 max-h-80 space-y-4 overflow-y-auto pr-2 text-sm leading-relaxed text-foreground/85">
                        @for (article of ndaArticles(); track article.title) {
                          <div>
                            <h3 class="font-semibold text-primary">{{ article.title }}</h3>
                            @for (paragraph of article.paragraphs; track $index) {
                              <p class="mt-1">{{ paragraph }}</p>
                            }
                          </div>
                        }
                        <p class="text-muted-foreground">Version {{ ndaVersion }}. GoFounders n'est pas partie à cet engagement et n'assure pas de conseil juridique</p>
                      </div>
                    </details>
                    <label class="mt-4 flex cursor-pointer items-start gap-3">
                      <input type="checkbox" [checked]="ndaAccepted()" (change)="ndaAccepted.set($any($event.target).checked)" class="mt-1 h-5 w-5 flex-shrink-0 accent-[#1D4ED8]">
                      <span class="text-base text-foreground/85">J'ai lu et j'accepte l'engagement de confidentialité envers le cédant de cette entreprise</span>
                    </label>

                    @if (requestError()) {
                      <p class="mt-4 rounded-lg bg-red-50 px-4 py-3 text-base text-red-800" role="alert">{{ requestError() }}</p>
                    }
                    <button type="button" (click)="sendRequest()" [disabled]="requestBusy() || buying() || !ndaAccepted()" class="mt-5 rounded-lg bg-accent px-6 py-3.5 font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50">
                      {{ requestBusy() || buying() ? 'Ouverture du paiement…' : unlockLabel }}
                    </button>
                  </section>
                }
              }

              <section class="mt-10 border-t border-border pt-8" aria-labelledby="next-title">
                <h2 id="next-title" class="text-2xl text-primary">Les prochaines étapes</h2>
                <ol class="mt-5 space-y-5">
                  @for (step of steps; track step.title; let index = $index) {
                    <li class="flex gap-4">
                      <span class="tabular flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border font-semibold text-primary">{{ index + 1 }}</span>
                      <div>
                        <p class="text-lg font-semibold text-primary">{{ step.title }}</p>
                        <p class="mt-1 text-base leading-relaxed text-muted-foreground">{{ step.text }}</p>
                      </div>
                    </li>
                  }
                </ol>
                @if (features.pros) {
                <a routerLink="/pros" class="mt-5 inline-block font-medium text-accent underline-offset-4 hover:underline">Trouver un expert-comptable ou un avocat dans l'annuaire</a>
                }
              </section>

              @if (isBuyer() && hasDossier()) {
                <section class="mt-10 border-t border-border pt-8" aria-labelledby="analyse-title" aria-live="polite">
                  <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 id="analyse-title" class="text-2xl text-primary">Analyse du dossier</h2>
                      <p class="mt-2 max-w-[60ch] text-base leading-relaxed text-muted-foreground">
                        Points forts, points de vigilance et questions à poser au cédant, préparés par l'IA à partir des informations de l'annonce
                      </p>
                    </div>
                    @if (!analysis()) {
                      <button type="button" (click)="analyse()" [disabled]="analysing()" class="flex-shrink-0 rounded border border-primary px-5 py-2.5 font-medium text-primary transition-colors hover:bg-primary hover:text-white disabled:cursor-wait disabled:opacity-60">
                        {{ analysing() ? 'Analyse en cours…' : 'Analyser ce dossier' }}
                      </button>
                    }
                  </div>

                  @if (analysisError()) {
                    <p class="mt-4 text-base text-destructive" role="alert">{{ analysisError() }}</p>
                  }

                  @if (analysis(); as result) {
                    <p class="mt-6 text-lg leading-relaxed text-foreground/85">{{ result.summary }}</p>
                    <div class="mt-6 grid gap-x-8 gap-y-6 md:grid-cols-2">
                      @for (block of analysisBlocks(); track block.title) {
                        @if (block.items.length > 0) {
                          <div>
                            <h3 class="font-semibold text-primary">{{ block.title }}</h3>
                            <ul class="mt-2 list-disc space-y-1.5 pl-5 text-base leading-relaxed text-foreground/85">
                              @for (point of block.items; track point) {
                                <li>{{ point }}</li>
                              }
                            </ul>
                          </div>
                        }
                      }
                    </div>
                  }

                  <p class="mt-6 text-sm leading-relaxed text-muted-foreground">
                    Analyse générée automatiquement à partir des seules informations de l'annonce, sans vérification. Elle ne constitue ni une
                    valorisation, ni un conseil juridique, comptable ou financier : faites vérifier le dossier par un expert-comptable et un avocat
                    avant toute offre.
                  </p>
                </section>
              }
            </div>

            <aside class="lg:order-none" aria-label="Contacter le cédant">
              <div class="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-border lg:sticky lg:top-24">
                <p class="text-sm text-muted-foreground">Prix demandé</p>
                <p class="tabular mt-1 text-[1.75rem] font-semibold leading-tight text-amber-600"><span class="whitespace-nowrap">{{ item.priceMin }}</span> à <span class="whitespace-nowrap">{{ item.priceMax }}</span></p>
                @if (metrics()?.multiple !== null && metrics()?.multiple !== undefined) {
                  <p class="tabular mt-1 text-base text-muted-foreground">Soit {{ multipleLabel(metrics()!.multiple) }} le bénéfice annuel</p>
                }

                @if (isOwner()) {
                  <p class="mt-5 border-t border-border pt-5 text-base text-foreground/85">C'est votre annonce. Les repreneurs la voient telle qu'affichée ici</p>
                  <a routerLink="/ma/statistiques" class="mt-4 block rounded bg-primary px-5 py-3 text-center font-medium text-white transition-colors hover:bg-primary/90">Voir les statistiques</a>
                  <a routerLink="/ma/mes-annonces" class="mt-3 block text-center font-medium text-accent underline-offset-4 hover:underline">Gérer mes annonces</a>
                } @else if (canContact()) {
                  <a [routerLink]="'/messages'" [queryParams]="{ conversation: item.ownerId }" class="mt-5 block rounded-lg bg-accent px-5 py-3.5 font-semibold text-center font-medium text-white transition-colors hover:bg-accent/90">Contacter le cédant</a>
                  @if (item.contactInfo) {
                    <div class="mt-5 border-t border-border pt-5">
                      <p class="text-sm text-muted-foreground">Coordonnées transmises par le cédant</p>
                      <p class="mt-1 whitespace-pre-line break-words text-base font-medium text-primary">{{ item.contactInfo }}</p>
                    </div>
                  }
                } @else if (canRequest()) {
                  <div class="mt-5 border-t border-border pt-5">
                    <p class="text-base font-semibold" [class]="requestStatusCss()">{{ requestStatusText() }}</p>
                    @if (needsCommitment()) {
                      <button type="button" (click)="scrollToRequest()" class="mt-4 block w-full rounded-lg bg-accent px-5 py-3.5 text-center font-semibold text-white transition-colors hover:bg-accent/90">Débloquer le dossier · {{ introPrice }}</button>
                    } @else if (needsUnlock()) {
                      <button type="button" (click)="buyAccess()" [disabled]="buying()" class="mt-4 block w-full rounded-lg bg-accent px-5 py-3.5 text-center font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60">{{ buying() ? 'Ouverture du paiement…' : unlockLabel }}</button>
                      @if (buyError()) {
                        <p class="mt-3 text-sm font-medium text-red-700" role="alert">{{ buyError() }}</p>
                      }
                    }
                    @if (needsCommitment() || needsUnlock()) {
                      <p class="mt-3 text-sm text-muted-foreground">{{ pricingNote }}</p>
                    }
                  </div>
                } @else if (!hasDossier()) {
                  <div class="mt-5 border-t border-border pt-5">
                    <p class="text-base text-foreground/85">{{ lockedMessage() }}</p>
                    @if (cta(); as action) {
                      @if (action.buy) {
                        <button type="button" (click)="buyAccess()" [disabled]="buying()" class="mt-4 block w-full rounded-lg bg-accent px-5 py-3.5 text-center font-semibold text-white transition-colors hover:bg-accent/90 disabled:cursor-wait disabled:opacity-60">{{ buying() ? 'Ouverture du paiement…' : action.label }}</button>
                        @if (buyError()) {
                          <p class="mt-3 text-sm font-medium text-red-700" role="alert">{{ buyError() }}</p>
                        }
                        <a routerLink="/tarifs" fragment="repreneurs" class="mt-3 block text-center font-medium text-accent underline-offset-4 hover:underline">Ce que comprend l'accès</a>
                      } @else {
                        <a [routerLink]="action.link" [queryParams]="action.params" [fragment]="action.fragment" class="mt-4 block rounded-lg bg-accent px-5 py-3.5 font-semibold text-center font-medium text-white transition-colors hover:bg-accent/90">{{ action.label }}</a>
                      }
                      @if (!isAuthenticated()) {
                        <a routerLink="/connexion" [queryParams]="{ returnUrl: currentUrl() }" class="mt-3 block text-center font-medium text-accent underline-offset-4 hover:underline">J'ai déjà un compte</a>
                      }
                    }
                  </div>
                }

                <ul class="mt-5 space-y-2.5 border-t border-border pt-5 text-base text-foreground/85">
                  <li class="flex gap-2.5">
                    <svg class="mt-1 flex-shrink-0 text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Échanges confidentiels dans la messagerie
                  </li>
                  <li class="flex gap-2.5">
                    <svg class="mt-1 flex-shrink-0 text-muted-foreground" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    Aucune commission sur la vente
                  </li>
                </ul>
              </div>
            </aside>
          </div>

          @if (canContact() || cta() || needsCommitment() || needsUnlock()) {
            <div class="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-border bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
              <div class="min-w-0">
                <p class="text-sm text-muted-foreground">Prix demandé</p>
                <p class="tabular truncate text-lg font-semibold text-amber-600">{{ item.priceMin }} à {{ item.priceMax }}</p>
              </div>
              @if (canContact()) {
                <a [routerLink]="'/messages'" [queryParams]="{ conversation: item.ownerId }" class="flex-shrink-0 rounded bg-accent px-5 py-3 font-medium text-white">Contacter</a>
              } @else if (needsCommitment()) {
                <button type="button" (click)="scrollToRequest()" class="flex-shrink-0 rounded bg-accent px-5 py-3 font-medium text-white">Débloquer · {{ introPrice }}</button>
              } @else if (needsUnlock()) {
                <button type="button" (click)="buyAccess()" [disabled]="buying()" class="flex-shrink-0 rounded bg-accent px-5 py-3 font-medium text-white disabled:opacity-60">{{ buying() ? 'Ouverture…' : 'Débloquer · ' + introPrice }}</button>
              } @else if (cta()) {
                @if (cta()!.buy) {
                  <button type="button" (click)="buyAccess()" [disabled]="buying()" class="flex-shrink-0 rounded bg-accent px-5 py-3 font-medium text-white disabled:opacity-60">{{ buying() ? 'Ouverture…' : cta()!.short }}</button>
                } @else {
                  <a [routerLink]="cta()!.link" [queryParams]="cta()!.params" [fragment]="cta()!.fragment" class="flex-shrink-0 rounded bg-accent px-5 py-3 font-medium text-white">{{ cta()!.short }}</a>
                }
              }
            </div>
          }
        } @else if (loaded()) {
          <div class="mt-10 rounded-2xl bg-white p-10 text-center shadow-lg">
            <p class="text-lg text-muted-foreground">Cette annonce n'existe pas ou n'est plus disponible</p>
            <a routerLink="/ma" class="mt-4 inline-block font-medium text-accent underline-offset-4 hover:underline">Voir les annonces en cours</a>
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
  private readonly payment = inject(PaymentService);
  readonly buying = signal(false);
  readonly buyError = signal('');
  private readonly stats = inject(StatsService);
  private readonly access = inject(ListingAccessService);
  private readonly loadedListing = signal<MaListingData | undefined>(undefined);

  private readonly listingId = toSignal(
    this.route.params.pipe(map((params: Record<string, string>) => params['id'] ?? '')),
    { initialValue: '' }
  );

  readonly listing = computed(() => this.loadedListing());
  readonly loaded = signal(false);
  readonly metrics = computed(() => {
    const listing = this.listing();
    return listing ? listingMetrics(listing) : null;
  });
  readonly published = computed(() => publishedLabel(this.metrics()?.publishedAt ?? null));
  readonly figures = computed(() => {
    const listing = this.listing();
    const metrics = this.metrics();

    if (!listing || !metrics) {
      return [];
    }

    return [
      { label: "Chiffre d'affaires", value: formatEuros(metrics.revenue) },
      { label: 'Bénéfice net', value: formatEuros(metrics.netProfit) },
      { label: 'Marge nette', value: listing.margin },
      { label: 'Multiple du bénéfice', value: formatMultiple(metrics.multiple) },
      { label: 'Ancienneté', value: listing.age },
      { label: 'Type de cession', value: listing.type },
    ];
  });
  readonly features = FEATURES;
  readonly multipleLabel = formatMultiple;
  readonly euros = formatEuros;

  // Annonce enrichie : évolution du chiffre d'affaires et activité (colonnes publiques).
  readonly series = computed(() => {
    const listing = this.listing();
    return listing ? revenueSeries(listing.revenueHistory, listing.revenueYear, this.metrics()?.revenue ?? null) : [];
  });
  readonly growth = computed(() => lastGrowth(this.series()));
  readonly hoveredYear = signal<number | null>(null);
  readonly hoveredRevenue = computed(() => {
    const point = this.series().find(entry => entry.year === this.hoveredYear());
    return point ? `${point.year} : ${formatEuros(point.revenue)}` : '';
  });
  readonly seriesSummary = computed(() =>
    "Chiffre d'affaires annuel : " + this.series().map(point => `${point.year}, ${formatEuros(point.revenue)}`).join(' ; ')
  );
  readonly activityFacts = computed(() => {
    const listing = this.listing();

    if (!listing) {
      return [];
    }

    const facts: Array<{ label: string; value: string }> = [];

    if (listing.teamSize !== null && listing.teamSize !== undefined) {
      facts.push({ label: 'Équipe (hors dirigeant)', value: listing.teamSize === 0 ? 'Aucune, le dirigeant seul' : `${listing.teamSize} ${listing.teamSize > 1 ? 'personnes' : 'personne'}` });
    }

    if (listing.ownerHoursPerWeek !== null && listing.ownerHoursPerWeek !== undefined) {
      facts.push({ label: 'Temps du dirigeant', value: `${listing.ownerHoursPerWeek} h par semaine` });
    }

    if (listing.monthlyVisitors !== null && listing.monthlyVisitors !== undefined) {
      facts.push({ label: 'Visiteurs par mois', value: listing.monthlyVisitors.toLocaleString('fr-FR') });
    }

    if (listing.acquisitionChannels?.length) {
      facts.push({ label: "Canaux d'acquisition", value: listing.acquisitionChannels.map(value => labelOf(ACQUISITION_CHANNELS, value as AcquisitionChannel)).join(', ') });
    }

    return facts;
  });
  readonly includedLabels = computed(() =>
    (this.listing()?.includedAssets ?? []).map(value => labelOf(INCLUDED_ASSETS, value as IncludedAsset))
  );

  barHeight(revenue: number): number {
    const max = Math.max(...this.series().map(point => point.revenue), 1);
    return (revenue / max) * 100;
  }
  readonly isOwner = computed(() => {
    const ownerId = this.listing()?.ownerId;
    return !!ownerId && ownerId === this.auth.currentUser()?.uid;
  });
  // Contact : acheteur (accès vérifié par le guard et par Supabase) face au propriétaire de l'annonce.
  readonly canContact = computed(() => this.hasDossier() && this.isBuyer() && !!this.listing()?.ownerId && !this.isOwner());

  // Dossier complet renvoyé par Supabase (acheteur avec accès, propriétaire, admin) ; sinon partie anonymisée.
  readonly hasDossier = signal(false);
  readonly isAuthenticated = computed(() => this.auth.isAuthenticated());
  readonly currentUrl = computed(() => `/ma/annonce/${this.listingId()}`);
  readonly skeleton = [92, 100, 85, 96, 70, 0, 88, 100, 64, 0, 95, 82, 100, 58];
  readonly dossierContents = [
    "La présentation détaillée de l'activité",
    'Le motif de la cession et les pistes de croissance',
    'Les coordonnées du cédant et la messagerie',
    "L'analyse du dossier (points forts, vigilance, questions)",
  ];
  // Mise en relation à l'unité : engagement de confidentialité puis paiement, sans accord du cédant.
  readonly introPrice = OFFER_PRICES.INTRO.label.replace(/ /g, '\u00a0');
  readonly unlockLabel = `Débloquer le dossier et le contact · ${this.introPrice}`;
  readonly pricingNote = `Paiement unique de ${this.introPrice} pour cette entreprise, sans abonnement.`;
  readonly lockedMessage = computed(() => {
    const role = this.auth.currentUser()?.profileType;

    if (!this.isAuthenticated()) {
      return `Créez votre compte repreneur (gratuit), puis débloquez le dossier complet et le contact du cédant pour ${this.introPrice}.`;
    }

    if (role === 'buyer') {
      return `Débloquez le dossier complet et le contact du cédant pour ${this.introPrice}.`;
    }

    return 'Le dossier complet est réservé aux comptes repreneur.';
  });
  readonly cta = computed(() => {
    if (this.hasDossier()) {
      return null;
    }

    if (!this.isAuthenticated()) {
      return { label: 'Créer un compte repreneur', short: 'Créer un compte', link: '/inscription', params: { profil: 'buyer', returnUrl: this.currentUrl() }, fragment: undefined, buy: false };
    }

    return null;
  });
  readonly steps = [
    { title: 'Débloquez le dossier', text: "Acceptez l'engagement de confidentialité et payez 50 € : le dossier complet, les coordonnées du cédant et la messagerie s'ouvrent aussitôt, sans attendre son accord" },
    { title: 'Demandez les justificatifs', text: "Bilans des trois derniers exercices, relevés de chiffre d'affaires, accès en lecture aux outils (analytics, paiements, comptabilité)" },
    { title: 'Faites-vous accompagner', text: "Un expert-comptable et un avocat vérifient le dossier avant toute lettre d'intention. GoFounders n'intervient pas dans la négociation" },
  ];

  // Analyse de dossier par l'IA : réservée aux repreneurs (contrôle d'accès refait côté back).
  readonly isBuyer = computed(() => this.auth.currentUser()?.profileType === 'buyer');

  // Mise en relation (50 €) : redirection vers le paiement, ou déblocage immédiat en paiement simulé.
  async buyAccess(): Promise<void> {
    const listing = this.listing();

    if (!listing) {
      return;
    }

    this.buyError.set('');
    this.buying.set(true);

    try {
      const result = await this.payment.purchaseForListing('INTRO', listing.id);

      if (!result.success) {
        this.buyError.set(result.message);
        return;
      }

      // Paiement simulé : droits déjà accordés. Stripe : la page est quittée pour le paiement.
      await this.loadListing();
    } finally {
      this.buying.set(false);
    }
  }

  // Demande d'accès au dossier (repreneur avec accès en cours) et engagement de confidentialité.
  readonly myRequest = signal<MyAccessRequest | null>(null);
  readonly requestMessage = signal('');
  readonly ndaAccepted = signal(false);
  readonly ndaOpen = signal(false);
  readonly requestBusy = signal(false);
  readonly requestError = signal('');
  readonly ndaVersion = MA_NDA_VERSION;
  readonly canRequest = computed(() => this.isBuyer() && !this.hasDossier() && !this.isOwner() && !!this.listing());
  // Le cédant a accepté : reste à payer la mise en relation pour ouvrir le dossier et le contact.
  // Engagement de confidentialité déjà accepté : il ne reste qu'à payer pour ouvrir le dossier (pas d'accord du cédant).
  readonly needsUnlock = computed(() => this.canRequest() && !!this.myRequest() && this.myRequest()?.status !== 'refused' && !this.myRequest()?.unlocked);
  // Pas encore d'engagement accepté (ou ancienne demande refusée) : formulaire engagement + paiement.
  readonly needsCommitment = computed(() => this.canRequest() && (!this.myRequest() || this.myRequest()?.status === 'refused'));
  readonly ndaArticles = computed(() => {
    const listing = this.listing();
    return maNdaArticles({
      buyerName: this.auth.currentUser()?.displayName || 'le Repreneur',
      listingLabel: listing ? `${listing.sector}, ${listing.region}` : 'cette annonce',
    });
  });
  readonly requestStatusText = computed(() =>
    this.needsUnlock()
      ? `Engagement de confidentialité accepté. Débloquez le dossier complet et le contact du cédant pour ${this.introPrice}.`
      : `Acceptez l’engagement de confidentialité, puis débloquez le dossier complet et le contact du cédant pour ${this.introPrice}.`
  );
  readonly requestStatusCss = computed(() => (this.needsUnlock() ? 'text-accent' : 'text-foreground/85'));

  scrollToRequest(): void {
    document.getElementById('demande-acces')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async sendRequest(): Promise<void> {
    const listing = this.listing();

    if (!listing || this.requestBusy()) {
      return;
    }

    this.requestBusy.set(true);
    this.requestError.set('');

    try {
      const result = await this.access.requestAccess(listing.id, this.requestMessage().trim());

      if (!result.success) {
        this.requestError.set(result.message);
        return;
      }

      // Engagement enregistré : on enchaîne directement sur le paiement (50 €).
      this.myRequest.set({ status: result.status ?? 'pending', created_at: new Date().toISOString(), decided_at: null, unlocked: false });
      await this.buyAccess();
    } finally {
      this.requestBusy.set(false);
    }
  }
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

  // Retour de Stripe sur la fiche : le webhook peut arriver quelques secondes après le paiement.
  readonly paymentNotice = signal('');

  ngOnInit(): void {
    void this.loadListing().then(() => this.handlePaymentReturn());
  }

  private async handlePaymentReturn(): Promise<void> {
    const outcome = this.route.snapshot.queryParamMap.get('paiement');

    if (outcome === 'annule') {
      this.paymentNotice.set('Paiement annulé : aucun montant n’a été prélevé.');
      return;
    }

    if (outcome !== 'merci' || this.hasDossier()) {
      return;
    }

    this.paymentNotice.set('Paiement reçu : ouverture du dossier en cours…');
    for (const delay of [2000, 3000, 5000, 8000]) {
      await new Promise(resolve => setTimeout(resolve, delay));
      await this.loadListing();
      if (this.hasDossier()) {
        this.paymentNotice.set('');
        return;
      }
    }
    this.paymentNotice.set('Paiement reçu. Le dossier s’ouvre dès que la confirmation de Stripe arrive : rechargez la page dans une minute.');
  }

  private async loadListing(): Promise<void> {
    await this.auth.ensureSessionReady();
    const id = this.listingId();
    const dossier = this.auth.isAuthenticated() ? await this.maService.getListingDetail(id) : undefined;
    const listing = dossier ?? (await this.maService.getPublicListing(id));

    this.hasDossier.set(!!dossier);
    this.loadedListing.set(listing);
    this.loaded.set(true);

    if (listing && !dossier && this.isBuyer()) {
      this.myRequest.set(await this.access.getMyRequest(id));
    }

    // Vue de la page pour tous ; consultation du dossier seulement quand il a réellement été ouvert.
    if (listing) {
      void this.stats.recordListingView(id, 'page');
      if (dossier) {
        void this.stats.recordListingView(id, 'dossier');
      }
    }
  }
}
