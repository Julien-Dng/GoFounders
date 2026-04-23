import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PricingCardComponent, PricingFeature } from '../../shared/components/pricing-card/pricing-card.component';

interface Plan {
  name: string;
  price: string;
  period: string;
  description: string;
  badge?: string;
  features: PricingFeature[];
  cta: string;
  variant: 'free' | 'pro' | 'premium';
}

@Component({
  selector: 'app-tarifs',
  standalone: true,
  imports: [PricingCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen pt-32 pb-20 px-8">
      <div class="max-w-[1400px] mx-auto">

        <!-- Header -->
        <div class="text-center mb-16 animate-fade-in-up">
          <h1 class="text-6xl font-bold mb-6 tracking-tight text-primary">Choisissez votre formule</h1>
          <p class="text-xl text-muted-foreground max-w-2xl mx-auto">
            Des solutions adaptées à chaque étape de votre parcours entrepreneurial
          </p>
        </div>

        <!-- Pricing Cards -->
        <div class="grid grid-cols-3 gap-8 mb-20">
          @for (plan of plans; track plan.name) {
            <div class="animate-fade-in-up" [class]="'delay-' + (($index + 1) * 100)">
              <app-pricing-card
                [name]="plan.name"
                [price]="plan.price"
                [period]="plan.period"
                [description]="plan.description"
                [badge]="plan.badge ?? ''"
                [features]="plan.features"
                [cta]="plan.cta"
                [variant]="plan.variant"
              />
            </div>
          }
        </div>

        <!-- Comparison Table -->
        <div class="bg-card rounded-2xl border border-border p-12 animate-fade-in-up">
          <h2 class="text-4xl font-bold mb-10 text-center text-primary">Comparaison détaillée</h2>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b-2 border-border">
                  <th class="text-left py-4 px-6">Fonctionnalité</th>
                  <th class="text-center py-4 px-6 text-muted-foreground">FREE</th>
                  <th class="text-center py-4 px-6 text-accent">PRO</th>
                  <th class="text-center py-4 px-6 text-primary">PREMIUM</th>
                </tr>
              </thead>
              <tbody>
                @for (row of comparisonRows; track $index) {
                  <tr class="border-b border-border hover:bg-background/50 transition-colors">
                    <td class="py-4 px-6 font-medium">{{ row[0] }}</td>
                    <td class="py-4 px-6 text-center">
                      @if (row[1] === 'check') {
                        <svg class="mx-auto text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      } @else if (row[1] === 'x') {
                        <svg class="mx-auto text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      } @else {
                        {{ row[1] }}
                      }
                    </td>
                    <td class="py-4 px-6 text-center">
                      @if (row[2] === 'check') {
                        <svg class="mx-auto text-accent" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      } @else if (row[2] === 'x') {
                        <svg class="mx-auto text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      } @else {
                        {{ row[2] }}
                      }
                    </td>
                    <td class="py-4 px-6 text-center">
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

        <!-- M&A One-Shot -->
        <div class="mt-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl border-2 border-amber-600 p-10 text-white shadow-2xl animate-fade-in-up delay-200">
          <div class="flex items-start gap-6">
            <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <div class="flex-1">
              <h2 class="text-3xl mb-3 font-semibold">🏢 Accès M&A — Achat &amp; Cession d'entreprise</h2>
              <p class="text-lg mb-1 text-white/90">
                Disponible en accès one-shot à <span class="font-bold">149€</span> — indépendant de votre abonnement
              </p>
              <ul class="space-y-2 mb-6 text-white/90">
                <li class="flex items-start gap-2">
                  <svg width="20" height="20" class="mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Dépôt et consultation d'annonces complètes</span>
                </li>
                <li class="flex items-start gap-2">
                  <svg width="20" height="20" class="mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Mise en relation directe acheteur / vendeur</span>
                </li>
              </ul>
              <button class="px-8 py-4 bg-white text-amber-600 rounded-full font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95">
                Découvrir l'offre M&A
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class TarifsComponent {
  readonly plans: Plan[] = [
    {
      name: 'FREE', price: '0€', period: 'gratuit', description: 'Pour explorer la plateforme',
      features: [
        { text: 'Création de profil', included: true },
        { text: 'Voir 10 profils par mois', included: true },
        { text: '3 contacts par mois', included: true },
        { text: 'Score de compatibilité AI', included: false },
        { text: 'Suggestions personnalisées', included: false },
        { text: 'Générateur de pitch AI', included: false },
        { text: 'Recherche investisseurs', included: false },
        { text: 'Support prioritaire', included: false },
      ],
      cta: 'Commencer', variant: 'free',
    },
    {
      name: 'PRO', price: '49€', period: '/mois', badge: 'Populaire', description: 'Pour entrepreneurs sérieux',
      features: [
        { text: 'Tout de FREE, plus:', included: true },
        { text: 'Profils illimités', included: true },
        { text: 'Contacts illimités', included: true },
        { text: 'Score de compatibilité AI', included: true },
        { text: 'Suggestions personnalisées', included: true },
        { text: 'Générateur de pitch AI basique', included: true },
        { text: 'Analytics avancés', included: true },
        { text: 'Recherche investisseurs', included: false },
      ],
      cta: 'Souscrire', variant: 'pro',
    },
    {
      name: 'PREMIUM', price: 'Sur mesure', period: '', description: 'Solutions personnalisées',
      features: [
        { text: 'Tout de PRO, plus:', included: true },
        { text: 'Générateur pitch IA complet', included: true },
        { text: 'Recherche investisseurs', included: true },
        { text: 'Coaching humain dédié', included: true },
        { text: 'Matching assisté par expert', included: true },
        { text: 'Mise en relation experts juridiques', included: true },
        { text: 'Événements exclusifs', included: true },
        { text: 'Support 24/7', included: true },
      ],
      cta: 'Nous contacter', variant: 'premium',
    },
  ];

  readonly comparisonRows: string[][] = [
    ['Profils visibles/mois', '10', 'Illimité', 'Illimité'],
    ['Nombre de contacts', '3/mois', 'Illimité', 'Illimité'],
    ['Score AI', 'x', 'check', 'check'],
    ['Générateur pitch', 'x', 'check', 'check'],
    ['Pitch IA', 'x', '✓ basique', '✓ complet'],
    ['Recherche investisseurs', 'x', 'x', 'check'],
    ['Coaching humain', 'x', 'x', 'check'],
    ['Support', 'Email', 'Email + Chat', '24/7 Dédié'],
    ['Expert matching', 'x', 'x', 'check'],
  ];
}
