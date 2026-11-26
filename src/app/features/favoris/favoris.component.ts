import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MaListingData, MarketplaceProfile } from '../../core/data/mock-platform.data';
import { FavoriteKind, FavoritesService } from '../../core/services/favorites.service';
import { MaService } from '../../core/services/ma.service';
import { MatchingService } from '../../core/services/matching.service';
import { FavoriteButtonComponent } from '../../shared/components/favorite-button/favorite-button.component';

type Filter = 'all' | FavoriteKind;

export interface FavoriteCard {
  kind: FavoriteKind;
  id: string;
  at: string;
  title: string;
  subtitle: string;
  detail: string;
  tags: string[];
  initials: string;
  link: string[];
  figures: Array<{ label: string; value: string }>;
}

export const KIND_LABELS: Record<FavoriteKind, string> = { listing: 'Entreprise', project: 'Projet', associate: 'Associé' };

// Cartes de favoris (entreprises, projets, associés) construites à partir des données déjà lisibles par le membre.
export function buildFavoriteCards(
  entries: Array<{ kind: FavoriteKind; id: string; at: string }>,
  listings: MaListingData[],
  profiles: MarketplaceProfile[],
): FavoriteCard[] {
  const listingById = new Map(listings.map(listing => [listing.id, listing]));
  const profileById = new Map(profiles.map(profile => [profile.id, profile]));
  const cards: FavoriteCard[] = [];
  for (const entry of entries) {
    if (entry.kind === 'listing') {
      const listing = listingById.get(entry.id);
      if (listing) {
        cards.push({
          ...entry,
          title: listing.title || `${listing.sector}, ${listing.region}`,
          subtitle: `${listing.sector} · ${listing.region}`,
          detail: '',
          tags: [],
          initials: (listing.sector || 'E').slice(0, 1).toUpperCase(),
          link: ['/ma/annonce', listing.id],
          figures: [{ label: 'CA', value: listing.revenue }, { label: 'Prix', value: `${listing.priceMin} à ${listing.priceMax}` }],
        });
      }
      continue;
    }
    const profile = profileById.get(entry.id);
    if (profile) {
      cards.push({
        ...entry,
        title: entry.kind === 'project' ? profile.displayName : profile.title || profile.displayName,
        subtitle: entry.kind === 'project'
          ? [profile.sector, profile.location].filter(Boolean).join(' · ')
          : [profile.displayName, profile.location].filter(Boolean).join(' · '),
        detail: entry.kind === 'project'
          ? (profile.lookingFor.length ? `Recherche : ${profile.lookingFor.slice(0, 2).join(', ')}` : '')
          : profile.availabilityLabel,
        tags: entry.kind === 'project' ? [profile.stage].filter(Boolean) : profile.skills.slice(0, 2),
        initials: profile.initials || profile.displayName.slice(0, 2).toUpperCase(),
        link: ['/profil', profile.id],
        figures: [],
      });
    }
  }
  return cards;
}

// « Mes favoris » : tout ce que le membre a enregistré, au même endroit (entreprises, projets, associés).
@Component({
  selector: 'app-favoris',
  standalone: true,
  imports: [RouterLink, FavoriteButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-16 pt-20 sm:px-6 sm:pt-24 lg:px-8">
      <div class="mx-auto max-w-6xl">
        <h1 class="text-2xl font-semibold text-primary sm:text-4xl">Mes favoris</h1>
        <p class="mt-2 text-muted-foreground">Entreprises, projets et associés : retrouvez tout ce que vous avez enregistré</p>

        <!-- Téléphones : les quatre filtres en deux lignes égales. -->
        <div class="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:flex-wrap" role="tablist" aria-label="Type de favori">
          @for (option of filters; track option.value) {
            <button type="button" role="tab" [attr.aria-selected]="filter() === option.value" (click)="filter.set(option.value)"
                    class="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors"
                    [class]="filter() === option.value ? 'bg-primary text-white' : 'bg-white text-primary ring-1 ring-border hover:text-accent'">
              {{ option.label }}
              <span class="rounded-full px-1.5 text-xs" [class]="filter() === option.value ? 'bg-white/20' : 'bg-secondary'">{{ countOf(option.value) }}</span>
            </button>
          }
        </div>

        <div class="mt-4 flex flex-col gap-3 sm:flex-row">
          <div class="relative flex-1">
            <label for="favoris-search" class="sr-only">Rechercher dans mes favoris</label>
            <svg class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input id="favoris-search" type="search" [value]="query()" (input)="query.set($any($event.target).value)" placeholder="Rechercher dans mes favoris…"
                   class="h-12 w-full rounded-xl border border-border bg-white pl-11 pr-4 text-base outline-none focus:border-accent">
          </div>
          <div class="flex items-center gap-3">
            <label for="favoris-sort" class="flex-shrink-0 text-sm font-medium text-muted-foreground sm:sr-only">Trier par</label>
            <select id="favoris-sort" [value]="sort()" (change)="sort.set($any($event.target).value)" class="h-12 w-full rounded-xl border border-border bg-white px-4 text-base outline-none focus:border-accent sm:w-52">
              <option value="recent">Ajout récent</option>
              <option value="alpha">Ordre alphabétique</option>
            </select>
          </div>
        </div>

        @if (!loaded()) {
          <p class="py-16 text-center text-muted-foreground" role="status">Chargement…</p>
        } @else if (cards().length === 0) {
          <div class="mt-5 rounded-2xl bg-white p-6 text-center shadow-lg ring-1 ring-border sm:mt-6 sm:p-10">
            <h2 class="text-2xl text-primary">{{ allCards().length === 0 ? 'Aucun favori pour le moment' : 'Aucun favori ne correspond' }}</h2>
            <p class="mx-auto mt-3 max-w-[50ch] text-base leading-relaxed text-muted-foreground">
              Touchez le cœur sur une entreprise, un projet ou un profil d'associé pour le retrouver ici
            </p>
            <div class="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <a routerLink="/ma" class="rounded-lg bg-accent px-6 py-3 font-semibold text-white transition-colors hover:bg-accent/90">Voir les entreprises</a>
              <a routerLink="/recherche" class="rounded-lg border border-border bg-white px-6 py-3 font-semibold text-primary transition-colors hover:border-primary">Voir les associés et projets</a>
            </div>
          </div>
        } @else {
          <ul class="mt-5 grid gap-3 sm:mt-6 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
            @for (card of cards(); track card.kind + card.id) {
              <li class="group relative flex flex-col rounded-2xl bg-white p-4 shadow-md ring-1 ring-border transition-shadow hover:shadow-lg sm:p-5">
                <div class="flex items-start justify-between gap-3">
                  <span class="rounded-md bg-accent/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-accent">{{ kindLabel(card.kind) }}</span>
                  <app-favorite-button [listingId]="card.id" [kind]="card.kind" [label]="card.title" />
                </div>
                <div class="mt-2 flex items-start gap-3">
                  <span class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-secondary font-bold text-primary" aria-hidden="true">{{ card.initials }}</span>
                  <div class="min-w-0">
                    <h2 class="text-lg font-bold leading-snug text-primary group-hover:text-accent">
                      <a [routerLink]="card.link" class="after:absolute after:inset-0 after:rounded-2xl focus:outline-none focus-visible:underline">{{ card.title }}</a>
                    </h2>
                    <p class="text-sm text-muted-foreground">{{ card.subtitle }}</p>
                    @if (card.detail) {
                      <p class="mt-1 text-sm text-foreground/80">{{ card.detail }}</p>
                    }
                  </div>
                </div>
                @if (card.figures.length) {
                  <dl class="tabular mt-4 flex gap-6">
                    @for (figure of card.figures; track figure.label) {
                      <div><dt class="text-xs text-muted-foreground">{{ figure.label }}</dt><dd class="font-semibold text-primary">{{ figure.value }}</dd></div>
                    }
                  </dl>
                }
                <div class="mt-auto flex items-end justify-between gap-3 pt-4">
                  <span class="flex flex-wrap gap-1.5">
                    @for (tag of card.tags; track tag) {
                      <span class="rounded-md bg-secondary px-2 py-0.5 text-sm font-medium text-foreground">{{ tag }}</span>
                    }
                  </span>
                  <span class="text-accent" aria-hidden="true">→</span>
                </div>
              </li>
            }
          </ul>
        }

        <p class="mt-8 text-sm text-muted-foreground">Retirer un favori ne supprime ni vos échanges ni vos dossiers achetés</p>
      </div>
    </div>
  `,
})
export class FavorisComponent implements OnInit {
  private readonly favorites = inject(FavoritesService);
  private readonly ma = inject(MaService);
  private readonly matching = inject(MatchingService);

  readonly filters: Array<{ value: Filter; label: string }> = [
    { value: 'all', label: 'Tous' },
    { value: 'listing', label: 'Entreprises' },
    { value: 'project', label: 'Projets' },
    { value: 'associate', label: 'Associés' },
  ];
  readonly filter = signal<Filter>('all');
  readonly query = signal('');
  readonly sort = signal<'recent' | 'alpha'>('recent');
  readonly loaded = signal(false);
  private readonly listings = signal<MaListingData[]>([]);
  private readonly profiles = signal<MarketplaceProfile[]>([]);

  // Un favori retiré disparaît aussitôt (la liste suit le service).
  readonly allCards = computed(() => buildFavoriteCards(this.favorites.all(), this.listings(), this.profiles()));
  readonly cards = computed(() => {
    const words = this.normalize(this.query()).split(/\s+/).filter(Boolean);
    const list = this.allCards()
      .filter(card => this.filter() === 'all' || card.kind === this.filter())
      .filter(card => words.every(word => this.normalize([card.title, card.subtitle, card.detail, ...card.tags].join(' ')).includes(word)));
    return this.sort() === 'alpha' ? [...list].sort((a, b) => a.title.localeCompare(b.title, 'fr')) : list;
  });

  async ngOnInit(): Promise<void> {
    const [listings, profiles] = await Promise.all([
      this.ma.getListingCards(),
      this.matching.getMarketplaceProfilesForSearch(),
      this.favorites.ensureLoaded(),
    ]);
    this.listings.set(listings);
    this.profiles.set(profiles);
    this.loaded.set(true);
  }

  countOf(filter: Filter): number {
    return filter === 'all' ? this.allCards().length : this.allCards().filter(card => card.kind === filter).length;
  }

  kindLabel(kind: FavoriteKind): string {
    return KIND_LABELS[kind];
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
}
