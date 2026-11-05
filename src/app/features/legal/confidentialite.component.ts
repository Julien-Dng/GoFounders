import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-confidentialite',
  standalone: true,
  imports: [RouterLink, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary">
      <section class="px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:px-8">
        <article class="mx-auto max-w-4xl rounded-3xl border border-border bg-white p-6 sm:p-10 lg:p-12">
          <a routerLink="/" class="mb-8 inline-flex text-sm font-semibold text-accent hover:underline">
            Retour à l'accueil
          </a>

          <p class="mb-4 inline-flex rounded-full bg-accent/10 px-4 py-2 text-sm font-semibold text-accent">
            Version provisoire à compléter juridiquement
          </p>
          <h1 class="mb-6 text-3xl font-semibold text-primary sm:text-5xl">Politique de confidentialité</h1>
          <p class="mb-10 text-lg leading-relaxed text-muted-foreground">
            Cette page présente les grands principes de traitement des données personnelles sur GoFounders. Elle doit être complétée avec les
            informations légales exactes, les durées de conservation et les sous-traitants réellement utilisés.
          </p>

          <div class="space-y-8 text-muted-foreground">
            <section>
              <h2 class="mb-3 text-xl font-semibold text-primary">Données collectées</h2>
              <p class="leading-relaxed">
                GoFounders peut collecter les informations nécessaires à la création du compte, au profil utilisateur, à la messagerie, à la gestion
                des abonnements et à l'accès aux opportunités M&A.
              </p>
            </section>

            <section>
              <h2 class="mb-3 text-xl font-semibold text-primary">Finalités</h2>
              <p class="leading-relaxed">
                Les données sont utilisées pour fournir le service, sécuriser les comptes, gérer les paiements, faciliter les mises en relation
                et améliorer l'expérience utilisateur.
              </p>
              <p class="mt-3 leading-relaxed">
                Pour éviter qu'un même professionnel bénéficie plusieurs fois de l'essai gratuit, nous conservons une empreinte
                chiffrée de son adresse e-mail et l'empreinte de sa carte bancaire fournie par Stripe (aucun numéro de carte),
                y compris après la suppression de son compte.
              </p>
            </section>

            <section>
              <h2 class="mb-3 text-xl font-semibold text-primary">Page publique « Trouver un associé »</h2>
              <p class="leading-relaxed">
                Les porteurs de projet et les associés peuvent choisir d'apparaître de façon anonyme sur la page publique /associes, visible sans
                compte. Cet affichage n'a lieu qu'avec votre accord, donné à l'inscription ou dans les paramètres, et peut être retiré à tout moment.
                Pour un associé, seuls le titre du profil, les compétences et la disponibilité sont affichés ; pour un projet, le secteur, le stade,
                les profils et compétences recherchés, la demande d'engagement de confidentialité et l'ouverture au capital. Le nom, la photo, la
                localisation, le nom et la description du projet ne sont jamais affichés. Un profil masqué de la recherche n'apparaît pas non plus
                sur cette page.
              </p>
            </section>

            <section>
              <h2 class="mb-3 text-xl font-semibold text-primary">Partage et sous-traitants</h2>
              <p class="leading-relaxed">
                Certaines données peuvent être transmises à des prestataires techniques strictement nécessaires, notamment pour l'authentification,
                l'hébergement, le paiement, la messagerie ou l'assistance IA, selon les intégrations effectivement activées.
              </p>
            </section>

            <section>
              <h2 class="mb-3 text-xl font-semibold text-primary">Droits des utilisateurs</h2>
              <p class="leading-relaxed">
                Chaque utilisateur devra pouvoir exercer ses droits d'accès, de rectification, d'opposition, d'effacement et de portabilité selon
                les modalités à préciser dans la version juridiquement validée.
              </p>
            </section>
          </div>

          <div class="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
            Cette politique est provisoire. Elle ne remplace pas une analyse RGPD complète et doit être finalisée avec les informations réelles
            du responsable de traitement, des prestataires et des durées de conservation.
          </div>
        </article>
      </section>

      <app-footer />
    </div>
  `
})
export class ConfidentialiteComponent {}
