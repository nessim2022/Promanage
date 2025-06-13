
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HttpClientModule, HttpClient } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { GitlabService } from '../../core/services/gitlab.service';

@Component({
  selector: 'app-gitlab-integration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    ToastModule,
    HttpClientModule
  ],
  providers: [MessageService],
  template: `
    <div class="gitlab-integration-container">
      <p-card>
        <ng-template pTemplate="header">
          <div class="flex align-items-center justify-content-between p-3">
            <h2>Intégration GitLab</h2>
          </div>
        </ng-template>
        
        <div class="p-fluid">
          <div class="field">
            <label for="gitlabUrl">URL du projet GitLab</label>
            <div class="p-inputgroup">
              <input 
                id="gitlabUrl" 
                type="text" 
                pInputText 
                [(ngModel)]="gitlabUrl" 
                placeholder="https://gitlab.com/votre-groupe/votre-projet"
              />
              <button 
                type="button" 
                pButton 
                icon="pi pi-check" 
                (click)="validateUrl()"
                [disabled]="loading || !gitlabUrl"
                [loading]="loading"
              ></button>
            </div>
          </div>
          
          <div *ngIf="projectId" class="mt-3">
            <button 
              pButton 
              label="Synchroniser avec GitLab" 
              icon="pi pi-sync" 
              (click)="syncProject()"
              [disabled]="syncLoading"
              [loading]="syncLoading"
            ></button>
          </div>
        </div>
        
        <div *ngIf="error" class="p-error mt-3">
          {{ errorMessage }}
        </div>
        
        <div *ngIf="success" class="p-success mt-3">
          {{ successMessage }}
        </div>
      </p-card>
      
      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .gitlab-integration-container {
      padding: 1rem;
    }
    .mt-3 {
      margin-top: 1rem;
    }
    .p-success {
      color: var(--green-600);
    }
  `]
})
export class GitlabIntegrationComponent implements OnInit {
  @Input() projectId: number = 0;
  @Input() gitlabUrl: string = '';
  loading: boolean = false;
  syncLoading: boolean = false;
  error: boolean = false;
  success: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private messageService: MessageService,
    private gitlabService: GitlabService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    // Initialisation du composant
  }

  validateUrl() {
    if (!this.gitlabUrl) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez entrer une URL GitLab valide'
      });
      return;
    }
    
    this.loading = true;
    this.error = false;
    this.success = false;
    
    console.log('Tentative de validation de l\'URL GitLab:', this.gitlabUrl);
    
    this.gitlabService.validateGitlabUrl(this.gitlabUrl)
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la validation de l\'URL GitLab:', error);
          console.error('Détails de l\'erreur:', error.status, error.statusText, error.message);
          this.error = true;
          this.errorMessage = `Impossible de valider l'URL GitLab: ${error.status === 0 ? 'Problème de connexion au serveur' : error.message || 'Erreur inconnue'}. Veuillez vérifier l'URL et réessayer.`;
          
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: this.errorMessage
          });
          
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe(members => {
        console.log('Résultat de la validation:', members);
        if (members && Array.isArray(members) && members.length > 0) {
          this.success = true;
          this.successMessage = 'URL GitLab validée avec succès';
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'URL GitLab validée avec succès'
          });
        } else {
          this.error = true;
          this.errorMessage = 'Aucun membre trouvé pour ce projet GitLab. Veuillez vérifier l\'URL et vos permissions.';
          this.messageService.add({
            severity: 'warn',
            summary: 'Attention',
            detail: this.errorMessage
          });
        }
      });
  }

  syncProject() {
    if (!this.projectId) return;
    
    this.syncLoading = true;
    this.error = false;
    this.success = false;
    
    this.gitlabService.syncGitLabProject(this.projectId)
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la synchronisation avec GitLab:', error);
          this.error = true;
          this.errorMessage = 'Impossible de synchroniser avec GitLab. Veuillez réessayer plus tard.';
          return of(false);
        }),
        finalize(() => {
          this.syncLoading = false;
        })
      )
      .subscribe(success => {
        if (success) {
          this.success = true;
          this.successMessage = 'Projet synchronisé avec GitLab';
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Projet synchronisé avec GitLab'
          });
        } else {
          this.error = true;
          this.errorMessage = 'La synchronisation a échoué. Veuillez réessayer plus tard.';
        }
      });
  }
}