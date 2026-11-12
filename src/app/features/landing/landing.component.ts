import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MaListingData } from '../../core/data/mock-platform.data';
import { FREE_CONTACTS_PER_MONTH, INTRO_SUMMARY, OFFER_PRICES } from '../../core/config/offers';
import { ShowcaseEntry, ShowcaseService } from '../../core/services/showcase.service';
import { FEATURES } from '../../core/config/features';
import { MaService } from '../../core/services/ma.service';
import { AuthService } from '../../core/services/auth.service';
import { isTalentMarketplaceRole } from '../../core/models/user.model';
import { formatEuros, formatMultiple, listingMetrics } from '../../core/ma/listing-metrics';
import { INCLUDED_ASSETS, IncludedAsset, labelOf, revenueSeries } from '../../core/ma/listing-options';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { SuccessStoriesComponent } from '../../shared/components/success-stories/success-stories.component';
import { VerifiedBadgeComponent } from '../../shared/components/verified-badge/verified-badge.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

interface LandingFaqItem {
  question: string;
  answer: string;
}

// Accueil de la refonte « reprise ». Système de design : docs/DESIGN.md (fiche de cession, chiffres en avant).
// Cartes de la section « Projets et associés » de l'accueil.
interface TeamCard {
  key: string;
  kind: 'project' | 'talent';
  // Secteur (pictogramme) et stade du projet (0 : idée … 3 : établi ; -1 : inconnu ou associé).
  sector: string;
  stageIndex: number;
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

const STAGE_ORDER = ['idea', 'mvp', 'growth', 'established'];

// Stade saisi librement ou par code (« mvp », « MVP », « Premier produit »…) → position 0 à 3, sinon -1.
function stageIndexOf(stage: string | null | undefined): number {
  const value = (stage ?? '').trim().toLowerCase();
  const aliases: string[][] = [
    ['idea', 'idée', 'idee'],
    ['mvp', 'premier produit', 'prototype'],
    ['growth', 'croissance', 'en croissance'],
    ['established', 'établi', 'etabli'],
  ];
  return aliases.findIndex(names => names.includes(value));
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
    // Le titre dit la compétence réellement recherchée ; le sous-titre, l'activité et le stade.
    const needs = [...(entry.looking_for ?? []), ...entry.skills].filter((value, index, all) => value && all.indexOf(value) === index);
    const need = needs[0] ?? 'Associé';
    const stage = entry.stage ? STAGE_LABELS[entry.stage] ?? entry.stage : '';
    const activity = entry.sector ? `Projet ${entry.sector.toLowerCase()}` : 'Projet';
    const meta: TeamCard['meta'] = [];
    if (entry.open_to_equity) {
      meta.push({ icon: 'equity', text: 'Ouvert au capital' });
    }
    if (entry.nda_required) {
      meta.push({ icon: 'lock', text: 'Détails sous NDA' });
    }
    return {
      key: entry.profile_id,
      kind: 'project',
      sector: entry.sector ?? '',
      stageIndex: stageIndexOf(entry.stage),
      badge: 'Projet',
      initial: (entry.sector || need).charAt(0).toUpperCase(),
      name: `Recherche : ${need}`,
      subtitle: [activity, stage].filter(Boolean).join(' · '),
      summary: '',
      meta,
      chipsLabel: 'Aussi recherché',
      chips: needs.slice(1, 4),
      linkLabel: 'Découvrir le projet',
    };
  }

  const title = entry.title || (entry.skills[0] ? `Associé ${entry.skills[0]}` : 'Associé');
  return {
    key: entry.profile_id,
    kind: 'talent',
    sector: '',
    stageIndex: -1,
    badge: 'Associé',
    initial: title.charAt(0).toUpperCase(),
    name: title,
    subtitle: entry.availability ?? '',
    summary: '',
    meta: [],
    chipsLabel: 'Compétences',
    chips: entry.skills.slice(0, 4),
    linkLabel: 'Voir le profil',
  };
}

const EXAMPLE_TEAM_CARDS: TeamCard[] = [
  {
    key: 'exemple-1', kind: 'project', sector: 'E-commerce', stageIndex: 1, badge: 'Projet', initial: 'L', name: 'Loop Market', subtitle: 'E-commerce responsable',
    summary: 'Une boutique de produits reconditionnés cherche son associé pour accélérer ses ventes',
    meta: [{ icon: 'place', text: 'Lyon' }, { icon: 'equity', text: 'Ouvert au capital' }],
    chipsLabel: 'Recherche', chips: ['Associé commercial', 'Acquisition'], linkLabel: 'Découvrir le projet',
  },
  {
    key: 'exemple-2', kind: 'project', sector: 'Santé', stageIndex: 1, badge: 'Projet', initial: 'P', name: 'Planéo', subtitle: 'Logiciel pour les professionnels de santé',
    summary: 'Un outil de planning pour les cabinets médicaux, prêt à accueillir ses premiers utilisateurs',
    meta: [{ icon: 'place', text: 'À distance' }, { icon: 'lock', text: 'Détails sous NDA' }],
    chipsLabel: 'Recherche', chips: ['Associé technique', 'Développement'], linkLabel: 'Découvrir le projet',
  },
  {
    key: 'exemple-3', kind: 'talent', sector: '', stageIndex: -1, badge: 'Associée', initial: 'S', name: 'Sarah M.', subtitle: 'Growth marketer',
    summary: '5 ans en acquisition. Souhaite rejoindre un projet en phase de lancement',
    meta: [{ icon: 'place', text: 'Paris' }, { icon: 'time', text: '2 jours / semaine' }],
    chipsLabel: 'Compétences', chips: ['SEO', 'Acquisition', 'Stratégie'], linkLabel: 'Voir le profil',
  },
];

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, NgTemplateOutlet, FooterComponent, SuccessStoriesComponent, VerifiedBadgeComponent, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white">
      <!-- En-tête : titre, sous-titre court et les deux parcours ; à droite (ordinateur), l'illustration annonce + projet. -->
      <section class="relative overflow-hidden bg-primary px-4 pb-8 pt-20 text-white sm:px-6 sm:pb-14 sm:pt-28 lg:px-8 lg:pb-20 lg:pt-32">
        <div class="pointer-events-none absolute inset-y-0 right-0 hidden w-[52%] lg:block" aria-hidden="true">
          <div class="absolute -top-10 left-[6%] h-36 w-64 rounded-3xl bg-white/[0.04]"></div>
          <div class="absolute left-[6%] top-[62%] h-72 w-64 rounded-3xl bg-white/[0.04]"></div>
          <div class="absolute -top-10 left-[52%] h-56 w-72 rounded-3xl bg-white/[0.04]"></div>
          <div class="absolute bottom-[-3rem] left-[52%] h-40 w-72 rounded-3xl bg-white/[0.04]"></div>
          <div class="absolute right-[-3rem] top-[10%] h-80 w-24 rounded-3xl bg-white/[0.04]"></div>
        </div>

        <div class="relative mx-auto grid max-w-[78rem] gap-14 lg:grid-cols-12 lg:items-center">
          <div class="lg:col-span-6">
            <h1 class="hero-enter text-[clamp(1.4rem,7.5vw,2.2rem)] leading-[1.15] text-white sm:max-w-[16ch] sm:text-[3.5rem] sm:leading-[1.08] lg:text-[3.75rem]">
              @if (showAssociates) {
                <!-- Téléphones : une phrase par ligne. -->
                <span class="block whitespace-nowrap sm:inline sm:whitespace-normal">Reprenez une entreprise.</span> <span class="block whitespace-nowrap sm:inline sm:whitespace-normal">Trouvez vos associés</span>
              } @else {
                Reprenez une entreprise qui a déjà ses clients
              }
            </h1>
            <p class="hero-enter mt-5 hidden max-w-[48ch] text-lg leading-relaxed text-white/70 sm:block" style="animation-delay: 120ms">
              Des entreprises à reprendre partout en France, et des associés pour lancer ou développer votre projet
            </p>

            <!-- Téléphones : deux boutons courts à la place des cartes. -->
            <div class="hero-enter mt-7 grid gap-2.5 sm:hidden" style="animation-delay: 160ms">
              <a href="#entreprises" (click)="scrollTo($event, 'entreprises')" class="rounded-lg bg-accent px-5 py-3.5 text-center font-semibold text-white">Explorer les entreprises</a>
              @if (showAssociates) {
                <a [routerLink]="associatesHref()" class="rounded-lg border border-white/30 px-5 py-3.5 text-center font-semibold text-white">Trouver des associés</a>
              }
              <p class="mt-1 text-center font-semibold text-white/80">
                <a routerLink="/ma/deposer" class="underline-offset-4 hover:underline">Vendre mon entreprise</a>
                <span class="mx-1.5 text-white/40" aria-hidden="true">·</span>
                <a routerLink="/estimation" class="underline-offset-4 hover:underline">Estimer sa valeur</a>
              </p>
            </div>

            <div class="hero-enter mt-9 hidden gap-3 sm:grid" style="animation-delay: 220ms" [class]="showAssociates ? 'sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2' : ''">
              <a href="#entreprises" (click)="scrollTo($event, 'entreprises')" class="group flex flex-col rounded-xl border border-white/20 bg-white/[0.06] p-5 transition-colors hover:border-white/60 hover:bg-white/[0.1] lift">
                <span class="text-lg font-bold text-white">Explorer les entreprises</span>
                <span class="mt-1.5 flex-1 text-base leading-relaxed text-white/70">Commerces, services, industrie, activités en ligne : découvrez celles qui sont à reprendre</span>
                <span class="mt-4 whitespace-nowrap font-semibold text-[#9DB8FF] group-hover:text-white">Voir les entreprises&nbsp;<span class="arrow-nudge">→</span></span>
              </a>
              @if (showAssociates) {
                <a [routerLink]="associatesHref()" class="group flex flex-col rounded-xl border border-white/20 bg-white/[0.06] p-5 transition-colors hover:border-white/60 hover:bg-white/[0.1] lift">
                  <span class="text-lg font-bold text-white">Trouver des associés et une équipe</span>
                  <span class="mt-1.5 flex-1 text-base leading-relaxed text-white/70">Présentez votre projet ou rejoignez une équipe qui cherche vos compétences</span>
                  <span class="mt-4 whitespace-nowrap font-semibold text-[#9DB8FF] group-hover:text-white">Voir les projets et associés&nbsp;<span class="arrow-nudge">→</span></span>
                </a>
              }
            </div>

            <p class="hero-enter mt-5 hidden text-base text-white/60 sm:block" style="animation-delay: 320ms">
              Vous vendez ? <a routerLink="/ma/deposer" class="font-semibold text-white underline-offset-4 hover:underline">Déposer une annonce gratuite</a>
              <span class="mx-1.5" aria-hidden="true">·</span>
              <a routerLink="/estimation" class="font-semibold text-white underline-offset-4 hover:underline">Estimer sa valeur</a>
            </p>
          </div>

          @if (featuredListing(); as item) {
            <figure class="relative hidden lg:col-span-6 lg:block lg:min-h-[30rem]">
              <article class="hero-float relative mx-auto max-w-[27rem] rounded-2xl bg-[#DCE5F7] p-6 text-primary shadow-2xl sm:p-7 lg:absolute lg:left-0 lg:top-0 lg:w-[25rem]" aria-label="Annonce en ligne">
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
                <aside class="hero-float-late relative z-10 mx-auto -mt-4 w-[20rem] max-w-full rounded-2xl bg-[#DCE5F7] p-5 text-primary shadow-2xl lg:absolute lg:bottom-0 lg:right-0 lg:mt-0" aria-label="Exemple de projet qui constitue son équipe">
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
                <aside class="hero-float-late relative z-10 mx-auto -mt-4 w-[20rem] max-w-full rounded-2xl bg-[#DCE5F7] p-5 text-primary shadow-2xl lg:absolute lg:bottom-0 lg:right-0 lg:mt-0" aria-label="Exemple de profil repreneur">
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
      <!-- Confiance, juste après le haut de page : trois garanties réelles et le journal d'un dossier qui s'ouvre. -->
      <section class="bg-[#F3F6FD] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14" aria-labelledby="trust-title">
        <div class="mx-auto grid max-w-[78rem] items-center gap-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 appReveal id="trust-title" class="text-center text-2xl text-primary sm:text-4xl lg:text-left">Une reprise encadrée, en toute confiance</h2>
            <ul class="mt-4 grid gap-2 sm:mt-8 sm:gap-4">
              @for (item of guarantees; track item.title; let i = $index) {
                <li appReveal [revealDelay]="i * 110" class="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-border sm:gap-4 sm:rounded-2xl sm:p-4">
                  <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent sm:h-11 sm:w-11 sm:rounded-xl" aria-hidden="true">
                    @switch (item.icon) {
                      @case ('shield') { <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg> }
                      @case ('lock') { <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> }
                      @default { <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6.5 15h4"/></svg> }
                    }
                  </span>
                  <div>
                    <p class="font-bold text-primary">{{ item.title }}</p>
                    <p class="text-sm leading-snug text-muted-foreground sm:text-base sm:leading-relaxed">{{ item.detail }}</p>
                  </div>
                </li>
              }
            </ul>
          </div>

          <!-- Journal d'un dossier (illustration) : les étapes se cochent, puis le cadenas s'ouvre.
               Ordinateur et tablette : affiché ; téléphone : replié derrière un bouton, pour atteindre vite les annonces. -->
          <div appReveal [revealDelay]="150" class="hidden sm:block">
            <ng-container *ngTemplateOutlet="dossierExample" />
          </div>
          <details class="group -mt-2 sm:hidden">
            <summary class="flex cursor-pointer list-none items-center justify-center gap-2 py-2 text-sm font-semibold text-accent">
              Voir comment un dossier est protégé
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" class="transition-transform group-open:rotate-180" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
            </summary>
            <div class="pb-2 pt-3">
              <ng-container *ngTemplateOutlet="dossierExample" />
            </div>
          </details>

          <ng-template #dossierExample>
            <figure class="pointer-events-none relative mx-auto w-[88%] max-w-md select-none sm:w-full" aria-label="Exemple : le journal d'un dossier de cession">
              <div class="absolute inset-0 translate-x-3 translate-y-3 rotate-2 rounded-3xl bg-[#DCE5F7]" aria-hidden="true"></div>
              <div class="relative -rotate-1 rounded-3xl bg-white p-5 shadow-xl ring-1 ring-border sm:rotate-0 sm:p-8">
                <div class="flex items-start justify-between gap-4 border-b border-border pb-5">
                  <div>
                    <p class="inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-accent">Exemple de dossier</p>
                    <p class="mt-1 text-lg font-bold text-primary sm:text-xl">Éditeur de logiciel SaaS · Lyon</p>
                  </div>
                  <span class="dossier-lock flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary text-white" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path class="dossier-shackle" d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
                  </span>
                </div>
                <ol class="mt-5 space-y-4">
                  @for (event of dossierEvents; track event.title; let i = $index) {
                    <li class="dossier-event flex gap-3" [style.animation-delay.ms]="400 + i * 700">
                      <span class="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg></span>
                      <div>
                        <p class="font-semibold text-primary">{{ event.title }}</p>
                        <p class="text-sm text-muted-foreground">{{ event.detail }}</p>
                      </div>
                    </li>
                  }
                </ol>
                <p class="dossier-open mt-6 rounded-xl bg-accent/10 px-4 py-3 text-center font-semibold text-accent">Dossier et contact du cédant ouverts</p>
              </div>
            </figure>
          </ng-template>
        </div>
      </section>

      <section id="entreprises" class="scroll-mt-20 px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16" aria-labelledby="latest-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 appReveal id="latest-title" class="text-center text-2xl text-primary sm:text-4xl">Entreprises à reprendre</h2>

          <div class="mx-auto mt-6 hidden max-w-3xl rounded-xl bg-white p-2 shadow-lg ring-1 ring-border sm:block" role="search">
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
              <select id="hero-revenue" [value]="heroRevenue()" (change)="heroRevenue.set($any($event.target).value)" class="rounded-lg border border-border bg-secondary px-3 py-3 text-base text-foreground outline-none sm:w-56">
                <option value="">Tout chiffre d'affaires</option>
                <option value="0-100000">Moins de 100 k€</option>
                <option value="100000-500000">100 à 500 k€</option>
                <option value="500000-1000000">500 k€ à 1 M€</option>
                <option value="1000000-">Plus de 1 M€</option>
              </select>
              <button type="button" (click)="search()" class="rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent/90">Rechercher</button>
            </div>
          </div>

          @if (latestListings().length > 0) {
            <!-- Mobile : deux cartes compactes. Ordinateur : une grande carte détaillée et deux plus petites. -->
            <div class="mt-5 grid gap-3 sm:mt-8 sm:gap-5 md:grid-cols-2 lg:grid-cols-5 max-sm:[&>*:nth-child(3)]:hidden">
              @for (item of latestListings(); track item.listing.id; let i = $index; let first = $first) {
                <a appReveal [revealDelay]="i * 110" [routerLink]="['/ma/annonce', item.listing.id]"
                   class="lift group flex flex-col rounded-xl border border-border bg-white p-4 transition-shadow hover:shadow-md sm:rounded-2xl sm:border-0 sm:p-6 sm:shadow-lg sm:ring-1 sm:ring-border sm:hover:shadow-xl"
                   [class]="first ? 'md:col-span-2 lg:col-span-3 lg:row-span-2' : 'lg:col-span-2'">
                  <div class="flex items-center gap-3">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm text-muted-foreground">{{ item.listing.sector }} · {{ item.listing.region }}</p>
                      @if (item.metrics.age !== null) {
                        <p class="hidden text-sm text-muted-foreground sm:block">Créée il y a {{ item.metrics.age }} ans@if (item.listing.teamSize) { · {{ item.listing.teamSize }} salarié{{ item.listing.teamSize > 1 ? 's' : '' }}}</p>
                      }
                    </div>
                    @if (item.listing.featured) {
                      <span class="hidden flex-shrink-0 rounded-full border border-amber-500/40 px-2 py-0.5 text-xs font-semibold text-amber-700 sm:inline">En vedette</span>
                    }
                  </div>

                  <h3 class="mt-1 line-clamp-2 text-lg font-bold leading-snug text-primary group-hover:text-accent sm:mt-4" [class.lg:text-2xl]="first">{{ item.listing.title || item.listing.summary }}@if (item.listing.verified) { <app-verified-badge [size]="first ? 24 : 20" class="ml-1" /> }</h3>
                  @if (first && item.listing.title) {
                    <div class="mt-2 hidden lg:block">
                      <p class="line-clamp-2 text-base leading-relaxed text-muted-foreground">{{ item.listing.summary }}</p>
                    </div>
                  }

                  <!-- Mobile : une ligne de chiffres et le prix. -->
                  <p class="tabular mt-1.5 truncate text-sm text-muted-foreground sm:hidden">CA {{ euros(item.metrics.revenue) }} · Bénéfice {{ euros(item.metrics.netProfit) }}</p>
                  <p class="tabular mt-1.5 font-bold text-amber-600 sm:hidden"><span class="whitespace-nowrap">{{ item.listing.priceMin }}</span> à <span class="whitespace-nowrap">{{ item.listing.priceMax }}</span></p>

                  <!-- Ordinateur : chiffres clés et évolution du chiffre d'affaires déclarée par le cédant.
                       Grande carte : chiffres sur une ligne puis graphique en largeur ; petites cartes : graphique à droite. -->
                  @if (first) {
                    <dl class="tabular mt-5 hidden grid-cols-2 gap-x-4 gap-y-3 sm:grid lg:mt-6 lg:grid-cols-4">
                      <div>
                        <dt class="text-sm text-muted-foreground">Chiffre d'affaires</dt>
                        <dd class="text-lg font-bold text-primary">{{ euros(item.metrics.revenue) }}</dd>
                      </div>
                      <div>
                        <dt class="text-sm text-muted-foreground">Bénéfice net</dt>
                        <dd class="text-lg font-bold text-primary">{{ euros(item.metrics.netProfit) }}</dd>
                      </div>
                      <div>
                        <dt class="text-sm text-muted-foreground">Marge nette</dt>
                        <dd class="text-lg font-bold text-primary">{{ item.listing.margin }}</dd>
                      </div>
                      <div>
                        <dt class="text-sm text-muted-foreground">Multiple</dt>
                        <dd class="text-lg font-bold text-primary">{{ item.metrics.multiple !== null ? multiple(item.metrics.multiple) : '—' }}</dd>
                      </div>
                    </dl>
                    @if (revenueBars(item.listing).length > 1) {
                      <figure class="mt-5 hidden rounded-xl bg-secondary p-4 lg:block" aria-label="Évolution du chiffre d’affaires">
                        <figcaption class="text-sm font-semibold text-primary">Chiffre d'affaires déclaré</figcaption>
                        <div class="mt-3 flex h-24 items-end gap-3">
                          @for (bar of revenueBars(item.listing); track bar.year; let last = $last) {
                            <div class="flex h-full flex-1 flex-col justify-end">
                              <span class="tabular mb-1 text-center text-xs font-semibold text-muted-foreground">{{ euros(bar.revenue) }}</span>
                              <span class="rounded-t-md" [class]="last ? 'bg-accent' : 'bg-accent/25'" [style.height.%]="bar.height * 0.75"></span>
                            </div>
                          }
                        </div>
                        <div class="mt-1.5 flex gap-3 text-xs text-muted-foreground">
                          @for (bar of revenueBars(item.listing); track bar.year) {
                            <span class="flex-1 text-center">{{ bar.year }}</span>
                          }
                        </div>
                      </figure>
                    }
                  } @else {
                    <div class="mt-5 hidden gap-5 sm:flex">
                      <dl class="tabular grid flex-1 grid-cols-2 gap-x-4 gap-y-3">
                        <div>
                          <dt class="text-sm text-muted-foreground">Chiffre d'affaires</dt>
                          <dd class="font-bold text-primary">{{ euros(item.metrics.revenue) }}</dd>
                        </div>
                        <div>
                          <dt class="text-sm text-muted-foreground">Bénéfice net</dt>
                          <dd class="font-bold text-primary">{{ euros(item.metrics.netProfit) }}</dd>
                        </div>
                      </dl>
                      @if (revenueBars(item.listing).length > 1) {
                        <figure class="flex flex-shrink-0 flex-col" aria-label="Évolution du chiffre d’affaires">
                          <div class="flex h-14 items-end gap-1.5">
                            @for (bar of revenueBars(item.listing); track bar.year; let last = $last) {
                              <span class="w-5 rounded-t-md" [class]="last ? 'bg-accent' : 'bg-accent/25'" [style.height.%]="bar.height" [attr.title]="bar.year + ' : ' + euros(bar.revenue)"></span>
                            }
                          </div>
                          <figcaption class="mt-1 flex gap-1.5 text-[0.65rem] text-muted-foreground">
                            @for (bar of revenueBars(item.listing); track bar.year) {
                              <span class="w-5 text-center">{{ bar.year.toString().slice(2) }}</span>
                            }
                          </figcaption>
                        </figure>
                      }
                    </div>
                  }

                  @if (first && (item.listing.includedAssets?.length ?? 0) > 0) {
                    <ul class="mt-5 hidden flex-wrap gap-2 lg:flex">
                      @for (asset of assetLabels(item.listing).slice(0, 5); track asset) {
                        <li class="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-primary">{{ asset }}</li>
                      }
                    </ul>
                  }

                  <div class="mt-auto hidden pt-5 sm:block">
                    <div class="flex items-baseline justify-between gap-3 border-t border-border pt-4">
                      <span class="text-sm text-muted-foreground">Prix demandé</span>
                      <span class="tabular font-bold text-amber-600" [class.lg:text-xl]="first"><span class="whitespace-nowrap">{{ item.listing.priceMin }}</span> à <span class="whitespace-nowrap">{{ item.listing.priceMax }}</span></span>
                    </div>
                  </div>
                </a>
              }
            </div>
          }
          <div class="mt-5 text-center sm:mt-8">
            <a routerLink="/ma" class="inline-block rounded-lg bg-primary px-7 py-3.5 font-semibold text-white transition-colors hover:bg-primary/90"><span class="sm:hidden">Explorer les entreprises</span><span class="hidden sm:inline">Voir toutes les annonces</span></a>
          </div>
        </div>
      </section>

      @if (showAssociates) {
        <!-- Projets et associés : vrais profils de la vitrine publique (anonymisés), sinon exemples fictifs signalés. -->
        <section class="bg-secondary px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16" aria-labelledby="team-title">
          <!-- Composition différente des annonces : texte à gauche, cartes à droite (ordinateur) ;
               cartes qui défilent à l'horizontale sur téléphone. -->
          <div class="mx-auto grid max-w-[78rem] gap-5 lg:grid-cols-12 lg:items-center lg:gap-10">
            <div class="text-center lg:col-span-4 lg:text-left">
              <h2 appReveal id="team-title" class="text-2xl text-primary sm:text-4xl">Projets et associés</h2>
              <p class="mx-auto mt-3 hidden max-w-[40ch] text-lg leading-relaxed text-muted-foreground sm:block lg:mx-0">Présentez votre projet et trouvez les compétences qui vous manquent, ou rejoignez une équipe</p>
              <div class="mt-6 hidden flex-wrap justify-center gap-3 sm:flex lg:justify-start">
                <a [routerLink]="associatesHref()" class="group rounded-lg bg-accent px-5 py-3 font-semibold text-white transition-colors hover:bg-accent/90">Explorer les projets et associés&nbsp;<span class="arrow-nudge">→</span></a>
              </div>
              @if (teamCardsAreExamples()) {
                <p class="mt-3 hidden text-sm italic text-muted-foreground sm:block">Exemples fictifs</p>
              }
            </div>

            <div class="scrollbar-none -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:col-span-8">
              @for (card of teamCards(); track card.key; let i = $index; let last = $last) {
                <article appReveal [revealDelay]="i * 110"
                         class="lift flex w-[88%] flex-shrink-0 snap-start snap-always flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-border hover:shadow-xl sm:w-auto sm:p-5 sm:shadow-lg"
                         [class.sm:col-span-2]="last && teamCards().length % 2 === 1">
                  <div class="flex items-start gap-3">
                    <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center text-lg font-extrabold text-white" [class]="card.kind === 'project' ? 'rounded-xl bg-accent' : 'rounded-full bg-primary'" aria-hidden="true">{{ card.initial }}</span>
                    <div class="min-w-0">
                      <span class="inline-block rounded-full px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide"
                            [class]="card.kind === 'project' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'">{{ card.badge }}</span>
                      <h3 class="mt-1 text-lg font-bold leading-tight text-primary">{{ card.name }}</h3>
                      @if (card.subtitle) {
                        <p class="mt-0.5 text-sm text-muted-foreground">{{ card.subtitle }}</p>
                      }
                    </div>
                  </div>

                  @if (card.summary) {
                    <p class="mt-3 hidden text-base leading-relaxed text-foreground/85 sm:block">{{ card.summary }}</p>
                  }

                  <!-- Ordinateur : avancement du projet et conditions. -->
                  @if (card.stageIndex >= 0) {
                    <div class="mt-4 hidden sm:block" [attr.aria-label]="'Stade : ' + stageLabels[card.stageIndex]">
                      <div class="flex gap-1" aria-hidden="true">
                        @for (step of stageLabels; track step; let s = $index) {
                          <span class="h-1.5 flex-1 rounded-full" [class]="s <= card.stageIndex ? 'bg-accent' : 'bg-accent/15'"></span>
                        }
                      </div>
                      <p class="mt-1.5 text-xs font-semibold text-muted-foreground">Stade : {{ stageLabels[card.stageIndex] }}</p>
                    </div>
                  }
                  @if (card.meta.length > 0) {
                    <ul class="mt-3 hidden flex-wrap gap-2 sm:flex">
                      @for (item of card.meta; track item.text) {
                        <li class="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-primary">{{ item.text }}</li>
                      }
                    </ul>
                  }

                  @if (card.chips.length > 0) {
                    <p class="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground sm:mt-4">{{ card.chipsLabel }}</p>
                    <ul class="mt-1.5 flex flex-wrap gap-1.5 max-sm:[&>li:nth-child(n+3)]:hidden">
                      @for (chip of card.chips; track chip) {
                        <li class="rounded-full bg-accent/10 px-2.5 py-0.5 text-sm font-semibold text-accent">{{ chip }}</li>
                      }
                    </ul>
                  }

                  <div class="mt-auto pt-3 sm:pt-4">
                    <a [routerLink]="associatesHref()" class="group block border-t border-border pt-3 text-sm font-semibold text-accent sm:text-base">{{ card.linkLabel }}&nbsp;<span class="arrow-nudge">→</span></a>
                  </div>
                </article>
              }
            </div>

            <div class="text-center sm:hidden">
              <a [routerLink]="associatesHref()" class="inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-white">Tout explorer&nbsp;→</a>
              @if (teamCardsAreExamples()) {
                <p class="mt-2 text-sm italic text-muted-foreground">Exemples fictifs</p>
              }
            </div>
          </div>
        </section>
      }

      <!-- Téléphones : fonctionnement et prix réunis dans un bloc court (étapes dépliables). -->
      <div>
        <app-success-stories />
      </div>

      <!-- Téléphones : les prix, après les avis (sur ordinateur, la section « Vendre est gratuit » plus bas). -->
      <section class="px-4 pb-8 pt-2 sm:hidden" aria-labelledby="prices-mobile-title">
        <h2 appReveal id="prices-mobile-title" class="text-center text-2xl text-primary">Combien ça coûte ?</h2>
        <dl appReveal class="mt-5 grid grid-cols-2 gap-3 text-center">
          <div class="rounded-2xl bg-white px-3 py-4 shadow-sm ring-1 ring-border">
            <dt class="text-sm text-muted-foreground">Vendre</dt>
            <dd class="mt-1 text-lg font-extrabold text-primary">Gratuit</dd>
          </div>
          <div class="rounded-2xl bg-white px-3 py-4 shadow-sm ring-1 ring-border">
            <dt class="text-sm text-muted-foreground">Dossier + contact</dt>
            <dd class="mt-1 text-lg font-extrabold text-primary">{{ buyerPrice }} <span class="text-sm font-semibold text-muted-foreground">/ entreprise</span></dd>
          </div>
        </dl>
        <p class="mt-4 text-center text-sm text-muted-foreground">Aucune commission sur la vente, aucun abonnement. <a routerLink="/tarifs" class="whitespace-nowrap font-semibold text-accent">Voir les tarifs</a></p>
      </section>

      <section class="hidden bg-secondary px-4 py-12 sm:block sm:px-6 lg:px-8 lg:py-16" aria-labelledby="prices-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 appReveal id="prices-title" class="text-center text-2xl text-primary sm:text-4xl">Vendre est gratuit. Une mise en relation coûte {{ buyerPrice }}</h2>
          <p class="mx-auto mt-3 max-w-[60ch] text-center text-lg text-muted-foreground">
            Aucune commission sur la vente, aucun abonnement
          </p>
          <div class="mx-auto mt-8 grid max-w-4xl gap-6 md:grid-cols-2">
            @for (row of priceRows; track row.who; let first = $first; let i = $index) {
              <div appReveal [revealDelay]="i * 120" class="lift flex flex-col rounded-2xl p-8 shadow-lg" [class]="first ? 'bg-white ring-1 ring-border' : 'bg-primary text-white'">
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

      <section class="bg-secondary px-4 py-8 sm:bg-transparent sm:px-6 sm:py-12 lg:px-8 lg:py-16" aria-labelledby="faq-title">
        <!-- Ordinateur : titre et liens à gauche, questions à droite (composition différente des sections centrées). -->
        <div class="mx-auto grid max-w-3xl gap-5 sm:gap-8 lg:max-w-[78rem] lg:grid-cols-12 lg:gap-12">
          <div class="text-center lg:col-span-4 lg:text-left">
            <h2 appReveal id="faq-title" class="text-2xl text-primary sm:text-4xl">Questions fréquentes</h2>
            <p class="mt-4 hidden text-base leading-relaxed text-muted-foreground lg:block">Une autre question ? Écrivez-nous, nous vous répondons par e-mail</p>
            <p class="mt-5 hidden flex-col gap-2 lg:flex">
              <a routerLink="/faq" class="group font-semibold text-accent">Toutes les questions&nbsp;<span class="arrow-nudge">→</span></a>
              <a routerLink="/contact" class="group font-semibold text-accent">Nous contacter&nbsp;<span class="arrow-nudge">→</span></a>
            </p>
          </div>
          <div class="lg:col-span-8">
            <div class="space-y-2 sm:space-y-3 max-sm:[&>*:nth-child(n+4)]:hidden">
              @for (item of faq; track item.question) {
                <details class="group rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-border sm:rounded-2xl sm:px-6 sm:py-4">
                  <summary class="flex cursor-pointer list-none items-start justify-between gap-6 font-bold text-primary">
                    {{ item.question }}
                    <span class="mt-0.5 text-xl leading-none text-accent transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p class="mt-3 text-base leading-relaxed text-muted-foreground">{{ item.answer }}</p>
                </details>
              }
            </div>
            <p class="mt-5 text-center lg:hidden">
              <a routerLink="/faq" class="font-semibold text-accent underline-offset-4 hover:underline">Toutes les questions</a>
              <span class="mx-2 text-muted-foreground max-sm:hidden" aria-hidden="true">·</span>
              <a routerLink="/contact" class="font-semibold text-accent underline-offset-4 hover:underline max-sm:hidden">Nous contacter</a>
            </p>
          </div>
        </div>
      </section>

      <section class="hidden bg-secondary px-4 py-12 sm:block sm:px-6 lg:px-8 lg:py-16" aria-label="Notre conviction">
        <div appReveal class="mx-auto grid max-w-[78rem] items-center gap-10 overflow-hidden rounded-3xl bg-white shadow-lg lg:grid-cols-12 lg:gap-0">
          <div class="p-8 sm:p-12 lg:col-span-7">
            <p class="text-[1.75rem] font-bold leading-snug tracking-tight text-primary sm:text-[2.1rem]">
              Une entreprise, ce sont des années de travail, des clients qui vous font confiance, parfois une équipe.
              La transmettre mérite mieux qu'une petite annonce
            </p>
            <p class="mt-6 max-w-[56ch] text-base leading-relaxed text-muted-foreground">
              Chaque année, des entreprises rentables ferment faute de repreneur, pendant que d'autres cherchent
              à racheter une activité qui tourne déjà. GoFounders les rapproche, discrètement et sans commission
            </p>
            <p class="mt-5 font-bold text-primary">L'équipe GoFounders</p>
          </div>
          <figure class="h-full lg:col-span-5">
            <img src="/assets/images/provisoire/fondateurs-ecran.jpg" alt="Un fondateur travaille sur le site de son entreprise, sur deux écrans" width="1400" height="933" loading="lazy" class="h-full max-h-[28rem] w-full object-cover object-[15%_center] lg:max-h-none">
          </figure>
        </div>
      </section>

      <!-- Téléphones : petit encart vendeur. -->
      <section class="px-4 py-8 sm:hidden" aria-label="Vendre son entreprise">
        <div class="flex items-center justify-between gap-4 rounded-2xl bg-primary px-5 py-4 text-white">
          <p class="font-semibold">Vous vendez ? Publiez gratuitement</p>
          <a routerLink="/ma/deposer" class="flex-shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white">Déposer</a>
        </div>
      </section>

      <section class="hidden px-4 py-12 sm:block sm:px-6 lg:px-8 lg:py-16" aria-labelledby="sell-title">
        <div appReveal class="relative mx-auto max-w-[78rem] overflow-hidden rounded-3xl bg-primary px-6 py-14 text-white sm:px-12 lg:py-16">
          <img src="/assets/images/provisoire/bureau-vue-dessus.jpg" alt="" aria-hidden="true" width="1400" height="933" loading="lazy" class="absolute inset-0 h-full w-full object-cover">
          <div class="absolute inset-0" style="background: rgba(15, 27, 45, 0.86)" aria-hidden="true"></div>
          <div class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="sell-title" class="text-3xl sm:text-4xl">Vous pensez à passer la main ?</h2>
              <p class="mt-3 max-w-[60ch] text-lg leading-relaxed text-white/75">
                Déposez votre annonce gratuitement. Elle reste anonyme : seuls les repreneurs qui acceptent l'engagement de confidentialité et débloquent votre dossier voient le détail et vos coordonnées
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


  readonly buyerPrice = OFFER_PRICES.INTRO.label;

  readonly euros = formatEuros;
  readonly stageLabels = STAGE_ORDER.map(stage => STAGE_LABELS[stage]);

  // Barres du chiffre d'affaires déclaré (années précédentes puis dernière année), hauteur relative au maximum.
  revenueBars(listing: MaListingData): Array<{ year: number; revenue: number; height: number }> {
    const series = revenueSeries(listing.revenueHistory, listing.revenueYear, listing.revenueValue).slice(-4);
    const max = Math.max(...series.map(point => point.revenue), 1);
    return series.map(point => ({ ...point, height: Math.max(12, Math.round((point.revenue / max) * 100)) }));
  }

  assetLabels(listing: MaListingData): string[] {
    return (listing.includedAssets ?? []).map(asset => labelOf(INCLUDED_ASSETS, asset as IncludedAsset));
  }
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

  // Bloc de confiance sous le haut de page : uniquement des garanties réelles de la plateforme.
  readonly guarantees = [
    { icon: 'shield', title: 'Annonces relues', detail: 'Chaque annonce est vérifiée par notre équipe avant publication' },
    { icon: 'lock', title: 'Confidentialité', detail: 'Un engagement est accepté avant tout accès au dossier' },
    { icon: 'card', title: 'Paiement sécurisé', detail: 'Par Stripe, sans aucune commission sur la vente' },
  ];
  readonly dossierEvents = [
    { title: 'Annonce relue par GoFounders', detail: 'Publiée de façon anonyme' },
    { title: 'Engagement de confidentialité accepté', detail: 'Preuve horodatée et conservée' },
    { title: 'Paiement confirmé', detail: 'Sécurisé par Stripe' },
  ];


  readonly priceRows = [
    { who: 'Cédant', detail: 'Annonce anonymisée, relue avant publication. Vous êtes prévenu à chaque ouverture de votre dossier.', price: 'Gratuit', href: '/ma/deposer', cta: 'Déposer une annonce' },
    { who: 'Repreneur', detail: 'Dossier complet, coordonnées du cédant et messagerie, ouverts aussitôt après l’engagement de confidentialité.', price: `${OFFER_PRICES.INTRO.label} par entreprise`, href: '/ma', cta: 'Voir les annonces' },
  ];

  // Questions courtes ; sur téléphone, seules les trois premières s'affichent.
  readonly faq: LandingFaqItem[] = [
    { question: 'Mon annonce est-elle confidentielle ?', answer: 'Oui. Seule une annonce anonymisée est publique, après relecture par notre équipe. Le dossier complet et vos coordonnées ne s’ouvrent qu’aux repreneurs qui acceptent un engagement de confidentialité et paient l’accès ; vous êtes prévenu à chaque ouverture.' },
    { question: 'Que comprennent les 50 € ?', answer: INTRO_SUMMARY + ' Le paiement est unique pour cette entreprise, sans abonnement ni commission sur la vente.' },
    ...(FEATURES.associates
      ? [{ question: 'Comment trouver un associé ?', answer: `Créez votre profil gratuitement et présentez votre projet, ou indiquez vos compétences si vous voulez rejoindre une équipe. Vous voyez les profils compatibles et écrivez directement aux associés : ${FREE_CONTACTS_PER_MONTH} nouveaux contacts par mois sont gratuits pour un porteur de projet, sans limite pour un associé.` }]
      : []),
    { question: 'Quelles entreprises ?', answer: 'Des entreprises françaises de tous secteurs : commerces, restaurants, artisans et entreprises du bâtiment, sociétés de services, PME industrielles, mais aussi entreprises en ligne (e-commerce, logiciels, sites, agences). Surtout des TPE et petites PME, de quelques dizaines de milliers d’euros à quelques millions d’euros de chiffre d’affaires.' },
    { question: 'Une commission sur la vente ?', answer: 'Non. La publication est gratuite pour les cédants et nous ne prenons aucun pourcentage sur le prix de vente.' },
    { question: 'Un accompagnement juridique ?', answer: 'Non, nous ne fournissons pas de conseil juridique. Nous vous mettons en relation avec des experts juridiques et comptables partenaires pour sécuriser la transaction.' },
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
