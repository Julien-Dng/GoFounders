import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MaListingData } from '../../core/data/mock-platform.data';
import { OFFER_PRICES } from '../../core/config/offers';
import { ShowcaseEntry, ShowcaseService } from '../../core/services/showcase.service';
import { FEATURES } from '../../core/config/features';
import { MaService } from '../../core/services/ma.service';
import { AuthService } from '../../core/services/auth.service';
import { usesTeamMarketplace } from '../../core/models/user.model';
import { formatEuros, listingMetrics } from '../../core/ma/listing-metrics';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { SuccessStoriesComponent } from '../../shared/components/success-stories/success-stories.component';
import { VerifiedBadgeComponent } from '../../shared/components/verified-badge/verified-badge.component';
import { RevealDirective } from '../../shared/directives/reveal.directive';

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
      <!-- Haut de page (maquette « new-design ») : message, deux actions, photos d'équipes tech libres de droits
           (Unsplash), garanties en une ligne. Téléphones : texte, photos puis garanties. -->
      <section class="relative overflow-hidden bg-primary px-4 pb-8 pt-20 text-white sm:px-6 sm:pb-12 sm:pt-28 lg:px-8 lg:pb-14 lg:pt-32">
        <svg class="pointer-events-none absolute -right-16 top-16 hidden h-[24rem] w-[24rem] text-accent/70 lg:block" viewBox="0 0 200 200" fill="none" aria-hidden="true">
          <path d="M8 196 A188 188 0 0 1 196 8" stroke="currentColor" stroke-width="1.2" />
        </svg>

        <div class="relative mx-auto grid max-w-[78rem] items-center gap-7 lg:grid-cols-12 lg:gap-x-12 lg:gap-y-8">
          <div class="lg:col-span-6">
            <h1 class="hero-enter text-[clamp(1.4rem,7.5vw,2.2rem)] leading-[1.15] text-white sm:max-w-[16ch] sm:text-[3.5rem] sm:leading-[1.08] lg:text-[3.75rem]">
              @if (showAssociates) {
                <!-- Téléphones : une phrase par ligne. -->
                <span class="block whitespace-nowrap sm:inline sm:whitespace-normal">Reprenez une entreprise.</span> <span class="block whitespace-nowrap sm:inline sm:whitespace-normal">Trouvez vos associés</span>
              } @else {
                Reprenez une entreprise qui a déjà ses clients
              }
            </h1>
            <p class="hero-enter mt-3 text-base text-white/75 sm:mt-5 sm:text-xl" style="animation-delay: 120ms">
              {{ showAssociates ? 'Une activité à reprendre, une équipe pour avancer' : 'Des entreprises rentables, prêtes à être reprises' }}
            </p>

            <div class="hero-enter mt-6 grid gap-2.5 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3" style="animation-delay: 200ms">
              <a href="#entreprises" (click)="scrollTo($event, 'entreprises')" class="rounded-lg bg-accent px-6 py-3.5 text-center font-semibold text-white transition-colors hover:bg-accent/90">Explorer les entreprises</a>
              @if (showAssociates) {
                <a [routerLink]="associatesHref()" class="rounded-lg border border-white/40 px-6 py-3.5 text-center font-semibold text-white transition-colors hover:border-white hover:bg-white/10">Trouver des associés</a>
              }
            </div>

            <p class="hero-enter mt-4 text-center font-semibold text-white/85 sm:mt-5 sm:text-left" style="animation-delay: 260ms">
              <a routerLink="/ma/deposer" class="group underline underline-offset-4 decoration-white/40 hover:decoration-white">Vendre mon entreprise&nbsp;<span class="arrow-nudge">→</span></a>
              <span class="mx-2 text-white/40" aria-hidden="true">·</span>
              <a routerLink="/estimation" class="underline-offset-4 hover:underline">Estimer sa valeur</a>
            </p>
          </div>

          <!-- Photos : équipe au travail, et un binôme en médaillon (ordinateur et tablette ; une seule photo sur téléphone). -->
          <figure class="hero-enter relative mx-auto w-full max-w-xl sm:pb-12 sm:pr-10 lg:col-span-6 lg:row-span-2 lg:mr-0 lg:max-w-none" style="animation-delay: 180ms">
            <img src="/assets/images/hero/equipe-startup.webp" width="1100" height="760" fetchpriority="high"
                 alt="Une équipe travaille sur ses ordinateurs autour d'une grande table"
                 class="aspect-[3/2] w-full rounded-2xl object-cover shadow-2xl">
            <img src="/assets/images/hero/binome-ordinateur.webp" width="560" height="420" loading="lazy"
                 alt="Deux associés échangent devant un ordinateur"
                 class="hero-float-late absolute bottom-0 right-0 hidden aspect-[4/3] w-[44%] rounded-xl border-4 border-white object-cover shadow-2xl sm:block">
          </figure>

          <!-- Garanties : une ligne, séparées par des traits (sous le texte sur ordinateur, sous les photos sur téléphone). -->
          <ul class="hero-enter grid w-full grid-cols-3 items-center whitespace-nowrap text-[clamp(0.56rem,2.85vw,0.75rem)] text-white/85 sm:max-w-[42rem] sm:text-base lg:relative lg:z-10 lg:col-span-6 lg:row-start-2 lg:w-[calc(100%+11rem)] lg:max-w-none lg:text-lg" style="animation-delay: 320ms" aria-label="Nos garanties">
            <li class="flex items-center justify-center gap-1 min-[380px]:gap-1.5 sm:gap-2.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 flex-shrink-0 min-[380px]:h-[18px] min-[380px]:w-[18px] sm:h-[22px] sm:w-[22px]" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/></svg>
              Annonces relues
            </li>
            <li class="flex items-center justify-center gap-1 border-x border-white/25 min-[380px]:gap-1.5 sm:gap-2.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 flex-shrink-0 min-[380px]:h-[18px] min-[380px]:w-[18px] sm:h-[22px] sm:w-[22px]" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>
              Confidentialité
            </li>
            <li class="flex items-center justify-center gap-1 min-[380px]:gap-1.5 sm:gap-2.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4 flex-shrink-0 min-[380px]:h-[18px] min-[380px]:w-[18px] sm:h-[22px] sm:w-[22px]" aria-hidden="true"><path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>
              Sans commission
            </li>
          </ul>
        </div>
      </section>

      <!-- Entreprises à reprendre : recherche et filtres, puis les annonces du moment. -->
      <!-- Bloc « Une reprise encadrée, en toute confiance » mis de côté (essai sans ce bloc, nouveau design) :
           repasser showTrustBlock à true pour le réafficher. -->
      @if (showTrustBlock) {
      <!-- Confiance, juste après le haut de page : trois garanties réelles et le journal d'un dossier qui s'ouvre. -->
      <section class="bg-[#F3F6FD] px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-14" aria-labelledby="trust-title">
        <div class="mx-auto grid max-w-[78rem] items-center gap-6 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 appReveal id="trust-title" class="text-2xl text-primary sm:text-center sm:text-4xl lg:text-left" style="text-align: center"><span class="sm:hidden">Des échanges en confiance</span><span class="hidden sm:inline">Une reprise encadrée, en toute confiance</span></h2>
            <!-- Téléphones : liste simple, une ligne par engagement. -->
            <ul class="mt-4 space-y-3 sm:hidden">
              @for (item of guarantees; track item.title) {
                <li class="flex items-center gap-3 text-base text-foreground">
                  <span class="flex-shrink-0 text-accent" aria-hidden="true">
                    @switch (item.icon) {
                      @case ('shield') { <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/></svg> }
                      @case ('lock') { <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg> }
                      @default { <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6.5 15h4"/></svg> }
                    }
                  </span>
                  {{ item.short }}
                </li>
              }
            </ul>
            <ul class="mt-8 hidden gap-4 sm:grid">
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
          <details class="group -mt-3 sm:hidden">
            <summary class="flex cursor-pointer list-none items-center gap-2 py-2 text-base font-semibold text-accent">
              Comment ça marche
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
      }

      <section id="entreprises" class="relative scroll-mt-20 overflow-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10" aria-labelledby="latest-title">
        <svg class="pointer-events-none absolute -top-10 right-0 hidden h-28 w-[28rem] text-accent/50 lg:block" viewBox="0 0 400 100" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M0 4 C120 70 280 70 400 40" stroke="currentColor" stroke-width="1.2"/></svg>
        <div class="relative mx-auto max-w-[78rem]">
          <!-- En-tête : titre et accroche à gauche, lien vers toutes les annonces à droite (ordinateur). -->
          <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
            <div>
              <h2 appReveal id="latest-title" class="text-2xl text-primary sm:text-3xl lg:text-4xl">Des entreprises à reprendre</h2>
              <p class="mt-1 text-base text-muted-foreground sm:text-lg">Une activité, un savoir-faire, une nouvelle étape</p>
            </div>
            <a routerLink="/ma" class="group hidden flex-shrink-0 font-semibold text-accent sm:inline-block">Toutes les entreprises&nbsp;<span class="arrow-nudge">→</span></a>
          </div>

          @if (latestListings().length > 0) {
            <!-- Cartes d'annonce : secteur, titre, ancienneté et équipe, accroche (ordinateur), chiffres clés, prix.
                 Trois côte à côte sur ordinateur, deux sur tablette et téléphone. -->
            <div class="mt-4 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 max-lg:[&>*:nth-child(3)]:hidden">
              @for (item of latestListings(); track item.listing.id; let i = $index) {
                <a appReveal [revealDelay]="i * 110" [routerLink]="['/ma/annonce', item.listing.id]"
                   class="lift group flex flex-col rounded-2xl border border-border bg-white p-4 transition-shadow hover:border-accent/40 hover:shadow-lg sm:p-6">
                  <div class="flex items-center justify-between gap-3">
                    <p class="truncate text-sm text-muted-foreground">{{ item.listing.sector }} · {{ item.listing.region }}</p>
                    @if (item.listing.featured) {
                      <span class="flex-shrink-0 rounded-full border border-amber-500/40 px-2 py-0.5 text-xs font-semibold text-amber-700">En vedette</span>
                    }
                  </div>
                  <h3 class="mt-2 line-clamp-2 text-lg font-bold leading-snug text-primary group-hover:text-accent sm:text-xl">{{ item.listing.title || item.listing.summary }}@if (item.listing.verified) { <app-verified-badge [size]="20" class="ml-1" /> }</h3>
                  @if (item.metrics.age !== null) {
                    <p class="mt-1 text-sm text-muted-foreground">{{ item.metrics.age }} ans d'activité@if (item.listing.teamSize) { · {{ item.listing.teamSize }} salarié{{ item.listing.teamSize > 1 ? 's' : '' }}}</p>
                  }
                  @if (item.listing.title) {
                    <div class="mt-3 hidden sm:block">
                      <p class="line-clamp-2 text-sm leading-relaxed text-foreground/75">{{ item.listing.summary }}</p>
                    </div>
                  }

                  <dl class="tabular mt-4 grid grid-cols-3 divide-x divide-border rounded-xl bg-secondary py-3 text-center">
                    <div class="px-2">
                      <dt class="text-xs text-muted-foreground">CA annuel</dt>
                      <dd class="mt-0.5 font-bold text-primary">{{ euros(item.metrics.revenue) }}</dd>
                    </div>
                    <div class="px-2">
                      <dt class="text-xs text-muted-foreground">Bénéfice</dt>
                      <dd class="mt-0.5 font-bold text-primary">{{ euros(item.metrics.netProfit) }}</dd>
                    </div>
                    <div class="px-2">
                      <dt class="text-xs text-muted-foreground">Marge</dt>
                      <dd class="mt-0.5 font-bold text-primary">{{ item.listing.margin }}</dd>
                    </div>
                  </dl>

                  <span class="min-h-4 flex-1" aria-hidden="true"></span>
                  <div class="flex items-end justify-between gap-3 border-t border-border pt-4">
                    <div>
                      <p class="text-xs text-muted-foreground">Prix demandé</p>
                      <p class="tabular text-lg font-bold text-amber-600"><span class="whitespace-nowrap">{{ item.listing.priceMin }}</span> à <span class="whitespace-nowrap">{{ item.listing.priceMax }}</span></p>
                    </div>
                    <span class="arrow-nudge text-xl text-accent" aria-hidden="true">→</span>
                  </div>
                </a>
              }
            </div>
          }
          <div class="mt-4 text-center sm:hidden">
            <a routerLink="/ma" class="inline-block rounded-lg bg-primary px-7 py-3.5 font-semibold text-white transition-colors hover:bg-primary/90">Explorer les entreprises</a>
          </div>
        </div>
      </section>

      @if (showAssociates) {
        <!-- Projets et associés : vrais profils de la vitrine publique (anonymisés), sinon exemples fictifs signalés. -->
        <section class="relative overflow-hidden bg-secondary px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12" aria-labelledby="team-title">
          <svg class="pointer-events-none absolute -bottom-6 left-0 hidden h-24 w-[22rem] text-accent/50 lg:block" viewBox="0 0 300 80" fill="none" preserveAspectRatio="none" aria-hidden="true"><path d="M0 20 C90 10 200 30 300 78" stroke="currentColor" stroke-width="1.2"/></svg>
          <!-- Accroche à gauche, deux profils en lignes à droite (un projet et un associé quand c'est possible). -->
          <div class="relative mx-auto grid max-w-[78rem] gap-5 lg:grid-cols-12 lg:items-center lg:gap-10">
            <div class="lg:col-span-5">
              <h2 appReveal id="team-title" class="text-2xl leading-tight text-primary sm:text-3xl lg:text-[2.6rem]">Le projet est là.<br> Il ne manque <span class="whitespace-nowrap">peut-être</span> que vous</h2>
              <p class="mt-2 text-base text-muted-foreground sm:mt-3 sm:text-lg">Trouvez un associé ou rejoignez une équipe</p>
              <a [routerLink]="associatesHref()" class="group mt-4 hidden font-semibold text-accent sm:inline-block">Explorer les projets et associés&nbsp;<span class="arrow-nudge">→</span></a>
              @if (teamCardsAreExamples()) {
                <p class="mt-2 hidden text-sm italic text-muted-foreground sm:block">Exemples fictifs</p>
              }
            </div>

            <ul class="grid gap-3 sm:gap-4 lg:col-span-7">
              @for (card of teamPreview(); track card.key; let i = $index) {
                <li appReveal [revealDelay]="i * 110">
                  <a [routerLink]="associatesHref()" class="lift group flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-border hover:shadow-lg hover:ring-accent/40 sm:gap-5 sm:p-5">
                    <span class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold sm:h-14 sm:w-14"
                          [class]="card.kind === 'project' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'" aria-hidden="true">{{ card.initial }}</span>
                    <span class="min-w-0 flex-1 border-l border-border pl-4 sm:pl-5">
                      <span class="inline-block rounded-md px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-wide"
                            [class]="card.kind === 'project' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'">{{ card.badge }}</span>
                      <span class="mt-1 block text-base font-bold leading-snug text-primary group-hover:text-accent sm:text-lg">{{ card.name }}</span>
                      @if (card.subtitle) {
                        <span class="block text-sm text-muted-foreground">{{ card.subtitle }}</span>
                      }
                      @if (card.chips.length > 0) {
                        <span class="mt-2 flex flex-wrap gap-1.5">
                          @for (chip of card.chips.slice(0, 3); track chip) {
                            <span class="rounded-md bg-secondary px-2.5 py-0.5 text-sm font-medium text-primary">{{ chip }}</span>
                          }
                        </span>
                      }
                    </span>
                    <span class="arrow-nudge flex-shrink-0 text-xl text-accent" aria-hidden="true">→</span>
                  </a>
                </li>
              }
            </ul>

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
      <!-- Comment ça marche, en trois étapes (nouveau design) : sans icônes, séparées par des traits, dans un encadré bleu marine. -->
      <section class="px-4 pt-6 sm:px-6 sm:pt-8 lg:px-8 lg:pt-10" aria-labelledby="simple-title">
        <!-- Encadré bleu marine : se distingue à la fois de la section projets (bleu clair) et des avis (blanc).
             Ordinateur : titre, phrase et bouton à gauche, étapes détaillées à droite. -->
        <div class="mx-auto grid max-w-[78rem] gap-6 rounded-2xl bg-primary px-5 py-7 text-white sm:px-8 sm:py-8 lg:grid-cols-12 lg:items-center lg:gap-12 lg:px-12 lg:py-10">
          <div class="lg:col-span-5">
            <h2 appReveal id="simple-title" class="text-2xl leading-tight text-white sm:text-3xl lg:text-[2.2rem]">Simple, du premier échange à la rencontre</h2>
            <p class="mt-3 text-base leading-relaxed text-white/70 sm:text-lg">{{ simpleIntro }}</p>
            @if (!isLoggedIn()) {
              <a routerLink="/inscription" class="mt-6 hidden rounded-lg bg-accent px-6 py-3.5 font-semibold text-white transition-colors hover:bg-accent/90 lg:inline-block">Créer mon compte gratuit</a>
            }
          </div>
          <ol class="space-y-5 lg:col-span-7">
            @for (step of simpleSteps; track step.title; let i = $index) {
              <li appReveal [revealDelay]="i * 110" class="flex gap-4">
                <span class="tabular flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white/10 font-bold text-white ring-1 ring-white/20" aria-hidden="true">{{ i + 1 }}</span>
                <div>
                  <h3 class="text-base font-bold text-white sm:text-lg">{{ step.title }}</h3>
                  <p class="mt-0.5 text-base leading-relaxed text-white/75">{{ step.text }}</p>
                  <p class="mt-1 text-sm text-[#9DB8FF]">{{ step.detail }}</p>
                </div>
              </li>
            }
          </ol>
          @if (!isLoggedIn()) {
            <a routerLink="/inscription" class="rounded-lg bg-accent px-6 py-3.5 text-center font-semibold text-white lg:hidden">Créer mon compte gratuit</a>
          }
        </div>
      </section>

      <!-- Tarifs en un bandeau, juste sous les étapes : les trois prix côte à côte (ordinateur), lien vers la page Tarifs.
           Sur téléphone, il reprend aussi le bouton de dépôt de l'ancien encadré « Vous vendez ? ». -->
      <section class="px-4 pt-3 sm:px-6 sm:pt-4 lg:px-8" aria-label="Tarifs">
        <div appReveal class="mx-auto grid max-w-[78rem] gap-4 rounded-2xl bg-[#EEF2FE] px-5 py-5 ring-1 ring-accent/15 sm:px-7 sm:py-6 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-center lg:gap-0">
          @for (price of priceBand; track price.label; let first = $first) {
            <div class="lg:px-6" [class]="first ? 'lg:pl-0' : 'lg:border-l lg:border-accent/15'">
              <p class="text-sm text-muted-foreground">{{ price.label }}</p>
              <p class="tabular text-xl font-bold text-primary">{{ price.value }}</p>
              <p class="text-sm text-muted-foreground">{{ price.note }}</p>
            </div>
          }
          <div class="flex flex-wrap items-center gap-x-5 gap-y-3 lg:justify-end lg:pl-6">
            <a routerLink="/ma/deposer" class="rounded-lg bg-primary px-5 py-2.5 text-center font-semibold text-white sm:hidden">Publier mon annonce</a>
            <a routerLink="/tarifs" class="group flex-shrink-0 font-semibold text-accent">Comprendre les tarifs&nbsp;<span class="arrow-nudge">→</span></a>
          </div>
        </div>
      </section>

      <div>
        <app-success-stories />
      </div>

      <section class="hidden px-4 py-8 sm:block sm:px-6 lg:px-8 lg:py-10" aria-label="Notre conviction">
        <div appReveal class="mx-auto grid max-w-[78rem] items-center gap-10 overflow-hidden rounded-3xl bg-white shadow-lg lg:grid-cols-12 lg:gap-0">
          <div class="p-6 sm:p-8 lg:col-span-7">
            <p class="text-[1.4rem] font-bold leading-snug tracking-tight text-primary sm:text-[1.6rem]">
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

      <section class="hidden px-4 py-8 sm:block sm:px-6 lg:px-8 lg:py-10" aria-labelledby="sell-title">
        <div appReveal class="relative mx-auto max-w-[78rem] overflow-hidden rounded-3xl bg-primary px-6 py-8 text-white sm:px-10 lg:py-9">
          <img src="/assets/images/provisoire/bureau-vue-dessus.jpg" alt="" aria-hidden="true" width="1400" height="933" loading="lazy" class="absolute inset-0 h-full w-full object-cover">
          <div class="absolute inset-0" style="background: rgba(15, 27, 45, 0.86)" aria-hidden="true"></div>
          <div class="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 id="sell-title" class="text-2xl sm:text-3xl">Vous pensez à passer la main ?</h2>
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
  private readonly auth = inject(AuthService);
  private readonly showcaseService = inject(ShowcaseService);
  // Aperçu « Projets et associés » : deux projets et un associé de la vitrine publique (profils anonymisés).
  readonly showcase = signal<ShowcaseEntry[]>([]);
  // Tant qu'aucun membre n'est sur la vitrine, des exemples fictifs (signalés comme tels) illustrent la section.
  readonly teamCardsAreExamples = computed(() => this.showcase().length === 0);
  // Aperçu de l'accueil : un projet et un associé quand les deux existent, sinon les deux premiers profils.
  readonly teamPreview = computed<TeamCard[]>(() => {
    const cards = this.teamCards();
    const project = cards.find(card => card.kind === 'project');
    const talent = cards.find(card => card.kind === 'talent');
    return project && talent ? [project, talent] : cards.slice(0, 2);
  });
  readonly teamCards = computed<TeamCard[]>(() =>
    this.teamCardsAreExamples() ? EXAMPLE_TEAM_CARDS : this.showcase().map(entry => toTeamCard(entry))
  );
  private readonly listings = signal<MaListingData[]>([]);



  // Essai du nouveau design : bloc de confiance masqué, les garanties sont dans le haut de page.
  readonly showTrustBlock = false;

  readonly euros = formatEuros;


  private readonly items = computed(() => this.listings().map(listing => ({ listing, metrics: listingMetrics(listing) })));


  // Trois annonces sous les filtres : en vedette d'abord, puis les plus récentes.
  readonly latestListings = computed(() =>
    [...this.items()].sort((a, b) => Number(b.listing.featured ?? false) - Number(a.listing.featured ?? false)).slice(0, 3)
  );

  scrollTo(event: Event, id: string): void {
    event.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }



  readonly showAssociates = FEATURES.associates;
  // Porteurs de projet et associés connectés : recherche complète ; les autres : vitrine publique.
  readonly associatesHref = computed(() => (usesTeamMarketplace(this.auth.currentUser()) ? '/recherche' : '/associes'));

  // « Simple, du premier échange à la rencontre » : le parcours en trois étapes, entreprises et projets.
  readonly isLoggedIn = computed(() => this.auth.isAuthenticated());
  // Bandeau des tarifs : uniquement des prix réels (offers.ts).
  readonly priceBand = [
    { label: 'Publier une entreprise', value: 'Gratuit', note: 'Sans commission sur la vente' },
    { label: 'Dossier et contact du vendeur', value: `${OFFER_PRICES.INTRO.label} par entreprise`, note: 'Paiement unique, sans abonnement' },
    ...(FEATURES.associates
      ? [{ label: 'Associés et projets', value: 'Gratuit', note: `Offre PRO : ${OFFER_PRICES.PRO.label}` }]
      : []),
  ];
  readonly simpleIntro = FEATURES.associates
    ? 'Un seul compte gratuit pour reprendre ou céder une entreprise, trouver des associés ou rejoindre un projet'
    : 'Un compte gratuit pour reprendre ou céder une entreprise';
  readonly simpleSteps = FEATURES.associates
    ? [
        { title: 'Découvrez', text: 'Explorez les entreprises à reprendre et les projets', detail: 'Annonces anonymes, relues avant publication' },
        { title: 'Entrez en contact', text: `Accédez au dossier et au contact du vendeur pour ${OFFER_PRICES.INTRO.label.replace(' ', '\u00a0')}`, detail: 'Engagement de confidentialité · paiement sécurisé par Stripe' },
        { title: 'Échangez directement', text: 'Construisez la suite avec les bonnes personnes', detail: 'Messagerie intégrée, sans commission sur la vente' },
      ]
    : [
        { title: 'Découvrez', text: 'Explorez les entreprises à reprendre', detail: 'Annonces anonymes, relues avant publication' },
        { title: 'Entrez en contact', text: `Accédez au dossier et au contact du vendeur pour ${OFFER_PRICES.INTRO.label.replace(' ', '\u00a0')}`, detail: 'Engagement de confidentialité · paiement sécurisé par Stripe' },
        { title: 'Échangez directement', text: 'Construisez la suite avec le cédant', detail: 'Messagerie intégrée, sans commission sur la vente' },
      ];

  // Bloc de confiance sous le haut de page : uniquement des garanties réelles de la plateforme.
  readonly guarantees = [
    { icon: 'shield', title: 'Annonces relues', detail: 'Chaque annonce est vérifiée par notre équipe avant publication', short: 'Annonces relues avant publication' },
    { icon: 'lock', title: 'Confidentialité', detail: 'Un engagement est accepté avant tout accès au dossier', short: 'Dossiers protégés par confidentialité' },
    { icon: 'card', title: 'Paiement sécurisé', detail: 'Par Stripe, sans aucune commission sur la vente', short: 'Paiement sécurisé par Stripe' },
  ];
  readonly dossierEvents = [
    { title: 'Annonce relue par GoFounders', detail: 'Publiée de façon anonyme' },
    { title: 'Engagement de confidentialité accepté', detail: 'Preuve horodatée et conservée' },
    { title: 'Paiement confirmé', detail: 'Sécurisé par Stripe' },
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
