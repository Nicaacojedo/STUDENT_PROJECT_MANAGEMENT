import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.token()) return true;
  return router.createUrlTree(['/login']);
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.token()) return true;
  return router.createUrlTree(['/dashboard']);
};

export const roleGuard = (roles: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.token()) return router.createUrlTree(['/login']);
  if (!roles.includes(auth.role())) return router.createUrlTree(['/dashboard']);
  return true;
};

export const adminGuard = roleGuard(['Admin']);
export const adviserOrAdminGuard = roleGuard(['Adviser', 'Admin']);
