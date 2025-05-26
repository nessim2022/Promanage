import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable()
export class ApiUrlInterceptor implements HttpInterceptor {
  constructor() {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Ne pas modifier les URLs absolues
    if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
      console.log(`URL absolue détectée, pas d'interception: ${request.url}`);
      return next.handle(request);
    }

    // Déterminer l'URL de base
    let baseUrl = environment.apiUrl;
    let withCredentials = false;

    // Utiliser backendUrl pour les routes d'authentification
    if (request.url.startsWith('/auth/')) {
      baseUrl = environment.backendUrl;
      withCredentials = true; // Activer withCredentials pour /auth/*
    }

    // Nettoyer l'URL pour éviter le double /api/
    const cleanedUrl = request.url.replace(/^\/api\//, '/').replace(/^\/+/, '/');

    // Récupérer le token JWT (sauf pour /auth/* et /api/gitlab/validate-gitlab-url)
    let headers = request.headers;
    if (!request.url.startsWith('/auth/') && !request.url.includes('/api/gitlab/validate-gitlab-url')) {
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      } else {
        console.warn('Aucun token JWT trouvé pour la requête:', cleanedUrl);
      }
    }

    // Créer la nouvelle requête
    const apiReq = request.clone({
      url: `${baseUrl}${cleanedUrl}`,
      headers: headers,
      withCredentials: withCredentials
    });

    console.log(`URL interceptée: ${request.url} -> ${apiReq.url}`);
    return next.handle(apiReq);
  }
}