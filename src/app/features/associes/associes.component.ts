import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { isTalentMarketplaceRole } from '../../core/models/user.model';
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
            Développeurs, commerciaux, experts métier d'un côté ; porteurs de projet de l'autre. Les profils sont anonymes ici : le nom et le contact se découvrent une fois inscrit.
          </p>
          <div class="mt-8 flex flex-col gap-3 sm:flex-row">
            @if (canBrowseFull()) {
              <a routerLink="/recherche" class="rounded-lg bg-accent px-6 py-3.5 text-center font-semibold text-white transition-colors hover:bg-accent/90">Ouvrir la recherche complète</a>
            } @else if (isAuthenticated()) {
              <p class="max-w-[60ch] rounded-xl bg-white/10 px-5 py-4 text-base leading-relaxed text-white/85">
                Votre compte actuel sert à la reprise d'entreprise. Pour chercher un associé ou rejoindre un projet,
                créez un second compte, porteur de projet ou associé, avec une autre adresse e-mail.
              </p>
            } @else {
              <a routerLink="/inscription" [queryParams]="{ profil: 'entrepreneur' }" class="rounded-lg bg-accent px-6 py-3.5 text-center font-semibold text-white transition-colors hover:bg-accent/90">Je cherche un associé</a>
              <a routerLink="/inscription" [queryParams]="{ profil: 'talent' }" class="rounded-lg border border-white/30 px-6 py-3.5 text-center font-semibold text-white transition-colors hover:border-white/70">Je veux devenir associé</a>
            }
          </div>
        </div>
      </section>

      @if (loaded() && entries().length > 0) {
        <section class="bg-[#16243B] px-4 py-8 text-white sm:px-6 lg:px-8" aria-label="La communauté en chiffres">
          <dl class="mx-auto grid max-w-[78rem] grid-cols-2 gap-y-6 text-center lg:grid-cols-3">
            <div class="px-4 lg:border-r lg:border-dashed lg:border-white/25">
              <dd class="tabular text-3xl font-extrabold">{{ talents().length }}</dd>
              <dt class="mt-1 text-base text-white/70">{{ talents().length > 1 ? 'associés visibles' : 'associé visible' }}</dt>
            </div>
            <div class="px-4 lg:border-r lg:border-dashed lg:border-white/25">
              <dd class="tabular text-3xl font-extrabold">{{ projects().length }}</dd>
              <dt class="mt-1 text-base text-white/70">{{ projects().length > 1 ? 'projets qui recrutent' : 'projet qui recrute' }}</dt>
            </div>
            @if (topSkills().length > 0) {
              <div class="col-span-2 px-4 lg:col-span-1">
                <dd class="text-xl font-bold">{{ topSkills().join(' · ') }}</dd>
                <dt class="mt-1 text-base text-white/70">compétences les plus présentes</dt>
              </div>
            }
          </dl>
        </section>
      }

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
            <p class="text-base text-muted-foreground">Profils anonymes, affichés avec l'accord de leurs auteurs.</p>
          </div>

          @if (!loaded()) {
            <p class="mt-10 text-center text-muted-foreground" role="status">Chargement…</p>
          } @else if (visible().length === 0) {
            <div class="mt-8 rounded-2xl bg-white p-10 text-center shadow-lg ring-1 ring-border">
              <h3 class="text-2xl text-primary">{{ tab() === 'talent' ? 'Les premiers associés arrivent' : 'Les premiers projets arrivent' }}</h3>
              <p class="mx-auto mt-3 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
                La communauté démarre. Inscrivez-vous pour être parmi les premiers visibles : vous serez prévenu dès qu'un profil compatible rejoint GoFounders.
              </p>
              <a routerLink="/inscription" [queryParams]="{ profil: tab() === 'talent' ? 'talent' : 'entrepreneur' }" class="mt-6 inline-block rounded-lg bg-accent px-6 py-3.5 font-semibold text-white transition-colors hover:bg-accent/90">
                {{ tab() === 'talent' ? 'Rejoindre la liste des associés' : 'Présenter mon projet' }}
              </a>
            </div>
          } @else {
            <ul class="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              @for (entry of visible(); track entry.profile_id + entry.kind) {
                <li class="flex flex-col rounded-2xl bg-white p-6 shadow-lg ring-1 ring-border">
                  <div class="flex items-start gap-4">
                    <span class="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-primary/60" aria-hidden="true">
                      @if (entry.kind === 'talent') {
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>
                      } @else {
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z"/></svg>
                      }
                    </span>
                    <div class="min-w-0">
                      @if (entry.kind === 'talent') {
                        <h3 class="text-lg font-bold leading-snug text-primary">{{ entry.title || 'Associé' }}</h3>
                        @if (entry.availability) {
                          <p class="mt-1 inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-sm font-semibold text-emerald-800">{{ entry.availability }}</p>
                        }
                      } @else {
                        <h3 class="text-lg font-bold leading-snug text-primary">Projet {{ entry.sector || 'en recherche d’associé' }}</h3>
                        <p class="mt-1 text-sm text-muted-foreground">{{ stageLabel(entry.stage) }}</p>
                      }
                    </div>
                  </div>

                  @if (entry.kind === 'project' && entry.looking_for?.length) {
                    <p class="mt-4 text-base text-foreground/85"><span class="font-semibold text-primary">Recherche :</span> {{ entry.looking_for!.join(', ') }}</p>
                  }

                  @if (entry.skills.length > 0) {
                    <ul class="mt-4 flex flex-wrap gap-2" [attr.aria-label]="entry.kind === 'talent' ? 'Compétences' : 'Compétences recherchées'">
                      @for (skill of entry.skills.slice(0, 6); track skill) {
                        <li class="rounded-lg bg-secondary px-3 py-1 text-sm font-medium text-foreground">{{ skill }}</li>
                      }
                    </ul>
                  }

                  @if (entry.kind === 'project' && (entry.open_to_equity || entry.nda_required)) {
                    <p class="mt-4 text-sm text-muted-foreground">
                      {{ entry.open_to_equity ? 'Ouvert à un associé au capital' : '' }}{{ entry.open_to_equity && entry.nda_required ? ' · ' : '' }}{{ entry.nda_required ? 'Détails sous engagement de confidentialité' : '' }}
                    </p>
                  }

                  <div class="mt-auto pt-6">
                    @if (profileLink(entry).path) {
                      <a [routerLink]="profileLink(entry).path" [queryParams]="profileLink(entry).params" class="block rounded-lg bg-primary px-4 py-3 text-center font-semibold text-white transition-colors hover:bg-accent">
                        {{ profileLink(entry).label }}
                      </a>
                    } @else {
                      <p class="rounded-lg bg-secondary px-4 py-3 text-center text-sm font-semibold text-muted-foreground">{{ profileLink(entry).label }}</p>
                    }
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </section>

      <section class="bg-white px-4 py-14 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="how-title">
        <div class="mx-auto max-w-[78rem]">
          <h2 id="how-title" class="text-center text-3xl text-primary sm:text-4xl">Comment ça marche</h2>
          <ol class="mt-10 grid gap-6 md:grid-cols-3">
            @for (step of steps; track step.title; let index = $index) {
              <li class="rounded-2xl bg-secondary p-7">
                <span class="tabular flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-lg font-extrabold text-accent">{{ index + 1 }}</span>
                <h3 class="mt-5 text-xl font-bold text-primary">{{ step.title }}</h3>
                <p class="mt-2 text-base leading-relaxed text-muted-foreground">{{ step.text }}</p>
              </li>
            }
          </ol>
          <p class="mt-8 text-center text-base text-muted-foreground">
            Rejoindre un projet est gratuit. Les porteurs de projet contactent {{ freeContacts }} nouveaux associés par mois sans payer.
            <a routerLink="/tarifs" fragment="associes" class="font-semibold text-accent underline-offset-4 hover:underline">Voir les tarifs</a>
          </p>
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
  readonly steps = [
    { title: 'Créez votre profil', text: 'Porteur de projet ou futur associé : décrivez ce que vous apportez ou ce que vous cherchez. Inscription gratuite.' },
    { title: 'Découvrez les profils compatibles', text: 'Un score de compatibilité, calculé sur les compétences, la localisation, la disponibilité et le secteur, met en avant les meilleurs profils.' },
    { title: 'Échangez en toute discrétion', text: 'Vous discutez dans la messagerie. Pour un projet sensible, le porteur peut demander un engagement de confidentialité avant de tout dévoiler.' },
  ];

  readonly talents = computed(() => this.entries().filter(entry => entry.kind === 'talent'));
  readonly projects = computed(() => this.entries().filter(entry => entry.kind === 'project'));
  readonly visible = computed(() => (this.tab() === 'talent' ? this.talents() : this.projects()));
  readonly canBrowseFull = computed(() => isTalentMarketplaceRole(this.auth.currentUser()?.profileType));
  readonly isAuthenticated = this.auth.isAuthenticated;

  readonly topSkills = computed(() => {
    const counts = new Map<string, number>();
    for (const entry of this.talents()) {
      for (const skill of entry.skills) {
        counts.set(skill, (counts.get(skill) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([skill]) => skill);
  });

  async ngOnInit(): Promise<void> {
    this.entries.set(await this.showcase.list());
    this.loaded.set(true);
  }

  stageLabel(stage: string | null): string {
    return stage ? STAGE_LABELS[stage] ?? stage : 'Stade non précisé';
  }

  // Membre du bon rôle : profil complet. Visiteur : inscription dans le rôle complémentaire, retour sur le profil.
  profileLink(entry: ShowcaseEntry): { path: string; params: Record<string, string> | null; label: string } {
    const role = this.auth.currentUser()?.profileType;
    const wantedRole = entry.kind === 'talent' ? 'entrepreneur' : 'talent';
    const label = entry.kind === 'talent' ? 'Voir le profil' : 'Voir le projet';

    if (role === wantedRole) {
      return { path: `/profil/${entry.profile_id}`, params: null, label };
    }

    if (this.auth.isAuthenticated()) {
      return { path: '', params: null, label: entry.kind === 'talent' ? 'Visible par les porteurs de projet' : 'Visible par les associés' };
    }

    return { path: '/inscription', params: { profil: wantedRole, returnUrl: `/profil/${entry.profile_id}` }, label: `${label}` };
  }
}
