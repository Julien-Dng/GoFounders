import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

interface MaListing {
  id: string;
  sector: string;
  region: string;
  revenue: string;
  margin: string;
  age: string;
  reason: string;
  priceMin: string;
  priceMax: string;
  description: string;
}

@Component({
  selector: 'app-ma-home',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary">

      <!-- HERO NAVY BAND -->
      <section class="bg-primary text-primary-foreground pt-32 pb-16 px-8">
        <div class="max-w-[1400px] mx-auto">
          <div class="text-center animate-fade-in-up">
            <div class="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                <polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>

            <h1 class="text-5xl font-bold mb-4">Marketplace M&A — Achat &amp; Cession d'entreprise</h1>
            <p class="text-xl opacity-90 mb-8 max-w-3xl mx-auto">
              Trouvez votre prochaine acquisition ou cédez votre entreprise en toute confidentialité
            </p>

            <div class="flex items-center justify-center gap-4 mb-12">
              <button class="px-8 py-4 bg-amber-500 text-white rounded-lg font-bold shadow-2xl hover:bg-amber-600 transition-all hover:scale-105 active:scale-95">
                Voir les annonces
              </button>
              <button class="px-8 py-4 border-2 border-white text-white rounded-lg font-bold hover:bg-white/10 transition-all hover:scale-105 active:scale-95">
                Déposer une annonce — 149€
              </button>
            </div>

            <div class="flex items-center justify-center gap-12">
              @for (stat of stats; track $index) {
                <div class="text-center animate-fade-in-up" [class]="'delay-' + (($index + 1) * 100)">
                  <div class="text-lg font-semibold opacity-90">{{ stat }}</div>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

      <!-- FILTERS BAR -->
      <section class="bg-white border-b-2 border-border shadow-sm sticky top-0 z-30">
        <div class="max-w-[1400px] mx-auto px-8 py-6">
          <div class="flex items-center gap-4">

            <div class="flex-1">
              <label class="block text-xs font-bold text-muted-foreground mb-2">SECTEUR</label>
              <select
                [value]="selectedSector()"
                (change)="selectedSector.set($any($event.target).value)"
                class="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:border-amber-500 outline-none text-sm font-medium cursor-pointer"
              >
                @for (sector of sectors; track sector) {
                  <option [value]="sector">{{ sector }}</option>
                }
              </select>
            </div>

            <div class="flex-1">
              <label class="block text-xs font-bold text-muted-foreground mb-2">CA ANNUEL</label>
              <select class="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:border-amber-500 outline-none text-sm font-medium cursor-pointer">
                <option>Tous</option>
                <option>0 - 100k€</option>
                <option>100k€ - 500k€</option>
                <option>500k€ - 1M€</option>
                <option>1M€+</option>
              </select>
            </div>

            <div class="flex-1">
              <label class="block text-xs font-bold text-muted-foreground mb-2">PRIX DEMANDÉ</label>
              <select class="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:border-amber-500 outline-none text-sm font-medium cursor-pointer">
                <option>Tous</option>
                <option>0 - 250k€</option>
                <option>250k€ - 500k€</option>
                <option>500k€ - 1M€</option>
                <option>1M€+</option>
              </select>
            </div>

            <div class="flex-1">
              <label class="block text-xs font-bold text-muted-foreground mb-2">RÉGION</label>
              <input type="text" placeholder="Toute la France" class="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:border-amber-500 outline-none text-sm">
            </div>

            <div class="flex-1">
              <label class="block text-xs font-bold text-muted-foreground mb-2">TYPE</label>
              <select
                [value]="selectedType()"
                (change)="selectedType.set($any($event.target).value)"
                class="w-full px-4 py-2.5 bg-secondary border border-border rounded-lg focus:border-amber-500 outline-none text-sm font-medium cursor-pointer"
              >
                @for (type of types; track type) {
                  <option [value]="type">{{ type }}</option>
                }
              </select>
            </div>

          </div>
        </div>
      </section>

      <!-- ANNONCES GRID -->
      <section class="py-12 px-8">
        <div class="max-w-[1400px] mx-auto">
          <div class="mb-8 animate-fade-in-up">
            <div class="text-lg">
              <span class="font-bold text-primary">{{ listings.length }}</span>
              <span class="text-muted-foreground"> annonces disponibles</span>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-8">
            @for (listing of listings; track listing.id) {
              <div class="bg-white rounded-2xl border-2 border-border shadow-md hover:shadow-xl transition-all relative overflow-hidden animate-fade-in-up" [class]="'delay-' + (($index % 4) * 100)">

                @if (!hasMAAccess()) {
                  <div class="absolute inset-0 z-20 bg-white/95 backdrop-blur-sm flex items-center justify-center">
                    <div class="text-center p-8 max-w-sm">
                      <div class="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                      <h3 class="text-xl font-bold mb-2">Accès one-shot M&A</h3>
                      <p class="text-muted-foreground mb-4 text-sm">Débloquez toutes les annonces détaillées pour 149€</p>
                      <button class="w-full py-3 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 transition-colors shadow-lg mb-2">
                        Acheter l'accès — 149€
                      </button>
                      <button (click)="hasMAAccess.set(true)" class="text-xs text-muted-foreground hover:text-foreground">
                        Aperçu démo (pour ce test)
                      </button>
                    </div>
                  </div>
                }

                <div [class.blur-sm]="!hasMAAccess()" class="p-6">
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <div class="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <rect x="1" y="3" width="15" height="18"/>
                          <rect x="16" y="8" width="5" height="13"/>
                          <rect x="5" y="7" width="3" height="3"/>
                          <rect x="9" y="7" width="3" height="3"/>
                        </svg>
                      </div>
                      <div>
                        <div class="text-xs font-mono text-muted-foreground mb-1">{{ listing.id }}</div>
                        <div class="font-bold text-foreground">Entreprise confidentielle</div>
                      </div>
                    </div>
                    <button class="p-2 hover:bg-secondary rounded-lg transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                      </svg>
                    </button>
                  </div>

                  <div class="flex gap-2 mb-4">
                    <span class="px-3 py-1 bg-amber-500/10 text-amber-700 rounded-lg text-sm font-semibold">{{ listing.sector }}</span>
                    <span class="px-3 py-1 bg-secondary text-foreground rounded-lg text-sm font-semibold flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {{ listing.region }}
                    </span>
                  </div>

                  <p class="text-sm text-foreground/70 mb-4 leading-relaxed">{{ listing.description }}</p>

                  <div class="grid grid-cols-3 gap-3 mb-4 pb-4 border-b border-border">
                    <div>
                      <div class="text-xs text-muted-foreground mb-1">Chiffre d'affaires</div>
                      <div class="font-bold text-sm">{{ listing.revenue }}</div>
                    </div>
                    <div>
                      <div class="text-xs text-muted-foreground mb-1">Marge nette</div>
                      <div class="font-bold text-sm">{{ listing.margin }}</div>
                    </div>
                    <div>
                      <div class="text-xs text-muted-foreground mb-1">Ancienneté</div>
                      <div class="font-bold text-sm">{{ listing.age }}</div>
                    </div>
                  </div>

                  <div class="mb-4">
                    <div class="text-xs text-muted-foreground mb-1">Raison de la cession</div>
                    <div class="text-sm font-medium">{{ listing.reason }}</div>
                  </div>

                  <div class="flex items-end justify-between pt-4 border-t border-border">
                    <div>
                      <div class="text-xs text-muted-foreground mb-1">Prix demandé</div>
                      <div class="text-2xl font-bold text-amber-600">{{ listing.priceMin }} — {{ listing.priceMax }}</div>
                    </div>
                    <button class="px-6 py-2.5 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors shadow-md flex items-center gap-2">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      Voir l'annonce
                    </button>
                  </div>
                </div>

              </div>
            }
          </div>
        </div>
      </section>

      <!-- BOTTOM CTA -->
      <section class="bg-gradient-to-br from-amber-500 to-orange-600 text-white py-20 px-8">
        <div class="max-w-[1400px] mx-auto text-center">
          <div class="animate-fade-in-up">
            <div class="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="1" y="3" width="15" height="18"/>
                <rect x="16" y="8" width="5" height="13"/>
              </svg>
            </div>
            <h2 class="text-4xl font-bold mb-4">Vous souhaitez vendre votre entreprise ?</h2>
            <p class="text-xl opacity-90 mb-8 max-w-2xl mx-auto">Déposez votre annonce en 10 minutes — Accès one-shot 149€</p>
            <button class="px-10 py-5 bg-white text-amber-600 rounded-lg font-bold text-lg shadow-2xl hover:bg-white/95 transition-all hover:scale-105 active:scale-95">
              Déposer mon annonce
            </button>
            <div class="mt-8 flex items-center justify-center gap-8 text-sm opacity-90">
              @for (bullet of bullets; track bullet) {
                <div class="flex items-center gap-2">
                  <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span>{{ bullet }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      </section>

    </div>
  `
})
export class MaHomeComponent {
  selectedSector = signal('Tous');
  selectedType = signal('Tous');
  hasMAAccess = signal(false);

  readonly sectors = ['Tous', 'E-commerce', 'SaaS', 'Commerce de détail', 'Restauration', 'Services B2B', 'Industrie'];
  readonly types = ['Tous', 'Cession', 'Fonds de commerce', 'Parts sociales'];
  readonly stats = ['120+ entreprises listées', 'Transactions de 50k€ à 5M€', 'NDA digital inclus'];
  readonly bullets = ['Confidentialité garantie', 'NDA digital inclus', 'Validation en 24h'];

  readonly listings: MaListing[] = [
    { id: 'MA-001', sector: 'E-commerce', region: 'Île-de-France', revenue: '280k€/an', margin: '22%', age: '7 ans', reason: 'Retraite du dirigeant', priceMin: '350k€', priceMax: '420k€', description: 'Boutique en ligne de produits bio avec base clients fidèle et marque établie.' },
    { id: 'MA-002', sector: 'SaaS', region: 'Auvergne-Rhône-Alpes', revenue: '450k€/an', margin: '35%', age: '4 ans', reason: 'Pivot vers nouveau projet', priceMin: '800k€', priceMax: '1.2M€', description: 'Plateforme B2B SaaS avec 120 clients récurrents et croissance stable.' },
    { id: 'MA-003', sector: 'Restauration', region: "Provence-Alpes-Côte d'Azur", revenue: '320k€/an', margin: '18%', age: '12 ans', reason: 'Reconversion professionnelle', priceMin: '280k€', priceMax: '350k€', description: 'Restaurant établi avec emplacement premium et clientèle régulière.' },
    { id: 'MA-004', sector: 'Services B2B', region: 'Nouvelle-Aquitaine', revenue: '180k€/an', margin: '28%', age: '5 ans', reason: "Déménagement à l'étranger", priceMin: '200k€', priceMax: '280k€', description: 'Agence de consulting RH avec contrats récurrents et forte réputation.' },
    { id: 'MA-005', sector: 'E-commerce', region: 'Occitanie', revenue: '520k€/an', margin: '25%', age: '6 ans', reason: 'Focus sur activité principale', priceMin: '650k€', priceMax: '780k€', description: 'Marketplace niche avec forte notoriété et automatisation complète.' },
    { id: 'MA-006', sector: 'Commerce de détail', region: 'Hauts-de-France', revenue: '380k€/an', margin: '20%', age: '15 ans', reason: 'Retraite anticipée', priceMin: '420k€', priceMax: '520k€', description: 'Boutique physique avec local commercial en propriété et équipe formée.' },
  ];
}
