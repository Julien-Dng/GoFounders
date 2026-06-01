import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService, UpdateProfilePayload } from '../../../core/services/auth.service';

@Component({
  selector: 'app-modifier-profil',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-14 pt-24 sm:px-6 lg:px-8">
      <div class="mx-auto w-full max-w-6xl">
        <div class="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <a
              [routerLink]="profileLink()"
              class="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-accent"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Retour au profil
            </a>
            <h1 class="text-3xl font-bold text-primary sm:text-4xl">Modifier mon profil</h1>
            <p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Ajoutez une bio, une photo et vos liens professionnels pour rendre votre profil plus crédible.
            </p>
          </div>

          <div class="rounded-2xl border border-border bg-white px-5 py-4 shadow-sm">
            <div class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Complétion actuelle</div>
            <div class="mt-1 text-2xl font-bold text-accent">{{ currentUser()?.profileComplete ?? 0 }}%</div>
          </div>
        </div>

        <div class="mb-6 overflow-hidden rounded-3xl border border-accent/15 bg-white p-5 shadow-lg sm:p-6">
          <div class="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-center">
            <div class="relative hidden h-44 lg:block">
              <div class="absolute inset-x-8 bottom-0 h-16 rounded-full bg-accent/10 blur-2xl"></div>
              <img
                src="/assets/images/profile-coach.png"
                alt=""
                aria-hidden="true"
                class="absolute -bottom-14 left-0 h-64 w-auto object-contain drop-shadow-2xl"
              >
            </div>

            <div>
              <div class="mb-3 inline-flex items-center rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-accent">
                Coach profil
              </div>
              <h2 class="text-2xl font-bold text-primary">Un profil complet inspire plus vite confiance</h2>
              <p class="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Ajoutez une photo nette, une bio concrète et quelques liens utiles. L'objectif n'est pas de faire long, mais de donner assez de signaux pour déclencher une conversation qualifiée.
              </p>
            </div>
          </div>
        </div>

        <div class="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside class="rounded-3xl border border-border bg-white p-6 shadow-lg">
            <div class="text-center">
              <div class="mx-auto mb-4 h-32 w-32 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-accent to-primary shadow-lg">
                @if (previewPhoto()) {
                  <img [src]="previewPhoto()" alt="Aperçu de la photo de profil" class="h-full w-full object-cover">
                } @else {
                  <div class="flex h-full w-full items-center justify-center text-4xl font-bold text-white">
                    {{ initials() }}
                  </div>
                }
              </div>

              <input #photoInput type="file" accept="image/*" class="hidden" (change)="onPhotoSelected($event)">

              <button
                type="button"
                (click)="photoInput.click()"
                class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-accent/90"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Modifier la photo
              </button>

              @if (previewPhoto()) {
                <button
                  type="button"
                  (click)="removePhoto()"
                  class="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                >
                  Retirer la photo
                </button>
              }
            </div>

            <div class="mt-6 rounded-2xl bg-secondary p-4 text-sm leading-relaxed text-muted-foreground">
              Préférez une photo carrée, nette, avec un visage visible. Elle sera stockée en local pour la démo, puis plutôt dans Firebase Storage en version production.
            </div>
          </aside>

          <section class="rounded-3xl border border-border bg-white p-6 shadow-lg sm:p-8">
            <div [formGroup]="profileForm" class="space-y-8">
              <div>
                <h2 class="text-xl font-bold text-primary">Informations principales</h2>
                <p class="mt-1 text-sm text-muted-foreground">Ce sont les premières informations vues sur votre profil.</p>

                <div class="mt-5 grid gap-5 md:grid-cols-2">
                  <div>
                    <label for="profile-name" class="mb-2 block text-sm font-semibold">Nom complet</label>
                    <input
                      id="profile-name"
                      type="text"
                      formControlName="displayName"
                      class="w-full rounded-xl border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="Marie Dupont"
                    >
                  </div>

                  <div>
                    <label for="profile-location" class="mb-2 block text-sm font-semibold">Localisation</label>
                    <input
                      id="profile-location"
                      type="text"
                      formControlName="location"
                      class="w-full rounded-xl border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="Paris, France"
                    >
                  </div>

                  <div>
                    <label for="profile-title" class="mb-2 block text-sm font-semibold">Titre du profil</label>
                    <input
                      id="profile-title"
                      type="text"
                      formControlName="profileTitle"
                      class="w-full rounded-xl border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      [placeholder]="rolePlaceholder()"
                    >
                  </div>

                  <div>
                    <label for="profile-availability" class="mb-2 block text-sm font-semibold">Disponibilité</label>
                    <input
                      id="profile-availability"
                      type="text"
                      formControlName="availabilityLabel"
                      class="w-full rounded-xl border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="Disponible 2 jours par semaine"
                    >
                  </div>
                </div>
              </div>

              <div>
                <label for="profile-bio" class="mb-2 block text-sm font-semibold">Bio</label>
                <textarea
                  id="profile-bio"
                  formControlName="bio"
                  rows="6"
                  maxlength="700"
                  class="w-full resize-none rounded-xl border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                  placeholder="Présentez votre parcours, ce que vous construisez ou ce que vous pouvez apporter à un projet..."
                ></textarea>
                <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Un texte court, concret et humain fonctionne mieux qu'un CV complet.</span>
                  <span>{{ profileForm.controls.bio.getRawValue().length }}/700</span>
                </div>
              </div>

              <div class="grid gap-5 md:grid-cols-2">
                <div>
                  <label for="profile-skills" class="mb-2 block text-sm font-semibold">Compétences</label>
                  <textarea
                    id="profile-skills"
                    formControlName="skills"
                    rows="4"
                    class="w-full resize-none rounded-xl border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                    placeholder="Angular, Firebase, Sales B2B, Growth..."
                  ></textarea>
                  <p class="mt-2 text-xs text-muted-foreground">Séparez les compétences par des virgules.</p>
                </div>

                <div>
                  <label for="profile-looking" class="mb-2 block text-sm font-semibold">Ce que vous recherchez</label>
                  <textarea
                    id="profile-looking"
                    formControlName="lookingFor"
                    rows="4"
                    class="w-full resize-none rounded-xl border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                    placeholder="Co-fondateur technique, projet SaaS, associé sales..."
                  ></textarea>
                  <p class="mt-2 text-xs text-muted-foreground">Ces tags aident à comprendre rapidement votre objectif.</p>
                </div>
              </div>

              <div>
                <h2 class="text-xl font-bold text-primary">Liens professionnels</h2>
                <p class="mt-1 text-sm text-muted-foreground">Ajoutez seulement les liens utiles pour inspirer confiance.</p>

                <div class="mt-5 grid gap-5 md:grid-cols-3">
                  <div>
                    <label for="profile-github" class="mb-2 block text-sm font-semibold">GitHub</label>
                    <input
                      id="profile-github"
                      type="text"
                      formControlName="githubUrl"
                      class="w-full rounded-xl border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="github.com/votreprofil"
                    >
                  </div>

                  <div>
                    <label for="profile-linkedin" class="mb-2 block text-sm font-semibold">LinkedIn</label>
                    <input
                      id="profile-linkedin"
                      type="text"
                      formControlName="linkedinUrl"
                      class="w-full rounded-xl border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="linkedin.com/in/vous"
                    >
                  </div>

                  <div>
                    <label for="profile-website" class="mb-2 block text-sm font-semibold">Site / portfolio</label>
                    <input
                      id="profile-website"
                      type="text"
                      formControlName="websiteUrl"
                      class="w-full rounded-xl border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                      placeholder="votresite.fr"
                    >
                  </div>
                </div>
              </div>

              @if (errorMessage()) {
                <div class="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                  {{ errorMessage() }}
                </div>
              }

              @if (successMessage()) {
                <div class="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                  {{ successMessage() }}
                </div>
              }

              <div class="flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <a
                  [routerLink]="profileLink()"
                  class="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
                >
                  Voir mon profil
                </a>

                <button
                  type="button"
                  (click)="saveProfile()"
                  [disabled]="isSaving()"
                  [ngClass]="isSaving() ? 'cursor-wait opacity-70' : ''"
                  class="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-colors hover:bg-accent/90"
                >
                  @if (isSaving()) {
                    Enregistrement...
                  } @else {
                    Enregistrer les modifications
                  }
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `
})
export class ModifierComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);

  readonly currentUser = this.auth.currentUser;
  readonly initials = this.auth.initials;
  readonly previewPhoto = signal(this.currentUser()?.photoURL ?? '');
  readonly isSaving = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  readonly profileLink = computed(() => {
    const userId = this.currentUser()?.uid;
    return userId ? ['/profil', userId] : ['/dashboard'];
  });
  readonly rolePlaceholder = computed(() => {
    switch (this.currentUser()?.profileType) {
      case 'talent':
        return 'Développeur full-stack, CTO freelance, Growth marketer...';
      case 'buyer':
        return 'Repreneur actif, entrepreneur en acquisition...';
      case 'seller':
        return 'Dirigeant cédant, fondateur SaaS...';
      default:
        return 'Fondateur SaaS, porteur de projet, CEO...';
    }
  });

  readonly profileForm = this.fb.nonNullable.group({
    displayName: [this.currentUser()?.displayName ?? '', [Validators.required, Validators.maxLength(80)]],
    location: [this.currentUser()?.location ?? '', [Validators.required, Validators.maxLength(80)]],
    profileTitle: [this.currentUser()?.profileTitle ?? '', Validators.maxLength(90)],
    availabilityLabel: [this.currentUser()?.availabilityLabel ?? '', Validators.maxLength(90)],
    bio: [this.currentUser()?.bio ?? '', Validators.maxLength(700)],
    skills: [(this.currentUser()?.skills ?? []).join(', '), Validators.maxLength(240)],
    lookingFor: [(this.currentUser()?.lookingFor ?? []).join(', '), Validators.maxLength(240)],
    githubUrl: [this.currentUser()?.githubUrl ?? '', Validators.maxLength(160)],
    linkedinUrl: [this.currentUser()?.linkedinUrl ?? '', Validators.maxLength(160)],
    websiteUrl: [this.currentUser()?.websiteUrl ?? '', Validators.maxLength(160)],
  });

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Choisissez une image valide pour la photo de profil.');
      input.value = '';
      return;
    }

    if (file.size > 1_500_000) {
      this.errorMessage.set('La photo est trop lourde pour la démo locale. Essayez une image de moins de 1,5 Mo.');
      input.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.previewPhoto.set(reader.result);
        this.errorMessage.set('');
        this.successMessage.set('');
      }
    };

    reader.onerror = () => {
      this.errorMessage.set("Impossible de lire l'image sélectionnée.");
    };

    reader.readAsDataURL(file);
    input.value = '';
  }

  removePhoto(): void {
    this.previewPhoto.set('');
    this.successMessage.set('');
  }

  async saveProfile(): Promise<void> {
    this.profileForm.markAllAsTouched();
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.profileForm.invalid) {
      this.errorMessage.set('Vérifiez les champs obligatoires et les longueurs maximales.');
      return;
    }

    const value = this.profileForm.getRawValue();
    const payload: UpdateProfilePayload = {
      displayName: value.displayName,
      location: value.location,
      profileTitle: value.profileTitle,
      availabilityLabel: value.availabilityLabel,
      bio: value.bio,
      skills: this.splitTags(value.skills),
      lookingFor: this.splitTags(value.lookingFor),
      githubUrl: this.normalizeUrl(value.githubUrl),
      linkedinUrl: this.normalizeUrl(value.linkedinUrl),
      websiteUrl: this.normalizeUrl(value.websiteUrl),
      photoURL: this.previewPhoto(),
    };

    this.isSaving.set(true);

    try {
      const result = await this.auth.updateProfile(payload);

      if (!result.success) {
        this.errorMessage.set(result.message ?? 'Impossible de sauvegarder le profil.');
        return;
      }

      this.successMessage.set('Profil mis à jour. Vous pouvez ouvrir votre profil pour vérifier le rendu.');
    } finally {
      this.isSaving.set(false);
    }
  }

  private splitTags(value: string): string[] {
    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean)
      .slice(0, 12);
  }

  private normalizeUrl(value: string): string {
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      return '';
    }

    if (/^https?:\/\//i.test(trimmedValue)) {
      return trimmedValue;
    }

    return `https://${trimmedValue}`;
  }
}
