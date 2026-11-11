import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MaListingData } from '../../core/data/mock-platform.data';
import { INTRO_SUMMARY, OFFER_PRICES } from '../../core/config/offers';
import { ShowcaseEntry, ShowcaseService } from '../../core/services/showcase.service';
import { FEATURES } from '../../core/config/features';
import { MaService } from '../../core/services/ma.service';
import { AuthService } from '../../core/services/auth.service';
import { isTalentMarketplaceRole } from '../../core/models/user.model';
import { formatEuros, formatMultiple, listingMetrics } from '../../core/ma/listing-metrics';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { SuccessStoriesComponent } from '../../shared/components/success-stories/success-stories.component';

interface LandingFaqItem {
  question: string;
  answer: string;
}

// Accueil de la refonte « reprise ». Système de design : docs/DESIGN.md (fiche de cession, chiffres en avant).
// Cartes de la section « Projets et associés » de l'accueil.
interface TeamCard {
  key: string;
  kind: 'project' | 'talent';
  badge: string;
  initial: string;
  name: string;
  subtitle: string;
  summary: string;
  meta: Array<{ icon: 'stage' | 'place' | 'time' | 'lock' | 'equity'; text: string }>;
  chipsLabel: string;
  chips: string[];
  linkLabel: string;
}

const STAGE_LABELS: Record<string, string> = {
  idea: 'Idée',
  mvp: 'Premier produit',
  growth: 'En croissance',
  established: 'Établi',
};

// Vraies fiches de la vitrine : seulement les champs publics (jamais de nom, photo, localisation ni description).
function toTeamCard(entry: ShowcaseEntry): TeamCard {
  if (entry.kind === 'project') {
    const sector = entry.sector || 'Projet';
    const meta: TeamCard['meta'] = [];
    if (entry.stage) {
      meta.push({ icon: 'stage', text: STAGE_LABELS[entry.stage] ?? entry.stage });
    }
    if (entry.open_to_equity) {
      meta.push({ icon: 'equity', text: 'Ouvert au capital' });
    }
    if (entry.nda_required) {
      meta.push({ icon: 'lock', text: 'Détails sous NDA' });
    }
    return {
      key: entry.profile_id,
      kind: 'project',
      badge: 'Projet',
      initial: sector.charAt(0).toUpperCase(),
      name: sector,
      subtitle: '',
      summary: entry.skills.length ? `Compétences recherchées : ${entry.skills.slice(0, 3).join(', ')}.` : '',
      meta,
      chipsLabel: 'Recherche',
      chips: (entry.looking_for ?? []).slice(0, 3),
      linkLabel: 'Découvrir le projet',
    };
  }

  const title = entry.title || 'Associé';
  return {
    key: entry.profile_id,
    kind: 'talent',
    badge: 'Associé',
    initial: title.charAt(0).toUpperCase(),
    name: title,
    subtitle: '',
    summary: '',
    meta: entry.availability ? [{ icon: 'time', text: entry.availability }] : [],
    chipsLabel: 'Compétences',
    chips: entry.skills.slice(0, 4),
    linkLabel: 'Voir le profil',
  };
}

const EXAMPLE_TEAM_CARDS: TeamCard[] = [
  {
    key: 'exemple-1', kind: 'project', badge: 'Projet', initial: 'L', name: 'Loop Market', subtitle: 'E-commerce responsable',
    summary: 'Une boutique de produits reconditionnés cherche son associé pour accélérer ses ventes.',
    meta: [{ icon: 'stage', text: 'Premières ventes' }, { icon: 'place', text: 'Lyon' }],
    chipsLabel: 'Recherche', chips: ['Associé commercial', 'Acquisition'], linkLabel: 'Découvrir le projet',
  },
  {
    key: 'exemple-2', kind: 'project', badge: 'Projet', initial: 'P', name: 'Planéo', subtitle: 'Logiciel pour les professionnels de santé',
    summary: 'Un outil de planning pour les cabinets médicaux, prêt à accueillir ses premiers utilisateurs.',
    meta: [{ icon: 'stage', text: 'Prototype prêt' }, { icon: 'place', text: 'À distance' }],
    chipsLabel: 'Recherche', chips: ['Associé technique', 'Développement'], linkLabel: 'Découvrir le projet',
  },
  {
    key: 'exemple-3', kind: 'talent', badge: 'Associée', initial: 'S', name: 'Sarah M.', subtitle: 'Growth marketer',
    summary: '5 ans en acquisition. Souhaite rejoindre un projet en phase de lancement.',
    meta: [{ icon: 'place', text: 'Paris' }, { icon: 'time', text: '2 jours / semaine' }],
    chipsLabel: 'Compétences', chips: ['SEO', 'Acquisition', 'Stratégie'], linkLabel: 'Voir le profil',
  },
];

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, FooterComponent, SuccessStoriesComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white">
      <!-- En-tête : titre, sous-titre court et les deux parcours ; à droite (ordinateur), l'illustration annonce + projet. -->
      <section class="relative overflow-hidden bg-primary px-4 pb-10 pt-24 text-white sm:px-6 sm:pb-16 sm:pt-28 lg:px-8 lg:pb-24 lg:pt-36">
        <div class="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] lg:block" aria-hidden="true">
          <div class="absolute -top-10 left-[6%] h-36 w-64 rounded-3xl bg-white/[0.04]"></div>
          <div class="absolute left-[6%] top-[62%] h-72 w-64 rounded-3xl bg-white/[0.04]"></div>
          <div class="absolute -top-10 left-[52%] h-56 w-72 rounded-3xl bg-white/[0.04]"></div>
          <div class="absolute bottom-[-3rem] left-[52%] h-40 w-72 rounded-3xl bg-white/[0.04]"></div>
          <div class="absolute right-[-3rem] top-[10%] h-80 w-24 rounded-3xl bg-white/[0.04]"></div>
        </div>

        <div class="relative mx-auto grid max-w-[78rem] gap-14 lg:grid-cols-12 lg:items-center">
          <div class="lg:col-span-6">
            <h1 class="max-w-[16ch] text-[2.2rem] leading-[1.08] text-white sm:text-[3.5rem] lg:text-[3.75rem]">
              @if (showAssociates) {
                Reprenez une entreprise. Trouvez vos associés.
              } @else {
                Reprenez une entreprise qui a déjà ses clients
              }
            </h1>
            <p class="mt-5 hidden max-w-[48ch] text-lg leading-relaxed text-white/70 sm:block">
              Des entreprises à reprendre partout en France, et des associés pour lancer ou développer votre projet.
            </p>

            <!-- Téléphones : deux boutons courts à la place des cartes. -->
            <div class="mt-7 grid gap-2.5 sm:hidden">
              <a href="#entreprises" (click)="scrollTo($event, 'entreprises')" class="rounded-lg bg-accent px-5 py-3.5 text-center font-semibold text-white">Explorer les entreprises</a>
              @if (showAssociates) {
                <a [routerLink]="associatesHref()" class="rounded-lg border border-white/30 px-5 py-3.5 text-center font-semibold text-white">Trouver des associés</a>
              }
              <a routerLink="/ma/deposer" class="mt-1 text-center font-semibold text-white/80 underline-offset-4 hover:underline">Vendre mon entreprise</a>
            </div>

            <div class="mt-9 hidden gap-3 sm:grid" [class]="showAssociates ? 'sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2' : ''">
              <a href="#entreprises" (click)="scrollTo($event, 'entreprises')" class="group flex flex-col rounded-xl border border-white/20 bg-white/[0.06] p-5 transition-colors hover:border-white/60 hover:bg-white/[0.1]">
                <span class="text-lg font-bold text-white">Explorer les entreprises</span>
                <span class="mt-1.5 flex-1 text-base leading-relaxed text-white/70">Commerces, services, industrie, activités en ligne : découvrez celles qui sont à reprendre.</span>
                <span class="mt-4 whitespace-nowrap font-semibold text-[#9DB8FF] group-hover:text-white">Voir les entreprises&nbsp;→</span>
              </a>
              @if (showAssociates) {
                <a [routerLink]="associatesHref()" class="group flex flex-col rounded-xl border border-white/20 bg-white/[0.06] p-5 transition-colors hover:border-white/60 hover:bg-white/[0.1]">
                  <span class="text-lg font-bold text-white">Trouver des associés et une équipe</span>
                  <span class="mt-1.5 flex-1 text-base leading-relaxed text-white/70">Présentez votre projet ou rejoignez une équipe qui cherche vos compétences.</span>
                  <span class="mt-4 whitespace-nowrap font-semibold text-[#9DB8FF] group-hover:text-white">Voir les projets et associés&nbsp;→</span>
                </a>
              }
            </div>

            <p class="mt-5 hidden text-base text-white/60 sm:block">
              Vous vendez ? <a routerLink="/ma/deposer" class="font-semibold text-white underline-offset-4 hover:underline">Déposer une annonce gratuite</a>
              <span class="mx-1.5" aria-hidden="true">·</span>
              <a routerLink="/estimation" class="font-semibold text-white underline-offset-4 hover:underline">Estimer sa valeur</a>
            </p>
          </div>

          @if (featuredListing(); as item) {
            <figure class="relative hidden lg:col-span-6 lg:block lg:min-h-[30rem]">
              <article class="relative mx-auto max-w-[27rem] rounded-2xl bg-[#DCE5F7] p-6 text-primary shadow-2xl sm:p-7 lg:absolute lg:left-0 lg:top-0 lg:w-[25rem]" aria-label="Annonce en ligne">
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="text-sm font-semibold text-primary/60">{{ item.listing.type }} · {{ item.listing.region }}</p>
                    <h2 class="mt-1 text-xl leading-snug text-primary">{{ item.listing.sector }}</h2>
                  </div>
                  <span class="flex-shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-sm font-semibold text-[#A3341C]">Confidentiel</span>
                </div>
                <p class="mt-3 line-clamp-2 text-base text-primary/75">{{ item.listing.summary }}</p>
                <dl class="tabular mt-5 grid grid-cols-3 gap-2">
                  <div class="rounded-lg bg-white/70 p-3">
                    <dt class="text-sm text-primary/60">CA</dt>
                    <dd class="mt-0.5 font-bold">{{ euros(item.metrics.revenue) }}</dd>
                  </div>
                  <div class="rounded-lg bg-white/70 p-3">
                    <dt class="text-sm text-primary/60">Bénéfice</dt>
                    <dd class="mt-0.5 font-bold">{{ euros(item.metrics.netProfit) }}</dd>
                  </div>
                  <div class="rounded-lg bg-white/70 p-3">
                    <dt class="text-sm text-primary/60">Marge</dt>
                    <dd class="mt-0.5 font-bold">{{ item.listing.margin }}</dd>
                  </div>
                </dl>
                <div class="mt-4 space-y-2" aria-hidden="true">
                  <div class="h-2.5 w-11/12 rounded bg-primary/10"></div>
                  <div class="h-2.5 w-3/4 rounded bg-primary/10"></div>
                </div>
                <div class="mt-5 rounded-xl bg-primary p-4 text-white">
                  <p class="text-sm text-white/65">Prix demandé</p>
                  <p class="tabular mt-0.5 text-2xl font-bold"><span class="whitespace-nowrap">{{ item.listing.priceMin }}</span> à <span class="whitespace-nowrap">{{ item.listing.priceMax }}</span></p>
                  @if (item.metrics.multiple !== null) {
                    <p class="tabular text-sm text-white/65">{{ multiple(item.metrics.multiple) }} le bénéfice annuel</p>
                  }
                </div>
              </article>

              @if (showAssociates) {
                <aside class="relative z-10 mx-auto -mt-4 w-[20rem] max-w-full rounded-2xl bg-[#DCE5F7] p-5 text-primary shadow-2xl lg:absolute lg:bottom-0 lg:right-0 lg:mt-0" aria-label="Exemple de projet qui constitue son équipe">
                  <p class="text-sm font-semibold text-primary/60">Exemple de projet · Lyon</p>
                  <div class="mt-3 flex items-center gap-3">
                    <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-accent font-bold text-white" aria-hidden="true">P</span>
                    <div class="min-w-0">
                      <p class="font-bold leading-snug">Logiciel de planning santé</p>
                      <p class="text-sm text-primary/70">Cherche à compléter son équipe</p>
                    </div>
                  </div>
                  <div class="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
                    <span class="rounded-lg bg-white/70 px-2.5 py-1.5">Associé technique</span>
                    <span class="rounded-lg bg-white/70 px-2.5 py-1.5">Profil commercial</span>
                  </div>
                  <div class="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold" aria-hidden="true">
                    <span class="rounded-lg border border-primary/25 py-2 text-center text-primary/70">Plus tard</span>
                    <span class="rounded-lg bg-accent py-2 text-center text-white">Rejoindre</span>
                  </div>
                </aside>
              } @else {
                <aside class="relative z-10 mx-auto -mt-4 w-[20rem] max-w-full rounded-2xl bg-[#DCE5F7] p-5 text-primary shadow-2xl lg:absolute lg:bottom-0 lg:right-0 lg:mt-0" aria-label="Exemple de profil repreneur">
                  <p class="text-sm font-semibold text-primary/60">Exemple de profil repreneur</p>
                  <div class="mt-3 flex items-center gap-3">
                    <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white" aria-hidden="true">R</span>
                    <div class="min-w-0">
                      <p class="font-bold leading-snug">Ancien directeur commercial</p>
                      <p class="text-sm text-primary/70">Budget 300 à 600 k€ · E-commerce</p>
                    </div>
                  </div>
                  <div class="mt-4 space-y-2" aria-hidden="true">
                    <div class="h-2.5 w-full rounded bg-primary/10"></div>
                    <div class="h-2.5 w-2/3 rounded bg-primary/10"></div>
                  </div>
                  <div class="mt-4 grid grid-cols-2 gap-2 text-sm font-semibold" aria-hidden="true">
                    <span class="rounded-lg border border-primary/25 py-2 text-center text-primary/70">Refuser</span>
                    <span class="rounded-lg bg-accent py-2 text-center text-white">Accepter</span>
                  </div>
                </aside>
              }
            </figure>
          }
        </div>
      </section>

      <!-- Entreprises à reprendre : recherche et filtres, puis les annonces du moment. -->
      <section id="entreprises" class="scroll-mt-20 px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20" aria-labelledby="latest-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="latest-title" class="text-center text-3xl text-primary sm:text-4xl">Entreprises à reprendre</h2>
          <p class="mx-auto mt-3 hidden max-w-[60ch] text-center text-lg text-muted-foreground sm:block">{{ introSummary }}</p>

          <div class="mx-auto mt-6 max-w-3xl sm:mt-8 rounded-xl bg-white p-2 shadow-lg ring-1 ring-border" role="search">
            <div class="flex flex-col gap-2 sm:flex-row">
              <label for="hero-search" class="sr-only">Rechercher une entreprise</label>
              <input
                id="hero-search"
                type="search"
                [value]="heroQuery()"
                (input)="heroQuery.set($any($event.target).value)"
                (keydown.enter)="search()"
                placeholder="Secteur, ville, mot-clé"
                class="min-w-0 flex-1 rounded-lg px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground"
              >
              <label for="hero-revenue" class="sr-only">Chiffre d'affaires</label>
              <select id="hero-revenue" [value]="heroRevenue()" (change)="heroRevenue.set($any($event.target).value)" class="rounded-lg border border-border bg-secondary px-3 py-3 text-base text-foreground outline-none sm:block sm:w-56" [class.hidden]="!filtersOpen()">
                <option value="">Tout chiffre d'affaires</option>
                <option value="0-100000">Moins de 100 k€</option>
                <option value="100000-500000">100 à 500 k€</option>
                <option value="500000-1000000">500 k€ à 1 M€</option>
                <option value="1000000-">Plus de 1 M€</option>
              </select>
              <div class="flex gap-2">
                <button type="button" (click)="filtersOpen.set(!filtersOpen())" [attr.aria-expanded]="filtersOpen()" class="rounded-lg border border-border px-4 py-3 font-semibold text-primary sm:hidden">Filtres</button>
                <button type="button" (click)="search()" class="flex-1 rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent/90">Rechercher</button>
              </div>
            </div>
          </div>

          @if (latestListings().length > 0) {
            <div class="mt-6 grid gap-4 sm:mt-10 sm:gap-6 md:grid-cols-3 max-sm:[&>*:nth-child(3)]:hidden">
              @for (item of latestListings(); track item.listing.id) {
                <a [routerLink]="['/ma/annonce', item.listing.id]" class="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-border transition-shadow hover:shadow-xl">
                  <p class="bg-primary px-5 py-3 text-sm font-semibold text-white">{{ item.listing.sector }} · {{ item.listing.region }}</p>
                  <div class="flex flex-1 flex-col p-5">
                    <h3 class="line-clamp-2 text-lg font-bold leading-snug text-primary group-hover:text-accent sm:line-clamp-3">{{ item.listing.summary }}</h3>
                    <p class="tabular mt-2 truncate text-base text-muted-foreground sm:mt-3">CA {{ euros(item.metrics.revenue) }} · Bénéfice {{ euros(item.metrics.netProfit) }}</p>
                    <div class="mt-auto pt-4 sm:pt-5">
                      <div class="rounded-xl bg-secondary px-4 py-3">
                        <p class="text-sm text-muted-foreground">Prix demandé</p>
                        <p class="tabular font-bold text-amber-600">
                          <span class="whitespace-nowrap">{{ item.listing.priceMin }}</span> à <span class="whitespace-nowrap">{{ item.listing.priceMax }}</span>
                          @if (item.metrics.multiple !== null) {
                            <span class="hidden font-semibold text-muted-foreground sm:inline"> ({{ multiple(item.metrics.multiple) }} le bénéfice)</span>
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </a>
              }
            </div>
          }
          <div class="mt-6 text-center sm:mt-10">
            <a routerLink="/ma" class="inline-block rounded-lg bg-primary px-7 py-3.5 font-semibold text-white transition-colors hover:bg-primary/90"><span class="sm:hidden">Toutes les entreprises</span><span class="hidden sm:inline">Voir toutes les annonces</span></a>
          </div>
        </div>
      </section>

      @if (showAssociates) {
        <!-- Projets et associés : vrais profils de la vitrine publique (anonymisés), sinon exemples fictifs signalés. -->
        <section class="bg-secondary px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20" aria-labelledby="team-title">
          <div class="mx-auto max-w-[78rem]">
            <h2 id="team-title" class="text-center text-3xl text-primary sm:text-4xl">Projets et associés</h2>
            <p class="mx-auto mt-3 hidden max-w-[56ch] text-center text-lg text-muted-foreground sm:block">Trouvez les compétences pour avancer, ou un projet à rejoindre.</p>
            <div class="mt-6 grid gap-4 sm:mt-10 sm:gap-6 md:grid-cols-3 max-sm:[&>*:nth-child(3)]:hidden">
              @for (card of teamCards(); track card.key) {
                <article class="flex flex-col rounded-2xl bg-white p-4 shadow-lg ring-1 ring-border sm:p-6">
                  <div class="flex items-start gap-4">
                    <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center text-lg font-extrabold text-white sm:h-14 sm:w-14 sm:text-xl"
                          [class]="card.kind === 'project' ? 'rounded-xl bg-accent' : 'rounded-full bg-primary'" aria-hidden="true">{{ card.initial }}</span>
                    <div class="min-w-0">
                      <span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide"
                            [class]="card.kind === 'project' ? 'bg-accent/10 text-accent' : 'bg-emerald-50 text-emerald-700'">{{ card.badge }}</span>
                      <h3 class="mt-1.5 text-xl font-bold leading-tight text-primary">{{ card.name }}</h3>
                      @if (card.subtitle) {
                        <p class="mt-0.5 text-sm text-muted-foreground">{{ card.subtitle }}</p>
                      }
                    </div>
                  </div>

                  @if (card.summary) {
                    <p class="mt-4 hidden text-base leading-relaxed text-foreground/85 sm:block">{{ card.summary }}</p>
                  }

                  @if (card.meta.length > 0) {
                    <ul class="mt-4 hidden flex-wrap items-center sm:flex gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                      @for (item of card.meta; track item.text) {
                        <li class="flex items-center gap-1.5">
                          @switch (item.icon) {
                            @case ('stage') {
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V14"/><path d="M10 20V10"/><path d="M16 20V6"/><path d="M22 20V3"/></svg>
                            }
                            @case ('place') {
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>
                            }
                            @case ('time') {
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                            }
                            @case ('lock') {
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            }
                            @default {
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M9 10h4.5a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3H15"/></svg>
                            }
                          }
                          {{ item.text }}
                        </li>
                      }
                    </ul>
                  }

                  @if (card.chips.length > 0) {
                    <p class="mt-3 text-sm font-bold text-primary sm:mt-5">{{ card.chipsLabel }}</p>
                    <ul class="mt-2 flex flex-wrap gap-2">
                      @for (chip of card.chips; track chip) {
                        <li class="rounded-full bg-accent/10 px-3 py-1 text-sm font-semibold text-accent">{{ chip }}</li>
                      }
                    </ul>
                  }

                  <div class="mt-auto pt-3 sm:pt-5">
                    <a [routerLink]="associatesHref()" class="block border-t border-border pt-3 sm:pt-4 font-semibold text-accent hover:underline underline-offset-4">{{ card.linkLabel }}&nbsp;→</a>
                  </div>
                </article>
              }
            </div>
            <div class="mt-6 text-center sm:mt-10">
              <a [routerLink]="associatesHref()" class="inline-block rounded-lg bg-accent px-7 py-3.5 font-semibold text-white transition-colors hover:bg-accent/90"><span class="sm:hidden">Tout explorer&nbsp;→</span><span class="hidden sm:inline">Explorer les projets et associés&nbsp;→</span></a>
              @if (teamCardsAreExamples()) {
                <p class="mt-3 text-sm italic text-muted-foreground">Exemples fictifs</p>
              }
            </div>
          </div>
        </section>
      }

      <!-- Téléphones : fonctionnement et prix réunis dans un bloc court (étapes dépliables). -->
      <section class="px-4 py-10 sm:hidden" aria-labelledby="how-mobile-title">
        <h2 id="how-mobile-title" class="text-center text-2xl text-primary">Comment ça marche</h2>
        <ol class="mt-5 divide-y divide-border rounded-2xl bg-white shadow-sm ring-1 ring-border">
          @for (step of steps; track step.title; let index = $index) {
            <li>
              <details class="group px-4 py-3">
                <summary class="flex cursor-pointer list-none items-center gap-3 font-semibold text-primary">
                  <span class="tabular flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-sm font-extrabold text-accent">{{ index + 1 }}</span>
                  <span class="flex-1">{{ step.title }}</span>
                  <span class="text-lg leading-none text-accent transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p class="mt-2 pl-10 text-base leading-relaxed text-muted-foreground">{{ step.description }}</p>
              </details>
            </li>
          }
        </ol>
        <dl class="mt-4 grid grid-cols-2 gap-2 text-center">
          <div class="rounded-xl bg-secondary px-3 py-3">
            <dt class="text-sm text-muted-foreground">Vendre</dt>
            <dd class="mt-0.5 font-extrabold text-primary">Gratuit</dd>
          </div>
          <div class="rounded-xl bg-secondary px-3 py-3">
            <dt class="text-sm text-muted-foreground">Reprendre</dt>
            <dd class="mt-0.5 font-extrabold text-primary">{{ buyerPrice }} / entreprise</dd>
          </div>
        </dl>
        <p class="mt-3 text-center text-sm text-muted-foreground">Aucune commission sur la vente, aucun abonnement. <a routerLink="/tarifs" class="font-semibold text-accent">Tarifs</a></p>
      </section>

      <section class="hidden px-4 py-14 sm:block sm:px-6 lg:px-8 lg:py-20" aria-labelledby="steps-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="steps-title" class="text-center text-3xl text-primary sm:text-4xl">Comment se passe une reprise</h2>
          <ol class="mt-8 grid gap-3 sm:mt-12 sm:gap-6 md:grid-cols-3">
            @for (step of steps; track step.title; let index = $index) {
              <li class="flex gap-4 rounded-2xl bg-white p-4 shadow-lg ring-1 ring-border sm:block sm:p-7">
                <span class="tabular flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10 font-extrabold text-accent sm:h-11 sm:w-11 sm:text-lg">{{ index + 1 }}</span>
                <div>
                  <h3 class="text-lg font-bold text-primary sm:mt-5 sm:text-xl">{{ step.title }}</h3>
                  <p class="mt-1 text-base leading-relaxed text-muted-foreground sm:mt-2">{{ step.description }}</p>
                </div>
              </li>
            }
          </ol>
        </div>
      </section>

      <!-- Un seul bloc de réassurance : commission, gratuité, prix et confidentialité. -->
      <section class="hidden bg-[#16243B] px-4 py-9 text-white sm:block sm:px-6 lg:px-8" aria-label="Les engagements de GoFounders">
        <dl class="mx-auto grid max-w-[78rem] grid-cols-2 gap-y-8 text-center lg:grid-cols-4">
          @for (fact of facts; track fact.label; let last = $last) {
            <div class="px-4 lg:border-dashed lg:border-white/25" [class.lg:border-r]="!last">
              <dt class="sr-only">{{ fact.label }}</dt>
              <dd class="tabular text-3xl font-extrabold tracking-tight">{{ fact.value }}</dd>
              <dd class="mx-auto mt-1 max-w-[22ch] text-base text-white/70">{{ fact.label }}</dd>
            </div>
          }
        </dl>
      </section>

      <section class="hidden bg-secondary px-4 py-16 sm:block sm:px-6 lg:px-8 lg:py-24" aria-label="Notre conviction">
        <div class="mx-auto grid max-w-[78rem] items-center gap-10 overflow-hidden rounded-3xl bg-white shadow-lg lg:grid-cols-12 lg:gap-0">
          <div class="p-8 sm:p-12 lg:col-span-7">
            <p class="text-[1.75rem] font-bold leading-snug tracking-tight text-primary sm:text-[2.1rem]">
              Une entreprise, ce sont des années de travail, des clients qui vous font confiance, parfois une équipe.
              La transmettre mérite mieux qu'une petite annonce.
            </p>
            <p class="mt-6 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
              Chaque année, des entreprises rentables ferment faute de repreneur, pendant que d'autres cherchent
              à racheter une activité qui tourne déjà. GoFounders les rapproche, discrètement et sans commission.
            </p>
            <p class="mt-5 font-bold text-primary">L'équipe GoFounders</p>
          </div>
          <figure class="h-full lg:col-span-5">
            <img src="/assets/images/provisoire/fondateurs-ecran.jpg" alt="Un fondateur travaille sur le site de son entreprise, sur deux écrans" width="1400" height="933" loading="lazy" class="h-full max-h-[28rem] w-full object-cover object-[15%_center] lg:max-h-none">
          </figure>
        </div>
      </section>

      <div class="hidden sm:block">
        <app-success-stories />
      </div>

      <section class="hidden bg-secondary px-4 py-16 sm:block sm:px-6 lg:px-8 lg:py-24" aria-labelledby="prices-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="prices-title" class="text-center text-3xl text-primary sm:text-4xl">Vendre est gratuit. Une mise en relation coûte {{ buyerPrice }}.</h2>
          <p class="mx-auto mt-3 max-w-[60ch] text-center text-lg text-muted-foreground">
            Aucune commission sur la vente, aucun abonnement.
          </p>
          <div class="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-2">
            @for (row of priceRows; track row.who; let first = $first) {
              <div class="flex flex-col rounded-2xl p-8 shadow-lg" [class]="first ? 'bg-white ring-1 ring-border' : 'bg-primary text-white'">
                <h3 class="text-lg font-bold" [class]="first ? 'text-primary' : 'text-white'">{{ row.who }}</h3>
                <p class="tabular mt-3 text-4xl font-extrabold tracking-tight">{{ row.price }}</p>
                <p class="mt-3 flex-1 text-base" [class]="first ? 'text-muted-foreground' : 'text-white/70'">{{ row.detail }}</p>
                <a [routerLink]="row.href" class="mt-7 rounded-lg px-5 py-3 text-center font-semibold transition-colors" [class]="first ? 'bg-primary text-white hover:bg-primary/90' : 'bg-accent text-white hover:bg-accent/90'">{{ row.cta }}</a>
              </div>
            }
          </div>
          <p class="mt-8 text-center">
            <a routerLink="/tarifs" class="font-semibold text-accent underline-offset-4 hover:underline">{{ allOffersLabel }}</a>
          </p>
        </div>
      </section>

      <section class="bg-secondary px-4 py-10 sm:bg-transparent sm:px-6 sm:py-16 lg:px-8 lg:py-24" aria-labelledby="faq-title">
        <div class="mx-auto max-w-3xl">
          <h2 id="faq-title" class="text-center text-2xl text-primary sm:text-4xl">Questions fréquentes</h2>
          <div class="mt-5 space-y-2 sm:mt-10 sm:space-y-3 max-sm:[&>*:nth-child(n+4)]:hidden">
            @for (item of faq; track item.question) {
              <details class="group rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-border sm:rounded-2xl sm:px-6 sm:py-5">
                <summary class="flex cursor-pointer list-none items-start justify-between gap-6 font-bold text-primary">
                  {{ item.question }}
                  <span class="mt-0.5 text-xl leading-none text-accent transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p class="mt-3 text-base leading-relaxed text-muted-foreground">{{ item.answer }}</p>
              </details>
            }
          </div>
          <p class="mt-8 text-center">
            <a routerLink="/faq" class="font-semibold text-accent underline-offset-4 hover:underline">Toutes les questions</a>
            <span class="mx-2 text-muted-foreground max-sm:hidden" aria-hidden="true">·</span>
            <a routerLink="/contact" class="font-semibold text-accent underline-offset-4 hover:underline max-sm:hidden">Nous contacter</a>
          </p>
        </div>
      </section>

      <!-- Téléphones : petit encart vendeur. -->
      <section class="px-4 py-8 sm:hidden" aria-label="Vendre son entreprise">
        <div class="flex items-center justify-between gap-4 rounded-2xl bg-primary px-5 py-4 text-white">
          <p class="font-semibold">Vous vendez ? Publiez gratuitement.</p>
          <a routerLink="/ma/deposer" class="flex-shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white">Déposer</a>
        </div>
      </section>

      <section class="hidden px-4 pb-16 sm:block sm:px-6 lg:px-8 lg:pb-24" aria-labelledby="sell-title">
        <div class="relative mx-auto max-w-[78rem] overflow-hidden rounded-3xl bg-primary px-6 py-14 text-white sm:px-12 lg:py-16">
          <img src="/assets/images/provisoire/bureau-vue-dessus.jpg" alt="" aria-hidden="true" width="1400" height="933" loading="lazy" class="absolute inset-0 h-full w-full object-cover">
          <div class="absolute inset-0" style="background: rgba(15, 27, 45, 0.86)" aria-hidden="true"></div>
          <div class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="sell-title" class="text-3xl sm:text-4xl">Vous pensez à passer la main ?</h2>
              <p class="mt-3 max-w-[60ch] text-lg leading-relaxed text-white/75">
                Déposez votre annonce gratuitement. Elle reste anonyme : seuls les repreneurs qui acceptent l'engagement de confidentialité et débloquent votre dossier voient le détail et vos coordonnées.
              </p>
            </div>
            <div class="flex flex-shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
              <a routerLink="/estimation" class="rounded-lg border border-white/30 px-6 py-3.5 text-center font-semibold text-white transition-colors hover:border-white/70">Estimer sa valeur d'abord</a>
              <a routerLink="/ma/deposer" class="rounded-lg bg-accent px-6 py-3.5 text-center font-semibold text-white transition-colors hover:bg-accent/90">Déposer mon annonce</a>
            </div>
          </div>
        </div>
      </section>

      <app-footer />
    </div>
  `
})
export class LandingComponent implements OnInit {
  private readonly maService = inject(MaService);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly showcaseService = inject(ShowcaseService);
  readonly introSummary = INTRO_SUMMARY;
  // Aperçu « Projets et associés » : deux projets et un associé de la vitrine publique (profils anonymisés).
  readonly showcase = signal<ShowcaseEntry[]>([]);
  // Tant qu'aucun membre n'est sur la vitrine, des exemples fictifs (signalés comme tels) illustrent la section.
  readonly teamCardsAreExamples = computed(() => this.showcase().length === 0);
  readonly teamCards = computed<TeamCard[]>(() =>
    this.teamCardsAreExamples() ? EXAMPLE_TEAM_CARDS : this.showcase().map(entry => toTeamCard(entry))
  );
  private readonly listings = signal<MaListingData[]>([]);

  readonly heroQuery = signal('');
  readonly heroRevenue = signal('');
  // Téléphones : filtre de chiffre d'affaires replié derrière « Filtres ».
  readonly filtersOpen = signal(false);

  // Uniquement des faits vérifiables : pas de volume ni de nombre de ventes inventés.
  readonly facts = [
    { value: '0 %', label: 'de commission sur la vente' },
    { value: 'Gratuit', label: 'pour publier une annonce' },
    { value: OFFER_PRICES.INTRO.label, label: 'par entreprise pour le dossier et le contact' },
    { value: 'NDA', label: 'accepté par chaque repreneur avant d’ouvrir un dossier' },
  ];

  readonly buyerPrice = OFFER_PRICES.INTRO.label;

  readonly euros = formatEuros;
  readonly multiple = formatMultiple;
  private readonly items = computed(() => this.listings().map(listing => ({ listing, metrics: listingMetrics(listing) })));

  // Annonce réelle montrée dans l'illustration de l'en-tête (en vedette d'abord, sinon la plus récente).
  readonly featuredListing = computed(() => {
    const items = this.items();
    return items.find(item => item.listing.featured) ?? items[0] ?? null;
  });

  // Trois annonces sous les filtres : en vedette d'abord, puis les plus récentes.
  readonly latestListings = computed(() =>
    [...this.items()].sort((a, b) => Number(b.listing.featured ?? false) - Number(a.listing.featured ?? false)).slice(0, 3)
  );

  scrollTo(event: Event, id: string): void {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  search(): void {
    const queryParams: Record<string, string> = {};

    if (this.heroQuery().trim()) {
      queryParams['q'] = this.heroQuery().trim();
    }

    if (this.heroRevenue()) {
      queryParams['ca'] = this.heroRevenue();
    }

    void this.router.navigate(['/ma'], { queryParams, fragment: 'ma-listings' });
  }

  readonly allOffersLabel = FEATURES.pros ? 'Toutes les offres, dont celles des professionnels et l’accompagnement sur devis' : 'Toutes les offres et l’accompagnement sur devis';


  readonly showAssociates = FEATURES.associates;
  // Porteurs de projet et associés connectés : recherche complète ; les autres : vitrine publique.
  readonly associatesHref = computed(() => (isTalentMarketplaceRole(this.auth.currentUser()?.profileType) ? '/recherche' : '/associes'));

  readonly steps = [
    { title: 'Parcourez les annonces', description: 'Secteur, région, chiffres clés et fourchette de prix : les annonces anonymisées sont visibles par tous.' },
    { title: 'Débloquez le dossier', description: `Après un engagement de confidentialité, ${OFFER_PRICES.INTRO.label} ouvrent aussitôt le dossier complet et les coordonnées du cédant, sans attendre son accord.` },
    { title: 'Échangez avec le cédant', description: 'En direct dans la messagerie, sans intermédiaire. Faites-vous accompagner par un expert-comptable et un avocat pour la suite.' },
  ];


  readonly priceRows = [
    { who: 'Cédant', detail: 'Annonce anonymisée, relue avant publication. Vous êtes prévenu à chaque ouverture de votre dossier.', price: 'Gratuit', href: '/ma/deposer', cta: 'Déposer une annonce' },
    { who: 'Repreneur', detail: 'Dossier complet, coordonnées du cédant et messagerie, ouverts aussitôt après l’engagement de confidentialité.', price: `${OFFER_PRICES.INTRO.label} par entreprise`, href: '/ma', cta: 'Voir les annonces' },
  ];

  readonly faq: LandingFaqItem[] = [
    { question: 'Quel type d’entreprises trouve-t-on sur GoFounders ?', answer: 'Des entreprises françaises de tous secteurs : commerces, restaurants, artisans et entreprises du bâtiment, sociétés de services, PME industrielles, mais aussi entreprises en ligne (e-commerce, logiciels, sites, agences). Surtout des TPE et petites PME, de quelques dizaines de milliers d’euros à quelques millions d’euros de chiffre d’affaires.' },
    { question: 'Mon annonce de cession est-elle confidentielle ?', answer: 'Oui. Seule une annonce anonymisée est publique, après relecture par notre équipe. Le dossier complet et vos coordonnées ne s’ouvrent qu’aux repreneurs qui acceptent un engagement de confidentialité et paient l’accès ; vous êtes prévenu à chaque ouverture.' },
    { question: 'Combien coûte la reprise pour un repreneur ?', answer: INTRO_SUMMARY + ' Sans abonnement ni commission sur la vente.' },
    { question: 'GoFounders prend-il une commission sur la vente ?', answer: 'Non. La publication est gratuite pour les cédants et nous ne prenons aucun pourcentage sur le prix de vente.' },
    { question: 'GoFounders m’accompagne-t-il juridiquement ?', answer: 'Non, nous ne fournissons pas de conseil juridique. Nous vous mettons en relation avec des experts juridiques et comptables partenaires pour sécuriser la transaction.' },
  ];

  ngOnInit(): void {
    void this.loadListings();
    if (FEATURES.associates) {
      void this.loadShowcase();
    }
  }

  private async loadShowcase(): Promise<void> {
    const entries = await this.showcaseService.list();
    const projects = entries.filter(entry => entry.kind === 'project').slice(0, 2);
    const talents = entries.filter(entry => entry.kind === 'talent').slice(0, 3 - projects.length);
    this.showcase.set([...projects, ...talents]);
  }

  private async loadListings(): Promise<void> {
    this.listings.set(await this.maService.getListingCards());
  }
}
