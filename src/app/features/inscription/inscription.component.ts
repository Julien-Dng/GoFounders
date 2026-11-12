import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FEATURES } from '../../core/config/features';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { PRO_CATEGORY_LABELS, ProCategory, ProfileType, Usage, primaryProfileType } from '../../core/models/user.model';

// Cartes de l'étape 1 → usages du compte (le compte pro reste un type à part).
const TYPE_TO_USAGE: Record<Exclude<ProfileType, 'pro'>, Usage> = { entrepreneur: 'projet', talent: 'associe', buyer: 'reprise', seller: 'cession' };
import { EMAIL_POLICY_MESSAGES, registrationEmailValidator } from '../../core/validators/email-policy.validator';
import { passwordPolicyValidator } from '../../core/validators/password-policy.validator';
import { PasswordCriteriaComponent } from '../../shared/components/password-criteria/password-criteria.component';

interface ProfileOption {
  id: ProfileType;
  icon: 'project' | 'talent' | 'buyer' | 'seller' | 'pro';
  title: string;
  description: string;
}

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, RouterLink, PasswordCriteriaComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
      <div class="mx-auto w-full max-w-5xl">
        <div class="mb-10 animate-fade-in-up sm:mb-12">
          <div class="mb-3 flex items-center justify-between gap-4">
            <span class="text-sm font-semibold text-muted-foreground">Étape {{ currentStep() }} sur {{ totalSteps }}</span>
            <span class="text-sm font-semibold text-accent">{{ progressPercent() }}%</span>
          </div>
          <div class="h-2 overflow-hidden rounded-full bg-secondary">
            <div class="h-full rounded-full bg-primary transition-all duration-500" [style.width]="progressPercent() + '%'"></div>
          </div>
        </div>

        <div class="animate-fade-in-scale delay-100 rounded-2xl border border-border bg-white p-6 sm:p-8 lg:p-12">
          @if (currentStep() === 1) {
            <div>
              <div class="mb-8 text-center sm:mb-10">
                <h1 class="mb-3 text-3xl font-semibold text-primary sm:text-4xl">Vous êtes plutôt…</h1>
                <p class="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Plusieurs choix possibles. Ils personnalisent votre espace et restent modifiables dans les paramètres
                </p>
              </div>

              <div class="mb-8 grid grid-cols-1 gap-4 sm:mb-10 md:grid-cols-2 md:gap-6">
                @for (type of profileTypes; track type.id) {
                  <button
                    type="button"
                    (click)="toggleType(type.id)"
                    [attr.aria-pressed]="isSelected(type.id)"
                    [ngClass]="isSelected(type.id)
                      ? 'rounded-2xl border border-accent bg-accent/5 p-6 text-left  transition-all hover:scale-[1.01] sm:p-8'
                      : 'rounded-2xl border border-border bg-card p-6 text-left transition-all hover:scale-[1.01]  sm:p-8'"
                  >
                    <div class="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                      @switch (type.icon) {
                        @case ('project') {
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M4.5 16.5 16 5" />
                            <path d="m10 5 6 0 0 6" />
                            <path d="M6 19h12" />
                          </svg>
                        }
                        @case ('talent') {
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="3" y="7" width="18" height="13" rx="2" />
                            <path d="M8 7V5a4 4 0 0 1 8 0v2" />
                            <path d="M3 12h18" />
                          </svg>
                        }
                        @case ('buyer') {
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M3 3v18h18"/>
                            <path d="m7 14 4-4 3 3 5-7"/>
                          </svg>
                        }
                        @case ('seller') {
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="3" y="4" width="18" height="16" rx="2"/>
                            <path d="M7 8h10"/>
                            <path d="M7 12h6"/>
                            <path d="M7 16h4"/>
                          </svg>
                        }
                        @case ('pro') {
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M12 3 2 8l10 5 10-5-10-5z"/>
                            <path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5"/>
                          </svg>
                        }
                      }
                    </div>

                    <h3 class="mb-2 text-xl font-semibold text-primary">{{ type.title }}</h3>
                    <p class="leading-relaxed text-muted-foreground">{{ type.description }}</p>

                    @if (isSelected(type.id)) {
                      <div class="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-sm font-semibold text-white animate-scale-in">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7"/></svg>
                        Choisi
                      </div>
                    }
                  </button>
                }
              </div>

              <button
                type="button"
                (click)="goToStep(2)"
                [disabled]="selectedTypes().length === 0"
                [ngClass]="selectedTypes().length > 0
                  ? 'w-full rounded-lg bg-primary py-4 text-lg font-semibold text-white  transition-all hover:bg-primary/90'
                  : 'w-full cursor-not-allowed rounded-lg bg-muted py-4 text-lg font-semibold text-muted-foreground opacity-50'"
              >
                Continuer
              </button>
            </div>
          }

          @if (currentStep() === 2) {
            <div [formGroup]="basicsForm">
              <div class="mb-8 text-center sm:mb-10">
                <h2 class="mb-3 text-3xl font-semibold text-primary sm:text-4xl">Créez votre accès</h2>
                <p class="text-sm text-muted-foreground sm:text-base">
                  Quelques informations pour ouvrir votre compte {{ selectedTypeLabel() }}
                </p>
              </div>

              <div class="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                <div>
                  <label class="mb-2 block text-sm font-semibold" for="signup-name">Nom complet</label>
                  <input
                    id="signup-name"
                    type="text"
                    formControlName="displayName"
                    class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                    placeholder="Marie Dupont"
                  >
                </div>

                <div>
                  <label class="mb-2 block text-sm font-semibold" for="signup-location">Localisation</label>
                  <input
                    id="signup-location"
                    type="text"
                    formControlName="location"
                    class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                    placeholder="Paris, France"
                  >
                </div>

                <div>
                  <label class="mb-2 block text-sm font-semibold" for="signup-email">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    formControlName="email"
                    class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                    placeholder="vous@exemple.fr"
                  >
                  @if (emailErrorMessage()) {
                    <p class="mt-2 text-sm text-destructive">{{ emailErrorMessage() }}</p>
                  }
                </div>

                <div>
                  <label class="mb-2 block text-sm font-semibold" for="signup-password">Mot de passe</label>
                  <div class="relative">
                    <input
                      id="signup-password"
                      [type]="isPasswordVisible() ? 'text' : 'password'"
                      formControlName="password"
                      class="w-full rounded-lg border border-border bg-secondary py-3 pl-4 pr-12 outline-none transition-colors focus:border-accent"
                      placeholder="8 caractères minimum"
                      aria-describedby="signup-password-criteria"
                    >
                    <button
                      type="button"
                      (click)="togglePasswordVisibility()"
                      [attr.aria-label]="isPasswordVisible() ? 'Masquer le mot de passe' : 'Afficher le mot de passe'"
                      [attr.aria-pressed]="isPasswordVisible()"
                      aria-controls="signup-password"
                      class="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                    >
                      @if (isPasswordVisible()) {
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="h-5 w-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M3 3l18 18" />
                          <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
                          <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c5.5 0 9 5 9 5a15.7 15.7 0 0 1-2.1 2.7" />
                          <path d="M6.6 6.6C4.3 8.1 3 10 3 10s3.5 5 9 5a9.8 9.8 0 0 0 3.4-.6" />
                        </svg>
                      } @else {
                        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" class="h-5 w-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                          <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" />
                          <circle cx="12" cy="12" r="2.5" />
                        </svg>
                      }
                    </button>
                  </div>
                  <app-password-criteria id="signup-password-criteria" [password]="basicsForm.controls.password.value" />
                </div>
              </div>

              @if (basicsForm.invalid && basicsForm.touched) {
                <p class="mt-5 text-sm text-destructive">
                  Renseignez un nom, une localisation, un email valide et un mot de passe qui respecte les critères ci-dessus
                </p>
              }

              <div class="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
                <button
                  type="button"
                  (click)="goToStep(1)"
                  class="rounded-lg border border-border px-6 py-3 font-semibold transition-colors hover:border-accent"
                >
                  Retour
                </button>
                <button
                  type="button"
                  (click)="goToStep(3)"
                  class="flex-1 rounded-lg bg-primary py-4 text-lg font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  Continuer
                </button>
              </div>
            </div>
          }

          @if (currentStep() === 3) {
            <div [formGroup]="detailsForm">
              <div class="mb-8 text-center sm:mb-10">
                <h2 class="mb-3 text-3xl font-semibold text-primary sm:text-4xl">Derniers détails</h2>
                <p class="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{{ detailStepPrompt() }}</p>
              </div>

              @if (isSelected('entrepreneur')) {
                <div class="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                  <div>
                    <label class="mb-2 block text-sm font-semibold" for="project-name">Nom du projet</label>
                    <input
                      id="project-name"
                      type="text"
                      formControlName="projectName"
                      class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="Nom du projet"
                    >
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-semibold" for="project-sector">Secteur</label>
                    <input
                      id="project-sector"
                      type="text"
                      formControlName="projectSector"
                      class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="SaaS, IA, e-commerce..."
                    >
                  </div>

                  <div class="md:col-span-2">
                    <label class="mb-2 block text-sm font-semibold" for="project-stage">Stade du projet</label>
                    <select
                      id="project-stage"
                      formControlName="projectStage"
                      class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                    >
                      @for (stage of projectStages; track stage.value) {
                        <option [value]="stage.value">{{ stage.label }}</option>
                      }
                    </select>
                  </div>
                </div>
              }

              @if (isSelected('talent')) {
                <div class="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                  <div>
                    <label class="mb-2 block text-sm font-semibold" for="talent-headline">Rôle principal</label>
                    <input
                      id="talent-headline"
                      type="text"
                      formControlName="talentHeadline"
                      class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="Développeur full-stack, sales, product..."
                    >
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-semibold" for="talent-skill">Compétence clé</label>
                    <input
                      id="talent-skill"
                      type="text"
                      formControlName="talentSkill"
                      class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="Angular, closing, growth..."
                    >
                  </div>

                  <label class="flex items-center justify-between gap-4 rounded-xl border border-border bg-secondary px-4 py-4 md:col-span-2">
                    <span>
                      <span class="block font-semibold text-primary">Disponible rapidement</span>
                      <span class="text-sm text-muted-foreground">Les entrepreneurs verront si vous êtes joignable tout de suite</span>
                    </span>
                    <input type="checkbox" formControlName="talentAvailability" class="h-5 w-5 accent-accent">
                  </label>
                </div>
              }

              @if (isSelected('buyer')) {
                <div class="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                  <div>
                    <label class="mb-2 block text-sm font-semibold" for="buyer-sector">Type d'entreprise recherchée</label>
                    <input
                      id="buyer-sector"
                      type="text"
                      formControlName="maSector"
                      class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="SaaS, commerce, services B2B..."
                    >
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-semibold" for="buyer-budget">Budget indicatif</label>
                    <input
                      id="buyer-budget"
                      type="text"
                      formControlName="maBudget"
                      class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="Ex. 150 k€ - 500 k€"
                    >
                  </div>

                  <div class="md:col-span-2">
                    <label class="mb-2 block text-sm font-semibold" for="buyer-region">Zone ou région visée</label>
                    <input
                      id="buyer-region"
                      type="text"
                      formControlName="maRegion"
                      class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="Toute la France, Île-de-France, Auvergne-Rhône-Alpes..."
                    >
                  </div>
                </div>
              }

              @if (isSelected('pro')) {
                <div class="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                  <div>
                    <label class="mb-2 block text-sm font-semibold" for="pro-category">Votre métier</label>
                    <select
                      id="pro-category"
                      formControlName="proCategory"
                      class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                    >
                      <option value="">Choisir…</option>
                      @for (category of proCategories; track category.value) {
                        <option [value]="category.value">{{ category.label }}</option>
                      }
                    </select>
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-semibold" for="pro-company">Cabinet ou société</label>
                    <input
                      id="pro-company"
                      type="text"
                      formControlName="proCompany"
                      class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="Cabinet Martin & Associés"
                    >
                  </div>

                  <p class="text-sm text-muted-foreground md:col-span-2">
                    Après l'inscription, activez votre fiche dans l'annuaire des professionnels depuis la page Tarifs : le premier mois est offert
                  </p>
                </div>
              }

              @if (isSelected('seller') && !isSelected('buyer')) {
                <div class="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
                  <div>
                    <label class="mb-2 block text-sm font-semibold" for="seller-sector">Secteur de l'entreprise</label>
                    <input
                      id="seller-sector"
                      type="text"
                      formControlName="maSector"
                      class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="Commerce, SaaS, restauration..."
                    >
                  </div>

                  <div>
                    <label class="mb-2 block text-sm font-semibold" for="seller-range">Ordre de grandeur</label>
                    <input
                      id="seller-range"
                      type="text"
                      formControlName="maBudget"
                      class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="CA, prix cible ou taille de l'activité"
                    >
                  </div>

                  <div class="md:col-span-2">
                    <label class="mb-2 block text-sm font-semibold" for="seller-region">Région</label>
                    <input
                      id="seller-region"
                      type="text"
                      formControlName="maRegion"
                      class="w-full rounded-lg border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="Ville ou région de l'activité"
                    >
                  </div>
                </div>
              }

              @if (isSelected('talent') || isSelected('entrepreneur')) {
                <label class="mt-6 flex cursor-pointer items-start gap-3 rounded-xl bg-secondary p-4">
                  <input type="checkbox" formControlName="publicListing" class="mt-1 h-5 w-5 flex-shrink-0 accent-accent">
                  <span>
                    <span class="block font-semibold text-primary">Apparaître de façon anonyme sur la page « Trouver un associé »</span>
                    <span class="text-sm text-muted-foreground">
                      @if (isSelected('talent')) {
                        Les visiteurs voient votre titre, vos compétences et votre disponibilité, jamais votre nom, votre photo ni votre ville
                      } @else {
                        Les visiteurs voient le secteur, le stade et les profils recherchés de votre projet, jamais votre nom, celui du projet ni sa description
                      }
                      Modifiable à tout moment dans les paramètres
                    </span>
                  </span>
                </label>
              }

              @if (detailsForm.invalid && detailsForm.touched) {
                <p class="mt-5 text-sm text-destructive">
                  Complétez les informations demandées pour terminer l'inscription
                </p>
              }

              @if (errorMessage()) {
                <div class="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {{ errorMessage() }}
                </div>
              }

              @if (returnUrl()) {
                <div class="mt-5 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent">
                  Une fois créé, votre compte sera redirigé vers la page demandée
                </div>
              }

              <div class="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
                <button
                  type="button"
                  (click)="goToStep(2)"
                  class="rounded-lg border border-border px-6 py-3 font-semibold transition-colors hover:border-accent"
                >
                  Retour
                </button>
                <button
                  type="button"
                  (click)="submitRegistration()"
                  [disabled]="isSubmitting()"
                  [ngClass]="isSubmitting() ? 'cursor-wait opacity-70' : ''"
                  class="flex-1 rounded-lg bg-primary py-4 text-lg font-semibold text-white transition-colors hover:bg-primary/90"
                >
                  {{ isSubmitting() ? 'Création du compte...' : 'Créer mon compte' }}
                </button>
              </div>
            </div>
          }
        </div>

        <p class="mt-6 text-center text-sm text-muted-foreground animate-fade-in delay-700">
          Vous avez déjà un compte ?
          <a
            routerLink="/connexion"
            [queryParams]="returnUrl() ? { returnUrl: returnUrl() } : null"
            class="font-semibold text-accent hover:underline"
          >Se connecter</a>
        </p>
      </div>
    </div>
  `
})
export class InscriptionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  readonly totalSteps = 3;
  readonly currentStep = signal(1);
  // Compte multi-usages : plusieurs choix possibles (« Je suis un professionnel » est exclusif).
  // ?profil=buyer (depuis une annonce) : choix présélectionné, modifiable à l'étape 1.
  readonly selectedTypes = signal<ProfileType[]>(
    (['entrepreneur', 'talent', 'buyer', 'seller', 'pro'] as const)
      .filter(type => (FEATURES.associates || (type !== 'entrepreneur' && type !== 'talent')) && (FEATURES.pros || type !== 'pro'))
      .filter(type => type === this.route.snapshot.queryParamMap.get('profil'))
  );
  readonly returnUrl = signal<string | null>(this.route.snapshot.queryParamMap.get('returnUrl'));
  readonly isPasswordVisible = signal(false);
  readonly errorMessage = signal('');
  readonly isSubmitting = signal(false);

  constructor() {
    // Choix présélectionné par le lien (?profil=…) : mêmes règles de saisie qu'un clic.
    queueMicrotask(() => this.updateDetailValidators(this.selectedTypes()));
  }

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update((isVisible) => !isVisible);
  }

  readonly basicsForm = this.fb.nonNullable.group({
    displayName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email, registrationEmailValidator()]],
    password: ['', [Validators.required, passwordPolicyValidator]],
    location: ['', Validators.required],
  });

  readonly detailsForm = this.fb.nonNullable.group({
    projectName: [''],
    projectSector: [''],
    projectStage: ['mvp'],
    talentHeadline: [''],
    talentSkill: [''],
    talentAvailability: [true],
    publicListing: [false],
    maSector: [''],
    maBudget: [''],
    maRegion: [''],
    proCategory: [''],
    proCompany: [''],
  });

  readonly proCategories = (Object.keys(PRO_CATEGORY_LABELS) as ProCategory[]).map(value => ({ value, label: PRO_CATEGORY_LABELS[value] }));

  readonly progressPercent = computed(() =>
    Math.round((this.currentStep() / this.totalSteps) * 100)
  );

  readonly selectedTypeLabel = computed(() => {
    const types = this.selectedTypes();
    const activeType = types.length === 1 ? types[0] : null;
    switch (activeType) {
      case 'entrepreneur':
        return 'porteur de projet';
      case 'talent':
        return 'associé';
      case 'buyer':
        return 'acheteur / repreneur';
      case 'seller':
        return 'vendeur M&A';
      case 'pro':
        return 'professionnel';
      default:
        return 'GoFounders';
    }
  });

  readonly detailStepDescription = computed(() => {
    return this.isSelected('entrepreneur')
      ? 'Présentez rapidement votre projet pour que les futurs associés sachent ce que vous construisez.'
      : 'Présentez votre expertise pour que les entrepreneurs trouvent le bon profil plus vite.';
  });

  readonly detailStepPrompt = computed(() => {
    const types = this.selectedTypes();
    if (types.length > 1) {
      return 'Complétez les informations utiles à chacun de vos choix.';
    }

    switch (types[0]) {
      case 'entrepreneur':
        return 'Présentez rapidement votre projet pour que les futurs associés sachent ce que vous construisez.';
      case 'talent':
        return 'Présentez votre expertise pour que les entrepreneurs trouvent le bon profil plus vite.';
      case 'buyer':
        return 'Indiquez ce que vous souhaitez reprendre pour recevoir des opportunités M&A cohérentes.';
      case 'seller':
        return 'Cadrez votre projet de cession pour préparer une annonce claire et confidentielle.';
      case 'pro':
        return 'Présentez votre activité pour apparaître auprès des cédants et des repreneurs.';
      default:
        return 'Complétez les informations utiles pour personnaliser votre parcours.';
    }
  });

  readonly profileTypes: ProfileOption[] = this.allProfileTypes().filter(type =>
    (FEATURES.associates || (type.id !== 'entrepreneur' && type.id !== 'talent')) && (FEATURES.pros || type.id !== 'pro')
  );

  private allProfileTypes(): ProfileOption[] {
    return [
    {
      id: 'entrepreneur',
      icon: 'project',
      title: 'Je cherche des associés',
      description: 'Je construis un projet et je veux trouver les bons associés pour le faire avancer',
    },
    {
      id: 'talent',
      icon: 'talent',
      title: 'Je veux devenir associé',
      description: 'Je veux découvrir des projets et rejoindre une équipe entrepreneuriale',
    },
    {
      id: 'buyer',
      icon: 'buyer',
      title: 'Je veux reprendre une entreprise',
      description: 'Je consulte les annonces et je débloque les dossiers qui m’intéressent, 50 € par entreprise',
    },
    {
      id: 'seller',
      icon: 'seller',
      title: 'Je veux céder mon entreprise',
      description: 'Je publie gratuitement une annonce anonyme et j’échange avec les repreneurs',
    },
    {
      id: 'pro',
      icon: 'pro',
      title: 'Je suis un professionnel',
      description: 'Expert-comptable, avocat, notaire ou cabinet de cession : compte à part, pour être visible et accompagner des cessions',
    },
    ];
  }

  readonly projectStages = [
    { value: 'idea', label: 'Idée' },
    { value: 'mvp', label: 'MVP' },
    { value: 'growth', label: 'Croissance' },
    { value: 'established', label: 'Établi' },
  ];

  emailErrorMessage(): string {
    const emailControl = this.basicsForm.controls.email;

    if (!emailControl.touched && !emailControl.dirty) {
      return '';
    }

    if (emailControl.hasError('required')) {
      return 'Renseignez votre email.';
    }

    if (emailControl.hasError('email') || emailControl.hasError('invalidEmail')) {
      return EMAIL_POLICY_MESSAGES.invalidEmail;
    }

    if (emailControl.hasError('emailAlias')) {
      return EMAIL_POLICY_MESSAGES.emailAlias;
    }

    if (emailControl.hasError('temporaryEmail')) {
      return EMAIL_POLICY_MESSAGES.temporaryEmail;
    }

    return '';
  }

  isSelected(id: ProfileType): boolean {
    return this.selectedTypes().includes(id);
  }

  toggleType(id: ProfileType): void {
    this.selectedTypes.update(types => {
      if (id === 'pro') {
        return types.includes('pro') ? [] : ['pro'];
      }

      const others = types.filter(type => type !== 'pro');
      return others.includes(id) ? others.filter(type => type !== id) : [...others, id];
    });
    this.errorMessage.set('');
    this.updateDetailValidators(this.selectedTypes());
  }

  goToStep(step: number): void {
    if (step === 2 && this.selectedTypes().length === 0) {
      return;
    }

    if (step === 3) {
      this.basicsForm.markAllAsTouched();

      if (this.basicsForm.invalid) {
        return;
      }
    }

    this.currentStep.set(step);
  }

  async submitRegistration(): Promise<void> {
    const types = this.selectedTypes();

    if (types.length === 0) {
      this.currentStep.set(1);
      return;
    }

    const usages = types.filter((type): type is Exclude<ProfileType, 'pro'> => type !== 'pro').map(type => TYPE_TO_USAGE[type]);
    const profileType: ProfileType = types.includes('pro') ? 'pro' : primaryProfileType(usages);

    this.errorMessage.set('');
    this.detailsForm.markAllAsTouched();

    if (this.detailsForm.invalid) {
      return;
    }

    if (this.basicsForm.invalid) {
      this.currentStep.set(2);
      this.basicsForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    try {
      const result = await this.auth.signUp(
        {
          displayName: this.basicsForm.controls.displayName.getRawValue(),
          email: this.basicsForm.controls.email.getRawValue(),
          password: this.basicsForm.controls.password.getRawValue(),
          location: this.basicsForm.controls.location.getRawValue(),
          profileType,
          usages,
          projectName: this.detailsForm.controls.projectName.getRawValue(),
          projectSector: this.detailsForm.controls.projectSector.getRawValue(),
          projectStage: this.detailsForm.controls.projectStage.getRawValue(),
          talentHeadline: this.detailsForm.controls.talentHeadline.getRawValue(),
          talentSkill: this.detailsForm.controls.talentSkill.getRawValue(),
          talentAvailability: this.detailsForm.controls.talentAvailability.getRawValue(),
          publicListing: this.detailsForm.controls.publicListing.getRawValue(),
          maSector: this.detailsForm.controls.maSector.getRawValue(),
          maBudget: this.detailsForm.controls.maBudget.getRawValue(),
          maRegion: this.detailsForm.controls.maRegion.getRawValue(),
          proCategory: (this.detailsForm.controls.proCategory.getRawValue() || undefined) as ProCategory | undefined,
          proCompany: this.detailsForm.controls.proCompany.getRawValue(),
        },
        this.returnUrl()
      );

      if (!result.success) {
        this.errorMessage.set(result.message ?? 'Création du compte impossible.');
      }
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private updateDetailValidators(types: ProfileType[]): void {
    const {
      projectName,
      projectSector,
      talentHeadline,
      talentSkill,
      maSector,
      maBudget,
      proCategory,
      proCompany,
    } = this.detailsForm.controls;

    projectName.clearValidators();
    projectSector.clearValidators();
    talentHeadline.clearValidators();
    talentSkill.clearValidators();
    maSector.clearValidators();
    maBudget.clearValidators();
    proCategory.clearValidators();
    proCompany.clearValidators();

    // Projet et compétences : nécessaires pour publier le projet et compléter le profil d'associé.
    // Reprise et cession : secteur et budget demandés seulement si c'est l'unique choix (personnalisation).
    if (types.includes('entrepreneur')) {
      projectName.setValidators([Validators.required]);
      projectSector.setValidators([Validators.required]);
    }

    if (types.includes('talent')) {
      talentHeadline.setValidators([Validators.required]);
      talentSkill.setValidators([Validators.required]);
    }

    if (types.includes('pro')) {
      proCategory.setValidators([Validators.required]);
      proCompany.setValidators([Validators.required]);
    }

    if (types.length === 1 && (types[0] === 'buyer' || types[0] === 'seller')) {
      maSector.setValidators([Validators.required]);
      maBudget.setValidators([Validators.required]);
    }

    projectName.updateValueAndValidity({ emitEvent: false });
    projectSector.updateValueAndValidity({ emitEvent: false });
    talentHeadline.updateValueAndValidity({ emitEvent: false });
    talentSkill.updateValueAndValidity({ emitEvent: false });
    maSector.updateValueAndValidity({ emitEvent: false });
    maBudget.updateValueAndValidity({ emitEvent: false });
    proCategory.updateValueAndValidity({ emitEvent: false });
    proCompany.updateValueAndValidity({ emitEvent: false });
  }
}
