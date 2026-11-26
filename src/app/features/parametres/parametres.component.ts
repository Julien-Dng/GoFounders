import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FEATURES } from '../../core/config/features';
import { AuthService } from '../../core/services/auth.service';
import { USAGE_OPTIONS, Usage, profileTabsFor, usagesOf } from '../../core/models/user.model';
import { ProjectService } from '../../core/services/project.service';
import { passwordPolicyValidator } from '../../core/validators/password-policy.validator';
import { PasswordCriteriaComponent } from '../../shared/components/password-criteria/password-criteria.component';

type OpenPanel = 'email' | 'password' | null;

interface Feedback {
  ok: boolean;
  text: string;
}

const DELETE_CONFIRMATION = 'SUPPRIMER';

@Component({
  selector: 'app-parametres',
  standalone: true,
  imports: [ReactiveFormsModule, PasswordCriteriaComponent, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-14 pt-20 sm:px-6 sm:pt-24 lg:px-8">
      <div class="mx-auto max-w-6xl">
        <div class="mb-6 animate-fade-in-up">
          <h1 class="mb-2 text-2xl font-semibold text-primary sm:text-4xl">Paramètres</h1>
          <p class="text-muted-foreground">Gérez votre compte, vos notifications et vos objectifs</p>
        </div>

        <div class="max-w-3xl space-y-4 animate-fade-in-up delay-100">
          <!-- Volets dépliables : Compte, Notifications, Mes objectifs, suppression du compte. -->
          <details class="group rounded-2xl bg-white shadow-lg ring-1 ring-border" open>
            <summary class="flex cursor-pointer list-none items-center gap-3 px-5 py-4 font-semibold text-primary [&::-webkit-details-marker]:hidden">
              <svg class="flex-shrink-0 text-primary" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/></svg>
              <span class="flex-1">Compte</span>
              <svg class="text-muted-foreground transition-transform group-open:rotate-180" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
          <section class="border-t border-border px-5 pb-4" aria-label="Compte">

            <div class="border-b border-border py-3">
              <div class="flex items-center justify-between gap-4">
                <div class="min-w-0">
                  <div class="text-sm font-medium">Email</div>
                  <div class="truncate text-sm text-muted-foreground">{{ email() }}</div>
                </div>
                <button type="button" (click)="toggle('email')" [attr.aria-expanded]="openPanel() === 'email'" class="text-sm font-semibold text-accent hover:underline">
                  {{ openPanel() === 'email' ? 'Annuler' : 'Modifier' }}
                </button>
              </div>
              @if (openPanel() === 'email') {
                <div class="mt-4" [formGroup]="emailForm">
                  <label for="new-email" class="mb-2 block text-sm font-semibold">Nouvelle adresse email</label>
                  <div class="flex flex-col gap-3 sm:flex-row">
                    <input id="new-email" type="email" formControlName="email" autocomplete="email" (keyup.enter)="saveEmail()"
                      class="flex-1 rounded-lg border border-border bg-secondary px-4 py-2.5 outline-none focus:border-accent">
                    <button type="button" (click)="saveEmail()" [disabled]="busy() || emailForm.invalid"
                      class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">Envoyer le lien</button>
                  </div>
                </div>
              }
              @if (emailFeedback(); as feedback) {
                <p class="mt-3 text-sm" [class.text-success]="feedback.ok" [class.text-destructive]="!feedback.ok" role="status">{{ feedback.text }}</p>
              }
            </div>

            <div class="py-3">
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="text-sm font-medium">Mot de passe</div>
                  <div class="text-sm text-muted-foreground">••••••••</div>
                </div>
                <button type="button" (click)="toggle('password')" [attr.aria-expanded]="openPanel() === 'password'" class="text-sm font-semibold text-accent hover:underline">
                  {{ openPanel() === 'password' ? 'Annuler' : 'Modifier' }}
                </button>
              </div>
              @if (openPanel() === 'password') {
                <div class="mt-4" [formGroup]="passwordForm">
                  <label for="new-password" class="mb-2 block text-sm font-semibold">Nouveau mot de passe</label>
                  <div class="flex flex-col gap-3 sm:flex-row">
                    <input id="new-password" type="password" formControlName="password" autocomplete="new-password" (keyup.enter)="savePassword()"
                      aria-describedby="settings-password-criteria"
                      class="flex-1 rounded-lg border border-border bg-secondary px-4 py-2.5 outline-none focus:border-accent">
                    <button type="button" (click)="savePassword()" [disabled]="busy() || passwordForm.invalid"
                      class="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50">Enregistrer</button>
                  </div>
                  <app-password-criteria id="settings-password-criteria" [password]="passwordForm.controls.password.value" />
                </div>
              }
              @if (passwordFeedback(); as feedback) {
                <p class="mt-3 text-sm" [class.text-success]="feedback.ok" [class.text-destructive]="!feedback.ok" role="status">{{ feedback.text }}</p>
              }
            </div>
          </section>
          </details>

          <!-- NOTIFICATIONS ET VISIBILITÉ -->
          <details class="group rounded-2xl bg-white shadow-lg ring-1 ring-border">
            <summary class="flex cursor-pointer list-none items-center gap-3 px-5 py-4 font-semibold text-primary [&::-webkit-details-marker]:hidden">
              <svg class="flex-shrink-0 text-primary" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
              <span class="flex-1">Notifications</span>
              <svg class="text-muted-foreground transition-transform group-open:rotate-180" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
          <section class="border-t border-border px-5 py-4" aria-label="Notifications et visibilité">
            @if (isPro()) {
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-sm font-medium" id="visibilite-label">Fiche visible dans l'annuaire des pros</div>
                <p class="mt-1 text-sm text-muted-foreground">
                  Masquée, votre fiche n'apparaît plus dans l'annuaire. Vos conversations en cours continuent normalement
                </p>
              </div>
              @if (isVisible() !== null) {
                <button
                  type="button"
                  role="switch"
                  [attr.aria-checked]="isVisible()"
                  aria-labelledby="visibilite-label"
                  (click)="toggleVisibility()"
                  [disabled]="busy()"
                  class="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50"
                  [class.bg-accent]="isVisible()"
                  [class.bg-border]="!isVisible()"
                >
                  <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform" [class.translate-x-5]="isVisible()"></span>
                </button>
              } @else {
                <span class="text-sm text-muted-foreground">Indisponible</span>
              }
            </div>
            @if (visibilityFeedback(); as feedback) {
              <p class="mt-3 text-sm" [class.text-success]="feedback.ok" [class.text-destructive]="!feedback.ok" role="status">{{ feedback.text }}</p>
            }

            } @else {
              <p class="text-sm text-muted-foreground">
                <!-- Seulement les rubriques qui concernent le membre (mêmes règles que les onglets de « Mon profil »). -->
                @if (associatesEnabled && (tabFlags().associe || tabFlags().projet)) {
                  Votre visibilité se règle là où elle s'applique :
                  @if (tabFlags().associe) {
                    <a routerLink="/profil/associe" class="font-semibold text-accent hover:underline">Mon profil d'associé</a> (visible dans la recherche, aperçu sur la vitrine){{ tabFlags().projet ? ' et' : '.' }}
                  }
                  @if (tabFlags().projet) {
                    <a routerLink="/mon-projet" class="font-semibold text-accent hover:underline">Mon projet</a> (publié ou brouillon).
                  }
                }
                Vos conversations en cours continuent dans tous les cas
              </p>
            }

            <div class="mt-5 flex items-start justify-between gap-4 border-t border-border pt-5">
              <div>
                <div class="text-sm font-medium" id="emails-label">E-mail à chaque nouveau message</div>
                <p class="mt-1 text-sm text-muted-foreground">
                  Au plus un e-mail par conversation toutes les 3 heures, sans le contenu du message. Les e-mails sur vos annonces et vos demandes d'accès restent envoyés
                </p>
              </div>
              @if (emailNotifications() !== null) {
                <button type="button" role="switch" [attr.aria-checked]="emailNotifications()" aria-labelledby="emails-label" (click)="toggleEmailNotifications()" [disabled]="busy()" class="relative h-6 w-11 flex-shrink-0 rounded-full transition-colors disabled:opacity-50" [class.bg-accent]="emailNotifications()" [class.bg-border]="!emailNotifications()">
                  <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform" [class.translate-x-5]="emailNotifications()"></span>
                </button>
              } @else {
                <span class="text-sm text-muted-foreground">Indisponible</span>
              }
            </div>
            @if (emailFeedbackSwitch(); as feedback) {
              <p class="mt-3 text-sm" [class.text-success]="feedback.ok" [class.text-destructive]="!feedback.ok" role="status">{{ feedback.text }}</p>
            }

          </section>
          </details>

          @if (!isPro()) {
            <!-- MES OBJECTIFS : personnalisent le site (suggestions, contenus), n'ouvrent aucun droit. -->
            <details class="group rounded-2xl bg-white shadow-lg ring-1 ring-border">
              <summary class="flex cursor-pointer list-none items-center gap-3 px-5 py-4 font-semibold text-primary [&::-webkit-details-marker]:hidden">
              <svg class="flex-shrink-0 text-primary" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>
              <span class="flex-1">Mes objectifs</span>
              <svg class="text-muted-foreground transition-transform group-open:rotate-180" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
              <section class="border-t border-border px-5 py-4" aria-label="Mes objectifs">
                <p class="text-sm text-muted-foreground">Indiquez vos objectifs sur GoFounders</p>
                <ul class="mt-3 space-y-2.5">
                  @for (option of usageOptions; track option.value) {
                    <li>
                      <label class="flex cursor-pointer items-center gap-3 text-base text-primary">
                        <input type="checkbox" class="h-5 w-5 flex-shrink-0 accent-accent" [checked]="usages().includes(option.value)" (change)="toggleUsage(option.value)">
                        {{ option.label }}
                      </label>
                    </li>
                  }
                </ul>
                <p class="mt-4 flex gap-2 rounded-xl bg-accent/5 px-4 py-3 text-sm text-primary ring-1 ring-accent/15">
                  <svg class="mt-0.5 flex-shrink-0 text-accent" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>
                  Cela personnalise votre expérience (suggestions et contenus), sans modifier vos accès
                </p>
                @if (associatesEnabled && (tabFlags().associe || tabFlags().projet)) {
                  <ul class="mt-4 divide-y divide-border border-t border-border">
                    @if (tabFlags().associe) {
                    <li>
                      <a routerLink="/profil/associe" class="flex items-center gap-3 py-3">
                        <svg class="flex-shrink-0 text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="8" r="4"/></svg>
                        <span class="flex-1"><span class="block font-semibold text-accent">Visibilité de mon profil</span><span class="block text-sm text-muted-foreground">Profil d'associé visible ou non dans la recherche</span></span>
                        <span class="text-muted-foreground" aria-hidden="true">›</span>
                      </a>
                    </li>
                    }
                    @if (tabFlags().projet) {
                    <li>
                      <a routerLink="/mon-projet" class="flex items-center gap-3 py-3">
                        <svg class="flex-shrink-0 text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
                        <span class="flex-1"><span class="block font-semibold text-accent">Visibilité de mon projet</span><span class="block text-sm text-muted-foreground">Projet publié ou en brouillon</span></span>
                        <span class="text-muted-foreground" aria-hidden="true">›</span>
                      </a>
                    </li>
                    }
                  </ul>
                }
                <button type="button" (click)="saveUsages()" [disabled]="busy() || !usagesChanged()" class="mt-4 w-full rounded-lg bg-accent px-5 py-3 font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50">Enregistrer</button>
                @if (usagesFeedback(); as feedback) {
                  <p class="mt-3 text-sm" [class.text-success]="feedback.ok" [class.text-destructive]="!feedback.ok" role="status">{{ feedback.text }}</p>
                }
              </section>
            </details>
          }

          <!-- SUPPRESSION DU COMPTE : repliée par défaut -->
          <details class="group rounded-2xl bg-white shadow-lg ring-1 ring-border">
            <summary class="flex cursor-pointer list-none items-center gap-3 px-5 py-4 font-semibold text-primary [&::-webkit-details-marker]:hidden">
              <svg class="flex-shrink-0 text-primary" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>
              <span class="flex-1">Supprimer mon compte</span>
              <svg class="text-muted-foreground transition-transform group-open:rotate-180" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <div class="border-t border-border px-5 py-4">
            <p class="mb-4 text-sm text-muted-foreground">
              La suppression est définitive : profil, photo, projet, annonces M&A, conversations et messages sont effacés
            </p>
            @if (!confirmingDelete()) {
              <button type="button" (click)="confirmingDelete.set(true)"
                class="rounded-lg border border-destructive px-4 py-2 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/5">
                Continuer
              </button>
            } @else {
              <label for="delete-confirmation" class="mb-2 block text-sm font-semibold">
                Tapez {{ deleteWord }} pour confirmer
              </label>
              <div class="flex flex-col gap-3 sm:flex-row">
                <input id="delete-confirmation" type="text" [value]="deleteInput()" (input)="deleteInput.set($any($event.target).value)"
                  autocomplete="off" class="flex-1 rounded-lg border border-destructive/40 bg-secondary px-4 py-2.5 outline-none focus:border-destructive">
                <button type="button" (click)="deleteAccount()" [disabled]="busy() || !canDelete()"
                  class="rounded-lg bg-destructive px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Supprimer définitivement</button>
                <button type="button" (click)="cancelDelete()" class="rounded-lg border border-border px-5 py-2.5 text-sm font-semibold">Annuler</button>
              </div>
            }
            @if (deleteError()) {
              <p class="mt-3 text-sm text-destructive" role="alert">{{ deleteError() }}</p>
            }
            </div>
          </details>
        </div>
      </div>
    </div>
  `,
})
export class ParametresComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly deleteWord = DELETE_CONFIRMATION;
  readonly email = computed(() => this.auth.currentUser()?.email ?? '');
  readonly openPanel = signal<OpenPanel>(null);
  readonly busy = signal(false);

  readonly emailForm = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  readonly passwordForm = this.fb.nonNullable.group({ password: ['', [Validators.required, passwordPolicyValidator]] });
  readonly emailFeedback = signal<Feedback | null>(null);
  readonly passwordFeedback = signal<Feedback | null>(null);

  // null : visibilité illisible (mode local ou migration 2026-10-12-parametres.sql non exécutée).
  readonly isVisible = signal<boolean | null>(null);
  readonly visibilityFeedback = signal<Feedback | null>(null);

  readonly isPro = computed(() => this.auth.currentUser()?.profileType === 'pro');
  readonly associatesEnabled = FEATURES.associates;
  // Mes objectifs : cochés à l'inscription, ajoutés par les actions, modifiables ici. Aucun droit n'en dépend.
  readonly usageOptions = USAGE_OPTIONS;
  // Rubriques qui concernent le membre : objectif enregistré ou contenu déjà commencé (profileTabsFor).
  private readonly projects = inject(ProjectService);
  private readonly ownsProject = signal(false);
  readonly tabFlags = computed(() => profileTabsFor(this.auth.currentUser(), this.ownsProject()));
  readonly usages = signal<Usage[]>(usagesOf(this.auth.currentUser()));
  readonly usagesChanged = computed(() => {
    const saved = usagesOf(this.auth.currentUser());
    const current = this.usages();
    return saved.length !== current.length || current.some(usage => !saved.includes(usage));
  });
  readonly usagesFeedback = signal<Feedback | null>(null);

  toggleUsage(usage: Usage): void {
    this.usages.update(list => (list.includes(usage) ? list.filter(item => item !== usage) : [...list, usage]));
    this.usagesFeedback.set(null);
  }

  async saveUsages(): Promise<void> {
    await this.run(async () => {
      const result = await this.auth.setUsages(this.usages());
      this.usagesFeedback.set({ ok: result.success, text: result.message ?? '' });
    });
  }
  readonly emailNotifications = signal<boolean | null>(null);
  readonly emailFeedbackSwitch = signal<Feedback | null>(null);

  readonly confirmingDelete = signal(false);
  readonly deleteInput = signal('');
  readonly deleteError = signal('');
  readonly canDelete = computed(() => this.deleteInput().trim().toUpperCase() === DELETE_CONFIRMATION);

  async ngOnInit(): Promise<void> {
    await this.auth.ensureSessionReady();
    this.usages.set(usagesOf(this.auth.currentUser()));
    const uid = this.auth.currentUser()?.uid;
    if (uid && this.associatesEnabled && !this.isPro()) {
      this.ownsProject.set(!!(await this.projects.getOwnedProject(uid)));
    }
    this.isVisible.set(await this.auth.getProfileVisibility());
    this.emailNotifications.set(await this.auth.getEmailNotifications());
  }

  async toggleEmailNotifications(): Promise<void> {
    const next = !this.emailNotifications();
    await this.run(async () => {
      const result = await this.auth.setEmailNotifications(next);
      this.emailFeedbackSwitch.set({ ok: result.success, text: result.message ?? '' });
      if (result.success) {
        this.emailNotifications.set(next);
      }
    });
  }

  toggle(panel: Exclude<OpenPanel, null>): void {
    this.openPanel.update(current => (current === panel ? null : panel));
    this.emailFeedback.set(null);
    this.passwordFeedback.set(null);
  }

  async saveEmail(): Promise<void> {
    if (this.emailForm.invalid || this.busy()) {
      return;
    }

    await this.run(async () => {
      const result = await this.auth.updateEmail(this.emailForm.controls.email.value);
      this.emailFeedback.set({ ok: result.success, text: result.message ?? '' });
      if (result.success) {
        this.openPanel.set(null);
        this.emailForm.reset();
      }
    });
  }

  async savePassword(): Promise<void> {
    if (this.passwordForm.invalid || this.busy()) {
      return;
    }

    await this.run(async () => {
      const result = await this.auth.updatePassword(this.passwordForm.controls.password.value, 'settings');
      this.passwordFeedback.set({ ok: result.success, text: result.success ? 'Mot de passe modifié.' : (result.message ?? '') });
      if (result.success) {
        this.openPanel.set(null);
        this.passwordForm.reset();
      }
    });
  }

  async toggleVisibility(): Promise<void> {
    const next = !this.isVisible();
    await this.run(async () => {
      const result = await this.auth.setProfileVisibility(next);
      this.visibilityFeedback.set({ ok: result.success, text: result.message ?? '' });
      if (result.success) {
        this.isVisible.set(next);
      }
    });
  }

  cancelDelete(): void {
    this.confirmingDelete.set(false);
    this.deleteInput.set('');
    this.deleteError.set('');
  }

  async deleteAccount(): Promise<void> {
    if (!this.canDelete() || this.busy()) {
      return;
    }

    await this.run(async () => {
      const result = await this.auth.deleteAccount();
      if (!result.success) {
        this.deleteError.set(result.message ?? 'La suppression a échoué.');
      }
    });
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy.set(true);
    try {
      await action();
    } finally {
      this.busy.set(false);
    }
  }
}
