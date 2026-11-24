import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export type FavoriteKind = 'listing' | 'project' | 'associate';

export interface FavoriteResult {
  success: boolean;
  message: string;
}

export interface FavoriteEntry {
  kind: FavoriteKind;
  id: string;
  at: string;
}

interface ListingFavoriteRow {
  listing_id: string;
  favorited_at: string;
}

interface MemberFavoriteRow {
  kind: 'project' | 'associate';
  target_id: string;
  favorited_at: string;
}

const LOCAL_KEY = 'gofounders.favorites.v2.';

// Mes favoris : entreprises (listing_favorites, 2026-11-16-favoris.sql), projets et associés (member_favorites,
// 2026-11-24-favoris-membres.sql). Lisibles par le seul membre ; un favori n'ouvre aucun droit et n'ajoute aucun
// objectif. Mode démo : stockés dans le navigateur.
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  // Clé « type:id » → date d'ajout.
  private readonly entries = signal<Map<string, string>>(new Map());
  private loadedFor: string | null = null;
  private loading: Promise<void> | null = null;

  // Du plus récent au plus ancien.
  readonly all = computed<FavoriteEntry[]>(() =>
    [...this.entries().entries()]
      .map(([key, at]) => {
        const [kind, id] = key.split(':') as [FavoriteKind, string];
        return { kind, id, at };
      })
      .sort((a, b) => b.at.localeCompare(a.at)));
  readonly count = computed(() => this.entries().size);
  // Compatibilité : identifiants des entreprises enregistrées.
  readonly orderedIds = computed(() => this.all().filter(entry => entry.kind === 'listing').map(entry => entry.id));

  isFavorite(id: string, kind: FavoriteKind = 'listing'): boolean {
    return this.entries().has(`${kind}:${id}`);
  }

  async ensureLoaded(): Promise<void> {
    await this.auth.ensureSessionReady();
    const uid = this.auth.currentUser()?.uid ?? null;

    if (!uid) {
      this.entries.set(new Map());
      this.loadedFor = null;
      return;
    }

    if (this.loadedFor === uid) {
      return this.loading ?? undefined;
    }

    this.loadedFor = uid;
    this.loading = this.load(uid).finally(() => (this.loading = null));
    return this.loading;
  }

  async toggle(id: string, kind: FavoriteKind = 'listing'): Promise<FavoriteResult> {
    const user = this.auth.currentUser();

    if (!user) {
      await this.router.navigate(['/connexion'], { queryParams: { returnUrl: this.router.url } });
      return { success: false, message: 'Connectez-vous pour enregistrer ce favori.' };
    }

    await this.ensureLoaded();
    const key = `${kind}:${id}`;
    const adding = !this.entries().has(key);
    const previous = this.entries();
    const next = new Map(previous);
    if (adding) {
      next.set(key, new Date().toISOString());
    } else {
      next.delete(key);
    }
    // Affichage immédiat, annulé si l'enregistrement échoue.
    this.entries.set(next);

    const done = { success: true, message: adding ? 'Ajouté à vos favoris' : 'Retiré de vos favoris' };

    if (!this.supabase.isConfigured) {
      localStorage.setItem(LOCAL_KEY + user.uid, JSON.stringify([...next.entries()]));
      return done;
    }

    const { error } = kind === 'listing'
      ? adding
        ? await this.supabase.client.from('listing_favorites').insert({ user_id: user.uid, listing_id: id })
        : await this.supabase.client.from('listing_favorites').delete().eq('listing_id', id)
      : adding
        ? await this.supabase.client.from('member_favorites').insert({ user_id: user.uid, kind, target_id: id })
        : await this.supabase.client.from('member_favorites').delete().eq('kind', kind).eq('target_id', id);

    if (error && !(adding && error.code === '23505')) {
      this.entries.set(previous);
      return {
        success: false,
        message: error.message.includes('FAVORIS_LIMITE')
          ? 'Vous avez atteint 200 favoris de ce type. Retirez-en quelques-uns pour en ajouter.'
          : 'Impossible d’enregistrer ce favori pour le moment.',
      };
    }

    return done;
  }

  private async load(uid: string): Promise<void> {
    if (!this.supabase.isConfigured) {
      try {
        const stored = JSON.parse(localStorage.getItem(LOCAL_KEY + uid) ?? '[]') as Array<[string, string]>;
        this.entries.set(new Map(stored));
      } catch {
        this.entries.set(new Map());
      }
      return;
    }

    // Seuls les éléments encore visibles reviennent (annonce retirée, projet en brouillon, associé masqué : absents).
    const [listings, members] = await Promise.all([
      this.supabase.client.rpc('list_my_favorite_listings'),
      this.supabase.client.rpc('list_my_member_favorites'),
    ]);
    const map = new Map<string, string>();
    for (const row of (listings.error ? [] : (listings.data ?? [])) as ListingFavoriteRow[]) {
      map.set(`listing:${row.listing_id}`, row.favorited_at);
    }
    for (const row of (members.error ? [] : (members.data ?? [])) as MemberFavoriteRow[]) {
      map.set(`${row.kind}:${row.target_id}`, row.favorited_at);
    }
    this.entries.set(map);
  }
}
