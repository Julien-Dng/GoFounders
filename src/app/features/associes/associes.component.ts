import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { hasUsage, usesTeamMarketplace } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { ShowcaseEntry, ShowcaseService } from '../../core/services/showcase.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { FREE_CONTACTS_PER_MONTH } from '../../core/config/offers';

type ShowcaseTab = 'talent' | 'project';

const STAGE_LABELS: Record<string, string> = {
  idea: 'Idée',
  mvp: 'Premier produit (MVP)',
  growth: 'En croissance',
  established: 'Établi',
};

// Vitrine publique « Trouver un associé ». Profils anonymisés, affichés seulement avec l'accord des membres
// (supabase/2026-10-27-vitrine-associes.sql). Le profil complet et le contact demandent un compte.
@Component({
  selector: 'app-associes',
  standalone: true,
  imports: [RouterLink, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary">
      <section class="relative overflow-hidden bg-primary px-4 pb-14 pt-28 text-white sm:px-6 lg:px-8 lg:pb-16 lg:pt-36">
        <div class="pointer-events-none absolute inset-y-0 right-0 hidden w-[45%] lg:block" aria-hidden="true">
          <div class="absolute -top-10 left-[10%] h-40 w-64 rounded-3xl bg-white/[0.04]"></div>
          <div class="absolute bottom-[-2rem] left-[45%] h-48 w-72 rounded-3xl bg-white/[0.04]"></div>
        </div>
        <div class="relative mx-auto max-w-[78rem]">
          <h1 class="max-w-[18ch] text-[2.4rem] leading-[1.08] sm:text-[3.25rem]">Trouvez l'associé qui complète votre projet</h1>
          <p class="mt-5 max-w-[56ch] text-lg leading-relaxed text-white/70">
            Trouvez un associé ou rejoignez un projet. Inscrivez-vous pour découvrir les profils et entrer en contact
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            @if (canBrowseFull()) {
              <a routerLink="/recherche" class="rounded-lg bg-accent px-6 py-3.5 text-center font-semibold text-white transition-colors hover:bg-accent/90">Ouvrir la recherche complète</a>
            } @else if (isAuthenticated()) {
              <p class="max-w-[60ch] rounded-xl bg-white/10 px-5 py-4 text-base leading-relaxed text-white/85">
                Votre compte actuel sert à la reprise d'entreprise. Pour chercher un associé ou rejoindre un projet,
                créez un second compte, porteur de projet ou associé, avec une autre adresse e-mail
              </p>
            } @else {
              <a routerLink="/inscription" [queryParams]="{ profil: 'entrepreneur' }" class="rounded-lg bg-accent px-6 py-3.5 text-center font-semibold text-white transition-colors hover:bg-accent/90">Je cherche un associé</a>
              <a routerLink="/inscription" [queryParams]="{ profil: 'talent' }" class="rounded-lg border border-white/30 px-6 py-3.5 text-center font-semibold text-white transition-colors hover:border-white/70">Je veux devenir associé</a>
            }
          </div>
        </div>
      </section>


      <section class="px-4 py-14 sm:px-6 lg:px-8 lg:py-16" aria-labelledby="showcase-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="showcase-title" class="sr-only">Profils</h2>
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div class="flex gap-2" role="tablist" aria-label="Type de profil">
              @for (option of tabs; track option.value) {
                <button type="button" role="tab" [attr.aria-selected]="tab() === option.value" (click)="tab.set(option.value)" class="rounded-full px-5 py-2.5 font-semibold transition-colors" [class]="tab() === option.value ? 'bg-primary text-white' : 'bg-white text-primary ring-1 ring-border hover:text-accent'">
                  {{ option.label }}
                </button>
              }
            </div>
            <!-- Recherche dans la vitrine : filtre sur les informations déjà affichées (intitulé, compétences, secteur…). -->
            <div class="relative w-full sm:w-80" role="search">
              <label for="associes-search" class="sr-only">Rechercher une compétence, un secteur</label>
              <svg class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
              <input id="associes-search" type="search" [value]="query()" (input)="query.set($any($event.target).value)"
                     [placeholder]="tab() === 'talent' ? 'Compétence, métier, disponibilité…' : 'Secteur, compétence recherchée…'"
                     class="w-full rounded-full border border-border bg-white py-2.5 pl-10 pr-4 text-base outline-none transition-colors focus:border-accent">
            </div>
          </div>

          @if (!loaded()) {
            <p class="mt-10 text-center text-muted-foreground" role="status">Chargement…</p>
          } @else if (visible().length === 0) {
            <div class="mt-8 rounded-2xl bg-white p-10 text-center shadow-lg ring-1 ring-border">
              <h3 class="text-2xl text-primary">{{ tab() === 'talent' ? 'Les premiers associés arrivent' : 'Les premiers projets arrivent' }}</h3>
              <p class="mx-auto mt-3 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
                La communauté démarre. Inscrivez-vous pour être parmi les premiers visibles : vous serez prévenu dès qu'un profil compatible rejoint GoFounders
              </p>
              <a routerLink="/inscription" [queryParams]="{ profil: tab() === 'talent' ? 'talent' : 'entrepreneur' }" class="mt-6 inline-block rounded-lg bg-accent px-6 py-3.5 font-semibold text-white transition-colors hover:bg-accent/90">
                {{ tab() === 'talent' ? 'Rejoindre la liste des associés' : 'Présenter mon projet' }}
              </a>
            </div>
          } @else if (results().length === 0) {
            <div class="mt-8 rounded-2xl bg-white p-8 text-center ring-1 ring-border" role="status">
              <p class="text-lg font-semibold text-primary">Aucun résultat pour « {{ query().trim() }} »</p>
              <p class="mt-1 text-muted-foreground">Essayez un autre mot, ou consultez tous les profils</p>
              <button type="button" (click)="query.set('')" class="mt-4 font-semibold text-accent hover:underline">Effacer la recherche</button>
            </div>
          } @else {
            @if (query().trim()) {
              <p class="mt-6 text-sm text-muted-foreground" role="status">{{ results().length }} résultat{{ results().length > 1 ? 's' : '' }} pour « {{ query().trim() }} »</p>
            }
            <ul class="mt-8 grid gap-6 md:auto-rows-fr md:grid-cols-2 xl:grid-cols-3" [class.mt-3]="!!query().trim()">
              @for (entry of results(); track entry.profile_id + entry.kind) {
                <!-- Toute la carte est cliquable : le lien « Voir le profil ↗ » s'étend sur la carte (clavier compris). -->
                <li class="group relative flex flex-col rounded-2xl bg-white p-5 shadow-md ring-1 ring-border transition-shadow focus-within:ring-2 focus-within:ring-accent"
                    [class]="profileLink(entry).path ? 'hover:shadow-lg hover:ring-accent/50' : ''">
                  <div class="flex items-start gap-4">
                    <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-primary/60" aria-hidden="true">
                      @if (entry.kind === 'talent') {
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                      } @else {
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z"/></svg>
                      }
                    </span>
                    <div class="min-w-0">
                      @if (entry.kind === 'talent') {
                        <h3 class="text-lg font-bold leading-snug text-primary transition-colors group-hover:text-accent">{{ entry.title || 'Associé' }}</h3>
                        @if (entry.availability) {
                          <p class="mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-sm font-semibold text-emerald-800">{{ entry.availability }}</p>
                        }
                      } @else {
                        <h3 class="text-lg font-bold leading-snug text-primary transition-colors group-hover:text-accent">Projet {{ entry.sector || 'en recherche d’associé' }}</h3>
                        <p class="mt-1 text-sm text-muted-foreground">{{ stageLabel(entry.stage) }}</p>
                      }
                    </div>
                  </div>

                  @if (entry.kind === 'project' && entry.looking_for?.length) {
                    <p class="mt-3 text-base text-foreground/85"><span class="font-semibold text-primary">Recherche :</span> {{ entry.looking_for!.join(', ') }}</p>
                  }

                  @if (entry.skills.length > 0) {
                    <ul class="mt-3 flex flex-wrap gap-2" [attr.aria-label]="entry.kind === 'talent' ? 'Compétences' : 'Compétences recherchées'">
                      @for (skill of entry.skills.slice(0, 6); track skill) {
                        <li class="rounded-lg bg-secondary px-3 py-1 text-sm font-medium text-foreground">{{ skill }}</li>
                      }
                    </ul>
                  }

                  @if (entry.kind === 'project' && (entry.open_to_equity || entry.nda_required)) {
                    <p class="mt-3 text-sm text-muted-foreground">
                      {{ entry.open_to_equity ? 'Ouvert à un associé au capital' : '' }}{{ entry.open_to_equity && entry.nda_required ? ' · ' : '' }}{{ entry.nda_required ? 'Détails sous engagement de confidentialité' : '' }}
                    </p>
                  }

                  <div class="mt-auto flex justify-end pt-4">
                    @if (profileLink(entry).path) {
                      <a [routerLink]="profileLink(entry).path" [queryParams]="profileLink(entry).params"
                         class="text-sm font-semibold text-accent outline-none after:absolute after:inset-0 after:rounded-2xl after:content-['']">
                        {{ profileLink(entry).label }}&nbsp;<span aria-hidden="true">↗</span>
                      </a>
                    } @else {
                      <p class="text-sm text-muted-foreground">{{ profileLink(entry).label }}</p>
                    }
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </section>

      <app-footer />
    </div>
  `,
})
export class AssociesComponent implements OnInit {
  readonly freeContacts = FREE_CONTACTS_PER_MONTH;
  private readonly auth = inject(AuthService);
  private readonly showcase = inject(ShowcaseService);

  readonly entries = signal<ShowcaseEntry[]>([]);
  readonly loaded = signal(false);
  readonly tab = signal<ShowcaseTab>('talent');
  readonly tabs: Array<{ value: ShowcaseTab; label: string }> = [
    { value: 'talent', label: 'Associés disponibles' },
    { value: 'project', label: 'Projets qui recrutent' },
  ];

  readonly talents = computed(() => this.entries().filter(entry => entry.kind === 'talent'));
  readonly projects = computed(() => this.entries().filter(entry => entry.kind === 'project'));
  readonly visible = computed(() => (this.tab() === 'talent' ? this.talents() : this.projects()));
  // Recherche dans la vitrine, sans accents ni majuscules, sur les seuls champs publics affichés.
  readonly query = signal('');
  readonly results = computed(() => {
    const words = this.normalize(this.query()).split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      return this.visible();
    }

    return this.visible().filter(entry => {
      const text = this.normalize([
        entry.title, entry.availability, entry.sector, entry.stage ? this.stageLabel(entry.stage) : '',
        ...entry.skills, ...(entry.looking_for ?? []),
      ].filter(Boolean).join(' '));
      return words.every(word => text.includes(word));
    });
  });
  readonly canBrowseFull = computed(() => usesTeamMarketplace(this.auth.currentUser()));
  readonly isAuthenticated = this.auth.isAuthenticated;


  async ngOnInit(): Promise<void> {
    this.entries.set(await this.showcase.list());
    this.loaded.set(true);
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  stageLabel(stage: string | null): string {
    return stage ? STAGE_LABELS[stage] ?? stage : 'Stade non précisé';
  }

  // Membre du bon rôle : profil complet. Visiteur : inscription dans le rôle complémentaire, retour sur le profil.
  profileLink(entry: ShowcaseEntry): { path: string; params: Record<string, string> | null; label: string } {
    // Compte multi-usages : les associés pour qui cherche des associés, les projets pour qui veut en rejoindre un.
    const wantedRole = entry.kind === 'talent' ? 'entrepreneur' : 'talent';
    const label = entry.kind === 'talent' ? 'Voir le profil' : 'Voir le projet';

    if (hasUsage(this.auth.currentUser(), entry.kind === 'talent' ? 'projet' : 'associe')) {
      return { path: `/profil/${entry.profile_id}`, params: null, label };
    }

    if (this.auth.isAuthenticated()) {
      return { path: '', params: null, label: entry.kind === 'talent' ? 'Ajoutez « Trouver des associés » dans Paramètres' : 'Ajoutez « Rejoindre un projet » dans Paramètres' };
    }

    return { path: '/inscription', params: { profil: wantedRole, returnUrl: `/profil/${entry.profile_id}` }, label: `${label}` };
  }
}
