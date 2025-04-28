
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  console.log('Auth Guard activé - Vérification de l\'authentification');
  console.log('Route demandée:', state.url);
  
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    console.log('Utilisateur authentifié - Accès autorisé');
    return true;
  } else {
    console.log('Utilisateur non authentifié - Redirection vers la page de connexion');
    router.navigate(['/login']);
    return false;
  }
};