import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { FeatureName, isEnabled } from '../config/features';

// Route d'un module masqué au lancement (core/config/features.ts) : retour à l'accueil.
export function featureGuard(feature: FeatureName): CanActivateFn {
  return () => isEnabled(feature) || inject(Router).createUrlTree(['/']);
}
