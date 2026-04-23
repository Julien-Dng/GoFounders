import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Profile {
  name: string;
  role: string;
  location: string;
  stage: string;
  bio: string;
  skills: string[];
  match: number;
  avatar: string;
}

@Component({
  selector: 'app-recherche',
  standalone: true,
  imports: [NgClass, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen pt-24 pb-12 px-8 bg-white">
      <div class="max-w-[1600px] mx-auto">
        <div class="flex gap-8">

          <!-- LEFT SIDEBAR -->
          <aside class="w-[280px] flex-shrink-0">
            <div class="bg-secondary rounded-2xl p-6 sticky top-28">
              <div class="flex items-center justify-between mb-6">
                <h2 class="text-xl font-bold">Filtrer les profils</h2>
                <button (click)="resetFilters()" class="text-sm text-accent hover:underline font-medium">Réinitialiser</button>
              </div>

              <div class="space-y-6">
                <!-- Type de profil -->
                <div>
                  <label class="block text-sm font-bold mb-3">Type de profil</label>
                  <div class="space-y-2">
                    @for (type of profileTypes; track type) {
                      <label class="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          [checked]="selectedTypes().includes(type)"
                          (change)="toggleType(type)"
                          class="w-4 h-4 text-accent border-border rounded"
                        >
                        <span class="text-sm group-hover:text-accent transition-colors">{{ type }}</span>
                      </label>
                    }
                  </div>
                </div>

                <!-- Secteur -->
                <div>
                  <label class="block text-sm font-bold mb-3">Secteur</label>
                  <select
                    [value]="selectedSector()"
                    (change)="selectedSector.set($any($event.target).value)"
                    class="w-full px-3 py-2.5 bg-white border border-border rounded-lg focus:border-accent outline-none text-sm cursor-pointer"
                  >
                    @for (sector of sectors; track sector) {
                      <option [value]="sector">{{ sector }}</option>
                    }
                  </select>
                </div>

                <!-- Stade du projet -->
                <div>
                  <label class="block text-sm font-bold mb-3">Stade du projet</label>
                  <div class="flex flex-wrap gap-2">
                    @for (stage of projectStages; track stage) {
                      <button
                        (click)="toggleStage(stage)"
                        class="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                        [class.bg-accent]="selectedStage().includes(stage)"
                        [class.text-white]="selectedStage().includes(stage)"
                        [class.shadow-md]="selectedStage().includes(stage)"
                        [class.bg-white]="!selectedStage().includes(stage)"
                        [class.border]="!selectedStage().includes(stage)"
                        [class.border-border]="!selectedStage().includes(stage)"
                        [class.hover:border-accent]="!selectedStage().includes(stage)"
                      >{{ stage }}</button>
                    }
                  </div>
                </div>

                <!-- Localisation -->
                <div>
                  <label class="block text-sm font-bold mb-3">Localisation</label>
                  <input type="text" placeholder="France entière" class="w-full px-3 py-2.5 bg-white border border-border rounded-lg focus:border-accent outline-none text-sm">
                </div>

                <!-- Disponibilité -->
                <div>
                  <label class="flex items-center justify-between cursor-pointer">
                    <span class="text-sm font-bold">Disponible maintenant</span>
                    <div class="relative">
                      <input type="checkbox" [checked]="isAvailableNow()" (change)="isAvailableNow.set(!isAvailableNow())" class="sr-only peer">
                      <div class="w-11 h-6 bg-border rounded-full peer-checked:bg-accent transition-colors"></div>
                      <div class="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full transition-transform peer-checked:translate-x-5 shadow-sm"></div>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </aside>

          <!-- MAIN AREA -->
          <div class="flex-1">

            <!-- Top Bar -->
            <div class="flex items-center justify-between mb-8">
              <div class="text-lg">
                <span class="font-bold text-primary">1247</span>
                <span class="text-muted-foreground"> profils</span>
              </div>
              <select class="px-4 py-2.5 bg-secondary border border-border rounded-lg focus:border-accent outline-none text-sm font-medium cursor-pointer">
                <option>Pertinence IA</option>
                <option>Plus récents</option>
                <option>Compatibilité décroissante</option>
                <option>Localisation</option>
              </select>
            </div>

            <!-- AI Match Banner -->
            <div class="bg-gradient-to-r from-accent to-primary rounded-2xl p-6 mb-8 text-white shadow-lg animate-fade-in-up">
              <div class="flex items-center gap-2 mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                </svg>
                <h2 class="text-xl font-bold">✨ 8 profils correspondent particulièrement à votre projet</h2>
              </div>

              <div class="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                @for (profile of highlightedProfiles; track $index) {
                  <div class="flex-shrink-0 w-80 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div class="flex items-center gap-3 mb-3">
                      <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">
                        {{ profile.avatar }}
                      </div>
                      <div class="flex-1 min-w-0">
                        <h3 class="font-bold truncate">{{ profile.name }}</h3>
                        <div class="text-sm opacity-90">{{ profile.role }}</div>
                      </div>
                      <div class="flex items-center gap-1 px-2.5 py-1 bg-white/20 rounded-full">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                        </svg>
                        <span class="text-sm font-bold">{{ profile.match }}%</span>
                      </div>
                    </div>
                    <p class="text-sm opacity-90 line-clamp-2 mb-3">{{ profile.bio }}</p>
                    <button class="w-full py-2 bg-white text-accent rounded-lg text-sm font-semibold hover:bg-white/95 transition-colors">
                      Voir le profil
                    </button>
                  </div>
                }
              </div>
            </div>

            <!-- Profile Grid -->
            <div class="grid grid-cols-3 gap-6 relative">
              @for (profile of allProfiles; track $index) {
                <div
                  class="bg-white rounded-2xl border-2 border-border p-6 shadow-sm hover:shadow-lg transition-all animate-fade-in-up"
                  [class.blur-sm]="isFreeUser() && $index >= 6"
                  [class]="'delay-' + (($index % 6) * 50)"
                >
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <div class="w-14 h-14 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {{ profile.avatar }}
                      </div>
                      <div>
                        <h3 class="font-bold text-lg">{{ profile.name }}</h3>
                        <div class="flex items-center gap-2 mt-1">
                          <span class="px-2.5 py-0.5 bg-accent text-white rounded-full text-xs font-semibold">{{ profile.role }}</span>
                        </div>
                      </div>
                    </div>
                    <button class="p-2 hover:bg-secondary rounded-lg transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                      </svg>
                    </button>
                  </div>

                  <div class="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                    </svg>
                    <span>{{ profile.location }}</span>
                    <span class="px-2 py-0.5 bg-secondary rounded text-xs font-medium">{{ profile.stage }}</span>
                  </div>

                  <p class="text-sm text-foreground/80 mb-4 line-clamp-2 leading-relaxed">{{ profile.bio }}</p>

                  <div class="flex flex-wrap gap-2 mb-4">
                    @for (skill of profile.skills; track skill) {
                      <span class="px-3 py-1 bg-secondary text-foreground text-xs rounded-lg font-medium">{{ skill }}</span>
                    }
                  </div>

                  <div class="flex items-center justify-between pt-4 border-t border-border">
                    <div class="flex items-center gap-1.5 px-3 py-1.5 bg-accent/10 text-accent rounded-full">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                      </svg>
                      <span class="text-sm font-bold">{{ profile.match }}% compatible</span>
                    </div>
                    <button class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      Voir le profil
                    </button>
                  </div>
                </div>
              }

              <!-- Free User Overlay -->
              @if (isFreeUser()) {
                <div class="absolute top-[calc(100%/3*2)] left-0 right-0 bottom-0 flex items-center justify-center pointer-events-none">
                  <div class="bg-white/95 backdrop-blur-md rounded-2xl border-2 border-accent p-10 shadow-2xl max-w-md pointer-events-auto text-center animate-fade-in-scale">
                    <div class="w-20 h-20 bg-gradient-to-br from-accent to-primary rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m2 4 3 12h14l3-12-6 5-4-5-4 5-6-5z"/>
                        <path d="M5 20h14"/>
                      </svg>
                    </div>
                    <h3 class="text-2xl font-bold mb-3">Passez en PRO</h3>
                    <p class="text-muted-foreground mb-6 leading-relaxed">
                      Débloquez l'accès à tous les profils et boostez vos chances de trouver le match parfait
                    </p>
                    <button class="w-full py-4 bg-accent text-white rounded-lg font-bold text-lg shadow-lg hover:bg-accent/90 transition-colors mb-3">
                      Découvrir PRO - 49€/mois
                    </button>
                    <button (click)="isFreeUser.set(false)" class="text-sm text-muted-foreground hover:text-foreground">
                      Aperçu démo (pour ce test)
                    </button>
                  </div>
                </div>
              }
            </div>

          </div>
        </div>
      </div>
    </div>
  `
})
export class RechercheComponent {
  selectedTypes = signal<string[]>([]);
  selectedSector = signal('Tous');
  selectedStage = signal<string[]>([]);
  isAvailableNow = signal(false);
  isFreeUser = signal(true);

  readonly profileTypes = ['Porteur de projet', 'Talent', 'Associé', 'Repreneur'];
  readonly sectors = ['Tous', 'Tech', 'Commerce', 'Santé', 'Finance', 'Industrie', 'Éducation', 'Marketing'];
  readonly projectStages = ['Idée', 'MVP', 'En croissance', 'Établi'];

  readonly highlightedProfiles: Profile[] = [
    { name: 'Sophie Martin', role: 'CTO & Co-fondatrice', location: 'Paris', stage: 'MVP', bio: "Passionnée par l'IA et la santé tech. Cherche co-fondateur business pour scaler une solution SaaS.", skills: ['React', 'Python', 'IA'], match: 95, avatar: 'SM' },
    { name: 'Thomas Dupont', role: 'Développeur Full-Stack', location: 'Lyon', stage: 'Idée', bio: 'Expert e-commerce et marketplaces. Recherche associé pour lancer une plateforme innovante.', skills: ['Node.js', 'AWS', 'DevOps'], match: 92, avatar: 'TD' },
    { name: 'Claire Bernard', role: 'Product Manager', location: 'Bordeaux', stage: 'En croissance', bio: 'Ex-Google, spécialiste produit B2B SaaS. Envie de rejoindre une aventure early-stage.', skills: ['Product', 'UX', 'Analytics'], match: 89, avatar: 'CB' },
  ];

  readonly allProfiles: Profile[] = [
    ...this.highlightedProfiles,
    { name: 'Marc Laurent', role: 'Commercial Senior', location: 'Marseille', stage: 'Établi', bio: "Expert vente B2B avec 10 ans d'expérience. Recherche projet rentable à développer.", skills: ['Sales', 'Négociation', 'B2B'], match: 87, avatar: 'ML' },
    { name: 'Emma Rousseau', role: 'Designer UI/UX', location: 'Toulouse', stage: 'MVP', bio: 'Créative et data-driven. Cherche startup tech pour apporter une vision design forte.', skills: ['Figma', 'Design System', 'Branding'], match: 84, avatar: 'ER' },
    { name: 'Alexandre Petit', role: 'Growth Marketer', location: 'Nantes', stage: 'En croissance', bio: "Spécialiste acquisition et rétention. A scalé 3 startups de 0 à 1M€ ARR.", skills: ['SEO', 'Ads', 'Growth'], match: 82, avatar: 'AP' },
    { name: 'Julie Moreau', role: 'Data Scientist', location: 'Lille', stage: 'Idée', bio: 'PhD en Machine Learning. Envie de créer un produit IA avec impact social.', skills: ['Python', 'ML', 'Data Viz'], match: 79, avatar: 'JM' },
    { name: 'Nicolas Blanc', role: 'Investisseur', location: 'Nice', stage: 'Établi', bio: "Business Angel cherchant à s'impliquer opérationnellement dans une startup.", skills: ['Finance', 'Strategy', 'Levée de fonds'], match: 76, avatar: 'NB' },
  ];

  toggleType(type: string): void {
    this.selectedTypes.update(types =>
      types.includes(type) ? types.filter(t => t !== type) : [...types, type]
    );
  }

  toggleStage(stage: string): void {
    this.selectedStage.update(stages =>
      stages.includes(stage) ? stages.filter(s => s !== stage) : [...stages, stage]
    );
  }

  resetFilters(): void {
    this.selectedTypes.set([]);
    this.selectedSector.set('Tous');
    this.selectedStage.set([]);
    this.isAvailableNow.set(false);
  }
}
