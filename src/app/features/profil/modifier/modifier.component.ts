import { NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, NgZone, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService, UpdateProfilePayload } from '../../../core/services/auth.service';
import { ProjectService } from '../../../core/services/project.service';
import { ProjectAccessRequest, ProjectAccessService } from '../../../core/services/project-access.service';
import { downloadTextFile, ndaProofDocument } from '../../../core/legal/nda';
import { ProjectAccessStatus } from '../../../core/models/supabase-database.model';
import { INVESTMENT_OPTIONS, InvestmentReadiness, MIN_PRESENTATION_LENGTH, PRO_CATEGORY_LABELS, ProCategory, hasUsage, isProjectPresented, profileTabsFor, usagesOf } from '../../../core/models/user.model';
import { isEnabled } from '../../../core/config/features';
import { TagInputComponent } from '../../../shared/components/tag-input/tag-input.component';
import { ProfileVerificationCardComponent } from '../../../shared/components/profile-verification-card/profile-verification-card.component';

@Component({
  selector: 'app-modifier-profil',
  standalone: true,
  imports: [NgClass, ReactiveFormsModule, RouterLink, ProfileVerificationCardComponent, TagInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Champ invalide après une tentative d'enregistrement : bordure rouge.
  styles: [`
    input.ng-invalid.ng-touched,
    textarea.ng-invalid.ng-touched,
    select.ng-invalid.ng-touched {
      border-color: var(--destructive);
    }
  `],
  template: `
    <div class="min-h-screen bg-secondary px-4 pb-14 pt-20 sm:px-6 sm:pt-24 lg:px-8">
      <div class="mx-auto w-full max-w-6xl">
        <div class="mb-5 sm:mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <a
              [routerLink]="profileLink()"
              class="mb-4 hidden items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-accent sm:inline-flex"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
              Retour au profil
            </a>
            <h1 class="flex items-center justify-between gap-3 text-2xl font-semibold text-primary sm:text-4xl">{{ heading().title }}
              @if (mode === 'projet') {
                <span class="inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold sm:hidden" [class]="isProjectPublished() ? 'bg-emerald-50 text-emerald-800' : 'bg-white text-muted-foreground ring-1 ring-border'"><span class="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true"></span>{{ isProjectPublished() ? 'Publié' : 'Brouillon' }}</span>
              }
            </h1>
            <p class="mt-2 hidden max-w-2xl text-sm leading-relaxed text-muted-foreground sm:block sm:text-base">{{ heading().subtitle }}</p>
            @if (associatesEnabled && !isPro()) {
              <!-- Une même rubrique « Mon profil » : seuls les onglets qui concernent le membre (objectif choisi ou contenu
                   déjà commencé, voir profileTabsFor) ; l'onglet de la page ouverte reste affiché (accès direct). -->
              @if (visibleTabs().length > 1) {
              <nav class="mt-3 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:none] sm:mt-5 [&::-webkit-scrollbar]:hidden" aria-label="Mon profil">
                @for (item of visibleTabs(); track item.path) {
                  <a [routerLink]="item.path" [attr.aria-current]="mode === item.mode ? 'page' : null"
                     class="-mb-px flex-1 whitespace-nowrap border-b-2 px-2 py-2.5 text-center text-sm font-semibold transition-colors sm:flex-none sm:px-4"
                     [class]="mode === item.mode ? 'border-accent text-primary' : 'border-transparent text-muted-foreground hover:text-primary'"><span class="sm:hidden">{{ item.short }}</span><span class="hidden sm:inline">{{ item.label }}</span></a>
                }
              </nav>
              }
              @if (discoverActions().length) {
                <!-- Usage pas encore choisi : un accès discret au formulaire, qui ne rend rien public. -->
                <p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span class="text-muted-foreground">Autre usage :</span>
                  @for (action of discoverActions(); track action.path) {
                    <a [routerLink]="action.path" class="font-semibold text-accent hover:underline">{{ action.label }}&nbsp;<span aria-hidden="true">→</span></a>
                  }
                </p>
              }
            }
          </div>

          @if (mode === 'profil') {

          <div class="rounded-2xl border border-border bg-white px-5 py-4">
            <div class="text-sm font-semibold text-muted-foreground">Complétion actuelle</div>
            <div class="mt-1 text-2xl font-semibold text-accent">{{ currentUser()?.profileComplete ?? 0 }}%</div>
          </div>
          }
        </div>

        @if (mode === 'profil') {

        <div class="mb-6 rounded-lg bg-white shadow-lg ring-1 ring-border p-5 sm:p-6">
          <h2 class="text-2xl text-primary">Un profil complet inspire plus vite confiance</h2>
          <p class="mt-2 max-w-2xl text-base leading-relaxed text-muted-foreground">
            Ajoutez une photo nette, une bio concrète et quelques liens utiles. L'objectif n'est pas de faire long, mais de donner assez de signaux pour déclencher une conversation qualifiée
          </p>
        </div>
        }

        @if (returnTo) {
          <!-- Arrivé depuis « Finalisez d'abord… » : on garde la personne à qui écrire en vue -->
          <div class="mx-auto mb-6 flex max-w-3xl flex-col gap-3 rounded-2xl border px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
               [class]="returnReady() ? 'border-green-200 bg-green-50' : 'border-accent/20 bg-accent/5'" role="status">
            <p class="text-sm font-medium" [class]="returnReady() ? 'text-green-800' : 'text-primary'">
              @if (returnReady()) {
                C’est prêt : vous pouvez écrire {{ returnName ? 'à ' + returnName : 'à ce membre' }}
              } @else {
                {{ mode === 'projet' ? 'Présentez votre projet' : 'Complétez votre profil d’associé' }} pour écrire {{ returnName ? 'à ' + returnName : 'à ce membre' }}, puis enregistrez{{ mode === 'projet' ? ' (le brouillon suffit)' : '' }}
              }
            </p>
            <div class="flex flex-shrink-0 flex-wrap items-center gap-3">
              @if (returnReady()) {
                <button type="button" (click)="goWrite()" class="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">Écrire {{ returnName ? 'à ' + returnName : 'maintenant' }}</button>
              }
              <button type="button" (click)="goBack()" class="text-sm font-semibold text-accent hover:underline">{{ returnIsConversation ? 'Revenir à la conversation' : 'Revenir à son profil' }}</button>
            </div>
          </div>
        }

        <div class="grid gap-6" [class]="mode === 'profil' ? 'xl:grid-cols-[340px_minmax(0,1fr)]' : 'mx-auto max-w-3xl'">
          @if (mode === 'profil') {
          <aside class="self-start rounded-3xl bg-white shadow-lg ring-1 ring-border p-6">
            <div class="text-center">
              <div class="mx-auto mb-4 h-32 w-32 overflow-hidden rounded-3xl border border-border bg-primary">
                @if (previewPhoto()) {
                  <img [src]="previewPhoto()" alt="Aperçu de la photo de profil" class="h-full w-full object-cover">
                } @else {
                  <div class="flex h-full w-full items-center justify-center text-4xl font-semibold text-white">
                    {{ initials() }}
                  </div>
                }
              </div>

              <input id="profile-photo-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="sr-only" (change)="onPhotoSelected($event)">

              <label
                for="profile-photo-input"
                class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-primary/90"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                Modifier la photo
              </label>

              @if (previewPhoto()) {
                <button
                  type="button"
                  (click)="removePhoto()"
                  class="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:border-destructive hover:text-destructive"
                >
                  Supprimer la photo
                </button>
              }

              @if (photoMessage()) {
                <div class="mt-3 rounded-xl border border-accent/15 bg-accent/5 px-3 py-2 text-sm font-semibold text-accent">
                  {{ photoMessage() }}
                </div>
              }

              @if (photoErrorMessage()) {
                <div class="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm font-semibold text-destructive">
                  {{ photoErrorMessage() }}
                </div>
              }
            </div>

          </aside>
          }

          <section class="rounded-3xl bg-white shadow-lg ring-1 ring-border p-6 sm:p-8">
            <div [formGroup]="profileForm" class="space-y-8">
              @if (mode === 'associe') {
                <!-- Photo : la même que sur le profil général. -->
                <div class="flex items-center gap-5">
                  <div class="h-24 w-24 flex-shrink-0 overflow-hidden rounded-2xl bg-primary text-2xl font-semibold text-white">
                    @if (previewPhoto()) {
                      <img [src]="previewPhoto()" alt="Votre photo" class="h-full w-full object-cover">
                    } @else {
                      <span class="flex h-full w-full items-center justify-center">{{ initials() }}</span>
                    }
                  </div>
                  <div>
                    <label for="associate-photo-input" class="cursor-pointer font-semibold text-accent hover:underline">{{ previewPhoto() ? 'Modifier la photo' : 'Ajouter une photo' }}</label>
                    <input id="associate-photo-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="sr-only" (change)="onPhotoSelected($event)">
                    <p class="mt-1 text-sm text-muted-foreground">JPG, PNG ou WebP, 5 Mo au plus</p>
                    @if (photoMessage()) { <p class="mt-1 text-sm text-emerald-700">{{ photoMessage() }}</p> }
                    @if (photoErrorMessage()) { <p class="mt-1 text-sm text-destructive">{{ photoErrorMessage() }}</p> }
                  </div>
                </div>
              }
              @if (mode !== 'projet') {
              <div>
                <h2 class="text-xl font-semibold text-primary">{{ mode === 'associe' ? 'Ce que vous proposez' : 'Informations principales' }}</h2>
                <p class="mt-1 text-sm text-muted-foreground">{{ mode === 'associe' ? 'Ce que les porteurs de projet voient en premier' : 'Ce sont les premières informations vues sur votre profil' }}</p>

                <div class="mt-5 grid gap-5 md:grid-cols-2">
                  @if (mode === 'profil') {
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
                  }

                  <div>
                    <label for="profile-title" class="mb-2 block text-sm font-semibold">{{ mode === 'associe' ? 'Intitulé' : 'Titre du profil' }}</label>
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
                <label for="profile-bio" class="mb-2 block text-sm font-semibold">{{ mode === 'associe' ? 'Présentation' : 'Bio' }}</label>
                <textarea
                  id="profile-bio"
                  formControlName="bio"
                  rows="6"
                  maxlength="700"
                  class="w-full resize-none rounded-xl border border-border bg-secondary px-4 py-3 outline-none transition-colors focus:border-accent"
                  placeholder="Présentez votre parcours, ce que vous construisez ou ce que vous pouvez apporter à un projet..."
                ></textarea>
                <div class="mt-2 flex items-center justify-between text-sm text-muted-foreground">
                  <span>Un texte court, concret et humain fonctionne mieux qu'un CV complet</span>
                  <span>{{ profileForm.controls.bio.getRawValue().length }}/700</span>
                </div>
              </div>

              <div class="grid gap-5 md:grid-cols-2">
                <div>
                  <label for="profile-skills" class="mb-2 block text-sm font-semibold">Compétences</label>
                  <app-tag-input inputId="profile-skills" formControlName="skills" placeholder="Angular, vente B2B, finance…" />
                  <p class="mt-2 text-sm text-muted-foreground">Appuyez sur Entrée ou tapez une virgule pour ajouter</p>
                </div>

                <div>
                  <label for="profile-looking" class="mb-2 block text-sm font-semibold">Ce que vous recherchez</label>
                  <app-tag-input inputId="profile-looking" formControlName="lookingFor" placeholder="Co-fondateur technique, projet SaaS…" />
                  <p class="mt-2 text-sm text-muted-foreground">Ces tags aident à comprendre rapidement votre objectif</p>
                </div>
              </div>
              }

              @if (mode === 'associe') {
                <!-- Profil complété : pour écrire aux porteurs (même sans être visible). Visible : choix explicite (set_associate_offer).
                     Vitrine : option en plus, seulement si le profil est visible (2026-11-17-visibilite-contact.sql). -->
                <div class="rounded-2xl border border-border p-5 sm:p-6" aria-labelledby="associate-complete-title">
                  <h2 id="associate-complete-title" class="font-semibold text-primary">Profil complété {{ associateChecklistDone() ? '✓' : '' }}</h2>
                  <p class="mt-1 text-sm text-muted-foreground">Nécessaire pour écrire aux porteurs de projet et pour apparaître dans la recherche</p>
                  <ul class="mt-3 space-y-1 text-sm">
                    @for (item of associateChecklist(); track item.label) {
                      <li class="flex items-center gap-2" [class]="item.done ? 'text-emerald-700' : 'text-muted-foreground'">
                        <span aria-hidden="true">{{ item.done ? '✓' : '○' }}</span>{{ item.label }}<span class="sr-only">{{ item.done ? ' : fait' : ' : à compléter' }}</span>
                      </li>
                    }
                  </ul>
                </div>

                <!-- Apport : miroir de « projet ouvert à un apport », sans montant (2026-11-25-apport-associe.sql). -->
                <fieldset class="rounded-2xl border border-border p-5 sm:p-6">
                  <legend class="px-1 font-semibold text-primary">Êtes-vous prêt à entrer au capital avec un apport ?</legend>
                  <p class="text-sm text-muted-foreground">Facultatif et sans montant : il se discute avec le porteur. Visible des membres, jamais sur la vitrine publique</p>
                  <div class="mt-3 grid gap-2 sm:grid-cols-2">
                    @for (option of investmentOptions; track option.value) {
                      <label class="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
                             [class]="investment() === option.value ? 'border-accent bg-accent/5 text-primary' : 'border-border hover:border-accent/40'">
                        <input type="radio" name="investment" class="h-4 w-4 accent-accent" [checked]="investment() === option.value" (change)="investment.set(option.value)">
                        {{ option.label }}
                      </label>
                    }
                    <label class="flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium transition-colors"
                           [class]="investment() === null ? 'border-accent bg-accent/5 text-primary' : 'border-border hover:border-accent/40'">
                      <input type="radio" name="investment" class="h-4 w-4 accent-accent" [checked]="investment() === null" (change)="investment.set(null)">
                      Je préfère ne pas le préciser
                    </label>
                  </div>
                </fieldset>

                <div class="rounded-2xl border border-accent/20 bg-accent/[0.035] p-5 sm:p-6">
                  <label for="associate-offer" class="flex cursor-pointer items-start gap-3">
                    <input id="associate-offer" type="checkbox" class="mt-1 h-4 w-4 accent-accent" [checked]="associateOffer()" (change)="setAssociateOfferDraft($any($event.target).checked)" aria-describedby="associate-offer-help">
                    <span>
                      <span class="block font-semibold text-primary">Rendre mon profil visible</span>
                      <span id="associate-offer-help" class="mt-1 block text-sm leading-relaxed text-muted-foreground">
                        Les membres de GoFounders pourront voir votre profil dans la recherche et les recommandations, et vous écrire.
                        Sans cette case, vous pouvez quand même écrire aux porteurs de projet : seuls ceux à qui vous écrivez voient votre profil
                      </span>
                    </span>
                  </label>
                  <label for="associate-vitrine" class="mt-4 flex items-start gap-3 border-t border-accent/15 pt-4" [class]="associateOffer() ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'">
                    <input id="associate-vitrine" type="checkbox" class="mt-1 h-4 w-4 accent-accent" [checked]="associateOffer() && associateVitrine()" [disabled]="!associateOffer()" (change)="associateVitrine.set($any($event.target).checked)" aria-describedby="associate-vitrine-help">
                    <span>
                      <span class="block font-semibold text-primary">Autoriser un aperçu anonyme sur la vitrine publique</span>
                      <span id="associate-vitrine-help" class="mt-1 block text-sm leading-relaxed text-muted-foreground">
                        Les visiteurs de la page <a routerLink="/associes" class="relative z-10 font-semibold text-accent hover:underline">Trouver un associé</a> voient votre intitulé,
                        vos compétences et votre disponibilité, jamais votre nom, votre photo ni votre ville{{ associateOffer() ? '' : '. Disponible quand votre profil est visible' }}
                      </span>
                    </span>
                  </label>
                </div>
              }

              @if (mode === 'profil' && !isPro() && associatesEnabled && (tabFlags().projet || tabFlags().associe)) {
                <!-- Mêmes règles que les onglets : seulement les rubriques qui concernent le membre. -->
                <div class="grid gap-3" [ngClass]="tabFlags().projet && tabFlags().associe ? 'sm:grid-cols-2' : ''">
                  @if (tabFlags().projet) {
                    <a routerLink="/mon-projet" class="group rounded-2xl border border-border p-4 transition-colors hover:border-accent">
                      <span class="block font-semibold text-primary group-hover:text-accent">Mon projet&nbsp;<span aria-hidden="true">→</span></span>
                      <span class="mt-1 block text-sm text-muted-foreground">Présenter votre projet et trouver des associés</span>
                    </a>
                  }
                  @if (tabFlags().associe) {
                    <a routerLink="/profil/associe" class="group rounded-2xl border border-border p-4 transition-colors hover:border-accent">
                      <span class="block font-semibold text-primary group-hover:text-accent">Mon profil d'associé&nbsp;<span aria-hidden="true">→</span></span>
                      <span class="mt-1 block text-sm text-muted-foreground">Proposer vos compétences aux porteurs de projet</span>
                    </a>
                  }
                </div>
              }

              @if (mode === 'profil' && isPro()) {
                <div class="rounded-2xl border border-accent/20 bg-accent/[0.035] p-5 sm:p-6">
                  <h2 class="text-xl font-semibold text-primary">Votre fiche professionnelle</h2>
                  <p class="mt-1 text-sm text-muted-foreground">
                    Votre métier, votre intitulé, votre localisation, votre présentation et votre site apparaissent dans l'annuaire
                    quand votre fiche est active
                  </p>
                  <label for="pro-category" class="mb-2 mt-4 block text-sm font-semibold">Métier</label>
                  <select id="pro-category" [value]="proCategory()" (change)="proCategory.set($any($event.target).value)" class="w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-accent sm:max-w-sm">
                    <option value="">Non renseigné</option>
                    @for (category of proCategories; track category.value) {
                      <option [value]="category.value">{{ category.label }}</option>
                    }
                  </select>
                  <a routerLink="/tarifs" fragment="pros" class="mt-3 block text-sm font-semibold text-accent hover:underline">Gérer ma fiche annuaire</a>
                </div>
              }

              @if (mode === 'profil' && isMaRole()) {
                <div class="rounded-2xl border border-[#D97706]/30 bg-[#D97706]/[0.04] p-5 sm:p-6" [formGroup]="maForm">
                  <div class="text-sm font-semibold text-amber-700">Marketplace M&A</div>
                  <h2 class="mt-1 text-xl font-semibold text-primary">{{ maLabels().title }}</h2>
                  <p class="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{{ maLabels().description }}</p>

                  <div class="mt-6 grid gap-5 md:grid-cols-2">
                    <div>
                      <label for="ma-sector" class="mb-2 block text-sm font-semibold">{{ maLabels().sector }}</label>
                      <input
                        id="ma-sector"
                        type="text"
                        formControlName="sector"
                        class="w-full rounded-xl border border-border bg-white px-4 py-3 outline-none transition-colors focus:border-accent"
                        placeholder="SaaS, commerce, services B2B..."
                      >
                    </div>

                    <div>
                      <label for="ma-budget" class="mb-2 block text-sm font-semibold">{{ maLabels().budget }}</label>
                      <input
                        id="ma-budget"
                        type="text"
                        formControlName="budget"
                        class="w-full rounded-xl border border-border bg-white px-4 py-3 outline-none transition-colors focus:border-accent"
                        [placeholder]="maLabels().budgetPlaceholder"
                      >
                    </div>

                    <div class="md:col-span-2">
                      <label for="ma-region" class="mb-2 block text-sm font-semibold">{{ maLabels().region }}</label>
                      <input
                        id="ma-region"
                        type="text"
                        formControlName="region"
                        class="w-full rounded-xl border border-border bg-white px-4 py-3 outline-none transition-colors focus:border-accent"
                        placeholder="Toute la France, Île-de-France, Auvergne-Rhône-Alpes..."
                      >
                    </div>
                  </div>
                </div>
              }

              @if (mode === 'projet') {
                <div class="rounded-2xl border border-accent/20 bg-accent/[0.035] p-5 sm:p-6" [formGroup]="projectForm">
                  <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div class="text-sm font-semibold text-accent">{{ isProjectPublished() ? 'Publié : visible des membres' : 'Brouillon : non visible dans la recherche' }}</div>
                      <h2 class="mt-1 text-xl font-semibold text-primary">Présentation du projet</h2>
                      <p class="mt-1 hidden max-w-2xl text-sm leading-relaxed text-muted-foreground sm:block">
                        Un titre, une présentation d'au moins 50 caractères et une compétence recherchée suffisent pour écrire aux associés,
                        même en brouillon. Publié, votre projet apparaît dans la recherche et les recommandations
                      </p>
                      <p class="mt-3 flex max-w-2xl items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-relaxed text-foreground/80">
                        <svg class="mt-0.5 flex-shrink-0 text-emerald-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        <span>
                          <strong>Votre idée reste protégée</strong> En brouillon, seuls les associés à qui vous écrivez lisent sa présentation.
                          Les détails sensibles vont dans la partie confidentielle : vous choisissez qui y accède, et pouvez exiger un engagement de confidentialité (NDA)
                        </span>
                      </p>
                    </div>

                    <span class="hidden flex-shrink-0 items-center rounded-full px-3 py-1 text-sm font-semibold sm:inline-flex"
                          [class]="isProjectPublished() ? 'bg-emerald-50 text-emerald-800' : 'bg-secondary text-muted-foreground'">
                      {{ isProjectPublished() ? 'Publié' : 'Brouillon' }}
                    </span>
                  </div>

                  @if (isProjectLoading()) {
                    <div class="mt-5 rounded-xl border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
                      Chargement de votre annonce...
                    </div>
                  } @else {
                    <div class="mt-6 grid gap-5 md:grid-cols-2">
                      <div>
                        <label for="project-name" class="mb-2 block text-sm font-semibold">Nom du projet</label>
                        <input
                          id="project-name"
                          type="text"
                          formControlName="name"
                          class="w-full rounded-xl border border-border bg-white px-4 py-3 outline-none transition-colors focus:border-accent"
                          placeholder="Nom de votre projet"
                        >
                      </div>

                      <div>
                        <label for="project-sector" class="mb-2 block text-sm font-semibold">Secteur</label>
                        <input
                          id="project-sector"
                          type="text"
                          formControlName="sector"
                          class="w-full rounded-xl border border-border bg-white px-4 py-3 outline-none transition-colors focus:border-accent"
                          placeholder="SaaS, santé, commerce..."
                        >
                      </div>

                      <div>
                        <label for="project-stage" class="mb-2 block text-sm font-semibold">Stade du projet</label>
                        <select
                          id="project-stage"
                          formControlName="stage"
                          class="w-full rounded-xl border border-border bg-white px-4 py-3 outline-none transition-colors focus:border-accent"
                        >
                          @for (stage of projectStages; track stage.value) {
                            <option [value]="stage.value">{{ stage.label }}</option>
                          }
                        </select>
                      </div>

                      <div>
                        <label for="project-location" class="mb-2 block text-sm font-semibold">Localisation du projet</label>
                        <input
                          id="project-location"
                          type="text"
                          formControlName="location"
                          class="w-full rounded-xl border border-border bg-white px-4 py-3 outline-none transition-colors focus:border-accent"
                          placeholder="Paris, France ou à distance"
                        >
                      </div>

                      <div class="md:col-span-2">
                        <label for="project-description" class="mb-2 block text-sm font-semibold">
                          Présentation du projet
                          <span class="font-normal text-muted-foreground">(au moins 50 caractères pour publier ou écrire à un associé)</span>
                        </label>
                        <textarea
                          id="project-description"
                          formControlName="description"
                          rows="5"
                          maxlength="900"
                          class="w-full resize-none rounded-xl border border-border bg-white px-4 py-3 outline-none transition-colors focus:border-accent"
                          placeholder="Présentez le problème, votre solution et l'avancement du projet."
                        ></textarea>
                        <div class="mt-2 text-right text-sm text-muted-foreground">{{ projectForm.controls.description.getRawValue().length }}/900</div>
                      </div>

                      <div>
                        <label for="project-looking-for" class="mb-2 block text-sm font-semibold">Profils recherchés</label>
                        <app-tag-input inputId="project-looking-for" formControlName="lookingFor" placeholder="CTO, commercial, développeur…" />
                        <p class="mt-2 text-sm text-muted-foreground">Appuyez sur Entrée ou tapez une virgule pour ajouter</p>
                      </div>

                      <div>
                        <label for="project-skills" class="mb-2 block text-sm font-semibold">Compétences recherchées <span class="font-normal text-muted-foreground">(au moins une)</span></label>
                        <app-tag-input inputId="project-skills" formControlName="skillsNeeded" placeholder="Angular, UX/UI, vente B2B…" />
                        <p class="mt-2 text-sm text-muted-foreground">Appuyez sur Entrée ou tapez une virgule pour ajouter</p>
                      </div>

                      <div class="md:col-span-2">
                        <label for="project-vitrine" class="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white px-4 py-3">
                          <input id="project-vitrine" type="checkbox" formControlName="publicListing" class="mt-1 h-4 w-4 accent-accent" aria-describedby="project-vitrine-help">
                          <span>
                            <span class="block font-semibold text-primary">Autoriser un aperçu anonyme sur la vitrine publique</span>
                            <span id="project-vitrine-help" class="mt-1 block text-sm leading-relaxed text-muted-foreground">
                              Les visiteurs voient le secteur, le stade et les profils recherchés, jamais votre nom, celui du projet ni sa présentation{{ isProjectPublished() ? '' : '. S’applique une fois le projet publié' }}
                            </span>
                          </span>
                        </label>
                      </div>

                      <div class="md:col-span-2">
                        <label for="project-open-to-equity" class="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-white px-4 py-3">
                          <input
                            id="project-open-to-equity"
                            type="checkbox"
                            formControlName="openToEquity"
                            aria-describedby="project-open-to-equity-help"
                            class="mt-0.5 h-4 w-4 flex-shrink-0 accent-accent"
                          >
                          <span>
                            <span class="block text-sm font-semibold">Ouvert à un associé avec apport financier</span>
                            <span id="project-open-to-equity-help" class="mt-1 block text-sm leading-relaxed text-muted-foreground">
                              Les associés verront que vous acceptez que l'un d'eux entre au capital en apportant aussi de l'argent.
                              N'indiquez ni montant ni pourcentage dans votre annonce : les conditions se discutent en privé, avec l'aide d'un professionnel.
                              GoFounders ne propose pas d'investissement.
                            </span>
                          </span>
                        </label>
                      </div>

                      <div class="md:col-span-2 rounded-2xl border border-primary/15 bg-white p-4 sm:p-5">
                        <button type="button" (click)="confidentialOpen.set(!confidentialOpen())" [attr.aria-expanded]="confidentialOpen()" class="flex w-full items-center gap-2 text-left sm:pointer-events-none">
                          <svg class="text-primary" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <rect x="3" y="11" width="18" height="11" rx="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
                          <h3 class="flex-1 text-base font-semibold text-primary">Partie confidentielle</h3>
                          <svg class="transition-transform sm:hidden" [class.rotate-180]="confidentialOpen()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                        </button>
                        <!-- Téléphones : repliée par défaut. -->
                        <div [ngClass]="confidentialOpen() ? '' : 'max-sm:hidden'">
                        <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
                          Invisible dans la recherche. Un associé doit vous demander l'accès, et vous acceptez ou refusez chaque demande
                        </p>

                        <div class="mt-4 rounded-xl bg-secondary/70 px-4 py-3 text-sm leading-relaxed text-foreground/80">
                          <div class="mb-1 font-semibold text-foreground">Ce qu'il vaut mieux réserver à cette partie (ou au premier rendez-vous)</div>
                          <ul class="list-disc space-y-0.5 pl-4">
                            <li>le fonctionnement détaillé du produit, l'algorithme, le code ;</li>
                            <li>les noms de clients, partenaires et pilotes, et les prix négociés ;</li>
                            <li>les chiffres financiers et la stratégie de lancement</li>
                          </ul>
                          <div class="mt-1">Dans la partie publique, décrivez le problème, le stade du projet et les profils recherchés.</div>
                        </div>

                        <label for="project-confidential" class="mb-2 mt-4 block text-sm font-semibold">
                          Détails confidentiels <span class="font-normal text-muted-foreground">(facultatif)</span>
                        </label>
                        <textarea
                          id="project-confidential"
                          formControlName="confidentialDetails"
                          rows="5"
                          maxlength="3000"
                          class="w-full resize-y rounded-xl border border-border bg-white px-4 py-3 outline-none transition-colors focus:border-accent"
                          placeholder="Ce que seuls les associés que vous acceptez pourront lire."
                        ></textarea>
                        <div class="mt-2 text-right text-sm text-muted-foreground">{{ projectForm.controls.confidentialDetails.getRawValue().length }}/3000</div>

                        <label for="project-nda-required" class="mt-3 flex cursor-pointer items-start gap-3 rounded-xl border border-primary/20 bg-primary/[0.03] px-4 py-3">
                          <input
                            id="project-nda-required"
                            type="checkbox"
                            formControlName="ndaRequired"
                            aria-describedby="project-nda-required-help"
                            class="mt-0.5 h-4 w-4 flex-shrink-0 accent-accent"
                          >
                          <span>
                            <span class="flex flex-wrap items-center gap-2 text-sm font-semibold">
                              Exiger un engagement de confidentialité (NDA)
                              <span class="rounded-full bg-primary px-2 py-0.5 text-sm font-semibold text-white">Recommandé</span>
                            </span>
                            <span id="project-nda-required-help" class="mt-1 block text-sm leading-relaxed text-muted-foreground">
                              Avant de vous envoyer sa demande, l'associé doit accepter un engagement de confidentialité type. GoFounders conserve la preuve
                              (nom, date, version du texte) et vous pouvez la télécharger. GoFounders n'assure pas de conseil juridique : pour un accord sur mesure,
                              faites appel à nos experts juridiques partenaires.
                            </span>
                          </span>
                        </label>
                        </div>
                      </div>
                    </div>
                  }
                </div>

                @if (projectId()) {
                  <div id="demandes-acces" class="rounded-2xl bg-white shadow-lg ring-1 ring-border p-5 sm:p-6">
                    <h2 class="text-xl font-semibold text-primary">Demandes d'accès à la partie confidentielle</h2>
                    <p class="mt-1 text-sm text-muted-foreground">Acceptez les associés avec qui vous voulez aller plus loin. Vous pouvez retirer un accès à tout moment</p>

                    @if (accessRequests().length === 0) {
                      <p class="mt-4 rounded-xl bg-secondary/60 px-4 py-3 text-sm text-muted-foreground">Aucune demande pour l'instant</p>
                    } @else {
                      <ul class="mt-4 divide-y divide-border">
                        @for (request of accessRequests(); track request.id) {
                          <li class="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                            <div class="min-w-0">
                              <div class="flex flex-wrap items-center gap-2">
                                <span class="font-semibold">{{ request.requesterName }}</span>
                                <span class="rounded-full px-2.5 py-0.5 text-sm font-semibold" [ngClass]="accessStatusClass(request.status)">{{ accessStatusLabel(request.status) }}</span>
                              </div>
                              <div class="mt-1 text-sm text-muted-foreground">
                                Demande du {{ formatDate(request.createdAt) }}
                                @if (request.ndaAcceptedAt) {
                                  · NDA accepté le {{ formatDate(request.ndaAcceptedAt) }} (version {{ request.ndaVersion }})
                                } @else {
                                  · Sans NDA
                                }
                              </div>
                            </div>
                            <div class="flex flex-wrap gap-2">
                              @if (request.ndaAcceptedAt) {
                                <button type="button" (click)="downloadNdaProof(request)" class="rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors hover:border-accent">
                                  Télécharger la preuve
                                </button>
                              }
                              @if (request.status !== 'approved') {
                                <button type="button" (click)="decideAccess(request, true)" class="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90">
                                  Accepter
                                </button>
                              }
                              @if (request.status === 'pending') {
                                <button type="button" (click)="decideAccess(request, false)" class="rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors hover:border-destructive hover:text-destructive">
                                  Refuser
                                </button>
                              }
                              @if (request.status === 'approved') {
                                <button type="button" (click)="decideAccess(request, false)" class="rounded-lg border border-border px-3 py-2 text-sm font-semibold transition-colors hover:border-destructive hover:text-destructive">
                                  Retirer l'accès
                                </button>
                              }
                            </div>
                          </li>
                        }
                      </ul>
                    }
                  </div>
                }
              }

              @if (mode === 'profil') {
              <div>
                <h2 class="text-xl font-semibold text-primary">Liens professionnels</h2>
                <p class="mt-1 text-sm text-muted-foreground">Ajoutez seulement les liens utiles pour inspirer confiance</p>

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
              }

              @if (errorMessage()) {
                <div class="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive" role="alert">
                  {{ errorMessage() }}
                </div>
              }

              @if (successMessage()) {
                <div class="flex flex-col gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 sm:flex-row sm:items-center sm:justify-between">
                  <span>{{ successMessage() }}</span>
                  @if (returnReady()) {
                    <button type="button" (click)="goWrite()" class="flex-shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">Écrire {{ returnName ? 'à ' + returnName : 'maintenant' }}</button>
                  }
                </div>
              }

              <!-- Téléphones : les deux boutons d'enregistrement côte à côte. -->
              <div class="grid grid-cols-2 gap-3 border-t border-border pt-6 sm:flex sm:items-center sm:justify-between">
                <a
                  [routerLink]="profileLink()"
                  class="inline-flex items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold transition-colors hover:border-accent hover:text-accent"
                  [ngClass]="mode === 'projet' ? 'max-sm:order-3 max-sm:col-span-2' : 'max-sm:order-2'"
                >
                  Voir mon profil
                </a>

                @if (mode === 'projet') {
                  <div class="contents sm:flex sm:flex-row sm:gap-3">
                    <button type="button" (click)="saveProjectAs(false)" [disabled]="isSaving()"
                            class="inline-flex items-center justify-center rounded-xl border border-primary px-6 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white disabled:opacity-60">
                      {{ isProjectPublished() ? 'Repasser en brouillon' : 'Enregistrer le brouillon' }}
                    </button>
                    <button type="button" (click)="saveProjectAs(true)" [disabled]="isSaving()"
                            class="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-60">
                      {{ isSaving() ? 'Enregistrement...' : isProjectPublished() ? 'Enregistrer et garder publié' : 'Publier mon projet' }}
                    </button>
                  </div>
                } @else {
                <button
                  type="button"
                  (click)="saveProfile()"
                  [disabled]="isSaving()"
                  [ngClass]="isSaving() ? 'cursor-wait opacity-70' : ''"
                  class="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 max-sm:order-1"
                >
                  @if (isSaving()) {
                    Enregistrement...
                  } @else {
                    {{ heading().save }}
                  }
                </button>
                }
              </div>
            </div>
          </section>

          @if (mode === 'profil') {
            <app-profile-verification-card class="block xl:col-start-2" />
          }
        </div>
      </div>
    </div>
  `
})
export class ModifierComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly projects = inject(ProjectService);
  private readonly projectAccess = inject(ProjectAccessService);
  readonly accessRequests = signal<ProjectAccessRequest[]>([]);
  private readonly zone = inject(NgZone);

  readonly currentUser = this.auth.currentUser;
  readonly initials = this.auth.initials;
  readonly previewPhoto = signal(this.currentUser()?.photoURL ?? '');
  readonly photoMessage = signal('');
  readonly photoErrorMessage = signal('');
  readonly isSaving = signal(false);
  readonly isProjectLoading = signal(false);
  readonly projectId = signal<string | null>(null);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');
  // Trois pages, un même formulaire : le profil général (/profil/modifier), « Mon projet » (/mon-projet) et
  // « Mon profil d'associé » (/profil/associe). Chaque bouton mène à sa vraie destination.
  readonly associatesEnabled = isEnabled('associates');
  readonly profileTabs = [
    { path: '/profil/modifier', mode: 'profil', label: 'Profil général', short: 'Général' },
    { path: '/profil/associe', mode: 'associe', label: 'Profil d’associé', short: 'Associé' },
    { path: '/mon-projet', mode: 'projet', label: 'Mon projet', short: 'Projet' },
  ] as const;

  // Onglets selon les objectifs et les contenus déjà créés (profileTabsFor). Un projet existant, même en brouillon,
  // garde l'onglet « Mon projet » ; il est cherché pour toutes les pages de la rubrique.
  readonly ownsProject = signal(false);
  readonly tabFlags = computed(() => profileTabsFor(this.currentUser(), this.ownsProject()));
  readonly visibleTabs = computed(() => {
    const flags = this.tabFlags();
    return this.profileTabs.filter(item => item.mode === 'profil' || item.mode === this.mode || flags[item.mode]);
  });
  readonly discoverActions = computed(() => {
    const shown = new Set<string>(this.visibleTabs().map(item => item.mode));
    return [
      ...(shown.has('associe') ? [] : [{ path: '/profil/associe', label: 'Créer mon profil d’associé' }]),
      ...(shown.has('projet') ? [] : [{ path: '/mon-projet', label: 'Présenter mon projet' }]),
    ];
  });
  // Onglet de la page ouverte devenu masqué (objectif retiré, aucun contenu) : retour sur « Profil général ».
  private tabWasShown = false;
  private readonly hiddenTabEffect = effect(() => {
    if (this.mode === 'profil' || this.isPro()) {
      return;
    }
    const shown = this.tabFlags()[this.mode];
    if (shown) {
      this.tabWasShown = true;
    } else if (this.tabWasShown) {
      void this.router.navigateByUrl('/profil/modifier');
    }
  });

  // « Enregistrer le brouillon » / « Publier mon projet » : le statut suit le bouton choisi.
  async saveProjectAs(publish: boolean): Promise<void> {
    this.projectForm.controls.isActive.setValue(publish);
    await this.saveProfile();
  }
  readonly mode: 'profil' | 'projet' | 'associe' = inject(ActivatedRoute).snapshot.data['mode'] ?? 'profil';

  // Retour vers la personne à qui l'on voulait écrire (fenêtre « Finalisez d'abord… ») : fiche ou conversation.
  private readonly router = inject(Router);
  private readonly returnQuery = inject(ActivatedRoute).snapshot.queryParamMap;
  readonly returnTo = safeReturnUrl(this.returnQuery.get('retour'));
  readonly returnName = (this.returnQuery.get('pour') ?? '').trim().slice(0, 80) || null;
  readonly returnIsConversation = !!this.returnTo?.startsWith('/messages');
  readonly returnReady = signal(false);

  goBack(): void {
    if (this.returnTo) {
      void this.router.navigateByUrl(this.returnTo);
    }
  }

  // Depuis une fiche : la conversation s'ouvre directement.
  goWrite(): void {
    const profileId = this.returnTo?.match(/^\/profil\/([\w-]+)$/)?.[1];
    void this.router.navigateByUrl(profileId ? `/messages?conversation=${profileId}` : this.returnTo ?? '/messages');
  }
  readonly heading = computed(() => {
    switch (this.mode) {
      case 'projet':
        return { title: 'Mon projet', subtitle: 'Présentez votre projet et les compétences qui vous manquent. Une fois publié, il est visible des associés', save: 'Enregistrer mon projet' };
      case 'associe':
        return { title: "Mon profil d'associé", subtitle: 'Présentez ce que vous pouvez apporter à un projet, puis choisissez si votre profil apparaît dans la recherche', save: 'Enregistrer' };
      default:
        return { title: 'Mon profil', subtitle: 'Ajoutez une bio, une photo et vos liens professionnels pour rendre votre profil plus crédible', save: 'Enregistrer les modifications' };
    }
  });
  // Case « Rendre mon profil visible » : décochée tant que le membre ne l'a pas choisie. Vitrine : option en plus.
  readonly associateOffer = signal(!!this.auth.currentUser()?.associateOfferedAt);
  readonly associateVitrine = signal(false);
  readonly investmentOptions = INVESTMENT_OPTIONS;
  readonly investment = signal<InvestmentReadiness | null>(this.auth.currentUser()?.investmentReadiness ?? null);
  private savedVitrine = false;

  setAssociateOfferDraft(checked: boolean): void {
    this.associateOffer.set(checked);
    if (!checked) {
      this.associateVitrine.set(false);
    }
  }
  readonly isPro = computed(() => this.currentUser()?.profileType === 'pro');
  readonly proCategory = signal<ProCategory | ''>(this.auth.currentUser()?.proCategory ?? '');
  readonly proCategories = (Object.keys(PRO_CATEGORY_LABELS) as ProCategory[]).map(value => ({ value, label: PRO_CATEGORY_LABELS[value] }));
  readonly isMaRole = computed(() => hasUsage(this.currentUser(), 'reprise') || hasUsage(this.currentUser(), 'cession'));
  readonly maLabels = computed(() =>
    hasUsage(this.currentUser(), 'cession') && !hasUsage(this.currentUser(), 'reprise')
      ? {
          title: 'Mon entreprise à céder',
          description: 'Ces informations résument votre projet de cession. Le détail de votre annonce se gère depuis le dépôt M&A',
          sector: "Secteur de l'entreprise",
          budget: 'Ordre de grandeur',
          budgetPlaceholder: "CA, prix cible ou taille de l'activité",
          region: 'Région',
        }
      : {
          title: 'Ma recherche de reprise',
          description: "Précisez le type d'entreprise que vous souhaitez reprendre pour être identifié par les vendeurs",
          sector: "Type d'entreprise recherchée",
          budget: 'Budget indicatif',
          budgetPlaceholder: 'Ex. 150 k€ - 500 k€',
          region: 'Zone ou région visée',
        }
  );
  readonly profileLink = computed(() => {
    const userId = this.currentUser()?.uid;
    return userId ? ['/profil', userId] : ['/dashboard'];
  });
  readonly rolePlaceholder = computed(() => {
    const user = this.currentUser();
    switch (user?.profileType === 'pro' ? 'pro' : this.mode === 'associe' ? 'associe' : usagesOf(user)[0]) {
      case 'associe':
        return 'Développeur full-stack, CTO freelance, Growth marketer...';
      case 'reprise':
        return 'Repreneur actif, entrepreneur en acquisition...';
      case 'cession':
        return 'Dirigeant cédant, fondateur SaaS...';
      case 'pro':
        return 'Cabinet de cession, expert-comptable spécialisé transmission...';
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

  // Profil complété (règle de Supabase), suivi en direct pendant la saisie.
  private readonly profileValues = toSignal(this.profileForm.valueChanges, { initialValue: this.profileForm.getRawValue() });
  readonly associateChecklist = computed(() => {
    const value = this.profileValues();
    return [
      { label: 'Un intitulé', done: !!value.profileTitle?.trim() },
      { label: 'Au moins une compétence', done: this.splitTags(value.skills ?? '').length > 0 },
      { label: `Une présentation d'au moins ${MIN_PRESENTATION_LENGTH} caractères (${(value.bio ?? '').trim().length}/${MIN_PRESENTATION_LENGTH})`, done: (value.bio ?? '').trim().length >= MIN_PRESENTATION_LENGTH },
    ];
  });
  readonly associateChecklistDone = computed(() => this.associateChecklist().every(item => item.done));

  readonly maForm = this.fb.nonNullable.group({
    sector: [this.currentUser()?.maSector ?? '', [Validators.required, Validators.maxLength(80)]],
    budget: [this.currentUser()?.maBudget ?? '', [Validators.required, Validators.maxLength(80)]],
    region: [this.currentUser()?.maRegion ?? '', Validators.maxLength(100)],
  });

  readonly projectForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    sector: ['', [Validators.required, Validators.maxLength(80)]],
    stage: ['mvp', Validators.required],
    location: ['', Validators.maxLength(100)],
    // Obligatoire uniquement quand l'annonce est publiée (voir syncDescriptionRequirement).
    description: ['', [Validators.required, Validators.maxLength(900)]],
    lookingFor: ['', Validators.maxLength(260)],
    skillsNeeded: ['', Validators.maxLength(260)],
    isActive: [false],
    openToEquity: [false],
    confidentialDetails: ['', Validators.maxLength(3000)],
    ndaRequired: [false],
    publicListing: [false],
  });

  // Une annonce publiée doit avoir une présentation ; un brouillon peut rester incomplet.
  private readonly syncDescriptionRequirement = this.projectForm.controls.isActive.valueChanges
    .pipe(takeUntilDestroyed())
    .subscribe(isActive => {
      // Publier exige le même minimum que Supabase (enforce_project_minimum) ; un brouillon peut rester incomplet.
      const description = this.projectForm.controls.description;
      description.setValidators(isActive ? [Validators.required, Validators.minLength(MIN_PRESENTATION_LENGTH), Validators.maxLength(900)] : [Validators.maxLength(900)]);
      description.updateValueAndValidity();
      const skills = this.projectForm.controls.skillsNeeded;
      skills.setValidators(isActive ? [Validators.required, Validators.maxLength(260)] : [Validators.maxLength(260)]);
      skills.updateValueAndValidity();

    });

  // Téléphones : partie confidentielle repliée tant qu'on ne l'ouvre pas.
  readonly confidentialOpen = signal(false);
  readonly isProjectPublished = toSignal(this.projectForm.controls.isActive.valueChanges, { initialValue: false });

  readonly projectStages = [
    { value: 'idea', label: 'Idée' },
    { value: 'mvp', label: 'MVP' },
    { value: 'growth', label: 'En croissance' },
    { value: 'established', label: 'Établi' },
  ];

  ngOnInit(): void {
    // « Mon profil d'associé » : l'intitulé créé à l'inscription pour la reprise ou la cession (« Recherche M&A - … »)
    // ne décrit pas ce que la personne apporte à un projet. Le champ reste vide, sans rien enregistrer tant qu'on ne valide pas.
    if (this.mode === 'associe' && /^(Recherche|Cession) M&A - /.test(this.profileForm.controls.profileTitle.value)) {
      this.profileForm.controls.profileTitle.setValue('');
    }
    void this.loadProject();
    if (this.mode === 'associe') {
      void this.auth.getPublicListing().then(value => {
        this.savedVitrine = !!value && this.associateOffer();
        this.associateVitrine.set(this.savedVitrine);
      });
    }
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.photoMessage.set('');
    this.photoErrorMessage.set('');

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.photoErrorMessage.set('Choisissez une image valide.');
      input.value = '';
      return;
    }

    if (file.size > 5_000_000) {
      this.photoErrorMessage.set('Photo trop lourde. Essayez une image de moins de 5 Mo.');
      input.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        this.zone.run(() => {
          this.previewPhoto.set(reader.result as string);
          this.photoMessage.set('Photo prête à être enregistrée.');
          this.errorMessage.set('');
          this.successMessage.set('');
        });
      }
    };

    reader.onerror = () => {
      this.zone.run(() => {
        this.photoErrorMessage.set("Impossible de lire l'image sélectionnée.");
      });
    };

    reader.readAsDataURL(file);
    input.value = '';
  }

  removePhoto(): void {
    this.previewPhoto.set('');
    this.photoMessage.set('Photo supprimée. Enregistrez pour confirmer.');
    this.photoErrorMessage.set('');
    this.successMessage.set('');
  }

  async saveProfile(): Promise<void> {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (this.mode === 'projet') {
      await this.saveProjectPage();
      return;
    }

    this.profileForm.markAllAsTouched();
    const checkMa = this.mode === 'profil' && this.isMaRole();
    if (checkMa) {
      this.maForm.markAllAsTouched();
    }

    if (this.profileForm.invalid || (checkMa && this.maForm.invalid)) {
      this.errorMessage.set(`À compléter ou raccourcir : ${this.invalidFieldLabels().join(', ')}.`);
      return;
    }

    const value = this.profileForm.getRawValue();
    const skills = this.splitTags(value.skills);
    if (this.mode === 'associe' && this.associateOffer() && !this.associateChecklistDone()) {
      this.errorMessage.set(`Pour rendre votre profil visible, complétez-le : un intitulé, au moins une compétence et une présentation d'au moins ${MIN_PRESENTATION_LENGTH} caractères.`);
      return;
    }

    const maValue = this.maForm.getRawValue();
    const payload: UpdateProfilePayload = {
      displayName: value.displayName,
      location: value.location,
      profileTitle: value.profileTitle,
      availabilityLabel: value.availabilityLabel,
      ...(this.mode === 'associe' ? { investmentReadiness: this.investment(), associateStarted: true } : {}),
      ...(checkMa ? { maSector: maValue.sector, maBudget: maValue.budget, maRegion: maValue.region } : {}),
      ...(this.mode === 'profil' && this.isPro() ? { proCategory: this.proCategory() } : {}),
      bio: value.bio,
      skills,
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

      if (this.mode === 'associe') {
        const wasOffered = !!this.currentUser()?.associateOfferedAt;
        if (this.associateOffer() !== wasOffered) {
          const offerResult = await this.auth.setAssociateOffer(this.associateOffer());
          if (!offerResult.success) {
            this.errorMessage.set(offerResult.message ?? 'Impossible d’enregistrer ce choix pour le moment.');
            return;
          }
        }
        const vitrine = this.associateOffer() && this.associateVitrine();
        if (vitrine !== this.savedVitrine) {
          const vitrineResult = await this.auth.setPublicListing(vitrine);
          if (!vitrineResult.success) {
            this.errorMessage.set(vitrineResult.message ?? 'Impossible d’enregistrer l’aperçu sur la vitrine pour le moment.');
            return;
          }
          this.savedVitrine = vitrine;
        }
        this.returnReady.set(this.associateChecklistDone());
        this.successMessage.set(this.associateOffer()
          ? 'Profil d’associé enregistré et visible des membres.'
          : this.associateChecklistDone()
            ? 'Profil d’associé enregistré. Il n’apparaît pas dans la recherche, mais vous pouvez écrire aux porteurs de projet.'
            : 'Profil d’associé enregistré. Complétez-le pour pouvoir écrire aux porteurs de projet.');
        return;
      }

      this.successMessage.set('Profil mis à jour. Vous pouvez ouvrir votre profil pour vérifier le rendu.');
      this.photoMessage.set('');
      this.photoErrorMessage.set('');
    } finally {
      this.isSaving.set(false);
    }
  }

  // « Mon projet » : seul le projet est enregistré. Le publier ajoute l'objectif « Trouver des associés ».
  private async saveProjectPage(): Promise<void> {
    this.projectForm.markAllAsTouched();
    if (this.projectForm.invalid) {
      this.errorMessage.set(`À compléter ou raccourcir : ${this.invalidFieldLabels().join(', ')}.`);
      return;
    }

    this.isSaving.set(true);
    try {
      if (!(await this.saveProject())) {
        return;
      }
      this.ownsProject.set(true);
      const published = this.projectForm.controls.isActive.value;
      if (published) {
        await this.auth.noteActionUsage('projet');
      }
      const value = this.projectForm.getRawValue();
      const presented = isProjectPresented({ name: value.name, description: value.description, skillsNeeded: this.splitTags(value.skillsNeeded) });
      this.returnReady.set(presented);
      this.successMessage.set(published
        ? 'Projet publié : il est visible des membres dans la recherche.'
        : presented
          ? 'Brouillon enregistré : il n’apparaît pas dans la recherche, mais vous pouvez déjà écrire aux associés.'
          : 'Brouillon enregistré. Complétez la présentation pour pouvoir écrire aux associés.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async decideAccess(request: ProjectAccessRequest, approve: boolean): Promise<void> {
    const success = await this.projectAccess.decide(request.id, approve);

    if (!success) {
      this.errorMessage.set("La décision n'a pas pu être enregistrée. Réessayez dans un instant.");
      return;
    }

    this.accessRequests.set(await this.projectAccess.listForProject(request.projectId));
  }

  downloadNdaProof(request: ProjectAccessRequest): void {
    if (!request.ndaAcceptedAt || !request.ndaVersion) {
      return;
    }

    const content = ndaProofDocument(
      { ownerName: request.ownerName, associateName: request.requesterName, projectName: request.projectName },
      { version: request.ndaVersion, acceptedAt: request.ndaAcceptedAt, ip: request.ndaIp, userAgent: request.ndaUserAgent }
    );
    downloadTextFile(`NDA-${this.slug(request.projectName)}-${this.slug(request.requesterName)}.txt`, content);
  }

  accessStatusLabel(status: ProjectAccessStatus): string {
    return status === 'approved' ? 'Accès accordé' : status === 'refused' ? 'Refusée' : 'En attente';
  }

  accessStatusClass(status: ProjectAccessStatus): string {
    return status === 'approved'
      ? 'bg-emerald-50 text-emerald-700'
      : status === 'refused'
        ? 'bg-secondary text-muted-foreground'
        : 'bg-amber-100 text-amber-700';
  }

  formatDate(value: string): string {
    return new Date(value).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private slug(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'document';
  }

  private async loadProject(): Promise<void> {
    await this.auth.ensureSessionReady();

    const ownerId = this.currentUser()?.uid;

    if (!ownerId) {
      return;
    }

    if (this.mode !== 'projet') {
      if (this.associatesEnabled && !this.isPro()) {
        this.ownsProject.set(!!(await this.projects.getOwnedProject(ownerId)));
      }
      return;
    }

    this.isProjectLoading.set(true);

    try {
      const project = await this.projects.getOwnedProject(ownerId);
      this.projectId.set(project?.id ?? null);
      this.ownsProject.set(!!project);
      this.accessRequests.set(project ? await this.projectAccess.listForProject(project.id) : []);
      this.projectForm.patchValue({
        name: project?.name ?? this.currentUser()?.profileTitle ?? '',
        sector: project?.sector ?? '',
        stage: project?.stage ?? 'mvp',
        location: project?.location ?? this.currentUser()?.location ?? '',
        description: project?.description ?? '',
        lookingFor: (project?.lookingFor ?? this.currentUser()?.lookingFor ?? []).join(', '),
        skillsNeeded: (project?.skillsNeeded ?? []).join(', '),
        isActive: project?.isActive ?? false,
        openToEquity: project?.openToEquity ?? false,
        confidentialDetails: project?.confidentialDetails ?? '',
        ndaRequired: project?.ndaRequired ?? false,
        publicListing: project?.publicListing ?? false,
      });
    } finally {
      this.isProjectLoading.set(false);
    }
  }

  private async saveProject(): Promise<boolean> {
    const ownerId = this.currentUser()?.uid;

    if (!ownerId) {
      this.errorMessage.set("Impossible d'identifier le propriétaire de l'annonce.");
      return false;
    }

    const value = this.projectForm.getRawValue();
    const result = await this.projects.saveOwnedProject(ownerId, this.projectId(), {
      name: value.name,
      sector: value.sector,
      stage: value.stage,
      location: value.location,
      description: value.description,
      lookingFor: this.splitTags(value.lookingFor),
      skillsNeeded: this.splitTags(value.skillsNeeded),
      isActive: value.isActive,
      openToEquity: value.openToEquity,
      confidentialDetails: value.confidentialDetails,
      ndaRequired: value.ndaRequired,
      publicListing: value.publicListing,
    });

    if (!result.success) {
      this.errorMessage.set(result.message ?? "Le profil a été enregistré, mais pas l'annonce de projet.");
      return false;
    }

    this.projectId.set(result.project?.id ?? this.projectId());
    return true;
  }

  // Libellés des champs invalides, dans l'ordre du formulaire.
  private invalidFieldLabels(): string[] {
    const labels: string[] = [];
    const collect = (controls: Record<string, { invalid: boolean }>, names: Record<string, string>) => {
      for (const [name, label] of Object.entries(names)) {
        if (controls[name]?.invalid) {
          labels.push(label);
        }
      }
    };

    if (this.mode !== 'projet') collect(this.profileForm.controls, {
      displayName: 'Nom complet',
      location: 'Localisation',
      profileTitle: 'Titre du profil (90 caractères max.)',
      availabilityLabel: 'Disponibilité (90 caractères max.)',
      bio: 'Bio (700 caractères max.)',
      skills: 'Compétences (240 caractères max.)',
      lookingFor: 'Ce que vous recherchez (240 caractères max.)',
      githubUrl: 'GitHub',
      linkedinUrl: 'LinkedIn',
      websiteUrl: 'Site / portfolio',
    });

    if (this.mode === 'projet') {
      collect(this.projectForm.controls, {
        name: 'Nom du projet',
        sector: 'Secteur',
        stage: 'Stade du projet',
        location: 'Localisation du projet',
        description: this.projectForm.controls.description.hasError('maxlength')
          ? 'Présentation du projet (900 caractères max.)'
          : 'Présentation du projet (au moins 50 caractères pour publier ; décochez « Publié dans la recherche » pour enregistrer un brouillon)',
        lookingFor: 'Profils recherchés',
        skillsNeeded: 'Compétences recherchées (au moins une pour publier)',
      });
    }

    if (this.mode === 'profil' && this.isMaRole()) {
      collect(this.maForm.controls, { sector: 'Secteur M&A', budget: 'Budget / ordre de grandeur', region: 'Région' });
    }

    return labels;
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

// Seules les pages d'où l'on peut écrire sont acceptées (pas d'adresse extérieure).
function safeReturnUrl(value: string | null): string | null {
  return value && /^\/(profil\/[\w-]+|messages(\?conversation=[\w-]+)?)$/.test(value) && value !== '/profil/modifier' && value !== '/profil/associe'
    ? value
    : null;
}
