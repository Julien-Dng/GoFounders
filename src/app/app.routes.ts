import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { maAccessGuard } from './core/guards/ma-access.guard';
import { planGuard } from './core/guards/plan.guard';

export const routes: Routes = [
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
        path: 'inscription',
        loadComponent: () => import('./features/inscription/inscription.component').then(m => m.InscriptionComponent)
      },
      {
        path: 'connexion',
        loadComponent: () => import('./features/auth/connexion/connexion.component').then(m => m.ConnexionComponent)
      },
      {
        path: 'ma',
        loadComponent: () => import('./features/ma/ma-home/ma-home.component').then(m => m.MaHomeComponent)
      },
      // Routes protégées (auth requise)
      {
        path: 'recherche',
        canActivate: [authGuard],
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
        canActivate: [authGuard, planGuard],
        data: { requiredPlan: 'PRO' },
        loadComponent: () => import('./features/coaching-ia/coaching-ia.component').then(m => m.CoachingIaComponent)
      },
      {
        path: 'generateur-pitch',
        canActivate: [authGuard, planGuard],
        data: { requiredPlan: 'PRO' },
        loadComponent: () => import('./features/pitch/pitch.component').then(m => m.PitchComponent)
      },
      {
        path: 'ma/deposer',
        canActivate: [authGuard],
        loadComponent: () => import('./features/ma/ma-deposer/ma-deposer.component').then(m => m.MaDeposerComponent)
      },
      {
        path: 'ma/annonce/:id',
        canActivate: [authGuard, maAccessGuard],
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
    ]
  },
  // Dashboard (layout propre, sans navbar publique)
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
