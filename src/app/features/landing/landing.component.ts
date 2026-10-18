import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { AuthService } from '../../core/services/auth.service';

interface PricingPreviewPlan {
  name: string;
  price: string;
  popular: boolean;
  features: string[];
  href: string;
  cta: string;
}

interface LandingFaqItem {
  question: string;
  answer: string;
}

type LandingIcon = 'rocket' | 'profile' | 'lock' | 'handshake' | 'briefcase' | 'building';

interface LandingStep {
  icon: LandingIcon;
  title: string;
  description: string;
}

interface LandingUseCase {
  icon: LandingIcon;
  title: string;
  description: string;
}

interface LandingAudience {
  icon: LandingIcon;
  title: string;
  description: string;
  href: string;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, NgClass, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white">

      <section class="px-4 pb-16 pt-28 sm:px-6 sm:pb-20 sm:pt-32 lg:px-8">
        <div class="max-w-[1400px] mx-auto">
          <div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">

            <div class="animate-fade-in-up">
              <div class="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full mb-6">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M4.5 16.5c-1 1-1.5 3-1.5 4.5 1.5 0 3.5-.5 4.5-1.5"/>
                  <path d="M9 15 5.5 11.5a2.1 2.1 0 0 1 .5-3.3l2.2-1.1L16.9 15.8l-1.1 2.2a2.1 2.1 0 0 1-3.3.5L9 15z"/>
                  <path d="M14 6.5 17.5 3H21v3.5L17.5 10"/>
                  <path d="M8 16l-2 2"/>
                </svg>
                <span class="text-sm font-semibold">Reprise d'entreprises numériques en France</span>
              </div>

              <h1 class="text-4xl font-bold mb-6 leading-tight text-primary sm:text-5xl lg:text-6xl">
                Reprenez une entreprise rentable, avec les bons associés
              </h1>

              <p class="text-lg text-muted-foreground mb-8 leading-relaxed sm:text-xl">
                SaaS, e-commerce, sites de contenu, petites agences : GoFounders met en relation les fondateurs qui veulent céder et les repreneurs qui préfèrent racheter une activité qui tourne plutôt que repartir de zéro.
              </p>

              <div class="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center">
                <a routerLink="/ma" class="px-8 py-4 bg-accent text-white rounded-lg font-semibold shadow-lg shadow-accent/25 hover:bg-accent/90 transition-all hover:scale-105 active:scale-95 text-center">
                  Voir les entreprises à reprendre
                </a>
                <a routerLink="/ma/deposer" class="px-8 py-4 border-2 border-border text-foreground rounded-lg font-semibold hover:border-amber-500 transition-all hover:scale-105 active:scale-95 text-center">
                  Céder mon entreprise
                </a>
              </div>

              <div class="mb-8 grid gap-3 sm:grid-cols-3">
                @for (audience of audienceCards; track audience.title) {
                  <a
                    [routerLink]="audienceHref(audience.href)"
                    class="group rounded-2xl border border-border bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg"
                  >
                    <div
                      class="mb-3 flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
                      [ngClass]="audience.icon === 'building' ? 'bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white' : 'bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white'"
                      aria-hidden="true"
                    >
                      @switch (audience.icon) {
                        @case ('rocket') {
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4.5 16.5c-1 1-1.5 3-1.5 4.5 1.5 0 3.5-.5 4.5-1.5"/>
                            <path d="M9 15 5.5 11.5a2.1 2.1 0 0 1 .5-3.3l2.2-1.1L16.9 15.8l-1.1 2.2a2.1 2.1 0 0 1-3.3.5L9 15z"/>
                            <path d="M14 6.5 17.5 3H21v3.5L17.5 10"/>
                          </svg>
                        }
                        @case ('briefcase') {
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                            <rect x="3" y="7" width="18" height="13" rx="2"/>
                            <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                            <path d="M3 13h18"/>
                          </svg>
                        }
                        @case ('building') {
                          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16"/>
                            <path d="M17 8h1a2 2 0 0 1 2 2v11"/>
                            <path d="M8 7h5"/>
                            <path d="M8 11h5"/>
                            <path d="M8 15h5"/>
                            <path d="M9 21v-3h3v3"/>
                          </svg>
                        }
                      }
                    </div>
                    <div class="text-sm font-bold text-primary">{{ audience.title }}</div>
                    <p class="mt-1 text-xs leading-relaxed text-muted-foreground">{{ audience.description }}</p>
                  </a>
                }
              </div>

              <div class="flex flex-wrap gap-4">
                @for (badge of trustBadges; track badge) {
                  <div class="flex items-center gap-2 text-sm text-muted-foreground">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span>{{ badge }}</span>
                  </div>
                }
              </div>
            </div>

            <div class="relative mx-auto w-full max-w-[660px] lg:max-w-[720px]" aria-hidden="true">
              <div class="landing-hero-stage">
                <div class="landing-hero-card">
                  <div class="landing-hero-pulse landing-hero-pulse-one"></div>
                  <div class="landing-hero-pulse landing-hero-pulse-two"></div>

                  <div class="landing-hero-pill landing-hero-pill-top">
                    <span class="landing-hero-pill-dot"></span>
                    Repreneur qualifié
                  </div>

                  <div class="landing-hero-pill landing-hero-pill-left">
                    <span class="landing-hero-pill-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21a8 8 0 0 0-16 0"/>
                        <circle cx="12" cy="8" r="4"/>
                      </svg>
                    </span>
                    Cédant discret
                  </div>

                  <div class="landing-hero-pill landing-hero-pill-bottom">
                    <span class="landing-hero-pill-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5V5a2 2 0 0 1 2-2h9l5 5v11.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5Z"/>
                        <path d="M14 3v5h5"/>
                        <path d="M8 13h8"/>
                        <path d="M8 17h5"/>
                      </svg>
                    </span>
                    Dossier confidentiel
                  </div>

                  <div class="landing-hero-video-shell">
                    <div class="landing-hero-video-shadow"></div>
                    <video
                      #heroVideo
                      class="landing-hero-video"
                      autoplay="autoplay"
                      muted="muted"
                      playsinline
                      webkit-playsinline
                      preload="auto"
                      aria-hidden="true"
                      (loadedmetadata)="playHeroAnimation($event)"
                      (loadeddata)="playHeroAnimation($event)"
                      (canplay)="playHeroAnimation($event)"
                      (canplaythrough)="playHeroAnimation($event)"
                      (mouseenter)="playHeroAnimation($event)"
                    >
                      <source src="/assets/videos/landing-puzzle-animation.webm?v=20260601-1510" type="video/webm">
                    </video>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section class="px-4 py-16 bg-secondary sm:px-6 sm:py-20 lg:px-8">
        <div class="max-w-[1400px] mx-auto">
          <div class="text-center mb-16 animate-fade-in-up">
            <h2 class="text-3xl font-bold mb-4 text-primary sm:text-4xl">Comment ça marche ?</h2>
            <p class="text-lg text-muted-foreground">En 3 étapes simples</p>
          </div>

          <div class="grid grid-cols-1 gap-12 md:grid-cols-3">
            @for (step of steps; track $index) {
              <div class="text-center animate-fade-in-up" [class]="'delay-' + (($index + 1) * 100)">
                <div class="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accent/20">
                  <span class="text-white" aria-hidden="true">
                    @switch (step.icon) {
                      @case ('profile') {
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M20 21a8 8 0 0 0-16 0"/>
                          <circle cx="12" cy="8" r="4"/>
                        </svg>
                      }
                      @case ('lock') {
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="5" y="11" width="14" height="10" rx="2"/>
                          <path d="M8 11V8a4 4 0 0 1 8 0v3"/>
                        </svg>
                      }
                      @case ('handshake') {
                        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                          <path d="m8 11 2 2a2.8 2.8 0 0 0 4 0l1-1"/>
                          <path d="M6 12 3 9l4-4 3 3"/>
                          <path d="m18 12 3-3-4-4-3 3"/>
                          <path d="M7 13l3 3"/>
                          <path d="m14 16 3-3"/>
                        </svg>
                      }
                    }
                  </span>
                </div>
                <div class="mb-4">
                  <div class="inline-flex items-center justify-center w-8 h-8 bg-primary text-white rounded-full font-bold mb-3">
                    {{ $index + 1 }}
                  </div>
                  <h3 class="text-xl font-bold mb-2">{{ step.title }}</h3>
                </div>
                <p class="text-muted-foreground leading-relaxed">{{ step.description }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <section id="protection" class="px-4 pt-16 bg-white sm:px-6 sm:pt-20 lg:px-8" aria-labelledby="protection-title">
        <div class="max-w-[1400px] mx-auto">
          <div class="overflow-hidden rounded-3xl bg-primary px-6 py-10 text-primary-foreground shadow-2xl sm:px-10 lg:px-14 lg:py-14">
            <div class="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center">
              <div>
                <div class="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                  Porteurs de projet
                </div>
                <h2 id="protection-title" class="mb-4 text-3xl font-bold sm:text-4xl">Votre idée reste protégée</h2>
                <p class="text-lg leading-relaxed text-white/85">
                  Peur qu'on vous copie ? Sur GoFounders, vous décidez de ce que vous montrez, à qui, et sous quel engagement.
                </p>
                <p class="mt-6 text-xs leading-relaxed text-white/60">
                  Engagement de confidentialité type mis à disposition par GoFounders, qui n'assure pas de conseil juridique.
                  Pour un accord sur mesure, nos experts juridiques partenaires peuvent vous accompagner.
                </p>
              </div>

              <ul class="grid gap-4 sm:grid-cols-2">
                @for (item of protectionPoints; track item.title) {
                  <li class="rounded-2xl p-5" [ngClass]="item.highlight ? 'bg-white text-primary sm:col-span-2' : 'border border-white/10 bg-white/5'">
                    <div class="mb-2 flex items-center gap-2">
                      <span class="flex h-8 w-8 items-center justify-center rounded-lg" [ngClass]="item.highlight ? 'bg-accent text-white' : 'bg-white/10 text-white'" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </span>
                      <h3 class="font-bold">{{ item.title }}</h3>
                    </div>
                    <p class="text-sm leading-relaxed" [ngClass]="item.highlight ? 'text-foreground/80' : 'text-white/75'">{{ item.description }}</p>
                  </li>
                }
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section class="px-4 py-16 bg-white sm:px-6 sm:py-20 lg:px-8">
        <div class="max-w-[1400px] mx-auto">
          <div class="text-center mb-16 animate-fade-in-up">
            <h2 class="text-3xl font-bold mb-4 text-primary sm:text-4xl">Pourquoi reprendre plutôt que créer ?</h2>
            <p class="text-lg text-muted-foreground">Construire un produit n'a jamais été aussi facile. Trouver des clients, si.</p>
          </div>

          <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
            @for (useCase of useCases; track $index) {
              <div
                class="bg-card rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all cursor-pointer border-2 hover:-translate-y-2 duration-300 animate-fade-in-up"
                [ngClass]="$index === 1 ? 'border-amber-500/30' : 'border-border'"
              >
                <div
                  class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                  [ngClass]="$index === 1 ? 'bg-amber-500/10 text-amber-600' : 'bg-accent/10 text-accent'"
                  aria-hidden="true"
                >
                  @switch (useCase.icon) {
                    @case ('rocket') {
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4.5 16.5c-1 1-1.5 3-1.5 4.5 1.5 0 3.5-.5 4.5-1.5"/>
                        <path d="M9 15 5.5 11.5a2.1 2.1 0 0 1 .5-3.3l2.2-1.1L16.9 15.8l-1.1 2.2a2.1 2.1 0 0 1-3.3.5L9 15z"/>
                        <path d="M14 6.5 17.5 3H21v3.5L17.5 10"/>
                      </svg>
                    }
                    @case ('briefcase') {
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="7" width="18" height="13" rx="2"/>
                        <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>
                        <path d="M3 13h18"/>
                      </svg>
                    }
                    @case ('building') {
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16"/>
                        <path d="M17 8h1a2 2 0 0 1 2 2v11"/>
                        <path d="M8 7h5"/>
                        <path d="M8 11h5"/>
                        <path d="M8 15h5"/>
                        <path d="M9 21v-3h3v3"/>
                      </svg>
                    }
                  }
                </div>
                <h3 class="text-xl font-bold mb-3">{{ useCase.title }}</h3>
                <p class="text-muted-foreground leading-relaxed">{{ useCase.description }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <section class="px-4 py-16 bg-secondary sm:px-6 sm:py-20 lg:px-8">
        <div class="max-w-[1400px] mx-auto">
          <div class="grid grid-cols-1 gap-8 mb-16 animate-fade-in-up sm:grid-cols-2 lg:grid-cols-4">
            @for (stat of stats; track stat.label) {
              <div class="text-center">
                <div class="text-3xl font-bold text-accent mb-2 sm:text-4xl lg:text-5xl">{{ stat.value }}</div>
                <div class="text-muted-foreground">{{ stat.label }}</div>
              </div>
            }
          </div>

          <div class="text-center mb-12 animate-fade-in-up">
            <h2 class="text-3xl font-bold mb-4 text-primary sm:text-4xl">Questions fréquentes</h2>
          </div>

          <div class="mx-auto grid max-w-4xl gap-4">
            @for (item of faq; track item.question) {
              <details class="group rounded-2xl bg-white p-6 shadow-md">
                <summary class="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-primary">
                  {{ item.question }}
                  <span class="text-accent transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p class="mt-4 leading-relaxed text-muted-foreground">{{ item.answer }}</p>
              </details>
            }
          </div>
        </div>
      </section>

      <section class="px-4 py-16 bg-primary text-primary-foreground sm:px-6 sm:py-20 lg:px-8">
        <div class="max-w-[1400px] mx-auto">
          <div class="text-center animate-fade-in-up">
            <div class="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <h2 class="text-3xl font-bold mb-4 sm:text-4xl">Vous êtes fondateur et pensez à passer la main ?</h2>
            <p class="text-lg opacity-90 mb-8 max-w-2xl mx-auto sm:text-xl">
              Déposez votre annonce gratuitement. Elle reste anonyme : votre nom et votre activité ne sont communiqués qu'aux repreneurs que vous acceptez.
            </p>
            <a routerLink="/ma/deposer" class="inline-block px-10 py-4 bg-amber-500 text-white rounded-lg font-bold shadow-2xl hover:bg-amber-600 transition-all hover:scale-105 active:scale-95">
              Déposer mon annonce gratuitement
            </a>
          </div>
        </div>
      </section>

      <section class="px-4 py-16 bg-white sm:px-6 sm:py-20 lg:px-8">
        <div class="max-w-[1400px] mx-auto">
          <div class="text-center mb-16 animate-fade-in-up">
            <h2 class="text-3xl font-bold mb-4 text-primary sm:text-4xl">Un prix simple, sans abonnement</h2>
            <p class="text-lg text-muted-foreground">Vendre est gratuit. Les repreneurs paient une seule fois pour accéder aux dossiers pendant 12 mois.</p>
          </div>

          <div class="mx-auto grid max-w-4xl grid-cols-1 gap-8 mb-12 md:grid-cols-2">
            @for (plan of pricingPreview; track plan.name) {
              <div
                class="bg-card rounded-2xl p-8 border-2 shadow-md animate-fade-in-up transition-transform hover:-translate-y-1 duration-300"
                [ngClass]="plan.popular ? 'border-accent md:scale-105' : 'border-border'"
              >
                @if (plan.popular) {
                  <div class="inline-block px-4 py-1 bg-accent text-white rounded-full text-sm font-semibold mb-4">
                    Sans abonnement
                  </div>
                }
                <h3 class="text-2xl font-bold mb-4">{{ plan.name }}</h3>
                <div class="text-4xl font-bold text-accent mb-6">{{ plan.price }}</div>

                <ul class="space-y-3 mb-8">
                  @for (feature of plan.features; track feature) {
                    <li class="flex items-start gap-3 text-sm text-muted-foreground">
                      <svg class="mt-0.5 flex-shrink-0 text-accent" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      <span>{{ feature }}</span>
                    </li>
                  }
                </ul>

                <a
                  [routerLink]="plan.href"
                  [ngClass]="plan.popular ? 'block w-full py-3 rounded-lg font-semibold transition-colors cursor-pointer bg-accent text-white text-center' : 'block w-full py-3 rounded-lg font-semibold transition-colors cursor-pointer border-2 border-border text-center'"
                >{{ plan.cta }}</a>
              </div>
            }
          </div>

          <div class="text-center">
            <a routerLink="/tarifs" class="px-8 py-3 text-accent font-semibold hover:underline inline-block">
              Voir tous les tarifs →
            </a>
          </div>
        </div>
      </section>

      <app-footer />
    </div>
  `
})
export class LandingComponent implements AfterViewInit {
  private readonly auth = inject(AuthService);

  @ViewChild('heroVideo')
  private readonly heroVideo?: ElementRef<HTMLVideoElement>;

  readonly trustBadges = [
    'Annonces anonymisées',
    'Dépôt gratuit pour les cédants',
    'Projets protégés par NDA',
  ];

  readonly protectionPoints = [
    {
      title: 'Engagement de confidentialité (NDA)',
      description: 'Exigez qu’un associé accepte un NDA avant de lire vos détails. GoFounders conserve la preuve (nom, date, version du texte) et vous pouvez la télécharger à tout moment.',
      highlight: true,
    },
    {
      title: 'Jamais visible par vos concurrents',
      description: 'Votre projet n’est montré qu’aux associés, jamais aux autres porteurs de projet.',
      highlight: false,
    },
    {
      title: 'Vous choisissez qui accède',
      description: 'Les détails sensibles restent dans une partie confidentielle : vous acceptez ou refusez chaque demande, et retirez un accès quand vous voulez.',
      highlight: false,
    },
  ];

  readonly audienceCards: LandingAudience[] = [
    {
      icon: 'briefcase',
      title: 'Repreneurs',
      description: 'Rachetez une activité rentable au lieu de repartir de zéro.',
      href: '/ma',
    },
    {
      icon: 'building',
      title: 'Cédants',
      description: 'Passez la main discrètement, à un repreneur qualifié.',
      href: '/ma/deposer',
    },
    {
      icon: 'rocket',
      title: 'Associés',
      description: 'Trouvez un associé, ou rejoignez un projet comme associé.',
      href: '/recherche',
    },
  ];

  readonly steps: LandingStep[] = [
    { icon: 'profile', title: 'Parcourez les annonces', description: 'Secteur, chiffre d’affaires, marge, ancienneté et fourchette de prix : les teasers anonymisés sont visibles par tous.' },
    { icon: 'lock', title: 'Débloquez les dossiers', description: 'Un accès repreneur à 149 € pour 12 mois : dossiers complets et contact direct des vendeurs, sans abonnement.' },
    { icon: 'handshake', title: 'Échangez avec le cédant', description: 'Vous échangez directement avec le vendeur, et nous vous orientons vers des experts partenaires (comptables, avocats) pour la suite.' },
  ];

  readonly useCases: LandingUseCase[] = [
    { icon: 'rocket', title: 'Des clients dès le premier jour', description: 'Avec l’IA, tout le monde peut lancer un produit. Ce qui reste rare, ce sont des clients qui paient déjà. Une reprise vous les apporte.' },
    { icon: 'building', title: 'Un actif qui génère déjà du cash', description: 'Chiffre d’affaires, marge et historique sont connus avant d’acheter. Moins de pari, plus d’exécution.' },
    { icon: 'briefcase', title: 'Les bons associés autour de vous', description: 'Besoin d’un profil commercial, technique ou métier pour faire grandir votre projet ? Trouvez votre associé sur GoFounders.' },
  ];

  readonly stats = [
    { value: '50 k€ – 1 M€', label: 'de chiffre d’affaires : la taille des entreprises que nous ciblons' },
    { value: '0 €', label: 'pour déposer une annonce de cession' },
    { value: '149 €', label: 'pour 12 mois d’accès aux dossiers complets' },
    { value: '100 %', label: 'des annonces anonymisées avant mise en relation' },
  ];

  readonly faq: LandingFaqItem[] = [
    { question: 'Quel type d’entreprises trouve-t-on sur GoFounders ?', answer: 'Principalement des entreprises numériques françaises : SaaS, e-commerce, sites de contenu, petites agences, avec un chiffre d’affaires entre 50 k€ et 1 M€. Des TPE plus classiques peuvent aussi être proposées.' },
    { question: 'Mon annonce de cession est-elle confidentielle ?', answer: 'Oui. Seul un teaser anonymisé est public. Le dossier complet et vos coordonnées ne sont accessibles qu’aux repreneurs ayant un accès en cours.' },
    { question: 'Que comprend l’accès repreneur à 149 € ?', answer: 'Pendant 12 mois, la lecture des dossiers complets de toutes les annonces actives et le contact direct des vendeurs. C’est un paiement unique, sans abonnement.' },
    { question: 'Mon idée de projet est-elle protégée ?', answer: 'Votre projet n’est visible que par les associés, jamais par les autres porteurs de projet. Les détails sensibles restent dans une partie confidentielle, et vous pouvez exiger un engagement de confidentialité (NDA) avant d’y donner accès.' },
    { question: 'GoFounders m’accompagne-t-il juridiquement ?', answer: 'Non, nous ne fournissons pas de conseil juridique. Nous vous mettons en relation avec des experts juridiques et comptables partenaires pour sécuriser la transaction.' },
  ];

  readonly pricingPreview: PricingPreviewPlan[] = [
    {
      name: 'Cédant',
      price: 'Gratuit',
      popular: false,
      features: [
        'Dépôt d’annonce anonymisée',
        'Contacté directement par des repreneurs qualifiés',
        'Mise en relation avec des experts partenaires',
      ],
      href: '/ma/deposer',
      cta: 'Déposer mon annonce',
    },
    {
      name: 'Repreneur',
      price: '149 € / 12 mois',
      popular: true,
      features: [
        'Dossiers complets de toutes les annonces',
        'Contact direct des vendeurs',
        'Paiement unique, sans abonnement',
      ],
      href: '/ma',
      cta: 'Voir les annonces',
    },
  ];

  audienceHref(href: string): string {
    if (href === '/inscription' && this.auth.isAuthenticated()) {
      return '/profil/modifier';
    }

    return href;
  }

  playHeroAnimation(event: Event): void {
    const video = event.target as HTMLVideoElement | null;
    this.startHeroVideo(video ?? undefined, true);
  }

  ngAfterViewInit(): void {
    this.scheduleHeroVideoStart();
  }

  private scheduleHeroVideoStart(): void {
    this.startHeroVideo(undefined, true);

    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => this.startHeroVideo(undefined, true));
    }

    window.setTimeout(() => this.startHeroVideo(undefined, true), 250);
    window.setTimeout(() => this.startHeroVideo(undefined, true), 1000);
  }

  private startHeroVideo(video = this.heroVideo?.nativeElement, restartIfFinished = false): void {
    if (!video) {
      return;
    }

    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.loop = false;
    video.playsInline = true;

    if (video.readyState === HTMLMediaElement.HAVE_NOTHING) {
      video.load();
      return;
    }

    if (restartIfFinished && this.isHeroVideoAtEnd(video)) {
      video.currentTime = 0;
    }

    if (video.paused) {
      void video.play().catch(() => undefined);
    }
  }

  private isHeroVideoAtEnd(video: HTMLVideoElement): boolean {
    return video.ended || (Number.isFinite(video.duration) && video.duration > 0 && video.currentTime >= video.duration - 0.1);
  }
}
