import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PRO_CATEGORY_LABELS, ProCategory } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { MaService, ProDirectoryEntry } from '../../core/services/ma.service';
import { StatsService } from '../../core/services/stats.service';

// Annuaire public des professionnels de la transmission (refonte « reprise »).
@Component({
  selector: 'app-pros',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-[1200px]">
        <div class="mb-8">
          <h1 class="text-3xl font-bold text-primary sm:text-4xl">Annuaire des professionnels</h1>
          <p class="mt-2 max-w-3xl text-muted-foreground">
            Experts-comptables, avocats, notaires et cabinets de cession qui accompagnent les cessions et les reprises.
          </p>
        </div>

        <div class="mb-8 flex flex-wrap gap-2" role="group" aria-label="Filtrer par métier">
          <button type="button" (click)="filter(null)" [class]="chipClass(category() === null)">Tous</button>
          @for (option of categories; track option.value) {
            <button type="button" (click)="filter(option.value)" [class]="chipClass(category() === option.value)">{{ option.label }}</button>
          }
        </div>

        @if (entries().length === 0) {
          <div class="rounded-2xl border border-border bg-white p-10 text-center text-muted-foreground">Aucun professionnel dans cette catégorie pour l'instant.</div>
        } @else {
          <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            @for (entry of entries(); track entry.id) {
              <article class="flex flex-col rounded-2xl border-2 bg-white p-6 shadow-sm" [class]="entry.has_pro_account ? 'border-accent/40' : 'border-border'">
                <div class="flex items-start gap-3">
                  @if (entry.photo_url) {
                    <img [src]="entry.photo_url" [alt]="'Photo de ' + entry.display_name" class="h-12 w-12 flex-shrink-0 rounded-full object-cover">
                  } @else {
                    <span class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent to-primary font-bold text-white" aria-hidden="true">{{ initials(entry.display_name) }}</span>
                  }
                  <div class="min-w-0">
                    <h2 class="font-bold">{{ entry.display_name }}</h2>
                    @if (entry.title) {
                      <p class="text-sm text-muted-foreground">{{ entry.title }}</p>
                    }
                  </div>
                </div>
                <div class="mt-3 flex flex-wrap gap-2">
                  @if (entry.pro_category) {
                    <span class="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">{{ categoryLabel(entry.pro_category) }}</span>
                  }
                  @if (entry.location) {
                    <span class="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-foreground/80">{{ entry.location }}</span>
                  }
                  @if (entry.has_pro_account) {
                    <span class="rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-semibold text-white">Compte pro</span>
                  }
                </div>
                @if (entry.bio) {
                  <p class="mt-3 flex-1 text-sm leading-relaxed text-foreground/80">{{ entry.bio }}</p>
                }
                <div class="mt-5 flex flex-wrap gap-2">
                  @if (isAuthenticated()) {
                    <a routerLink="/messages" [queryParams]="{ conversation: entry.id }" class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90">Envoyer un message</a>
                  } @else {
                    <a routerLink="/connexion" [queryParams]="{ returnUrl: '/pros' }" class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90">Se connecter pour écrire</a>
                  }
                  @if (isAuthenticated()) {
                    <a [routerLink]="['/profil', entry.id]" class="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-accent">Voir la fiche</a>
                  }
                  @if (entry.website_url) {
                    <a [href]="entry.website_url" (click)="trackWebsite(entry.id)" target="_blank" rel="noopener noreferrer" class="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-accent">Site web</a>
                  }
                </div>
              </article>
            }
          </div>
        }

        <div class="mt-12 rounded-2xl border border-border bg-white p-6 text-center">
          <p class="font-semibold">Vous êtes un professionnel de la transmission ?</p>
          <a routerLink="/tarifs" fragment="pros" class="mt-2 inline-block text-sm font-semibold text-accent hover:underline">Apparaître dans l'annuaire</a>
        </div>

        <p class="mt-6 text-center text-xs text-muted-foreground">
          GoFounders met en relation avec ces professionnels mais n'assure pas de conseil juridique ou comptable.
        </p>
      </div>
    </div>
  `,
})
export class ProsComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly maService = inject(MaService);
  private readonly stats = inject(StatsService);

  readonly categories = (Object.keys(PRO_CATEGORY_LABELS) as ProCategory[]).map(value => ({ value, label: PRO_CATEGORY_LABELS[value] }));
  readonly category = signal<ProCategory | null>(null);
  readonly entries = signal<ProDirectoryEntry[]>([]);
  readonly isAuthenticated = this.auth.isAuthenticated;

  ngOnInit(): void {
    void this.load();
  }

  filter(category: ProCategory | null): void {
    this.category.set(category);
    void this.load();
  }

  chipClass(active: boolean): string {
    return active
      ? 'rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white'
      : 'rounded-full border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground/80 transition-colors hover:border-accent';
  }

  categoryLabel(category: ProCategory): string {
    return PRO_CATEGORY_LABELS[category];
  }

  trackWebsite(proId: string): void {
    void this.stats.recordProEvent(proId, 'website');
  }

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('');
  }

  private async load(): Promise<void> {
    this.entries.set(await this.maService.listProDirectory(this.category() ?? undefined));
  }
}
