import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PricingCardComponent, PricingFeature } from '../../shared/components/pricing-card/pricing-card.component';
import { AuthService } from '../../core/services/auth.service';

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  badge?: string;
  highlights: string[];
  features: PricingFeature[];
  cta: string;
  href: string;
  reassurance: string;
  variant: 'free' | 'pro' | 'premium';
}

@Component({
  selector: 'app-tarifs',
  standalone: true,
  imports: [PricingCardComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1400px]">
        <div class="mb-16 text-center">
          <h1 class="mb-6 text-4xl font-bold tracking-tight text-primary sm:text-5xl lg:text-6xl">Choisissez votre formule</h1>
          <p class="mx-auto max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Gratuit pour se faire connaître, PRO pour trouver son associé plus vite, PREMIUM pour être accompagné.
          </p>
        </div>

        <div class="mb-20 grid gap-8 lg:grid-cols-3">
          @for (plan of plans; track plan.name; let index = $index) {
            <div [class]="'animate-fade-in-up delay-' + ((index + 1) * 100)">
              <app-pricing-card
                [name]="plan.name"
                [price]="plan.price"
                [period]="plan.period"
                [description]="plan.description"
                [badge]="plan.badge ?? ''"
                [highlights]="plan.highlights"
                [features]="plan.features"
                [cta]="plan.cta"
                [href]="planHref(plan)"
                [reassurance]="plan.reassurance"
                [variant]="plan.variant"
              />
            </div>
          }
        </div>

        <div class="rounded-2xl border border-border bg-card p-4 sm:p-8 lg:p-12">
          <h2 class="mb-8 text-center text-3xl font-bold text-primary sm:mb-10 sm:text-4xl">Comparaison détaillée</h2>

          <div class="max-w-full overflow-hidden rounded-xl border border-border" style="contain: inline-size;">
            <div class="max-w-full overflow-x-auto overscroll-x-contain">
            <table class="w-full min-w-[1000px] table-fixed">
              <caption class="sr-only">Comparaison détaillée des formules FREE, PRO et PREMIUM</caption>
              <colgroup>
                <col class="w-[28%]" />
                <col class="w-[20%]" />
                <col class="w-[22%]" />
                <col class="w-[30%]" />
              </colgroup>
              <thead>
                <tr class="border-b-2 border-border bg-background/60">
                  <th scope="col" class="px-5 py-5 text-left text-sm font-bold uppercase tracking-wide text-primary sm:px-6">Fonctionnalité</th>
                  <th scope="col" class="px-5 py-5 text-center sm:px-6">
                    <span class="block font-bold text-primary">FREE</span>
                  </th>
                  <th scope="col" class="bg-accent/5 px-5 py-5 text-center sm:px-6">
                    <span class="block font-bold text-accent">PRO</span>
                    <span class="mt-1 block text-sm font-medium text-muted-foreground">49€/mois</span>
                  </th>
                  <th scope="col" class="px-5 py-5 text-center sm:px-6">
                    <span class="block font-bold text-primary">PREMIUM</span>
                    <span class="mt-1 block text-sm font-medium text-muted-foreground">à partir de ~199€/mois</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                @for (row of comparisonRows; track $index) {
                  <tr class="border-b border-border transition-colors hover:bg-background/50">
                    <th scope="row" class="px-5 py-4 text-left font-semibold text-primary sm:px-6">{{ row[0] }}</th>
                    <td class="px-5 py-4 text-center sm:px-6">
                      @if (row[1] === '✓') {
                        <svg aria-hidden="true" class="mx-auto text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span class="sr-only">Inclus</span>
                      } @else if (row[1] === '✗') {
                        <svg aria-hidden="true" class="mx-auto text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        <span class="sr-only">Non inclus</span>
                      } @else {
                        {{ row[1] }}
                      }
                    </td>
                    <td class="bg-accent/[0.03] px-5 py-4 text-center sm:px-6">
                      @if (row[2] === '✓') {
                        <svg aria-hidden="true" class="mx-auto text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span class="sr-only">Inclus</span>
                      } @else if (row[2] === '✗') {
                        <svg aria-hidden="true" class="mx-auto text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        <span class="sr-only">Non inclus</span>
                      } @else {
                        {{ row[2] }}
                      }
                    </td>
                    <td class="px-5 py-4 text-center sm:px-6">
                      @if (row[3] === '✓') {
                        <svg aria-hidden="true" class="mx-auto text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span class="sr-only">Inclus</span>
                      } @else if (row[3] === '✗') {
                        <svg aria-hidden="true" class="mx-auto text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        <span class="sr-only">Non inclus</span>
                      } @else {
                        {{ row[3] }}
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
            </div>
          </div>
        </div>

        <div id="ma-access" class="mt-12 rounded-2xl border-2 border-amber-600 bg-gradient-to-br from-amber-500 to-orange-500 p-8 text-white shadow-2xl sm:p-10">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div class="flex-1">
              <h2 class="mb-3 text-3xl font-semibold">M&A - Achat & cession d'entreprise</h2>
              <p class="mb-1 text-lg text-white/90">
                Indépendant de l'abonnement, réservé aux comptes acheteur et vendeur.
              </p>
              <ul class="mb-6 space-y-2 text-white/90">
                <li class="flex items-start gap-2">
                  <svg width="20" height="20" class="mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Vendeur : publication gratuite</strong> de votre annonce anonymisée (offre de lancement)</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg width="20" height="20" class="mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span><strong>Acheteur : 149 € pour 12 mois</strong> — dossiers complets, motif de cession et contact direct des vendeurs</span>
                </li>
              </ul>
              <div class="flex flex-col gap-3 sm:flex-row">
                <a routerLink="/abonnement" class="inline-block rounded-full bg-white px-8 py-4 text-center font-bold text-amber-600 shadow-xl transition-all hover:scale-105 active:scale-95">
                  Accès repreneur - 149 € / 12 mois
                </a>
                <a routerLink="/ma" class="inline-block rounded-full border border-white/70 px-8 py-4 text-center font-bold text-white transition-all hover:scale-105 hover:bg-white/10 active:scale-95">
                  Voir les annonces
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class TarifsComponent {
  private readonly auth = inject(AuthService);

  readonly plans: Plan[] = [
    {
      name: 'FREE',
      price: '0€',
      period: 'gratuit',
      description: 'Pour rejoindre la communauté et se faire connaître',
      features: [
        { text: 'Profil complet et visible', included: true },
        { text: 'Recherche et profils illimités', included: true },
        { text: 'Score de compatibilité', included: true },
        { text: 'Réponses illimitées à vos conversations', included: true },
        { text: 'Porteurs de projet : 3 nouveaux contacts par mois', included: true },
        { text: 'Talents : contacts illimités', included: true },
        { text: 'Raisons détaillées du score', included: false },
        { text: 'Assistant IA personnel', included: false },
      ],
      highlights: ['Gratuit pour les talents', 'Recherche illimitée', 'Réponses illimitées'],
      cta: 'Créer mon profil',
      href: '/inscription',
      reassurance: '',
      variant: 'free',
    },
    {
      name: 'PRO',
      price: '49€',
      period: '/mois',
      badge: 'Porteurs de projet',
      description: 'Trouvez votre associé plus vite',
      features: [
        { text: 'Tout de FREE, plus :', included: true },
        { text: 'Contacts illimités', included: true },
        { text: 'Matching intelligent : pourquoi chaque profil vous correspond', included: true },
        { text: 'Assistant IA personnel', included: true },
        { text: 'Recherche avancée (compétences, score minimum…)', included: true, soon: true },
        { text: 'Projet mis en avant dans les résultats', included: true, soon: true },
      ],
      highlights: ['Contacts illimités', 'Matching intelligent', 'Assistant IA'],
      cta: 'Passer en PRO',
      href: '/abonnement',
      reassurance: 'Sans engagement',
      variant: 'pro',
    },
    {
      name: 'PREMIUM',
      price: 'Sur devis',
      period: '',
      description: 'On vous présente les bonnes personnes',
      features: [
        { text: 'Tout de PRO, plus :', included: true },
        { text: "Présentations qualifiées d'associés et de talents", included: true },
        { text: 'Mise en relation avec des investisseurs', included: true },
        { text: 'Mise en relation avec des experts juridiques partenaires', included: true },
        { text: 'Un interlocuteur dédié', included: true },
      ],
      highlights: ['Accompagnement', 'Investisseurs', 'Experts partenaires'],
      cta: 'Premier échange gratuit',
      href: '/abonnement',
      reassurance: 'Réponse sous 48 h',
      variant: 'premium',
    },
  ];

  readonly comparisonRows: string[][] = [
    ['Profil et recherche', 'Illimités', 'Illimités', 'Illimités'],
    ['Nouveaux contacts par mois', 'Talents : illimités · Porteurs de projet : 3', 'Illimités', 'Illimités'],
    ['Réponses dans vos conversations', 'Illimitées', 'Illimitées', 'Illimitées'],
    ['Score de compatibilité', '✓', '✓', '✓'],
    ['Matching intelligent (raisons détaillées)', '✗', '✓', '✓'],
    ['Assistant IA personnel', '✗', '✓', '✓'],
    ['Recherche avancée', '✗', 'Bientôt', 'Bientôt'],
    ['Projet mis en avant dans les résultats', '✗', 'Bientôt', 'Bientôt'],
    ["Présentations qualifiées d'associés", '✗', '✗', '✓'],
    ['Mise en relation investisseurs et experts juridiques partenaires', '✗', '✗', '✓'],
    ['Interlocuteur dédié', '✗', '✗', '✓'],
    ['Support', 'Email', 'Email prioritaire', 'Interlocuteur dédié'],
  ];

  planHref(plan: Plan): string {
    if (this.auth.isAuthenticated()) {
      return plan.variant === 'free' ? '/dashboard' : '/abonnement';
    }

    return plan.href;
  }
}
