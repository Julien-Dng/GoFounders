import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-mentions-legales',
  standalone: true,
  imports: [RouterLink, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary">
      <section class="px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <article class="mx-auto max-w-4xl rounded-3xl border border-border bg-white p-6 shadow-lg sm:p-10 lg:p-12">
          <a routerLink="/" class="mb-8 inline-flex text-sm font-semibold text-accent hover:underline">
            Retour à l'accueil
          </a>

          <p class="mb-4 inline-flex rounded-full bg-accent/10 px-4 py-2 text-sm font-semibold text-accent">
            Version provisoire à compléter juridiquement
          </p>
          <h1 class="mb-6 text-3xl font-bold text-primary sm:text-5xl">Mentions légales</h1>
          <p class="mb-10 text-lg leading-relaxed text-muted-foreground">
            Ces mentions légales sont un modèle de travail destiné à réserver les emplacements obligatoires avant validation finale.
          </p>

          <div class="space-y-8 text-muted-foreground">
            <section>
              <h2 class="mb-3 text-xl font-bold text-primary">Éditeur du site</h2>
              <p class="leading-relaxed">
                GoFounders - forme juridique, capital social, numéro d'immatriculation, siège social et représentant légal à compléter.
              </p>
            </section>

            <section>
              <h2 class="mb-3 text-xl font-bold text-primary">Contact</h2>
              <p class="leading-relaxed">
                Adresse email de contact, adresse postale et coordonnées du directeur de la publication à renseigner avant mise en production.
              </p>
            </section>

            <section>
              <h2 class="mb-3 text-xl font-bold text-primary">Hébergement</h2>
              <p class="leading-relaxed">
                Nom de l'hébergeur, adresse, pays d'hébergement et coordonnées à compléter selon l'infrastructure réellement utilisée.
              </p>
            </section>

            <section>
              <h2 class="mb-3 text-xl font-bold text-primary">Propriété intellectuelle</h2>
              <p class="leading-relaxed">
                Les contenus, marques, interfaces et éléments graphiques du site sont protégés. Toute réutilisation doit être autorisée selon les
                conditions à préciser dans la version définitive.
              </p>
            </section>
          </div>

          <div class="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
            Ces mentions sont provisoires et ne constituent pas un avis juridique. Elles doivent être complétées avec les informations réelles
            de l'entreprise et validées avant publication.
          </div>
        </article>
      </section>

      <app-footer />
    </div>
  `
})
export class MentionsLegalesComponent {}
