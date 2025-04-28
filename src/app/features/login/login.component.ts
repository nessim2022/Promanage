import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';
import { finalize } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import { LoginCredentials } from '../../core/models/auth.models';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    CardModule,
    ToastModule,
    CheckboxModule
  ],
  providers: [MessageService],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';
  statusCode = 0;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      rememberMe: [false]
    });
  }

  login() {
    if (this.loginForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      this.statusCode = 0;
      this.loginForm.disable();

      const credentials: LoginCredentials = {
        email: this.loginForm.value.email,
        password: this.loginForm.value.password
      };

      console.log('Tentative de connexion avec:', credentials.email);

      this.authService.login(credentials)
        .pipe(
          finalize(() => {
            this.loading = false;
            this.loginForm.enable();
          })
        )
        .subscribe({
          next: (response) => {
            console.log('Connexion réussie, réponse:', response);
            this.statusCode = 200;
            
            // Vérifier si le token a été correctement stocké
            const token = localStorage.getItem('auth_token');
            console.log('Token stocké après connexion:', token ? (token.substring(0, 10) + '...') : 'null');
            
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Connexion réussie, redirection...'
            });
            
            // Attendre que le message s'affiche puis rediriger
            setTimeout(() => {
              // Force la navigation directe pour recharger complètement l'application 
              // et s'assurer que le token est appliqué
              window.location.href = '/dashboard';
            }, 1000);
          },
          error: (error: HttpErrorResponse) => {
            console.error('Erreur de connexion détaillée:', error);
            
            // Ajouter plus de détails pour le débogage
            if (error.error) {
              console.log('Contenu de l\'erreur:', error.error);
            }
            
            this.statusCode = error.status || 0;
            
            // Gestion améliorée des erreurs
            if (error.status === 0) {
              this.errorMessage = 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.';
            } else if (error.status === 401) {
              this.errorMessage = 'Email ou mot de passe incorrect.';
            } else if (error.status === 500) {
              this.errorMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
            } else {
              this.errorMessage = error.error?.message || 'Échec de la connexion. Veuillez réessayer.';
            }
            
            this.messageService.add({
              severity: 'error',
              summary: `Erreur (${this.statusCode})`,
              detail: this.errorMessage
            });
          }
        });
    } else {
      this.markFormGroupTouched(this.loginForm);
      
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez remplir tous les champs obligatoires.'
      });
    }
  }

  private markFormGroupTouched(formGroup: FormGroup) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }
}
