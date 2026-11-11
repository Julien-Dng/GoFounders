import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { INTRO_SUMMARY, FREE_AI_ANALYSES_PER_MONTH, FREE_CONTACTS_PER_MONTH, OFFER_PRICES } from '../../core/config/offers';
import { FEATURES, FeatureName } from '../../core/config/features';
import { FooterComponent } from '../../shared/components/footer/footer.component';

interface FaqEntry {
  question: string;
  answer: string;
  // Question liée à un module masqué au lancement (core/config/features.ts).
  feature?: FeatureName;
}

interface FaqCategory {
  id: string;
  title: string;
  entries: FaqEntry[];
  feature?: FeatureName;
}

const price = (key: keyof typeof OFFER_PRICES) => OFFER_PRICES[key].label;

// Questions fréquentes. Les réponses décrivent ce que fait réellement la plateforme ; les prix viennent
// de core/config/offers.ts. Toute nouvelle règle (remboursement, CGV) doit être validée avant d'être ajoutée ici.
const CATEGORIES: FaqCategory[] = [
  {
    id: 'cedants',
    title: 'Vendre son entreprise',
    entries: [
      { question: 'Combien coûte la publication d’une annonce ?', answer: 'Rien. La publication est gratuite pendant le lancement et GoFounders ne prend aucune commission sur le prix de vente.' },
      { question: 'Mon annonce est-elle anonyme ?', answer: 'Oui. Le public voit seulement le secteur, la région, les chiffres clés et un court résumé. La présentation détaillée, le motif de cession et vos coordonnées ne s’ouvrent qu’aux repreneurs qui acceptent un engagement de confidentialité et paient l’accès à votre dossier.' },
      { question: 'Qui peut voir mon dossier complet ?', answer: 'Les repreneurs qui acceptent un engagement de confidentialité envers vous et paient l’accès à votre dossier. Vous êtes prévenu à chaque ouverture, avec le nom et le profil du repreneur, et retrouvez la liste dans « Mes annonces ». Indiquez dans votre dossier les seules coordonnées que vous souhaitez transmettre.' },
      { question: 'Comment préparer mon annonce ?', answer: 'Le formulaire de dépôt vous guide en cinq étapes. Vous pouvez aussi décrire votre entreprise en quelques phrases : l’IA prépare une annonce anonymisée et vous signale ce qui permettrait de vous reconnaître. Vous relisez et modifiez tout avant de publier.' },
      { question: 'Comment fixer mon prix ?', answer: 'L’outil d’estimation gratuite donne une première fourchette à partir de votre bénéfice et de votre secteur. C’est un ordre de grandeur, pas une évaluation : faites confirmer le prix par un expert-comptable ou un conseil en cession.' },
      { question: 'Quand mon annonce est-elle publiée ?', answer: 'Après relecture par notre équipe, en général sous 24 h ouvrées. Nous vérifions qu’elle est sérieuse et qu’elle ne permet pas de vous reconnaître. Vous êtes prévenu dès qu’elle est en ligne, ou du motif si elle doit être corrigée. Une annonce modifiée repasse en relecture.' },
      { question: 'Comment rendre mon annonce plus visible ?', answer: `La mise en avant place votre annonce en tête de liste avec le badge « En vedette » : ${price('FEATURE_7D')} ou ${price('FEATURE_30D')}. Le dossier vérifié, où notre équipe contrôle vos justificatifs, coûte ${price('VERIFICATION')}.`, feature: 'sellerPaidOffers' },
      { question: 'Que se passe-t-il quand j’ai vendu ?', answer: 'Depuis « Mes annonces », déclarez la vente. Si vous le souhaitez, votre témoignage peut être publié après validation par notre équipe, avec le prix exact, une fourchette ou sans prix, selon votre choix.' },
    ],
  },
  {
    id: 'repreneurs',
    title: 'Reprendre une entreprise',
    entries: [
      { question: 'Combien coûte une mise en relation ?', answer: `${INTRO_SUMMARY} Le paiement est unique pour cette entreprise et inclut l’analyse du dossier par l’IA (jusqu’à ${FREE_AI_ANALYSES_PER_MONTH} analyses par mois).` },
      { question: 'Comment ouvrir le dossier d’une annonce ?', answer: 'Sur la fiche de l’annonce, cliquez sur « Demander l’accès au dossier » : présentez-vous en quelques phrases et acceptez l’engagement de confidentialité. Le cédant reçoit votre demande et vous êtes prévenu de sa réponse. S’il accepte, le dossier complet et ses coordonnées s’affichent.' },
      { question: 'Quelle différence avec l’accès Plus ?', answer: `L’accès Plus (${price('MA_PLUS')}) ajoute les analyses de dossier illimitées et les alertes sur les nouvelles annonces qui correspondent à votre recherche.`, feature: 'buyerPlus' },
      { question: 'Puis-je voir les annonces sans payer ?', answer: 'Oui. Toutes les annonces sont visibles gratuitement dans leur version anonymisée : secteur, région, chiffre d’affaires, marge, bénéfice, ancienneté et prix demandé.' },
      { question: 'Les chiffres des annonces sont-ils fiables ?', answer: `Ils sont déclarés par les cédants${FEATURES.sellerPaidOffers ? ' ; sauf mention « Dossier vérifié », GoFounders ne les a pas contrôlés' : ' et GoFounders ne les contrôle pas'}. Demandez toujours les justificatifs (bilans, relevés, accès aux outils) et faites vérifier le dossier par un expert-comptable avant toute offre.` },
      { question: 'Comment se passe la suite après le premier contact ?', answer: `Vous échangez directement avec le cédant dans la messagerie. GoFounders n’intervient pas dans la négociation. ${FEATURES.pros ? 'L’annuaire des professionnels vous aide à trouver un expert-comptable ou un avocat pour sécuriser la reprise.' : 'Faites-vous accompagner par un expert-comptable et un avocat pour sécuriser la reprise.'}` },
      { question: 'Qu’est-ce que l’analyse de dossier par l’IA ?', answer: 'Un résumé des points forts, des points de vigilance et des questions à poser au cédant, préparé à partir des informations de l’annonce. Ce n’est ni une valorisation, ni un conseil juridique ou financier.' },
    ],
  },
  {
    id: 'paiement',
    title: 'Paiement et abonnements',
    entries: [
      { question: 'Comment se fait le paiement ?', answer: 'Par carte bancaire, sur la page de paiement sécurisée de Stripe. GoFounders ne voit ni ne conserve vos numéros de carte.' },
      { question: 'Y a-t-il un abonnement pour les repreneurs ?', answer: 'Non. Vous payez seulement les dossiers que vous ouvrez, une fois par entreprise, sans abonnement ni renouvellement.' },
      { question: 'Comment résilier un abonnement mensuel ?', answer: `Les abonnements mensuels (PRO à ${price('PRO')}, comptes professionnels) sont sans engagement. Depuis « Mon abonnement », le bouton « Gérer mes abonnements et factures » vous permet de résilier et de télécharger vos factures.`, feature: 'associates' },
      { question: 'Où trouver mes factures ?', answer: 'Un reçu vous est envoyé par e-mail après chaque paiement. Depuis « Mon abonnement », le bouton « Gérer mes abonnements et factures » vous permet de les retrouver.' },
      { question: 'J’ai une question sur un paiement ou une facture', answer: 'Écrivez-nous depuis la page contact en choisissant le sujet « Paiement ou facture », en indiquant la date et le montant.' },
    ],
  },
  {
    id: 'confidentialite',
    title: 'Confidentialité et sécurité',
    entries: [
      { question: 'Qui peut voir mes coordonnées ?', answer: 'Votre adresse email n’est jamais affichée sur votre profil. Les coordonnées d’un cédant ne sont visibles que par les repreneurs qu’il a acceptés.' },
      { question: 'Puis-je cacher mon profil ?', answer: 'Oui. Dans les paramètres, vous pouvez retirer votre profil de la recherche. Vos conversations en cours continuent normalement.' },
      { question: 'Comment fonctionne l’engagement de confidentialité (NDA) ?', answer: 'Avant de demander un dossier, le repreneur accepte en ligne un engagement de confidentialité envers le cédant. La preuve d’acceptation (date, version du texte) est conservée. Le texte est un modèle mis à disposition : GoFounders n’est pas partie à l’engagement et n’assure pas de conseil juridique.' },
      { question: 'Comment supprimer mon compte ?', answer: 'Depuis les paramètres, rubrique « Zone de danger ». La suppression efface votre profil, vos photos, vos annonces et vos conversations.' },
    ],
  },
  {
    id: 'associes',
    title: 'Trouver un associé',
    feature: 'associates',
    entries: [
      { question: 'Comment fonctionne la recherche d’associés ?', answer: 'Les porteurs de projet voient les associés disponibles, les associés voient les projets. Un score de compatibilité, calculé par règles (compétences, localisation, disponibilité, secteur), aide à repérer les meilleurs profils.' },
      { question: 'Est-ce gratuit ?', answer: `Rejoindre un projet est gratuit. Les porteurs de projet peuvent contacter ${FREE_CONTACTS_PER_MONTH} nouveaux associés par mois gratuitement ; l’offre PRO (${price('PRO')}, sans engagement) lève cette limite et ajoute les raisons détaillées du score, la recherche avancée et la mise en avant du projet.` },
    ],
  },
];

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [RouterLink, FooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-secondary">
      <section class="px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pt-36">
        <div class="mx-auto max-w-3xl">
          <header class="text-center">
            <h1 class="text-[2.25rem] leading-tight text-primary sm:text-5xl">Questions fréquentes</h1>
            <p class="mt-4 text-lg leading-relaxed text-muted-foreground">Vendre, reprendre, payer, protéger vos informations : l'essentiel en quelques réponses</p>
          </header>

          <div class="relative mt-8">
            <label for="faq-search" class="sr-only">Rechercher dans les questions</label>
            <svg class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
            <input id="faq-search" type="search" [value]="query()" (input)="query.set($any($event.target).value)" placeholder="Rechercher : commission, NDA, facture…" class="w-full rounded-xl border border-input bg-white py-3.5 pl-12 pr-4 text-base shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20">
          </div>

          @if (!query().trim()) {
            <nav class="mt-5 flex flex-wrap justify-center gap-2" aria-label="Thèmes">
              @for (category of categories; track category.id) {
                <a routerLink="/faq" [fragment]="category.id" class="rounded-full bg-white px-4 py-2 text-base font-semibold text-primary shadow-sm ring-1 ring-border transition-colors hover:text-accent">{{ category.title }}</a>
              }
            </nav>
          }

          @for (category of visibleCategories(); track category.id) {
            <section [id]="category.id" class="mt-12 scroll-mt-24" [attr.aria-labelledby]="'faq-' + category.id">
              <h2 [id]="'faq-' + category.id" class="text-2xl text-primary">{{ category.title }}</h2>
              <div class="mt-4 space-y-3">
                @for (entry of category.entries; track entry.question) {
                  <details class="group rounded-2xl bg-white px-6 py-5 shadow-sm ring-1 ring-border" [open]="!!query().trim()">
                    <summary class="flex cursor-pointer list-none items-start justify-between gap-6 font-bold text-primary">
                      {{ entry.question }}
                      <span class="mt-0.5 text-xl leading-none text-accent transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                    </summary>
                    <p class="mt-3 text-base leading-relaxed text-muted-foreground">{{ entry.answer }}</p>
                  </details>
                }
              </div>
            </section>
          } @empty {
            <p class="mt-12 text-center text-base text-muted-foreground" role="status">Aucune question ne correspond à « {{ query() }} »</p>
          }

          <div class="mt-14 rounded-2xl bg-primary p-8 text-center text-white shadow-lg">
            <h2 class="text-2xl">Vous n'avez pas trouvé votre réponse ?</h2>
            <p class="mt-2 text-base text-white/70">Écrivez-nous, nous vous répondons par email</p>
            <a routerLink="/contact" class="mt-5 inline-block rounded-lg bg-accent px-6 py-3.5 font-semibold text-white transition-colors hover:bg-accent/90">Nous contacter</a>
          </div>
        </div>
      </section>
      <app-footer />
    </div>
  `,
})
export class FaqComponent {
  readonly categories = CATEGORIES
    .filter(category => !category.feature || FEATURES[category.feature])
    .map(category => ({ ...category, entries: category.entries.filter(entry => !entry.feature || FEATURES[entry.feature]) }));
  readonly query = signal('');

  readonly visibleCategories = computed(() => {
    const words = this.normalize(this.query()).split(/\s+/).filter(Boolean);

    if (words.length === 0) {
      return this.categories;
    }

    return this.categories
      .map(category => ({
        ...category,
        entries: category.entries.filter(entry => {
          const text = this.normalize(`${entry.question} ${entry.answer}`);
          return words.every(word => text.includes(word));
        }),
      }))
      .filter(category => category.entries.length > 0);
  });

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
}
