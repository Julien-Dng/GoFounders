import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { FEATURES } from '../../core/config/features';
import { AuthService } from '../../core/services/auth.service';
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
    <div class="min-h-screen bg-secondary px-4 pb-14 pt-24 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-6xl">
        <div class="mb-6 animate-fade-in-up">
          <h1 class="mb-2 text-3xl font-semibold text-primary sm:text-4xl">Paramètres</h1>
          <p class="text-muted-foreground">Votre compte et vos notifications</p>
        </div>

        <div class="max-w-3xl space-y-4 animate-fade-in-up delay-100">
          <div class="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label="Rubriques des paramètres">
            @for (option of tabs(); track option.value) {
              <button type="button" role="tab" [attr.aria-selected]="tab() === option.value" (click)="tab.set(option.value)"
                      class="-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors"
                      [class]="tab() === option.value ? 'border-accent text-primary' : 'border-transparent text-muted-foreground hover:text-primary'">
                {{ option.label }}
              </button>
            }
          </div>

          @if (tab() === 'compte') {
          <!-- COMPTE -->
          <section class="rounded-2xl bg-white shadow-lg ring-1 ring-border p-6" aria-labelledby="compte-titre">
            <h2 id="compte-titre" class="mb-4 text-lg font-semibold">Compte</h2>

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
          <!-- SUPPRESSION DU COMPTE : repliée par défaut -->
          <details class="group rounded-2xl bg-white p-5 shadow-lg ring-1 ring-border">
            <summary class="flex cursor-pointer list-none items-center justify-between font-semibold text-primary [&::-webkit-details-marker]:hidden">
              Supprimer mon compte
              <svg class="text-muted-foreground transition-transform group-open:rotate-180" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
            </summary>
            <div class="mt-4">
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
          }
          @if (tab() === 'notifications') {
          <!-- CONFIDENTIALITÉ -->
          <section class="rounded-2xl bg-white shadow-lg ring-1 ring-border p-6" aria-labelledby="confidentialite-titre">
            <h2 id="confidentialite-titre" class="mb-4 text-lg font-semibold">Notifications et visibilité</h2>
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
                Votre visibilité se règle là où elle s'applique :
                @if (associatesEnabled) {
                  <a routerLink="/profil/associe" class="font-semibold text-accent hover:underline">Mon profil d'associé</a> (visible dans la recherche, aperçu sur la vitrine) et
                  <a routerLink="/mon-projet" class="font-semibold text-accent hover:underline">Mon projet</a> (publié ou brouillon).
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
          }
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
  // Onglets : Compte (e-mail, mot de passe, suppression) et Notifications. Les objectifs ne se gèrent plus ici :
  // ils viennent de l'inscription et des actions, et les suggestions se masquent depuis le tableau de bord.
  readonly tab = signal<'compte' | 'notifications'>('compte');
  readonly tabs = computed(() => [
    { value: 'compte' as const, label: 'Compte' },
    { value: 'notifications' as const, label: 'Notifications' },
  ]);
  readonly emailNotifications = signal<boolean | null>(null);
  readonly emailFeedbackSwitch = signal<Feedback | null>(null);

  readonly confirmingDelete = signal(false);
  readonly deleteInput = signal('');
  readonly deleteError = signal('');
  readonly canDelete = computed(() => this.deleteInput().trim().toUpperCase() === DELETE_CONFIRMATION);

  async ngOnInit(): Promise<void> {
    await this.auth.ensureSessionReady();
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
