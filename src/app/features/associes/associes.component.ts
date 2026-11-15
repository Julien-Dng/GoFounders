import { ChangeDetectionStrategy, Component, ElementRef, HostListener, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { hasUsage, isProAccount, offersAssociateProfile } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { ShowcaseEntry, ShowcaseService } from '../../core/services/showcase.service';
import { FooterComponent } from '../../shared/components/footer/footer.component';
import { FREE_CONTACTS_PER_MONTH } from '../../core/config/offers';

type ShowcaseTab = 'talent' | 'project';
type FilterKey = 'availability' | 'skills' | 'sector' | 'stage';

interface FilterGroup {
  key: FilterKey;
  label: string;
  options: Array<{ value: string; label: string }>;
}

const NO_FILTERS: Record<FilterKey, string[]> = { availability: [], skills: [], sector: [], stage: [] };

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
            } @else if (isAuthenticated() && !isPro()) {
              <a routerLink="/mon-projet" class="rounded-lg bg-accent px-6 py-3.5 text-center font-semibold text-white transition-colors hover:bg-accent/90">Présenter mon projet</a>
              <a routerLink="/profil/associe" class="rounded-lg border border-white/30 px-6 py-3.5 text-center font-semibold text-white transition-colors hover:border-white/70">Proposer mes compétences</a>
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
          <div class="flex flex-wrap items-center gap-4">
            <div class="flex gap-2" role="tablist" aria-label="Type de profil">
              @for (option of tabs; track option.value) {
                <button type="button" role="tab" [attr.aria-selected]="tab() === option.value" (click)="selectTab(option.value)" class="rounded-full px-5 py-2.5 font-semibold transition-colors" [class]="tab() === option.value ? 'bg-primary text-white' : 'bg-white text-primary ring-1 ring-border hover:text-accent'">
                  {{ option.label }}
                </button>
              }
            </div>
          </div>

          <!-- Barre de recherche et filtres : uniquement sur les informations déjà affichées (aucun lieu, aucun nom). -->
          <div class="relative mt-5 flex gap-3" role="search" #filterZone>
            <div class="relative min-w-0 flex-1">
              <label for="associes-search" class="sr-only">{{ tab() === 'talent' ? 'Rechercher un métier, une compétence' : 'Rechercher un secteur, une compétence recherchée' }}</label>
              <svg class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary/70" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
              <input id="associes-search" type="search" [value]="query()" (input)="query.set($any($event.target).value)"
                     [placeholder]="tab() === 'talent' ? 'Un métier, une compétence…' : 'Un secteur, une compétence recherchée…'"
                     class="h-14 w-full rounded-xl border border-border bg-white pl-12 pr-4 text-base shadow-sm outline-none transition-colors focus:border-accent">
            </div>
            <button type="button" (click)="filtersOpen.set(!filtersOpen())" [attr.aria-expanded]="filtersOpen()" aria-controls="associes-filters"
                    class="flex h-14 flex-shrink-0 items-center gap-2 rounded-xl border bg-white px-4 font-semibold text-primary shadow-sm transition-colors hover:border-accent sm:px-5"
                    [class]="filtersOpen() || activeFilterCount() > 0 ? 'border-accent' : 'border-border'">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>
              <span class="max-sm:sr-only">Filtres</span>
              @if (activeFilterCount() > 0) {
                <span class="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs text-white">{{ activeFilterCount() }}<span class="sr-only"> actifs</span></span>
              }
              <svg class="max-sm:hidden transition-transform" [class.rotate-180]="filtersOpen()" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            </button>

            @if (filtersOpen()) {
              <div id="associes-filters" class="absolute right-0 top-full z-20 mt-2 w-full rounded-2xl bg-white p-5 shadow-xl ring-1 ring-border sm:w-[26rem]">
                @for (group of filterGroups(); track group.key) {
                  <fieldset class="mb-5 last:mb-0">
                    <legend class="mb-2 text-sm font-semibold text-primary">{{ group.label }}</legend>
                    <div class="flex flex-wrap gap-2">
                      @for (option of group.options; track option.value) {
                        <button type="button" (click)="toggleFilter(group.key, option.value)" [attr.aria-pressed]="isSelected(group.key, option.value)"
                                class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors"
                                [class]="isSelected(group.key, option.value) ? 'bg-primary text-white' : 'bg-secondary text-foreground hover:bg-accent/10'">
                          {{ option.label }}
                        </button>
                      }
                    </div>
                  </fieldset>
                }
                @if (tab() === 'project') {
                  <label class="mt-1 flex cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
                    <input type="checkbox" class="h-4 w-4 accent-accent" [checked]="equityOnly()" (change)="equityOnly.set($any($event.target).checked)">
                    Ouvert à un associé au capital
                  </label>
                }
                <div class="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <button type="button" (click)="clearFilters()" class="text-sm font-semibold text-muted-foreground hover:text-primary" [disabled]="activeFilterCount() === 0">Réinitialiser</button>
                  <button type="button" (click)="filtersOpen.set(false)" class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">
                    Voir {{ results().length }} résultat{{ results().length > 1 ? 's' : '' }}
                  </button>
                </div>
              </div>
            }
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
              <p class="text-lg font-semibold text-primary">{{ query().trim() ? 'Aucun résultat pour « ' + query().trim() + ' »' : 'Aucun résultat avec ces filtres' }}</p>
              <p class="mt-1 text-muted-foreground">Essayez un autre mot ou retirez un filtre</p>
              <button type="button" (click)="resetSearch()" class="mt-4 font-semibold text-accent hover:underline">Tout effacer</button>
            </div>
          } @else {
            @if (isFiltering()) {
              <p class="mt-5 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground" role="status">
                {{ results().length }} résultat{{ results().length > 1 ? 's' : '' }}{{ query().trim() ? ' pour « ' + query().trim() + ' »' : '' }}
                <button type="button" (click)="resetSearch()" class="font-semibold text-accent hover:underline">Tout effacer</button>
              </p>
            }
            <ul class="grid gap-6 md:auto-rows-fr md:grid-cols-2 xl:grid-cols-3" [class]="isFiltering() ? 'mt-3' : 'mt-8'">
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

      <!-- Comment ça marche, adapté à l'onglet, puis l'appel à s'inscrire. -->
      <section class="px-4 pb-14 sm:px-6 lg:px-8 lg:pb-16" aria-labelledby="associes-steps-title">
        <div class="mx-auto max-w-[78rem] space-y-6">
          <div class="rounded-2xl bg-white px-6 py-8 shadow-sm ring-1 ring-border sm:px-10">
            <h2 id="associes-steps-title" class="text-center text-2xl text-primary sm:text-3xl">Un profil. Un projet. Une rencontre</h2>
            <ol class="mt-8 grid gap-6 md:grid-cols-3 md:gap-0">
              @for (step of steps(); track step.title; let i = $index) {
                <li class="flex gap-4 md:px-8 md:first:pl-0 md:last:pr-0 md:[&:not(:first-child)]:border-l md:[&:not(:first-child)]:border-border">
                  <span class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-white" aria-hidden="true">{{ i + 1 }}</span>
                  <div>
                    <h3 class="text-lg font-bold text-primary">{{ step.title }}</h3>
                    <p class="mt-1 text-base leading-relaxed text-muted-foreground">{{ step.detail }}</p>
                  </div>
                </li>
              }
            </ol>
          </div>

          @if (banner(); as banner) {
            <div class="rounded-2xl bg-primary px-6 py-10 text-center text-white sm:px-10">
              <h2 class="text-2xl sm:text-3xl">{{ banner.title }}</h2>
              @if (banner.text) {
                <p class="mx-auto mt-3 max-w-[52ch] text-base leading-relaxed text-white/75">{{ banner.text }}</p>
              }
              <a [routerLink]="banner.path" [queryParams]="banner.params" class="mt-6 inline-block rounded-lg bg-accent px-6 py-3.5 font-semibold text-white transition-colors hover:bg-accent/90">{{ banner.label }}</a>
            </div>
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
  readonly filters = signal<Record<FilterKey, string[]>>(NO_FILTERS);
  readonly equityOnly = signal(false);
  readonly filtersOpen = signal(false);
  private readonly filterZone = viewChild<ElementRef<HTMLElement>>('filterZone');

  // Filtres construits à partir des profils affichés : seules les valeurs réellement présentes sont proposées.
  readonly filterGroups = computed<FilterGroup[]>(() => {
    const entries = this.visible();
    if (this.tab() === 'talent') {
      return [
        { key: 'availability', label: 'Disponibilité', options: this.distinct(entries.map(entry => entry.availability)) },
        { key: 'skills', label: 'Compétences', options: this.topSkills(entries) },
      ].filter(group => group.options.length > 0) as FilterGroup[];
    }
    return [
      { key: 'sector', label: 'Secteur', options: this.distinct(entries.map(entry => entry.sector)) },
      { key: 'stage', label: 'Stade', options: this.distinct(entries.map(entry => entry.stage)).map(option => ({ value: option.value, label: this.stageLabel(option.value) })) },
      { key: 'skills', label: 'Compétences recherchées', options: this.topSkills(entries) },
    ].filter(group => group.options.length > 0) as FilterGroup[];
  });
  readonly activeFilterCount = computed(() =>
    Object.values(this.filters()).reduce((total, values) => total + values.length, 0) + (this.equityOnly() ? 1 : 0));
  readonly isFiltering = computed(() => !!this.query().trim() || this.activeFilterCount() > 0);

  readonly results = computed(() => {
    const words = this.normalize(this.query()).split(/\s+/).filter(Boolean);
    const filters = this.filters();
    const equityOnly = this.equityOnly();

    return this.visible().filter(entry => {
      if (filters.availability.length && !filters.availability.includes(entry.availability ?? '')) { return false; }
      if (filters.sector.length && !filters.sector.includes(entry.sector ?? '')) { return false; }
      if (filters.stage.length && !filters.stage.includes(entry.stage ?? '')) { return false; }
      if (filters.skills.length && !filters.skills.some(skill => entry.skills.includes(skill))) { return false; }
      if (equityOnly && !entry.open_to_equity) { return false; }
      if (words.length === 0) { return true; }

      const text = this.normalize([
        entry.title, entry.availability, entry.sector, entry.stage ? this.stageLabel(entry.stage) : '',
        ...entry.skills, ...(entry.looking_for ?? []),
      ].filter(Boolean).join(' '));
      return words.every(word => text.includes(word));
    });
  });
  readonly steps = computed(() => this.tab() === 'talent'
    ? [
        { title: 'Présentez votre projet', detail: 'Décrivez votre idée, votre avancement et les compétences qui vous manquent' },
        { title: 'Trouvez votre complément', detail: 'Parcourez les associés disponibles et leurs compétences' },
        { title: 'Échangez directement', detail: 'Prenez contact et avancez ensemble sur votre projet' },
      ]
    : [
        { title: 'Présentez-vous', detail: 'Décrivez votre parcours, vos compétences et ce que vous cherchez' },
        { title: 'Trouvez votre projet', detail: 'Découvrez les projets qui recrutent et ce qu’ils recherchent' },
        { title: 'Échangez directement', detail: 'Prenez contact avec le porteur et avancez ensemble' },
      ]);
  readonly canBrowseFull = computed(() => this.canOpen('talent') || this.canOpen('project'));
  // Bannière finale selon la personne : visiteur → inscription ; membre qui peut déjà consulter l'onglet → recherche
  // complète ; sinon → l'action qui ouvre l'accès (présenter son projet, proposer ses compétences) ; compte pro → rien.
  readonly banner = computed<{ title: string; text: string | null; path: string; params: Record<string, string> | null; label: string } | null>(() => {
    const user = this.auth.currentUser();
    const talentTab = this.tab() === 'talent';
    const title = talentTab ? 'Votre prochain associé est peut-être ici' : 'Votre prochain projet est peut-être ici';

    if (!this.isAuthenticated()) {
      return { title, text: null, path: '/inscription', params: { profil: talentTab ? 'entrepreneur' : 'talent' }, label: 'Commencer gratuitement' };
    }
    if (isProAccount(user)) {
      return null;
    }
    if (this.canOpen(talentTab ? 'talent' : 'project')) {
      return { title, text: null, path: '/recherche', params: null, label: talentTab ? 'Voir tous les associés' : 'Voir tous les projets' };
    }
    return talentTab
      ? { title: 'Vous cherchez un associé ?', text: 'Présentez votre projet et les compétences qui vous manquent : les associés pourront le découvrir et vous écrire', path: '/mon-projet', params: null, label: 'Présenter mon projet' }
      : { title: 'Envie de rejoindre un projet ?', text: 'Proposez vos compétences aux porteurs de projet pour consulter leurs projets et leur écrire', path: '/profil/associe', params: null, label: 'Proposer mes compétences' };
  });
  readonly isAuthenticated = this.auth.isAuthenticated;
  readonly isPro = computed(() => isProAccount(this.auth.currentUser()));


  async ngOnInit(): Promise<void> {
    this.entries.set(await this.showcase.list());
    this.loaded.set(true);
  }

  selectTab(tab: ShowcaseTab): void {
    if (tab !== this.tab()) {
      this.tab.set(tab);
      this.clearFilters();
    }
  }

  isSelected(key: FilterKey, value: string): boolean {
    return this.filters()[key].includes(value);
  }

  toggleFilter(key: FilterKey, value: string): void {
    this.filters.update(filters => ({
      ...filters,
      [key]: filters[key].includes(value) ? filters[key].filter(item => item !== value) : [...filters[key], value],
    }));
  }

  clearFilters(): void {
    this.filters.set(NO_FILTERS);
    this.equityOnly.set(false);
  }

  resetSearch(): void {
    this.query.set('');
    this.clearFilters();
  }

  // Le panneau des filtres se ferme au clic ailleurs et avec Échap.
  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    const zone = this.filterZone()?.nativeElement;
    if (this.filtersOpen() && zone && !zone.contains(event.target as Node)) {
      this.filtersOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.filtersOpen.set(false);
  }

  private distinct(values: Array<string | null>): Array<{ value: string; label: string }> {
    return [...new Set(values.filter((value): value is string => !!value?.trim()))]
      .sort((a, b) => a.localeCompare(b, 'fr'))
      .map(value => ({ value, label: value }));
  }

  // Les compétences les plus fréquentes (10 au plus), pour garder un panneau lisible.
  private topSkills(entries: ShowcaseEntry[]): Array<{ value: string; label: string }> {
    const counts = new Map<string, number>();
    entries.flatMap(entry => entry.skills).forEach(skill => counts.set(skill, (counts.get(skill) ?? 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
      .slice(0, 10)
      .map(([value]) => ({ value, label: value }));
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  // Associés : visibles une fois son projet publié (objectif ajouté automatiquement). Projets : une fois son profil
  // d'associé proposé. Les règles réelles sont vérifiées par Supabase.
  private canOpen(kind: 'talent' | 'project'): boolean {
    const user = this.auth.currentUser();
    return kind === 'talent' ? hasUsage(user, 'projet') : offersAssociateProfile(user);
  }

  stageLabel(stage: string | null): string {
    return stage ? STAGE_LABELS[stage] ?? stage : 'Stade non précisé';
  }

  // Membre du bon rôle : profil complet. Visiteur : inscription dans le rôle complémentaire, retour sur le profil.
  profileLink(entry: ShowcaseEntry): { path: string; params: Record<string, string> | null; label: string } {
    // Compte multi-usages : les associés pour qui cherche des associés, les projets pour qui veut en rejoindre un.
    const wantedRole = entry.kind === 'talent' ? 'entrepreneur' : 'talent';
    const label = entry.kind === 'talent' ? 'Voir le profil' : 'Voir le projet';

    if (this.canOpen(entry.kind)) {
      return { path: `/profil/${entry.profile_id}`, params: null, label };
    }

    if (this.auth.isAuthenticated()) {
      if (this.isPro()) {
        return { path: '', params: null, label: 'Réservé aux membres' };
      }
      return entry.kind === 'talent'
        ? { path: '/mon-projet', params: null, label: 'Présenter mon projet pour le contacter' }
        : { path: '/profil/associe', params: null, label: 'Proposer mes compétences pour le voir' };
    }

    return { path: '/inscription', params: { profil: wantedRole, returnUrl: `/profil/${entry.profile_id}` }, label: `${label}` };
  }
}
