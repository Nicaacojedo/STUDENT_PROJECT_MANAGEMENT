import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const router = inject(Router);
  const token = localStorage.getItem('spms_token');
  const authenticated = token
    ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : request;

  return next(authenticated).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthCall = request.url.includes('/auth/login') || request.url.includes('/auth/register');
      if (error.status === 401 && !isAuthCall) {
        localStorage.removeItem('spms_token');
        localStorage.removeItem('spms_user');
        router.navigate(['/login'], { queryParams: { expired: '1' } });
      }
      return throwError(() => error);
    }),
  );
};
