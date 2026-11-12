import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { featureGuard } from './core/guards/feature.guard';
import { planGuard } from './core/guards/plan.guard';

export const routes: Routes = [
  // Dashboard (layout propre, sans navbar publique). Déclaré avant le layout public, dont la page 404 capte tout le reste.
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  // Routes publiques (avec navbar)
  {
    path: '',
    loadComponent: () => import('./shared/components/root-layout/root-layout.component').then(m => m.RootLayoutComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingComponent)
      },
      {
        path: 'tarifs',
        loadComponent: () => import('./features/tarifs/tarifs.component').then(m => m.TarifsComponent)
      },
      {
        path: 'paiement/merci',
        canActivate: [authGuard],
        loadComponent: () => import('./features/paiement/paiement-merci.component').then(m => m.PaiementMerciComponent)
      },
      {
        path: 'estimation',
        loadComponent: () => import('./features/estimation/estimation.component').then(m => m.EstimationComponent)
      },
      {
        path: 'conditions-generales',
        loadComponent: () => import('./features/legal/cgu.component').then(m => m.CguComponent)
      },
      {
        path: 'confidentialite',
        loadComponent: () => import('./features/legal/confidentialite.component').then(m => m.ConfidentialiteComponent)
      },
      {
        path: 'mentions-legales',
        loadComponent: () => import('./features/legal/mentions-legales.component').then(m => m.MentionsLegalesComponent)
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/contact/contact.component').then(m => m.ContactComponent)
      },
      {
        path: 'associes',
        canActivate: [featureGuard('associates')],
        loadComponent: () => import('./features/associes/associes.component').then(m => m.AssociesComponent)
      },
      {
        path: 'faq',
        loadComponent: () => import('./features/faq/faq.component').then(m => m.FaqComponent)
      },
      {
        path: 'inscription',
        loadComponent: () => import('./features/inscription/inscription.component').then(m => m.InscriptionComponent)
      },
      {
        path: 'connexion',
        loadComponent: () => import('./features/auth/connexion/connexion.component').then(m => m.ConnexionComponent)
      },
      {
        path: 'reinitialiser-mot-de-passe',
        loadComponent: () => import('./features/auth/reinitialiser/reinitialiser.component').then(m => m.ReinitialiserComponent)
      },
      {
        path: 'ma',
        loadComponent: () => import('./features/ma/ma-home/ma-home.component').then(m => m.MaHomeComponent)
      },
      {
        // Annuaire public des professionnels (refonte « reprise »).
        path: 'pros',
        canActivate: [featureGuard('pros')],
        loadComponent: () => import('./features/pros/pros.component').then(m => m.ProsComponent)
      },
      // Routes protégées (auth requise)
      {
        path: 'recherche',
        // Ouverte à tous les membres : ce qu'on y voit dépend de ses actions (projet publié, profil d'associé).
        canActivate: [featureGuard('associates'), authGuard],
        loadComponent: () => import('./features/recherche/recherche.component').then(m => m.RechercheComponent)
      },
      {
        path: 'profil/modifier',
        canActivate: [authGuard],
        loadComponent: () => import('./features/profil/modifier/modifier.component').then(m => m.ModifierComponent)
      },
      {
        path: 'profil/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./features/profil/profil.component').then(m => m.ProfilComponent)
      },
      {
        path: 'messages',
        canActivate: [authGuard],
        loadComponent: () => import('./features/messages/messages.component').then(m => m.MessagesComponent)
      },
      {
        path: 'messages/:id',
        redirectTo: '/messages',
        pathMatch: 'full'
      },
      {
        path: 'coaching-ia',
        canActivate: [featureGuard('assistant'), authGuard, planGuard],
        data: { requiredPlan: 'PRO' },
        loadComponent: () => import('./features/coaching-ia/coaching-ia.component').then(m => m.CoachingIaComponent)
      },
      {
        path: 'ma/deposer',
        // Tout membre peut publier ; pros : compte pro en cours vérifié dans la page et par Supabase (enforce_ma_listing_owner).
        canActivate: [authGuard],
        loadComponent: () => import('./features/ma/ma-deposer/ma-deposer.component').then(m => m.MaDeposerComponent)
      },
      {
        path: 'ma/mes-annonces',
        canActivate: [authGuard],
        loadComponent: () => import('./features/ma/ma-mes-annonces/ma-mes-annonces.component').then(m => m.MaMesAnnoncesComponent)
      },
      {
        path: 'admin/verifications',
        canActivate: [authGuard],
        loadComponent: () => import('./features/admin/verifications.component').then(m => m.VerificationsComponent)
      },
      {
        path: 'ma/statistiques',
        canActivate: [authGuard],
        loadComponent: () => import('./features/ma/ma-statistiques/ma-statistiques.component').then(m => m.MaStatistiquesComponent)
      },
      {
        path: 'ma/vendue/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./features/ma/ma-vente/ma-vente.component').then(m => m.MaVenteComponent)
      },
      {
        path: 'admin/temoignages',
        canActivate: [authGuard],
        loadComponent: () => import('./features/admin/admin-temoignages.component').then(m => m.AdminTemoignagesComponent)
      },
      {
        path: 'admin/messages',
        canActivate: [authGuard],
        loadComponent: () => import('./features/admin/admin-messages.component').then(m => m.AdminMessagesComponent)
      },
      {
        path: 'admin/annonces',
        canActivate: [authGuard],
        loadComponent: () => import('./features/admin/admin-annonces.component').then(m => m.AdminAnnoncesComponent)
      },
      {
        path: 'admin/profils',
        canActivate: [authGuard],
        loadComponent: () => import('./features/admin/admin-profils.component').then(m => m.AdminProfilsComponent)
      },
      {
        // Publique : partie anonymisée pour tous, dossier complet chargé seulement si Supabase l'autorise.
        path: 'ma/annonce/:id',
        loadComponent: () => import('./features/ma/ma-detail/ma-detail.component').then(m => m.MaDetailComponent)
      },
      {
        path: 'abonnement',
        canActivate: [authGuard],
        loadComponent: () => import('./features/abonnement/abonnement.component').then(m => m.AbonnementComponent)
      },
      {
        path: 'parametres',
        canActivate: [authGuard],
        loadComponent: () => import('./features/parametres/parametres.component').then(m => m.ParametresComponent)
      },
      {
        // Adresse inconnue : page 404, avec la barre de navigation.
        path: '**',
        loadComponent: () => import('./features/not-found/not-found.component').then(m => m.NotFoundComponent)
      },
    ]
  }
];
