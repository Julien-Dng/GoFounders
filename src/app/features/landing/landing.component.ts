import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';

interface PricingPreviewPlan {
  name: string;
  price: string;
  popular: boolean;
  features: string[];
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [RouterLink, NgClass, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white">

      <section class="pt-32 pb-20 px-8">
        <div class="max-w-[1400px] mx-auto">
          <div class="grid grid-cols-2 gap-16 items-center">

            <div class="animate-fade-in-up">
              <div class="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full mb-6">
                <span class="text-2xl">🚀</span>
                <span class="text-sm font-semibold">+500 projets actifs</span>
              </div>

              <h1 class="text-6xl font-bold mb-6 leading-tight text-primary">
                Trouvez le talent ou le projet qui fera avancer votre prochaine aventure
              </h1>

              <p class="text-xl text-muted-foreground mb-8 leading-relaxed">
                GoFounders met en relation les entrepreneurs qui lancent un projet et les talents qui veulent rejoindre une équipe ambitieuse.
              </p>

              <div class="flex items-center gap-4 mb-8">
                <a routerLink="/inscription" class="px-8 py-4 bg-accent text-white rounded-lg font-semibold shadow-lg shadow-accent/25 hover:bg-accent/90 transition-all hover:scale-105 active:scale-95">
                  Créer mon compte
                </a>
                <a routerLink="/recherche" class="px-8 py-4 border-2 border-border text-foreground rounded-lg font-semibold hover:border-accent transition-all hover:scale-105 active:scale-95">
                  Explorer la recherche
                </a>
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

            <div class="landing-visual-stage animate-landing-visual relative">
              <div class="landing-travel-orb" aria-hidden="true"></div>

              <div class="relative w-full aspect-square">
                <div class="absolute inset-0 rounded-full bg-accent/5 blur-3xl"></div>

                <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-accent rounded-full flex items-center justify-center shadow-2xl shadow-accent/30 landing-center-node">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>

                @for (node of orbitNodes; track $index) {
                  <div
                    class="absolute top-1/2 left-1/2 w-20 h-20 bg-white border-4 border-accent/30 rounded-full flex items-center justify-center shadow-xl"
                    [style.transform]="node.transform"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                  </div>
                }

                <svg class="absolute inset-0 w-full h-full -z-10" viewBox="0 0 400 400">
                  @for (line of connectionLines; track $index) {
                    <line
                      x1="200" y1="200" [attr.x2]="line.x" [attr.y2]="line.y"
                      stroke="#2563EB" stroke-width="2" stroke-opacity="0.2"
                    />
                  }
                </svg>
              </div>
            </div>

          </div>
        </div>
      </section>

      <section class="py-20 px-8 bg-secondary">
        <div class="max-w-[1400px] mx-auto">
          <div class="text-center mb-16 animate-fade-in-up">
            <h2 class="text-4xl font-bold mb-4 text-primary">Comment ça marche ?</h2>
            <p class="text-lg text-muted-foreground">En 3 étapes simples</p>
          </div>

          <div class="grid grid-cols-3 gap-12">
            @for (step of steps; track $index) {
              <div class="text-center animate-fade-in-up" [class]="'delay-' + (($index + 1) * 100)">
                <div class="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-accent/20">
                  <span class="text-4xl">{{ step.emoji }}</span>
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

      <section class="py-20 px-8 bg-white">
        <div class="max-w-[1400px] mx-auto">
          <div class="text-center mb-16 animate-fade-in-up">
            <h2 class="text-4xl font-bold mb-4 text-primary">Que souhaitez-vous faire ?</h2>
            <p class="text-lg text-muted-foreground">Choisissez votre entrée dans la plateforme</p>
          </div>

          <div class="grid grid-cols-3 gap-8">
            @for (useCase of useCases; track $index) {
              <div
                class="bg-card rounded-2xl p-8 shadow-md hover:shadow-2xl transition-all cursor-pointer border-2 hover:-translate-y-2 duration-300 animate-fade-in-up"
                [ngClass]="$index === 2 ? 'border-amber-500/30' : 'border-border'"
              >
                <div class="text-5xl mb-4">{{ useCase.icon }}</div>
                <h3 class="text-xl font-bold mb-3">{{ useCase.title }}</h3>
                <p class="text-muted-foreground leading-relaxed">{{ useCase.description }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <section class="py-20 px-8 bg-secondary">
        <div class="max-w-[1400px] mx-auto">
          <div class="grid grid-cols-4 gap-8 mb-16 animate-fade-in-up">
            @for (stat of stats; track stat.label) {
              <div class="text-center">
                <div class="text-5xl font-bold text-accent mb-2">{{ stat.value }}</div>
                <div class="text-muted-foreground">{{ stat.label }}</div>
              </div>
            }
          </div>

          <div class="text-center mb-12 animate-fade-in-up">
            <h2 class="text-4xl font-bold mb-4 text-primary">Ils nous font confiance</h2>
          </div>

          <div class="grid grid-cols-3 gap-8">
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
                <div class="flex gap-1 mt-4">
                  @for (star of [1,2,3,4,5]; track star) {
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#FBBF24" stroke="#FBBF24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      </section>

      <section class="py-20 px-8 bg-primary text-primary-foreground">
        <div class="max-w-[1400px] mx-auto">
          <div class="text-center animate-fade-in-up">
            <div class="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <h2 class="text-4xl font-bold mb-4">Vous souhaitez céder ou acquérir une entreprise ?</h2>
            <p class="text-xl opacity-90 mb-8 max-w-2xl mx-auto">
              Accédez à notre marketplace M&A en accès one-shot à 149€
            </p>
            <a routerLink="/ma" class="inline-block px-10 py-4 bg-amber-500 text-white rounded-lg font-bold shadow-2xl hover:bg-amber-600 transition-all hover:scale-105 active:scale-95">
              Découvrir le M&A
            </a>
          </div>
        </div>
      </section>

      <section class="py-20 px-8 bg-white">
        <div class="max-w-[1400px] mx-auto">
          <div class="text-center mb-16 animate-fade-in-up">
            <h2 class="text-4xl font-bold mb-4 text-primary">Tarifs simples et transparents</h2>
            <p class="text-lg text-muted-foreground">Chaque formule affiche maintenant ses fonctionnalités clés.</p>
          </div>

          <div class="grid grid-cols-3 gap-8 mb-12">
            @for (plan of pricingPreview; track plan.name) {
              <div
                class="bg-card rounded-2xl p-8 border-2 shadow-md animate-fade-in-up transition-transform hover:-translate-y-1 duration-300"
                [ngClass]="plan.popular ? 'border-accent scale-105' : 'border-border'"
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
export class LandingComponent {
  readonly trustBadges = [
    'Inscription rapide',
    'Recherche réservée aux membres connectés',
    '+200 mises en relation réussies',
  ];

  readonly steps = [
    { emoji: '👤', title: 'Créez votre profil', description: 'Choisissez si vous déposez un projet ou si vous rejoignez un projet comme talent.' },
    { emoji: '🔐', title: 'Connectez-vous', description: 'La recherche, les profils et la messagerie sont réservés aux membres authentifiés.' },
    { emoji: '🤝', title: 'Entrez en contact', description: 'Discutez avec les profils visibles pour votre rôle et accélérez les mises en relation utiles.' },
  ];

  readonly useCases = [
    { icon: '🚀', title: 'Je dépose un projet', description: 'Publiez votre ambition et trouvez des talents capables de faire avancer le produit, la vente ou l’exécution.' },
    { icon: '💼', title: 'Je suis un talent', description: 'Accédez uniquement aux projets publiés par les entrepreneurs pour vous concentrer sur les opportunités utiles.' },
    { icon: '🏢', title: "J'achète ou je vends une entreprise", description: 'Utilisez la verticale M&A avec un accès one-shot dédié et indépendant de l’abonnement mensuel.' },
  ];

  readonly stats = [
    { value: '500+', label: 'projets' },
    { value: '1200+', label: 'profils' },
    { value: '200+', label: 'mises en relation' },
    { value: '4.8/5', label: 'note moyenne' },
  ];

  readonly testimonials = [
    { name: 'Sophie Martin', role: 'CEO, TechFlow', avatar: 'SM', quote: "J'ai trouvé mon premier renfort produit en moins de deux semaines." },
    { name: 'Thomas Dupont', role: 'Fondateur, GreenBox', avatar: 'TD', quote: 'La séparation entre talents et projets rend la recherche beaucoup plus claire.' },
    { name: 'Claire Rousseau', role: 'Talent Product', avatar: 'CR', quote: 'Je ne perds plus de temps dans des profils hors sujet, je vois directement les projets pertinents.' },
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

  readonly orbitNodes = [0, 1, 2, 3, 4].map(index => {
    const angle = (index * 360) / 5;
    const radius = 180;
    const x = Math.cos((angle * Math.PI) / 180) * radius;
    const y = Math.sin((angle * Math.PI) / 180) * radius;

    return {
      transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
    };
  });

  readonly connectionLines = [0, 1, 2, 3, 4].map(index => {
    const angle = (index * 360) / 5;
    return {
      x: 200 + Math.cos((angle * Math.PI) / 180) * 180,
      y: 200 + Math.sin((angle * Math.PI) / 180) * 180,
    };
  });
}
