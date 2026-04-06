import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  
  // Prepend backend URL
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const backendUrl = isLocalhost ? 'http://127.0.0.1:3000' : 'https://community-ai-manager-backend-production.up.railway.app';
  const apiReq = req.clone({
    url: req.url.startsWith('/') ? `${backendUrl}${req.url}` : req.url
  });

  let authReq = apiReq;
  // Attach auth token if available
  const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
  if (token) {
    authReq = apiReq.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Clear tokens and redirect to login
        localStorage.removeItem('admin_token');
        if (router.url.includes('/admin')) {
           router.navigate(['/admin/login']);
        }
      }
      return throwError(() => error);
    })
  );
};
