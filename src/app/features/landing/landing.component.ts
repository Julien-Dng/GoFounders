import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { AuthService } from '../../core/services/auth.service';

interface PricingPreviewPlan {
  name: string;
  price: string;
  popular: boolean;
  features: string[];
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
                <span class="text-sm font-semibold">Plateforme en lancement</span>
              </div>

              <h1 class="text-4xl font-bold mb-6 leading-tight text-primary sm:text-5xl lg:text-6xl">
                Trouvez le talent ou le projet qui fera avancer votre prochaine aventure
              </h1>

              <p class="text-lg text-muted-foreground mb-8 leading-relaxed sm:text-xl">
                GoFounders prépare un espace de mise en relation pour les entrepreneurs qui lancent un projet et les talents qui veulent rejoindre une équipe ambitieuse.
              </p>

              <div class="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center">
                <a [routerLink]="primaryCtaHref()" class="px-8 py-4 bg-accent text-white rounded-lg font-semibold shadow-lg shadow-accent/25 hover:bg-accent/90 transition-all hover:scale-105 active:scale-95 text-center">
                  {{ primaryCtaLabel() }}
                </a>
                <a routerLink="/recherche" class="px-8 py-4 border-2 border-border text-foreground rounded-lg font-semibold hover:border-accent transition-all hover:scale-105 active:scale-95 text-center">
                  Explorer les opportunités
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
                    Match qualifié
                  </div>

                  <div class="landing-hero-pill landing-hero-pill-left">
                    <span class="landing-hero-pill-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21a8 8 0 0 0-16 0"/>
                        <circle cx="12" cy="8" r="4"/>
                      </svg>
                    </span>
                    Talent disponible
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
                    Projet cadré
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

      <section class="px-4 py-16 bg-white sm:px-6 sm:py-20 lg:px-8">
        <div class="max-w-[1400px] mx-auto">
          <div class="text-center mb-16 animate-fade-in-up">
            <h2 class="text-3xl font-bold mb-4 text-primary sm:text-4xl">Que souhaitez-vous faire ?</h2>
            <p class="text-lg text-muted-foreground">Choisissez votre entrée dans la plateforme</p>
          </div>

          <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
            @for (useCase of useCases; track $index) {
              <div
                class="bg-card rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all cursor-pointer border-2 hover:-translate-y-2 duration-300 animate-fade-in-up"
                [ngClass]="$index === 2 ? 'border-amber-500/30' : 'border-border'"
              >
                <div
                  class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl"
                  [ngClass]="$index === 2 ? 'bg-amber-500/10 text-amber-600' : 'bg-accent/10 text-accent'"
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
            <h2 class="text-3xl font-bold mb-4 text-primary sm:text-4xl">Pensé pour des parcours exigeants</h2>
          </div>

          <div class="grid grid-cols-1 gap-8 md:grid-cols-3">
            @for (testimonial of testimonials; track testimonial.name) {
              <div class="bg-white rounded-2xl p-6 shadow-md animate-fade-in-up" [class]="'delay-' + (($index + 1) * 100)">
                <div class="flex items-center gap-4 mb-4">
                  <div class="w-14 h-14 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold">
                    {{ testimonial.avatar }}
                  </div>
                  <div>
                    <div class="font-bold">{{ testimonial.name }}</div>
                    <div class="text-sm text-muted-foreground">{{ testimonial.role }}</div>
                  </div>
                </div>
                <p class="text-muted-foreground italic leading-relaxed">"{{ testimonial.quote }}"</p>
                <div class="mt-4 inline-flex rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                  Retour utilisateur pilote
                </div>
              </div>
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
            <h2 class="text-3xl font-bold mb-4 sm:text-4xl">Vous souhaitez céder ou acquérir une entreprise ?</h2>
            <p class="text-lg opacity-90 mb-8 max-w-2xl mx-auto sm:text-xl">
              Explorez une verticale dédiée aux opportunités d'achat et de cession, séparée du matching talents.
            </p>
            <a routerLink="/ma" class="inline-block px-10 py-4 bg-amber-500 text-white rounded-lg font-bold shadow-2xl hover:bg-amber-600 transition-all hover:scale-105 active:scale-95">
              Découvrir l'offre M&A
            </a>
          </div>
        </div>
      </section>

      <section class="px-4 py-16 bg-white sm:px-6 sm:py-20 lg:px-8">
        <div class="max-w-[1400px] mx-auto">
          <div class="text-center mb-16 animate-fade-in-up">
            <h2 class="text-3xl font-bold mb-4 text-primary sm:text-4xl">Tarifs simples et transparents</h2>
            <p class="text-lg text-muted-foreground">Chaque formule affiche maintenant ses fonctionnalités clés.</p>
          </div>

          <div class="grid grid-cols-1 gap-8 mb-12 md:grid-cols-3">
            @for (plan of pricingPreview; track plan.name) {
              <div
                class="bg-card rounded-2xl p-8 border-2 shadow-md animate-fade-in-up transition-transform hover:-translate-y-1 duration-300"
                [ngClass]="plan.popular ? 'border-accent md:scale-105' : 'border-border'"
              >
                @if (plan.popular) {
                  <div class="inline-block px-4 py-1 bg-accent text-white rounded-full text-sm font-semibold mb-4">
                    Populaire
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
                  routerLink="/tarifs"
                  [ngClass]="plan.popular ? 'block w-full py-3 rounded-lg font-semibold transition-colors cursor-pointer bg-accent text-white text-center' : 'block w-full py-3 rounded-lg font-semibold transition-colors cursor-pointer border-2 border-border text-center'"
                >En savoir plus</a>
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

  readonly primaryCtaHref = computed(() => this.auth.isAuthenticated() ? '/dashboard' : '/inscription');
  readonly primaryCtaLabel = computed(() => this.auth.isAuthenticated() ? 'Aller au dashboard' : 'Créer mon compte');

  readonly trustBadges = [
    'Inscription rapide',
    'Recherche réservée aux membres connectés',
    'Mises en relation cadrées au lancement',
  ];

  readonly audienceCards: LandingAudience[] = [
    {
      icon: 'rocket',
      title: 'Entrepreneurs',
      description: 'Déposez un projet et identifiez les talents utiles.',
      href: '/inscription',
    },
    {
      icon: 'briefcase',
      title: 'Talents',
      description: 'Repérez les projets qui correspondent à vos compétences.',
      href: '/inscription',
    },
    {
      icon: 'building',
      title: 'M&A',
      description: 'Explorez les reprises, achats et cessions d’entreprise.',
      href: '/ma',
    },
  ];

  readonly steps: LandingStep[] = [
    { icon: 'profile', title: 'Créez votre profil', description: 'Choisissez si vous déposez un projet ou si vous rejoignez un projet comme talent.' },
    { icon: 'lock', title: 'Connectez-vous', description: 'La recherche, les profils et la messagerie sont réservés aux membres authentifiés.' },
    { icon: 'handshake', title: 'Entrez en contact', description: 'Discutez avec les profils visibles pour votre rôle et accélérez les mises en relation utiles.' },
  ];

  readonly useCases: LandingUseCase[] = [
    { icon: 'rocket', title: 'Je dépose un projet', description: 'Publiez votre ambition et trouvez des talents capables de faire avancer le produit, la vente ou l’exécution.' },
    { icon: 'briefcase', title: 'Je suis un talent', description: 'Accédez uniquement aux projets publiés par les entrepreneurs pour vous concentrer sur les opportunités utiles.' },
    { icon: 'building', title: "J'achète ou je vends une entreprise", description: 'Utilisez la verticale M&A avec un accès one-shot dédié et indépendant de l’abonnement mensuel.' },
  ];

  readonly stats = [
    { value: 'Profils cadrés', label: 'besoins, compétences et disponibilité lisibles avant contact' },
    { value: 'Accès connecté', label: 'recherche, profils et messages réservés aux membres' },
    { value: 'Rôles séparés', label: 'entrepreneurs orientés talents, talents orientés projets' },
    { value: 'Mise en relation filtrée', label: 'des échanges guidés par l’intention, pas par un catalogue ouvert' },
  ];

  readonly testimonials = [
    { name: 'Camille Martin', role: 'Fondatrice SaaS santé', avatar: 'CM', quote: 'J’ai pu formuler précisément le profil produit que je cherchais avant de lancer mes premiers contacts.' },
    { name: 'Nadia Benali', role: 'Product designer freelance', avatar: 'NB', quote: 'Voir uniquement des projets côté talent rend la recherche plus simple et évite de perdre du temps.' },
    { name: 'Marc Lefèvre', role: 'Repreneur commerce local', avatar: 'ML', quote: 'La verticale M&A séparée clarifie tout de suite le parcours pour une reprise ou une cession.' },
  ];

  readonly pricingPreview: PricingPreviewPlan[] = [
    {
      name: 'FREE',
      price: '0€',
      popular: false,
      features: [
        '3 contacts par mois',
        '5 messages par mois',
        'Accès limité aux profils',
        'Sans matching IA ni recherche avancée',
      ],
    },
    {
      name: 'PRO',
      price: '49€/mois',
      popular: true,
      features: [
        'Contacts et messages illimités',
        'Matching IA',
        'Recherche avancée',
        'Visibilité premium dans les résultats',
      ],
    },
    {
      name: 'PREMIUM',
      price: 'Sur mesure',
      popular: false,
      features: [
        'Tout PRO',
        'Assistant IA complet',
        'Recherche investisseurs',
        'Coaching humain et account manager dédié',
      ],
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
