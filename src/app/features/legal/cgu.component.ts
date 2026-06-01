import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/components/footer/footer.component';

@Component({
  selector: 'app-cgu',
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
          <h1 class="mb-6 text-3xl font-bold text-primary sm:text-5xl">Conditions générales d'utilisation</h1>
          <p class="mb-10 text-lg leading-relaxed text-muted-foreground">
            Ces conditions décrivent le cadre d'utilisation de GoFounders, plateforme de mise en relation entre porteurs de projet,
            talents, acheteurs et vendeurs d'entreprises. Elles devront être relues et adaptées par un professionnel du droit avant publication définitive.
          </p>

          <div class="space-y-8 text-muted-foreground">
            <section>
              <h2 class="mb-3 text-xl font-bold text-primary">Objet du service</h2>
              <p class="leading-relaxed">
                GoFounders facilite la découverte de profils, projets et opportunités M&A. La plateforme ne garantit pas la conclusion d'un partenariat,
                d'une transaction, d'un recrutement, d'une levée de fonds ou d'une cession.
              </p>
            </section>

            <section>
              <h2 class="mb-3 text-xl font-bold text-primary">Compte utilisateur</h2>
              <p class="leading-relaxed">
                L'utilisateur s'engage à fournir des informations exactes, à maintenir la confidentialité de ses accès et à utiliser la plateforme
                de manière loyale, professionnelle et conforme aux lois applicables.
              </p>
            </section>

            <section>
              <h2 class="mb-3 text-xl font-bold text-primary">Abonnements et accès M&A</h2>
              <p class="leading-relaxed">
                Les fonctionnalités peuvent varier selon le plan choisi. L'accès one-shot M&A est distinct des abonnements mensuels et doit être
                encadré par des conditions de paiement, de remboursement et d'accès à finaliser.
              </p>
            </section>

            <section>
              <h2 class="mb-3 text-xl font-bold text-primary">Responsabilité</h2>
              <p class="leading-relaxed">
                Les contenus publiés par les utilisateurs restent sous leur responsabilité. Les informations M&A, estimations et échanges doivent
                être vérifiés par les parties et leurs conseils avant toute décision.
              </p>
            </section>
          </div>

          <div class="mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-900">
            Ce document est un contenu provisoire fourni pour structurer le site. Il ne constitue pas un conseil juridique et doit être complété
            par des mentions contractuelles validées par un professionnel compétent.
          </div>
        </article>
      </section>

      <app-footer />
    </div>
  `
})
export class CguComponent {}
