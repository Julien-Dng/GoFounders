import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProfileType } from '../../core/models/user.model';
import { EMAIL_POLICY_MESSAGES, registrationEmailValidator } from '../../core/validators/email-policy.validator';

interface ProfileOption {
  id: ProfileType;
  icon: 'project' | 'talent' | 'buyer' | 'seller';
  title: string;
  description: string;
}

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, RouterLink],
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
            <div class="h-full rounded-full bg-accent transition-all duration-500" [style.width]="progressPercent() + '%'"></div>
          </div>
        </div>

        @if (currentStep() > 1) {
          <div class="mb-8 hidden overflow-hidden rounded-3xl border border-accent/15 bg-secondary p-5 shadow-sm lg:block">
            <div class="grid grid-cols-[18rem_minmax(0,1fr)] items-center gap-6">
              <div class="relative h-36">
                <div class="absolute inset-x-8 bottom-0 h-12 rounded-full bg-accent/10 blur-2xl"></div>
                <img
                  src="/assets/images/profile-coach.png"
                  alt=""
                  aria-hidden="true"
                  class="absolute -bottom-16 left-0 h-56 w-auto object-contain drop-shadow-xl"
                >
              </div>
              <div>
                <div class="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-accent">Coach profil</div>
                <h2 class="text-2xl font-bold text-primary">Quelques infos bien choisies suffisent</h2>
                <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Le coach vous guide pour créer un profil clair : rôle, contexte, objectif et signaux de confiance.
                </p>
              </div>
            </div>
          </div>
        }

        <div class="animate-fade-in-scale delay-100 rounded-2xl border-2 border-border bg-white p-6 shadow-lg sm:p-8 lg:p-12">
          @if (currentStep() === 1) {
            <div>
              <div class="mb-8 text-center sm:mb-10">
                <h1 class="mb-3 text-3xl font-bold text-primary sm:text-4xl">Vous êtes plutôt…</h1>
                <p class="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                  Un seul rôle par compte pour garder une recherche claire et pertinente des deux côtés.
                </p>
              </div>

              <div class="mb-8 grid grid-cols-1 gap-4 sm:mb-10 md:grid-cols-2 md:gap-6">
                @for (type of profileTypes; track type.id) {
                  <button
                    type="button"
                    (click)="selectType(type.id)"
                    [ngClass]="selectedType() === type.id
                      ? 'rounded-2xl border-2 border-accent bg-accent/5 p-6 text-left shadow-lg transition-all hover:scale-[1.01] sm:p-8'
                      : 'rounded-2xl border-2 border-border bg-card p-6 text-left transition-all hover:scale-[1.01] hover:shadow-md sm:p-8'"
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
                      }
                    </div>

                    <h3 class="mb-2 text-xl font-bold text-primary">{{ type.title }}</h3>
                    <p class="leading-relaxed text-muted-foreground">{{ type.description }}</p>

                    @if (selectedType() === type.id) {
                      <div class="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-white animate-scale-in">
                        Sélectionné
                      </div>
                    }
                  </button>
                }
              </div>

              <button
                type="button"
                (click)="goToStep(2)"
                [disabled]="!selectedType()"
                [ngClass]="selectedType()
                  ? 'w-full rounded-lg bg-accent py-4 text-lg font-semibold text-white shadow-lg transition-all hover:bg-accent/90'
                  : 'w-full cursor-not-allowed rounded-lg bg-muted py-4 text-lg font-semibold text-muted-foreground opacity-50'"
              >
                Continuer
              </button>
            </div>
          }

          @if (currentStep() === 2) {
            <div [formGroup]="basicsForm">
              <div class="mb-8 text-center sm:mb-10">
                <h2 class="mb-3 text-3xl font-bold text-primary sm:text-4xl">Créez votre accès</h2>
                <p class="text-sm text-muted-foreground sm:text-base">
                  Quelques informations pour ouvrir votre compte {{ selectedTypeLabel() }}.
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
                      placeholder="6 caractères minimum"
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
                </div>
              </div>

              @if (basicsForm.invalid && basicsForm.touched) {
                <p class="mt-5 text-sm text-destructive">
                  Renseignez un nom, une localisation, un email valide et un mot de passe d'au moins 6 caractères.
                </p>
              }

              <div class="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
                <button
                  type="button"
                  (click)="goToStep(1)"
                  class="rounded-lg border-2 border-border px-6 py-3 font-semibold transition-colors hover:border-accent"
                >
                  Retour
                </button>
                <button
                  type="button"
                  (click)="goToStep(3)"
                  class="flex-1 rounded-lg bg-accent py-4 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-accent/90"
                >
                  Continuer
                </button>
              </div>
            </div>
          }

          @if (currentStep() === 3) {
            <div [formGroup]="detailsForm">
              <div class="mb-8 text-center sm:mb-10">
                <h2 class="mb-3 text-3xl font-bold text-primary sm:text-4xl">Derniers détails</h2>
                <p class="mx-auto max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{{ detailStepPrompt() }}</p>
              </div>

              @if (selectedType() === 'entrepreneur') {
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

              @if (selectedType() === 'talent') {
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
                      <span class="text-sm text-muted-foreground">Les entrepreneurs verront si vous êtes joignable tout de suite.</span>
                    </span>
                    <input type="checkbox" formControlName="talentAvailability" class="h-5 w-5 accent-accent">
                  </label>
                </div>
              }

              @if (selectedType() === 'buyer') {
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

              @if (selectedType() === 'seller') {
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

              @if (detailsForm.invalid && detailsForm.touched) {
                <p class="mt-5 text-sm text-destructive">
                  Complétez les informations demandées pour terminer l'inscription.
                </p>
              }

              @if (errorMessage()) {
                <div class="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                  {{ errorMessage() }}
                </div>
              }

              @if (returnUrl()) {
                <div class="mt-5 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-sm text-accent">
                  Une fois créé, votre compte sera redirigé vers la page demandée.
                </div>
              }

              <div class="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
                <button
                  type="button"
                  (click)="goToStep(2)"
                  class="rounded-lg border-2 border-border px-6 py-3 font-semibold transition-colors hover:border-accent"
                >
                  Retour
                </button>
                <button
                  type="button"
                  (click)="submitRegistration()"
                  [disabled]="isSubmitting()"
                  [ngClass]="isSubmitting() ? 'cursor-wait opacity-70' : ''"
                  class="flex-1 rounded-lg bg-accent py-4 text-lg font-semibold text-white shadow-lg transition-colors hover:bg-accent/90"
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
  readonly selectedType = signal<ProfileType | null>(null);
  readonly returnUrl = signal<string | null>(this.route.snapshot.queryParamMap.get('returnUrl'));
  readonly isPasswordVisible = signal(false);
  readonly errorMessage = signal('');
  readonly isSubmitting = signal(false);

  togglePasswordVisibility(): void {
    this.isPasswordVisible.update((isVisible) => !isVisible);
  }

  readonly basicsForm = this.fb.nonNullable.group({
    displayName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email, registrationEmailValidator()]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    location: ['', Validators.required],
  });

  readonly detailsForm = this.fb.nonNullable.group({
    projectName: [''],
    projectSector: [''],
    projectStage: ['mvp'],
    talentHeadline: [''],
    talentSkill: [''],
    talentAvailability: [true],
    maSector: [''],
    maBudget: [''],
    maRegion: [''],
  });

  readonly progressPercent = computed(() =>
    Math.round((this.currentStep() / this.totalSteps) * 100)
  );

  readonly selectedTypeLabel = computed(() => {
    const activeType = this.selectedType();
    switch (activeType) {
      case 'entrepreneur':
        return 'entrepreneur';
      case 'talent':
        return 'talent';
      case 'buyer':
        return 'acheteur / repreneur';
      case 'seller':
        return 'vendeur M&A';
      default:
        return 'GoFounders';
    }
  });

  readonly detailStepDescription = computed(() => {
    return this.selectedType() === 'entrepreneur'
      ? 'Présentez rapidement votre projet pour que les talents sachent ce que vous construisez.'
      : 'Présentez votre expertise pour que les entrepreneurs trouvent le bon profil plus vite.';
  });

  readonly detailStepPrompt = computed(() => {
    switch (this.selectedType()) {
      case 'entrepreneur':
        return 'Présentez rapidement votre projet pour que les talents sachent ce que vous construisez.';
      case 'talent':
        return 'Présentez votre expertise pour que les entrepreneurs trouvent le bon profil plus vite.';
      case 'buyer':
        return 'Indiquez ce que vous souhaitez reprendre pour recevoir des opportunités M&A cohérentes.';
      case 'seller':
        return 'Cadrez votre projet de cession pour préparer une annonce claire et confidentielle.';
      default:
        return 'Complétez les informations utiles pour personnaliser votre parcours.';
    }
  });

  readonly profileTypes: ProfileOption[] = [
    {
      id: 'entrepreneur',
      icon: 'project',
      title: 'Je dépose un projet',
      description: 'Je construis un projet et je veux trouver des talents pour le faire avancer.',
    },
    {
      id: 'talent',
      icon: 'talent',
      title: 'Je suis un talent',
      description: 'Je veux découvrir des projets et rejoindre une équipe entrepreneuriale.',
    },
    {
      id: 'buyer',
      icon: 'buyer',
      title: 'Je veux reprendre une entreprise',
      description: 'Je cherche une opportunité M&A à analyser ou acquérir avec un accès dédié.',
    },
    {
      id: 'seller',
      icon: 'seller',
      title: 'Je veux céder mon entreprise',
      description: 'Je souhaite préparer une annonce confidentielle et qualifier des repreneurs.',
    },
  ];

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

  selectType(id: ProfileType): void {
    this.selectedType.set(id);
    this.errorMessage.set('');
    this.updateDetailValidators(id);
  }

  goToStep(step: number): void {
    if (step === 2 && !this.selectedType()) {
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
    const profileType = this.selectedType();

    if (!profileType) {
      this.currentStep.set(1);
      return;
    }

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
          projectName: this.detailsForm.controls.projectName.getRawValue(),
          projectSector: this.detailsForm.controls.projectSector.getRawValue(),
          projectStage: this.detailsForm.controls.projectStage.getRawValue(),
          talentHeadline: this.detailsForm.controls.talentHeadline.getRawValue(),
          talentSkill: this.detailsForm.controls.talentSkill.getRawValue(),
          talentAvailability: this.detailsForm.controls.talentAvailability.getRawValue(),
          maSector: this.detailsForm.controls.maSector.getRawValue(),
          maBudget: this.detailsForm.controls.maBudget.getRawValue(),
          maRegion: this.detailsForm.controls.maRegion.getRawValue(),
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

  private updateDetailValidators(profileType: ProfileType): void {
    const {
      projectName,
      projectSector,
      talentHeadline,
      talentSkill,
      maSector,
      maBudget,
    } = this.detailsForm.controls;

    projectName.clearValidators();
    projectSector.clearValidators();
    talentHeadline.clearValidators();
    talentSkill.clearValidators();
    maSector.clearValidators();
    maBudget.clearValidators();

    if (profileType === 'entrepreneur') {
      projectName.setValidators([Validators.required]);
      projectSector.setValidators([Validators.required]);
    } else if (profileType === 'talent') {
      talentHeadline.setValidators([Validators.required]);
      talentSkill.setValidators([Validators.required]);
    } else {
      maSector.setValidators([Validators.required]);
      maBudget.setValidators([Validators.required]);
    }

    projectName.updateValueAndValidity({ emitEvent: false });
    projectSector.updateValueAndValidity({ emitEvent: false });
    talentHeadline.updateValueAndValidity({ emitEvent: false });
    talentSkill.updateValueAndValidity({ emitEvent: false });
    maSector.updateValueAndValidity({ emitEvent: false });
    maBudget.updateValueAndValidity({ emitEvent: false });
  }
}
