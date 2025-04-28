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
import { RegisterData } from '../../core/models/auth.models';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-register',
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
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  registerForm: FormGroup;
  loading = false;
  errorMessage = '';
  statusCode = 0;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {
    this.registerForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      termsAccepted: [false, Validators.requiredTrue]
    }, { validator: this.passwordMatchValidator });
  }

  register() {
    if (this.registerForm.valid) {
      this.loading = true;
      this.errorMessage = '';
      this.statusCode = 0;
      this.registerForm.disable();

      const registerData: RegisterData = {
        firstName: this.registerForm.value.firstName,
        lastName: this.registerForm.value.lastName,
        email: this.registerForm.value.email,
        password: this.registerForm.value.password
      };

      console.log('Tentative d\'inscription avec les données:', registerData);

      this.authService.register(registerData)
        .pipe(
          finalize(() => {
            this.loading = false;
            this.registerForm.enable();
          })
        )
        .subscribe({
          next: (response) => {
            console.log('Réponse d\'inscription réussie:', response);
            this.statusCode = 200;
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Inscription réussie !'
            });
            
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 1000);
          },
          error: (error: HttpErrorResponse) => {
            console.error('Erreur d\'inscription:', error);
            this.statusCode = error.status || 0;
            
            // Gestion améliorée des erreurs
            if (error.status === 0) {
              this.errorMessage = 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion internet.';
            } else if (error.status === 500) {
              this.errorMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard ou contacter le support.';
            } else {
              this.errorMessage = error.error?.message || 'Échec de l\'inscription. Veuillez réessayer.';
            }
            
            this.messageService.add({
              severity: 'error',
              summary: `Erreur (${this.statusCode})`,
              detail: this.errorMessage
            });
          }
        });
    } else {
      this.markFormGroupTouched(this.registerForm);
      
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez remplir tous les champs obligatoires.'
      });
    }
  }

  private passwordMatchValidator(g: FormGroup) {
    return g.get('password')?.value === g.get('confirmPassword')?.value
      ? null
      : { mismatch: true };
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
