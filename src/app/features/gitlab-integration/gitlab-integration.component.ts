
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { HttpClientModule } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

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

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    // Initialisation du composant
  }

  validateUrl() {
    if (!this.gitlabUrl) return;
    
    this.loading = true;
    this.error = false;
    this.success = false;
    
    // Simulation d'une validation réussie
    setTimeout(() => {
      this.loading = false;
      this.success = true;
      this.successMessage = 'URL GitLab validée avec succès';
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'URL GitLab validée avec succès'
      });
    }, 1000);
  }

  syncProject() {
    if (!this.projectId) return;
    
    this.syncLoading = true;
    this.error = false;
    this.success = false;
    
    // Simulation d'une synchronisation réussie
    setTimeout(() => {
      this.syncLoading = false;
      this.success = true;
      this.successMessage = 'Projet synchronisé avec GitLab';
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'Projet synchronisé avec GitLab'
      });
    }, 1500);
  }
}