import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Plan } from '../models/user.model';

const PLAN_RANK: Record<Plan, number> = { FREE: 0, PRO: 1, PREMIUM: 2 };

export const planGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const requiredPlan = (route.data['requiredPlan'] as Plan) ?? 'PRO';
  const userPlan = auth.plan();

  if (PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan]) {
    return true;
  }

  return router.createUrlTree(['/tarifs']);
};
