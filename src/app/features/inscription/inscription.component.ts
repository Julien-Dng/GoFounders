import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ProfileType } from '../../core/models/user.model';

interface ProfileOption {
  id: ProfileType;
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-inscription',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-white flex items-center justify-center px-8 py-12">
      <div class="w-full max-w-5xl">

        <div class="mb-12 animate-fade-in-up">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-semibold text-muted-foreground">Étape {{ currentStep() }} sur {{ totalSteps }}</span>
            <span class="text-sm font-semibold text-accent">{{ progressPercent() }}%</span>
          </div>
          <div class="h-2 bg-secondary rounded-full overflow-hidden">
            <div class="h-full bg-accent rounded-full transition-all duration-500" [style.width]="progressPercent() + '%'"></div>
          </div>
        </div>

        <div class="bg-white rounded-2xl border-2 border-border p-12 shadow-lg animate-fade-in-scale delay-100">
          @if (currentStep() === 1) {
            <div>
              <div class="text-center mb-10">
                <h1 class="text-4xl font-bold text-primary mb-3">Vous êtes plutôt…</h1>
                <p class="text-muted-foreground">Un seul rôle par compte pour garder la recherche claire des deux côtés.</p>
              </div>

              <div class="grid grid-cols-2 gap-6 mb-10">
                @for (type of profileTypes; track type.id) {
                  <button
                    type="button"
                    (click)="selectType(type.id)"
                    [ngClass]="selectedType() === type.id
                      ? 'p-8 rounded-2xl border-2 border-accent bg-accent/5 shadow-lg text-left transition-all hover:scale-[1.02]'
                      : 'p-8 rounded-2xl border-2 border-border bg-card text-left transition-all hover:scale-[1.02] hover:shadow-md'"
                  >
                    <div class="text-5xl mb-4">{{ type.icon }}</div>
                    <h3 class="text-xl font-bold mb-2 text-primary">{{ type.title }}</h3>
                    <p class="text-muted-foreground leading-relaxed">{{ type.description }}</p>

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
                  ? 'w-full py-4 rounded-lg font-semibold text-lg bg-accent text-white shadow-lg cursor-pointer transition-all hover:bg-accent/90'
                  : 'w-full py-4 rounded-lg font-semibold text-lg bg-muted text-muted-foreground cursor-not-allowed opacity-50'"
              >
                Continuer
              </button>
            </div>
          }

          @if (currentStep() === 2) {
            <div [formGroup]="basicsForm">
              <div class="text-center mb-10">
                <h2 class="text-4xl font-bold text-primary mb-3">Créez votre accès</h2>
                <p class="text-muted-foreground">Quelques informations pour ouvrir votre compte {{ selectedTypeLabel() }}.</p>
              </div>

              <div class="grid grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-semibold mb-2" for="signup-name">Nom complet</label>
                  <input
                    id="signup-name"
                    type="text"
                    formControlName="displayName"
                    class="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
                    placeholder="Marie Dupont"
                  >
                </div>

                <div>
                  <label class="block text-sm font-semibold mb-2" for="signup-location">Localisation</label>
                  <input
                    id="signup-location"
                    type="text"
                    formControlName="location"
                    class="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
                    placeholder="Paris, France"
                  >
                </div>

                <div>
                  <label class="block text-sm font-semibold mb-2" for="signup-email">Email</label>
                  <input
                    id="signup-email"
                    type="email"
                    formControlName="email"
                    class="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
                    placeholder="vous@exemple.fr"
                  >
                </div>

                <div>
                  <label class="block text-sm font-semibold mb-2" for="signup-password">Mot de passe</label>
                  <input
                    id="signup-password"
                    type="password"
                    formControlName="password"
                    class="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
                    placeholder="6 caractères minimum"
                  >
                </div>
              </div>

              @if (basicsForm.invalid && basicsForm.touched) {
                <p class="mt-5 text-sm text-destructive">
                  Renseignez un nom, une localisation, un email valide et un mot de passe d'au moins 6 caractères.
                </p>
              }

              <div class="mt-10 flex items-center gap-4">
                <button
                  type="button"
                  (click)="goToStep(1)"
                  class="px-6 py-3 rounded-lg border-2 border-border font-semibold hover:border-accent transition-colors"
                >
                  Retour
                </button>
                <button
                  type="button"
                  (click)="goToStep(3)"
                  class="flex-1 py-4 rounded-lg font-semibold text-lg bg-accent text-white shadow-lg transition-colors hover:bg-accent/90"
                >
                  Continuer
                </button>
              </div>
            </div>
          }

          @if (currentStep() === 3) {
            <div [formGroup]="detailsForm">
              <div class="text-center mb-10">
                <h2 class="text-4xl font-bold text-primary mb-3">Derniers détails</h2>
                <p class="text-muted-foreground">{{ detailStepDescription() }}</p>
              </div>

              @if (selectedType() === 'entrepreneur') {
                <div class="grid grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-semibold mb-2" for="project-name">Nom du projet</label>
                    <input
                      id="project-name"
                      type="text"
                      formControlName="projectName"
                      class="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
                      placeholder="Nom du projet"
                    >
                  </div>

                  <div>
                    <label class="block text-sm font-semibold mb-2" for="project-sector">Secteur</label>
                    <input
                      id="project-sector"
                      type="text"
                      formControlName="projectSector"
                      class="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
                      placeholder="SaaS, IA, e-commerce..."
                    >
                  </div>

                  <div class="col-span-2">
                    <label class="block text-sm font-semibold mb-2" for="project-stage">Stade du projet</label>
                    <select
                      id="project-stage"
                      formControlName="projectStage"
                      class="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
                    >
                      @for (stage of projectStages; track stage.value) {
                        <option [value]="stage.value">{{ stage.label }}</option>
                      }
                    </select>
                  </div>
                </div>
              }

              @if (selectedType() === 'talent') {
                <div class="grid grid-cols-2 gap-6">
                  <div>
                    <label class="block text-sm font-semibold mb-2" for="talent-headline">Rôle principal</label>
                    <input
                      id="talent-headline"
                      type="text"
                      formControlName="talentHeadline"
                      class="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
                      placeholder="Développeur full-stack, sales, product..."
                    >
                  </div>

                  <div>
                    <label class="block text-sm font-semibold mb-2" for="talent-skill">Compétence clé</label>
                    <input
                      id="talent-skill"
                      type="text"
                      formControlName="talentSkill"
                      class="w-full px-4 py-3 bg-secondary border border-border rounded-lg focus:border-accent outline-none transition-colors"
                      placeholder="Angular, closing, growth..."
                    >
                  </div>

                  <label class="col-span-2 flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-4">
                    <span>
                      <span class="block font-semibold text-primary">Disponible rapidement</span>
                      <span class="text-sm text-muted-foreground">Les entrepreneurs verront si vous êtes joignable tout de suite.</span>
                    </span>
                    <input type="checkbox" formControlName="talentAvailability" class="h-5 w-5 accent-accent">
                  </label>
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

              <div class="mt-10 flex items-center gap-4">
                <button
                  type="button"
                  (click)="goToStep(2)"
                  class="px-6 py-3 rounded-lg border-2 border-border font-semibold hover:border-accent transition-colors"
                >
                  Retour
                </button>
                <button
                  type="button"
                  (click)="submitRegistration()"
                  [disabled]="isSubmitting()"
                  [ngClass]="isSubmitting() ? 'opacity-70 cursor-wait' : ''"
                  class="flex-1 py-4 rounded-lg font-semibold text-lg bg-accent text-white shadow-lg transition-colors hover:bg-accent/90"
                >
                  {{ isSubmitting() ? 'Création du compte...' : 'Créer mon compte' }}
                </button>
              </div>
            </div>
          }
        </div>

        <p class="text-center text-sm text-muted-foreground mt-6 animate-fade-in delay-700">
          Vous avez déjà un compte ?
          <a
            routerLink="/connexion"
            [queryParams]="returnUrl() ? { returnUrl: returnUrl() } : null"
            class="text-accent font-semibold hover:underline"
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
  readonly errorMessage = signal('');
  readonly isSubmitting = signal(false);

  readonly basicsForm = this.fb.nonNullable.group({
    displayName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
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
  });

  readonly progressPercent = computed(() =>
    Math.round((this.currentStep() / this.totalSteps) * 100)
  );

  readonly selectedTypeLabel = computed(() => {
    const activeType = this.selectedType();
    return activeType === 'entrepreneur' ? 'entrepreneur' : 'talent';
  });

  readonly detailStepDescription = computed(() => {
    return this.selectedType() === 'entrepreneur'
      ? 'Présentez rapidement votre projet pour que les talents sachent ce que vous construisez.'
      : 'Présentez votre expertise pour que les entrepreneurs trouvent le bon profil plus vite.';
  });

  readonly profileTypes: ProfileOption[] = [
    {
      id: 'entrepreneur',
      icon: '🚀',
      title: 'Je dépose un projet',
      description: 'Je construis un projet et je veux trouver des talents pour le faire avancer.',
    },
    {
      id: 'talent',
      icon: '💼',
      title: 'Je suis un talent',
      description: 'Je veux découvrir des projets et rejoindre une équipe entrepreneuriale.',
    },
  ];

  readonly projectStages = [
    { value: 'idea', label: 'Idée' },
    { value: 'mvp', label: 'MVP' },
    { value: 'growth', label: 'Croissance' },
    { value: 'established', label: 'Établi' },
  ];

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
    } = this.detailsForm.controls;

    projectName.clearValidators();
    projectSector.clearValidators();
    talentHeadline.clearValidators();
    talentSkill.clearValidators();

    if (profileType === 'entrepreneur') {
      projectName.setValidators([Validators.required]);
      projectSector.setValidators([Validators.required]);
    } else {
      talentHeadline.setValidators([Validators.required]);
      talentSkill.setValidators([Validators.required]);
    }

    projectName.updateValueAndValidity({ emitEvent: false });
    projectSector.updateValueAndValidity({ emitEvent: false });
    talentHeadline.updateValueAndValidity({ emitEvent: false });
    talentSkill.updateValueAndValidity({ emitEvent: false });
  }
}
