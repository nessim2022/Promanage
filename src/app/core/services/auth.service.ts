import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../../environments/environment';
import { MessageService } from 'primeng/api';
import { Router } from '@angular/router';

// Interfaces pour les types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  authenticationToken: string;
  refreshToken: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private isAuthenticated = new BehaviorSubject<boolean>(this.hasToken());

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private router: Router
  ) {}

  register(userData: RegisterData): Observable<AuthResponse> {
    const registerUrl = `${environment.backendUrl}/auth/register`;
    console.log(`Service: Envoi de la requête d'inscription à ${registerUrl}`);
    
    return this.http.post<AuthResponse>(registerUrl, userData).pipe(
      tap(response => {
        console.log('Service: Réponse d\'inscription reçue:', response);
        this.messageService.add({
          severity: 'success',
          summary: 'Inscription réussie',
          detail: 'Votre compte a été créé avec succès.'
        });
      }),
      catchError(this.handleError('Inscription', userData))
    );
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.isAuthenticated.next(false);

    const loginUrl = `${environment.backendUrl}/auth/login`;
    console.log(`Tentative de connexion avec l'URL: ${loginUrl}`);
    
    const httpOptions = {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      withCredentials: true
    };
    
    return this.http.post<AuthResponse>(loginUrl, credentials, httpOptions).pipe(
      tap((response: AuthResponse) => {
        console.log('Réponse complète de login:', JSON.stringify(response, null, 2));
        const token = response.authenticationToken;
        if (token) {
          console.log('Token trouvé et stocké:', token);
          localStorage.setItem(this.TOKEN_KEY, token);
          const decoded: any = jwtDecode(token);
          console.log('Payload du token:', decoded);
          const user = {
            email: decoded.sub,
            roles: decoded.roles || decoded.authorities || []
          };
          console.log('Utilisateur stocké:', user);
          if (!user.roles.includes('ROLE_USER')) {
            console.warn('ROLE_USER manquant dans le token');
          }
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
          this.isAuthenticated.next(true);
        } else {
          console.error('Aucun token trouvé dans la réponse:', response);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de connexion',
            detail: 'Aucun token reçu du serveur.'
          });
        }
      }),
      catchError(this.handleError('Connexion', credentials))
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.isAuthenticated.next(false);
    console.log('Déconnexion effectuée');
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const hasToken = this.hasToken();
    console.log('Vérification d\'authentification - Token présent:', hasToken);
    // Mettre à jour le BehaviorSubject si nécessaire
    if (hasToken !== this.isAuthenticated.value) {
      this.isAuthenticated.next(hasToken);
    }
    return hasToken;
  }

  getToken(): string | null {
    const token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      console.log('Aucun token trouvé dans le localStorage');
      return null;
    }
    
    try {
      // Vérifier si le token est expiré
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp && decoded.exp < currentTime) {
        console.warn('Token expiré, déconnexion automatique');
        this.logout();
        return null;
      }
      
      return token;
    } catch (error) {
      console.error('Erreur lors de la vérification du token:', error);
      return token; // Retourner le token même s'il ne peut pas être décodé
    }
  }

  getCurrentUser(): any {
    const userString = localStorage.getItem(this.USER_KEY);
    if (userString) {
      try {
        return JSON.parse(userString);
      } catch (e) {
        console.error('Erreur lors de la récupération des données utilisateur:', e);
        return null;
      }
    }
    return null;
  }

  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  private setUser(user: any): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private hasToken(): boolean {
    const token = this.getToken();
    return !!token && token.length > 10; // Vérification basique que le token semble valide
  }

  isSuperAdmin(): boolean {
    const user = this.getCurrentUser();
    return (
      user &&
      (user.email === 'admin@example.com' ||
        (user.roles &&
          Array.isArray(user.roles) &&
          user.roles.some((role: string) => role === 'superAdmin')))
    );
  }

  getUserEmail(): string | null {
    const user = this.getCurrentUser();
    return user && user.email ? user.email : null;
  }

  getUserProjectIds(): string[] {
    const user = this.getCurrentUser();
    return user && user.projects ? user.projects : [];
  }

  private handleError(operation: string, data?: any) {
    return (error: HttpErrorResponse): Observable<never> => {
      console.error(`Erreur lors de l'opération ${operation}:`, error);
      
      console.log('Détails de la requête:', {
        operation,
        data,
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        error: error.error
      });
      
      let errorMessage = '';
      
      if (error.status === 0) {
        errorMessage = 'Problème de réseau ou serveur inaccessible.';
      } else if (error.status === 400) {
        errorMessage = 'Données invalides. Veuillez vérifier vos informations.';
        if (error.error && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        }
      } else if (error.status === 401) {
        errorMessage = 'Authentification échouée. Identifiants incorrects.';
      } else if (error.status === 403) {
        errorMessage = 'Accès refusé. Vous n\'êtes pas autorisé à effectuer cette action.';
      } else if (error.status === 409) {
        errorMessage = 'Un compte avec cette adresse email existe déjà.';
      } else if (error.status === 500) {
        errorMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
      } else {
        errorMessage = `Erreur ${error.status}: ${error.error?.message || error.statusText || 'Erreur inconnue'}`;
      }
      
      this.messageService.add({
        severity: 'error',
        summary: `Erreur lors de ${operation}`,
        detail: errorMessage
      });
      
      return throwError(() => ({
        status: error.status,
        message: errorMessage,
        originalError: error
      }));
    };
  }
}