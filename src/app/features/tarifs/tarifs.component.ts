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
            Des solutions adaptées à chaque étape de votre parcours entrepreneurial.
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

        <div class="rounded-2xl border border-border bg-card p-6 sm:p-8 lg:p-12">
          <h2 class="mb-10 text-center text-3xl font-bold text-primary sm:text-4xl">Comparaison détaillée</h2>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[760px]">
              <thead>
                <tr class="border-b-2 border-border">
                  <th class="px-6 py-4 text-left">Fonctionnalité</th>
                  <th class="px-6 py-4 text-center text-muted-foreground">FREE</th>
                  <th class="px-6 py-4 text-center text-accent">PRO</th>
                  <th class="px-6 py-4 text-center text-primary">PREMIUM</th>
                </tr>
              </thead>
              <tbody>
                @for (row of comparisonRows; track $index) {
                  <tr class="border-b border-border transition-colors hover:bg-background/50">
                    <td class="px-6 py-4 font-medium">{{ row[0] }}</td>
                    <td class="px-6 py-4 text-center">
                      @if (row[1] === 'check') {
                        <svg class="mx-auto text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      } @else if (row[1] === 'x') {
                        <svg class="mx-auto text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      } @else {
                        {{ row[1] }}
                      }
                    </td>
                    <td class="px-6 py-4 text-center">
                      @if (row[2] === 'check') {
                        <svg class="mx-auto text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      } @else if (row[2] === 'x') {
                        <svg class="mx-auto text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      } @else {
                        {{ row[2] }}
                      }
                    </td>
                    <td class="px-6 py-4 text-center">
                      @if (row[3] === 'check') {
                        <svg class="mx-auto text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      } @else if (row[3] === 'x') {
                        <svg class="mx-auto text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
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

        <div id="ma-access" class="mt-12 rounded-2xl border-2 border-amber-600 bg-gradient-to-br from-amber-500 to-orange-500 p-8 text-white shadow-2xl sm:p-10">
          <div class="flex flex-col gap-6 lg:flex-row lg:items-start">
            <div class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div class="flex-1">
              <h2 class="mb-3 text-3xl font-semibold">Accès M&A - Achat & cession d'entreprise</h2>
              <p class="mb-1 text-lg text-white/90">
                Disponible en accès one-shot à <span class="font-bold">149€</span> - indépendant de votre abonnement.
              </p>
              <ul class="mb-6 space-y-2 text-white/90">
                <li class="flex items-start gap-2">
                  <svg width="20" height="20" class="mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Dépôt et consultation d'annonces complètes</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg width="20" height="20" class="mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Mise en relation directe acheteur / vendeur</span>
                </li>
              </ul>
              <div class="flex flex-col gap-3 sm:flex-row">
                <a routerLink="/abonnement" class="inline-block rounded-full bg-white px-8 py-4 text-center font-bold text-amber-600 shadow-xl transition-all hover:scale-105 active:scale-95">
                  Débloquer l'accès M&A - 149€
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
      description: 'Pour explorer la plateforme',
      features: [
        { text: 'Création de profil', included: true },
        { text: 'Voir 10 profils par mois', included: true },
        { text: '3 contacts par mois', included: true },
        { text: 'Score de compatibilité IA', included: false },
        { text: 'Suggestions personnalisées', included: false },
        { text: 'Générateur de pitch IA', included: false },
        { text: 'Recherche investisseurs', included: false },
        { text: 'Support prioritaire', included: false },
      ],
      highlights: ['10 profils/mois', '3 contacts', 'Support email'],
      cta: 'Commencer',
      href: '/inscription',
      reassurance: '',
      variant: 'free',
    },
    {
      name: 'PRO',
      price: '49€',
      period: '/mois',
      badge: 'Populaire',
      description: 'Pour entrepreneurs sérieux',
      features: [
        { text: 'Tout de FREE, plus :', included: true },
        { text: 'Profils illimités', included: true },
        { text: 'Contacts illimités', included: true },
        { text: 'Score de compatibilité IA', included: true },
        { text: 'Suggestions personnalisées', included: true },
        { text: 'Générateur de pitch IA basique', included: true },
        { text: 'Analytics avancés', included: true },
        { text: 'Recherche investisseurs', included: false },
      ],
      highlights: ['Illimité', 'Match IA', 'Recherche avancée'],
      cta: 'Souscrire',
      href: '/abonnement',
      reassurance: 'Annulation simple',
      variant: 'pro',
    },
    {
      name: 'PREMIUM',
      price: 'Sur mesure',
      period: '',
      description: 'Solutions personnalisées',
      features: [
        { text: 'Tout de PRO, plus :', included: true },
        { text: 'Générateur de pitch IA complet', included: true },
        { text: 'Recherche investisseurs', included: true },
        { text: 'Coaching humain dédié', included: true },
        { text: 'Matching assisté par expert', included: true },
        { text: 'Mise en relation avec des experts juridiques partenaires', included: true },
        { text: 'Événements exclusifs', included: true },
        { text: 'Support 24/7', included: true },
      ],
      highlights: ['Accompagnement', 'Experts', 'Priorité'],
      cta: 'Nous contacter',
      href: '/abonnement',
      reassurance: 'Réponse sous 24h',
      variant: 'premium',
    },
  ];

  readonly comparisonRows: string[][] = [
    ['Profils visibles/mois', '10', 'Illimité', 'Illimité'],
    ['Nombre de contacts', '3/mois', 'Illimité', 'Illimité'],
    ['Score IA', 'x', 'check', 'check'],
    ['Générateur de pitch', 'x', 'check', 'check'],
    ['Pitch IA', 'x', 'Basique', 'Complet'],
    ['Recherche investisseurs', 'x', 'x', 'check'],
    ['Coaching humain', 'x', 'x', 'check'],
    ['Support', 'Email', 'Email + Chat', '24/7 dédié'],
    ['Expert matching', 'x', 'x', 'check'],
  ];

  planHref(plan: Plan): string {
    if (this.auth.isAuthenticated()) {
      return plan.variant === 'free' ? '/dashboard' : '/abonnement';
    }

    return plan.href;
  }
}
