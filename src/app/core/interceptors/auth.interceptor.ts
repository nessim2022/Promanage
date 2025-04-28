import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  constructor(private authService: AuthService, private router: Router) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
   
    // Ne pas ajouter le token pour les requêtes d'authentification
    if (request.url.includes('/auth/login') || request.url.includes('/auth/register')) {
      return next.handle(request);
    }

    let authReq = request;
    if (token) {
      authReq = request.clone({
        headers: request.headers.set('Authorization', `Bearer ${token}`)
      });
    }

    return next.handle(authReq).pipe(
      tap(event => {
        // Si la requête réussit et que l'utilisateur est authentifié, enregistrer dans localStorage
        console.log('this auth:', this.authService.isLoggedIn());
        if (this.authService.isLoggedIn()) {
          const user = this.authService.getCurrentUser();
          console.log('User:', user);
          if (user) {
            localStorage.setItem('auth_user', JSON.stringify(user));
          }
        }
      }),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          // Redirection vers login si session expirée
          this.router.navigate(['/login']);
        }
        return throwError(() => error);
      })
    );
  }
}