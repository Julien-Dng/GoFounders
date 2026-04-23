import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-profil',
  standalone: true,
  imports: [NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary pt-20">

      <!-- COVER BANNER -->
      <div class="relative h-64 bg-gradient-to-br from-accent via-primary to-accent overflow-hidden">
        <div class="absolute inset-0 opacity-20">
          <svg class="w-full h-full" viewBox="0 0 1000 400">
            <circle cx="200" cy="100" r="150" fill="white" opacity="0.1" />
            <circle cx="800" cy="300" r="200" fill="white" opacity="0.15" />
            <circle cx="500" cy="200" r="100" fill="white" opacity="0.1" />
          </svg>
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div class="max-w-[1400px] mx-auto px-8 -mt-32 pb-12">
        <div class="grid grid-cols-12 gap-8">

          <!-- LEFT & CENTER COLUMN -->
          <div class="col-span-8">

            <!-- PROFILE HEADER CARD -->
            <div class="bg-white rounded-2xl border-2 border-border shadow-xl p-8 mb-6 animate-fade-in-up">
              <div class="flex items-start gap-6">
                <div class="relative">
                  <div class="w-32 h-32 bg-gradient-to-br from-accent to-primary rounded-2xl flex items-center justify-center text-white text-4xl font-bold shadow-lg">SB</div>
                  <div class="absolute -bottom-2 -right-2 w-10 h-10 bg-accent rounded-full flex items-center justify-center shadow-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#2563EB" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                </div>

                <div class="flex-1">
                  <div class="flex items-start justify-between mb-3">
                    <div>
                      <div class="flex items-center gap-3 mb-2">
                        <h1 class="text-3xl font-bold">Sophie Bernard</h1>
                        <span class="px-3 py-1 bg-accent text-white rounded-full text-sm font-semibold">CEO &amp; Fondatrice</span>
                      </div>
                      <div class="flex items-center gap-2 text-muted-foreground mb-3">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span>Paris, France</span>
                      </div>
                      <div class="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 text-accent rounded-full">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3z"/>
                        </svg>
                        <span class="font-bold">87% compatible</span>
                        <span class="text-sm">avec votre profil</span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-3 mt-6">
                    <button class="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg font-semibold shadow-lg shadow-accent/25 hover:bg-accent/90 transition-all hover:scale-105 active:scale-95">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      Envoyer un message
                    </button>
                    <button
                      (click)="toggleBookmark()"
                      class="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border-2 transition-all hover:scale-105 active:scale-95"
                      [ngClass]="isBookmarked() ? 'bg-accent/10 border-accent text-accent' : 'border-border'"
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" [attr.fill]="isBookmarked() ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="m19 21-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                      </svg>
                      {{ isBookmarked() ? 'Sauvegardé' : 'Sauvegarder' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- TABS -->
            <div class="bg-white rounded-2xl border-2 border-border shadow-lg mb-6 animate-fade-in-up delay-100">
              <div class="border-b border-border px-2">
                <div class="flex gap-1">
                  @for (tab of tabs; track tab.id) {
                    <button
                      (click)="activeTab.set(tab.id)"
                      class="px-6 py-4 font-semibold transition-all relative"
                      [class.text-accent]="activeTab() === tab.id"
                      [class.text-muted-foreground]="activeTab() !== tab.id"
                      [class.hover:text-foreground]="activeTab() !== tab.id"
                    >
                      {{ tab.label }}
                      @if (activeTab() === tab.id) {
                        <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"></div>
                      }
                    </button>
                  }
                </div>
              </div>

              <div class="p-8">
                @if (activeTab() === 'presentation') {
                  <div class="space-y-8 animate-fade-in">
                    <div>
                      <h3 class="text-xl font-bold mb-4">À propos</h3>
                      <p class="text-foreground/80 leading-relaxed">
                        Passionnée par l'intersection entre IA et santé, j'ai créé HealthAI, une plateforme SaaS qui aide
                        les praticiens à optimiser leur diagnostic grâce à l'intelligence artificielle. Avec 5 ans
                        d'expérience en product management chez Google Health, j'ai validé le MVP avec 50 médecins pilotes
                        et généré les premiers revenus.
                        <br><br>
                        Je recherche maintenant un co-fondateur technique (CTO) qui partage ma vision d'améliorer
                        l'accès aux soins de qualité et qui maîtrise le développement d'IA en production.
                      </p>
                    </div>

                    <div>
                      <h3 class="text-xl font-bold mb-4">Ce que je recherche</h3>
                      <div class="flex flex-wrap gap-3">
                        @for (item of searchingFor; track item) {
                          <span class="px-4 py-2 bg-accent/10 text-accent rounded-lg font-semibold border border-accent/20">{{ item }}</span>
                        }
                      </div>
                    </div>

                    <div>
                      <h3 class="text-xl font-bold mb-4">Compétences</h3>
                      <div class="flex flex-wrap gap-2">
                        @for (skill of skills; track skill) {
                          <span class="px-4 py-2 bg-secondary text-foreground rounded-lg font-medium hover:bg-accent/10 hover:text-accent transition-colors cursor-default">{{ skill }}</span>
                        }
                      </div>
                    </div>

                    <div>
                      <h3 class="text-xl font-bold mb-4">Disponibilité</h3>
                      <div class="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold">
                        <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                        Disponible immédiatement pour démarrer
                      </div>
                    </div>
                  </div>
                }

                @if (activeTab() === 'projet') {
                  <div class="text-center py-12 text-muted-foreground animate-fade-in">
                    Détails du projet à venir...
                  </div>
                }

                @if (activeTab() === 'experience') {
                  <div class="text-center py-12 text-muted-foreground animate-fade-in">
                    Parcours professionnel à venir...
                  </div>
                }

                @if (activeTab() === 'avis') {
                  <div class="text-center py-12 text-muted-foreground animate-fade-in">
                    Avis et recommandations à venir...
                  </div>
                }
              </div>
            </div>

          </div>

          <!-- RIGHT SIDEBAR -->
          <div class="col-span-4 space-y-6">

            <div class="bg-white rounded-2xl border-2 border-border shadow-lg p-6 animate-fade-in-up delay-200">
              <h3 class="text-lg font-bold mb-4">Informations clés</h3>
              <div class="space-y-4">
                @for (info of quickInfo; track info.label) {
                  <div class="pb-4 border-b border-border last:border-0 last:pb-0">
                    <div class="text-xs font-semibold text-muted-foreground uppercase mb-1">{{ info.label }}</div>
                    <div class="font-semibold text-foreground">{{ info.value }}</div>
                  </div>
                }
              </div>
            </div>

            <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200 shadow-lg p-6 relative overflow-hidden animate-fade-in-up delay-300">
              <div class="relative z-10">
                <div class="flex items-center gap-3 mb-4">
                  <div class="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </div>
                  <h3 class="text-lg font-bold">Détails confidentiels</h3>
                </div>
                <p class="text-sm text-foreground/80 mb-4 leading-relaxed">
                  Accédez aux informations complètes du projet en signant un accord de confidentialité.
                </p>
                <button class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 transition-colors shadow-md">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  Signer l'accord
                </button>
                <p class="text-xs text-muted-foreground mt-3 text-center">Mise en relation avec des experts juridiques partenaires</p>
              </div>
              <div class="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -mr-16 -mt-16"></div>
            </div>

            <div class="text-center animate-fade-in delay-400">
              <button class="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                  <line x1="4" y1="22" x2="4" y2="15"/>
                </svg>
                Signaler ce profil
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  `
})
export class ProfilComponent {
  activeTab = signal('presentation');
  isBookmarked = signal(false);

  toggleBookmark(): void {
    this.isBookmarked.update(v => !v);
  }

  readonly tabs = [
    { id: 'presentation', label: 'Présentation' },
    { id: 'projet', label: 'Projet' },
    { id: 'experience', label: 'Expérience' },
    { id: 'avis', label: 'Avis' },
  ];

  readonly searchingFor = ['Co-fondateur technique', 'CTO', 'Développeur Full-Stack', 'Expert en IA'];

  readonly skills = ['Product Management', 'Fundraising', 'Business Development', 'SaaS', 'B2B', 'Growth', 'Strategy', 'Pitching', 'Leadership'];

  readonly quickInfo = [
    { label: 'Secteur', value: 'Tech / SaaS' },
    { label: 'Stade', value: 'MVP validé' },
    { label: 'Type de collaboration', value: 'Co-fondateur / Associé' },
    { label: 'Apport possible', value: 'Vision produit, business dev, levée de fonds' },
  ];
}
