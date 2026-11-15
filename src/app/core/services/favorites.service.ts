import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export interface FavoriteResult {
  success: boolean;
  message: string;
}

interface FavoriteRow {
  listing_id: string;
  favorited_at: string;
}

const LOCAL_KEY = 'gofounders.favorites.';

// Favoris d'entreprises (supabase/2026-11-16-favoris.sql) : lisibles par le seul membre, jamais par le cédant.
// Un favori n'ouvre aucun droit et n'ajoute aucun objectif. Mode démo : stockés dans le navigateur.
@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly auth = inject(AuthService);
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);

  // Annonce → date d'ajout, du plus récent au plus ancien.
  private readonly entries = signal<Map<string, string>>(new Map());
  private loadedFor: string | null = null;
  private loading: Promise<void> | null = null;

  readonly count = computed(() => this.entries().size);
  readonly orderedIds = computed(() =>
    [...this.entries().entries()].sort((a, b) => b[1].localeCompare(a[1])).map(([id]) => id));

  isFavorite(listingId: string): boolean {
    return this.entries().has(listingId);
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

  async toggle(listingId: string): Promise<FavoriteResult> {
    const user = this.auth.currentUser();

    if (!user) {
      await this.router.navigate(['/connexion'], { queryParams: { returnUrl: this.router.url } });
      return { success: false, message: 'Connectez-vous pour enregistrer cette entreprise.' };
    }

    await this.ensureLoaded();
    const adding = !this.isFavorite(listingId);
    const previous = this.entries();
    const next = new Map(previous);
    if (adding) {
      next.set(listingId, new Date().toISOString());
    } else {
      next.delete(listingId);
    }
    // Affichage immédiat, annulé si l'enregistrement échoue.
    this.entries.set(next);

    if (!this.supabase.isConfigured) {
      localStorage.setItem(LOCAL_KEY + user.uid, JSON.stringify([...next.entries()]));
      return { success: true, message: adding ? 'Ajoutée à vos favoris' : 'Retirée de vos favoris' };
    }

    const { error } = adding
      ? await this.supabase.client.from('listing_favorites').insert({ user_id: user.uid, listing_id: listingId })
      : await this.supabase.client.from('listing_favorites').delete().eq('listing_id', listingId);

    if (error && !(adding && error.code === '23505')) {
      this.entries.set(previous);
      return {
        success: false,
        message: error.message.includes('FAVORIS_LIMITE')
          ? 'Vous avez atteint 200 favoris. Retirez-en quelques-uns pour en ajouter.'
          : 'Impossible d’enregistrer ce favori pour le moment.',
      };
    }

    return { success: true, message: adding ? 'Ajoutée à vos favoris' : 'Retirée de vos favoris' };
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

    // Seules les annonces encore visibles reviennent (une annonce retirée disparaît de la liste).
    const { data, error } = await this.supabase.client.rpc('list_my_favorite_listings');
    const rows = error ? [] : ((data ?? []) as FavoriteRow[]);
    this.entries.set(new Map(rows.map(row => [row.listing_id, row.favorited_at])));
  }
}
