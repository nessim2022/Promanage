import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { LoginCredentials, RegisterData, AuthResponse } from '../models/auth.models';
import { jwtDecode } from 'jwt-decode';
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private isAuthenticated = new BehaviorSubject<boolean>(this.hasToken());

  constructor(private http: HttpClient) {}

  register(userData: RegisterData): Observable<AuthResponse> {
    const registerUrl = '/auth/register';
    console.log(`Service: Envoi de la requête d'inscription à ${registerUrl}`);
    
    return this.http.post<AuthResponse>(registerUrl, userData)
      .pipe(
        tap(response => console.log('Service: Réponse d\'inscription reçue:', response)),
        catchError(this.handleError('Inscription', userData))
      );
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    // Supprimer les tokens existants avant la connexion
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.isAuthenticated.next(false);

    const loginUrl = '/auth/login';
    return this.http.post<any>(loginUrl, credentials).pipe(
      tap((response: any) => {
        // 1. Extraction du token
        let token = null;
        const possibleKeys = [
          'token', 'accessToken', 'authToken', 'access_token', 'auth_token'
        ];
        for (const key of possibleKeys) {
          if (response[key]) {
            token = response[key];
            break;
          }
        }
        if (!token && response.data && response.data.token) {
          token = response.data.token;
        }
        // Fallback : chercher n'importe quelle propriété contenant 'token'
        if (!token) {
          for (const key in response) {
            if (typeof response[key] === 'string' && key.toLowerCase().includes('token')) {
              token = response[key];
              break;
            }
          }
        }
        // 2. Stockage du token
        if (token) {
          localStorage.setItem(this.TOKEN_KEY, token);
          const decoded: any = jwtDecode (token); const user = {
            email: decoded.sub,
            roles: decoded.roles 
          };
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
        } else {
          console.error('Aucun token trouvé dans la réponse');
        }

        // 3. Extraction et stockage de l'utilisateur
      //   let user = response.user || response.userData || (response.data && response.data.user) || null;
      //   debugger;
      //   console.log('User:', user);
      //   if (user) {
      //     localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      //   } else if (credentials && credentials.email === 'admin@example.com') {
      //     // Fallback for super admin if backend does not return user object
      //     const fallbackUser = {
      //       email: credentials.email,
      //       roles: [{ authority: 'superAdmin' }]
      //     };
      //     localStorage.setItem(this.USER_KEY, JSON.stringify(fallbackUser));
      //   }
      //   this.isAuthenticated.next(!!token);
      }),
      catchError(this.handleError('Connexion', credentials))
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.isAuthenticated.next(false);
    console.log('Déconnexion effectuée');
  }

  isLoggedIn(): boolean {
    const hasToken = this.hasToken();
    console.log('Vérification d\'authentification - Token présent:', hasToken);
    return hasToken;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  public getCurrentUser(): any {
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
    return !!this.getToken();
  }

  public isSuperAdmin(): boolean {
  const user = this.getCurrentUser();
  // Super admin: either by email or by role
  return (
    user && (
      user.email === 'admin@example.com' ||
      (user.roles && Array.isArray(user.roles) && user.roles.some((role: { authority: string }) => role.authority === 'superAdmin'))
    )
  );
}

public getUserEmail(): string | null {
  const user = this.getCurrentUser();
  return user && user.email ? user.email : null;
}

public getUserProjectIds(): string[] {
  const user = this.getCurrentUser();
  // Adapt this if your user object structure is different!
  return user && user.projects ? user.projects : [];
}


  // Gestionnaire d'erreur amélioré pour les opérations d'authentification
  private handleError(operation: string, data?: any) {
    return (error: HttpErrorResponse): Observable<never> => {
      console.error(`Erreur lors de l'opération ${operation}:`, error);
      
      // Logs détaillés pour le débogage
      console.log('Détails de la requête:', {
        operation,
        data,
        status: error.status,
        statusText: error.statusText,
        message: error.message,
        error: error.error
      });
      
      // Messages d'erreur plus informatifs basés sur le type d'erreur
      let errorMessage = '';
      
      if (error.status === 0) {
        errorMessage = 'Problème de réseau ou serveur inaccessible.';
      } else if (error.status === 400) {
        errorMessage = 'Données invalides. Veuillez vérifier vos informations.';
        
        // Si une erreur spécifique est retournée par le serveur
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
      
      return throwError(() => ({
        status: error.status,
        message: errorMessage,
        originalError: error
      }));
    };
  }
}
