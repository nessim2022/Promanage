import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

// Interfaces pour les modèles GitLab
interface GitLabMember {
  id: number;
  name: string;
  username: string;
  email: string;
  accessLevel: number;
  avatarUrl?: string;
}

interface AddMemberRequest {
  projectId: number;
  userId: number;
  accessLevel: number;
}

@Component({
  selector: 'app-gitlab-members',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    InputTextModule,
    ProgressBarModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="gitlab-members-container">
      <!-- Toast pour les notifications -->
      <p-toast></p-toast>
      <p-confirmDialog [style]="{width: '450px'}"></p-confirmDialog>
      
      <!-- En-tête de section -->
      <div class="section-header">
        <h2>Membres GitLab</h2>
        <!-- <button pButton pRipple type="button" icon="pi pi-plus" label="Ajouter un membre" 
                class="p-button-primary" (click)="openAddMemberDialog()" 
                *ngIf="authService.isSuperAdmin()"></button> -->
      </div>
      
      <!-- Indicateur de chargement -->
      <div *ngIf="loading" class="loading-container">
        <p-progressBar mode="indeterminate"></p-progressBar>
        <div class="loading-text">Chargement des membres GitLab...</div>
      </div>
      
      <!-- Message d'erreur -->
      <div *ngIf="error && !loading" class="error-container">
        <div class="error-message">
          <i class="pi pi-exclamation-triangle"></i>
          <span>{{ errorMessage }}</span>
        </div>
        <div class="retry-button">
          <button pButton pRipple type="button" label="Réessayer" (click)="loadMembers()"></button>
        </div>
      </div>
      
      <!-- Liste des membres -->
      <div *ngIf="!loading && !error" class="members-section">
        <!-- Aucun membre -->
        <div *ngIf="members.length === 0" class="no-members">
          <div class="empty-message">
            <i class="pi pi-info-circle"></i>
            <span>Aucun membre GitLab trouvé pour ce projet.</span>
          </div>
        </div>
        
        <!-- Table des membres -->
        <div *ngIf="members.length > 0" class="members-table">
          <p-table [value]="members" [paginator]="true" [rows]="5"
                  styleClass="p-datatable-striped" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th style="width: 50px"></th>
                <th>Nom</th>
                <th>Nom d'utilisateur</th>
                <th>Email</th>
                <th>Niveau d'accès</th>
                <th>Actions</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-member>
              <tr>
                <td>
                  <img [src]="member.avatarUrl || 'assets/images/default-avatar.png'" 
                       alt="Avatar" class="member-avatar" />
                </td>
                <td>{{ member.name }}</td>
                <td>{{ member.username }}</td>
                <td>{{ member.email }}</td>
                <td>{{ getAccessLevelLabel(member.accessLevel) }}</td>
                <td>
                  <div class="action-buttons" *ngIf="authService.isSuperAdmin()">
                    <button pButton type="button" icon="pi pi-pencil" class="p-button-rounded p-button-success p-button-sm"
                            pTooltip="Modifier le niveau d'accès" tooltipPosition="top"
                            (click)="openEditAccessLevelDialog(member)"></button>
                    <button pButton type="button" icon="pi pi-trash" class="p-button-rounded p-button-danger p-button-sm"
                            pTooltip="Retirer du projet" tooltipPosition="top"
                            (click)="confirmRemoveMember(member)"></button>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </div>
      
      <!-- Dialog d'ajout de membre -->
      <p-dialog [(visible)]="addMemberDialog" [style]="{width: '500px'}" header="Ajouter un membre GitLab" 
                [modal]="true" [closable]="!saving" [closeOnEscape]="!saving"
                [blockScroll]="true" styleClass="p-fluid">
        <div class="member-form">
          <div class="form-group">
            <label for="userEmail">Email de l'utilisateur <span class="required-field">*</span></label>
            <input id="userEmail" type="text" pInputText [(ngModel)]="newMemberEmail" 
                   placeholder="Entrez l'email de l'utilisateur" [disabled]="saving" />
            <small class="field-help">Entrez l'email de l'utilisateur à ajouter au projet GitLab.</small>
          </div>
          
          <div class="form-group">
            <label for="accessLevel">Niveau d'accès <span class="required-field">*</span></label>
            <p-dropdown id="accessLevel" [options]="accessLevels" 
                       [(ngModel)]="selectedAccessLevel" 
                       optionLabel="label"
                       optionValue="value"
                       placeholder="Sélectionner un niveau d'accès"
                       [disabled]="saving"></p-dropdown>
            <small class="field-help">Sélectionnez le niveau d'accès de l'utilisateur dans ce projet.</small>
          </div>
          
          <!-- Indicateur de progression -->
          <div *ngIf="saving" class="progress-container">
            <p-progressBar mode="indeterminate"></p-progressBar>
            <span class="progress-status">Traitement en cours...</span>
          </div>
        </div>
        
        <ng-template pTemplate="footer">
          <button pButton pRipple type="button" icon="pi pi-times" label="Annuler" 
                  class="p-button-text" (click)="addMemberDialog = false" [disabled]="saving"></button>
          <button pButton pRipple type="button" icon="pi pi-plus" label="Ajouter" 
                  class="p-button-primary" (click)="addMember()" 
                  [disabled]="!newMemberEmail || !selectedAccessLevel || saving">
          </button>
        </ng-template>
      </p-dialog>
      
      <!-- Dialog de modification du niveau d'accès -->
      <p-dialog [(visible)]="editAccessLevelDialog" [style]="{width: '500px'}" header="Modifier le niveau d'accès" 
                [modal]="true" [closable]="!saving" [closeOnEscape]="!saving"
                [blockScroll]="true" styleClass="p-fluid">
        <div class="access-level-form">
          <div class="member-info" *ngIf="selectedMember">
            <p><strong>Membre :</strong> {{ selectedMember.name }}</p>
            <p><strong>Email :</strong> {{ selectedMember.email }}</p>
            <p><strong>Niveau d'accès actuel :</strong> {{ getAccessLevelLabel(selectedMember.accessLevel) }}</p>
          </div>
          
          <div class="form-group">
            <label for="newAccessLevel">Nouveau niveau d'accès <span class="required-field">*</span></label>
            <p-dropdown id="newAccessLevel" [options]="accessLevels" 
                       [(ngModel)]="selectedAccessLevel" 
                       optionLabel="label"
                       optionValue="value"
                       placeholder="Sélectionner un niveau d'accès"
                       [disabled]="saving"></p-dropdown>
          </div>
          
          <!-- Indicateur de progression -->
          <div *ngIf="saving" class="progress-container">
            <p-progressBar mode="indeterminate"></p-progressBar>
            <span class="progress-status">Modification en cours...</span>
          </div>
        </div>
        
        <ng-template pTemplate="footer">
          <button pButton pRipple type="button" icon="pi pi-times" label="Annuler" 
                  class="p-button-text" (click)="editAccessLevelDialog = false" [disabled]="saving"></button>
          <button pButton pRipple type="button" icon="pi pi-check" label="Enregistrer" 
                  class="p-button-primary" (click)="updateMemberAccessLevel()" 
                  [disabled]="!selectedAccessLevel || saving">
          </button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .gitlab-members-container {
      margin-bottom: 30px;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .loading-container {
      margin: 20px 0;
    }
    
    .loading-text {
      margin-top: 10px;
      text-align: center;
      color: #666;
    }
    
    .error-container {
      margin: 20px 0;
      padding: 15px;
      border-radius: 4px;
      background-color: #ffebee;
      border: 1px solid #ffcdd2;
    }
    
    .error-message {
      display: flex;
      align-items: center;
      color: #d32f2f;
    }
    
    .error-message i {
      margin-right: 10px;
      font-size: 1.5rem;
    }
    
    .retry-button {
      margin-top: 15px;
      text-align: right;
    }
    
    .no-members {
      padding: 30px;
      text-align: center;
      background-color: #f5f5f5;
      border-radius: 4px;
    }
    
    .empty-message {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #666;
    }
    
    .empty-message i {
      font-size: 2rem;
      margin-bottom: 10px;
      color: #999;
    }
    
    .members-table {
      margin-top: 20px;
    }
    
    .action-buttons button {
      margin-right: 5px;
    }
    
    .member-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .form-group {
      margin-bottom: 20px;
    }
    
    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .required-field {
      color: #e74c3c;
    }
    
    .field-help {
      display: block;
      margin-top: 5px;
      color: #666;
      font-size: 0.85rem;
    }
    
    .progress-container {
      margin-top: 20px;
    }
    
    .progress-status {
      display: block;
      text-align: center;
      margin-top: 10px;
      color: #666;
    }
    
    .member-info {
      margin-bottom: 20px;
      padding: 15px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }
    
    .member-info p {
      margin: 5px 0;
    }
  `]
})
export class GitlabMembersComponent implements OnInit {
  @Input() projectId: number = 0;
  @Input() gitlabUrl: string = '';
  
  members: GitLabMember[] = [];
  loading: boolean = false;
  error: boolean = false;
  errorMessage: string = '';
  
  // Dialog d'ajout de membre
  addMemberDialog: boolean = false;
  newMemberEmail: string = '';
  selectedAccessLevel: number | null = null;
  selectedGitlabUserId: number | null = null;
  saving: boolean = false;
  
  // Dialog de modification du niveau d'accès
  editAccessLevelDialog: boolean = false;
  selectedMember: GitLabMember | null = null;
  
  // Niveaux d'accès GitLab
  accessLevels = [
    { label: 'Guest', value: 10 },
    { label: 'Reporter', value: 20 },
    { label: 'Developer', value: 30 },
    { label: 'Maintainer', value: 40 },
    { label: 'Owner', value: 50 }
  ];

  constructor(
    private http: HttpClient,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadMembers();
  }

  loadMembers() {
    if (!this.projectId && !this.gitlabUrl) {
      console.error('Aucun ID de projet ou URL GitLab fourni');
      this.error = true;
      this.errorMessage = 'Aucun ID de projet ou URL GitLab fourni';
      this.loading = false;
      return;
    }
    
    this.loading = true;
    this.error = false;
    
    // Afficher les valeurs reçues
    console.log('Valeurs reçues - projectId:', this.projectId, 'gitlabUrl:', this.gitlabUrl);
    
    // Utiliser l'URL ou l'ID du projet pour récupérer les membres
    const url = this.gitlabUrl ? 
      `/api/gitlab/validate-gitlab-url` : 
      `/api/gitlab/get-project-members`;
    
    // Créer un objet HttpParams pour les paramètres
    let httpParams = new HttpParams();
    
    if (this.gitlabUrl) {
      httpParams = httpParams.set('url', this.gitlabUrl);
    } else if (this.projectId) {
      httpParams = httpParams.set('projectId', this.projectId.toString());
    }
    
    console.log('Chargement des membres GitLab avec URL:', url, 'et paramètres:', httpParams.toString());
    
    // Ajouter des en-têtes d'authentification
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    this.http.get<GitLabMember[]>(url, {
      params: httpParams,
      headers,
      withCredentials: true // Ajouter cette option pour inclure les cookies dans la requête
    })
      .pipe(
        catchError(error => {
          console.error('Erreur lors du chargement des membres GitLab:', error);
          this.error = true;
          this.errorMessage = `Impossible de charger les membres GitLab. Erreur: ${error.status} ${error.statusText}. ${error.message || ''}`;
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe(members => {
        console.log('Réponse brute:', members);
        if (members && Array.isArray(members)) {
          this.members = members;
          console.log('Membres GitLab chargés:', this.members);
        } else {
          console.error('La réponse n\'est pas un tableau:', members);
          this.members = [];
          this.error = true;
          this.errorMessage = 'Format de réponse invalide. Veuillez contacter l\'administrateur.';
        }
      });
  }

  openAddMemberDialog() {
    this.addMemberDialog = true;
    this.newMemberEmail = '';
    this.selectedAccessLevel = null;
  }

  addMember() {
    if (!this.selectedGitlabUserId || !this.selectedAccessLevel) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez sélectionner un utilisateur GitLab et un niveau d\'accès.'
      });
      return;
    }
    this.saving = true;
    // 1. Récupérer l'ID GitLab du projet à partir de l'URL
    this.http.get<number>(`/api/gitlab/get-project-id?url=${this.gitlabUrl}`)
      .subscribe({
        next: (gitlabProjectId) => {
          const payload = {
            projectId: gitlabProjectId,
            userId: this.selectedGitlabUserId,
            accessLevel: this.selectedAccessLevel
          };
          console.log('Payload envoyé:', payload);
          // 2. Appeler l'API d'ajout de membre
          this.http.post<any>(`/api/gitlab/add-member`, payload)
            .pipe(
              catchError(error => {
                console.error('Erreur lors de l\'ajout du membre:', error);
                this.messageService.add({
                  severity: 'error',
                  summary: 'Erreur',
                  detail: error.error?.message || 'Impossible d\'ajouter le membre. Veuillez réessayer.'
                });
                return of(null);
              }),
              finalize(() => {
                this.saving = false;
              })
            )
            .subscribe(response => {
              if (response) {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Succès',
                  detail: 'Membre ajouté avec succès'
                });
                this.addMemberDialog = false;
                this.loadMembers();
              }
            });
        },
        error: (err) => {
          this.saving = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de récupérer l\'ID GitLab du projet. Vérifiez l\'URL.'
          });
        }
      });
  }

  openEditAccessLevelDialog(member: GitLabMember) {
    this.selectedMember = member;
    this.selectedAccessLevel = member.accessLevel;
    this.editAccessLevelDialog = true;
  }

  updateMemberAccessLevel() {
    if (!this.selectedMember || !this.selectedAccessLevel) {
      return;
    }
    
    this.saving = true;
    
    // Appel à l'API pour mettre à jour le niveau d'accès
    this.http.put<any>(`/api/gitlab/update-member-access`, {
      projectId: this.projectId,
      userId: this.selectedMember.id,
      accessLevel: this.selectedAccessLevel
    })
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la modification du niveau d\'accès:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de modifier le niveau d\'accès. Veuillez réessayer.'
          });
          return of(null);
        }),
        finalize(() => {
          this.saving = false;
        })
      )
      .subscribe(response => {
        if (response) {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Niveau d\'accès modifié avec succès'
          });
          this.editAccessLevelDialog = false;
          this.loadMembers(); // Recharger la liste des membres
        }
      });
  }

  confirmRemoveMember(member: GitLabMember) {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir retirer ${member.name} du projet GitLab ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.removeMember(member);
      }
    });
  }

  removeMember(member: GitLabMember) {
    this.http.delete<any>(`/api/gitlab/remove-member?projectId=${this.projectId}&userId=${member.id}`)
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la suppression du membre:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de retirer le membre. Veuillez réessayer.'
          });
          return of(null);
        })
      )
      .subscribe(response => {
        if (response !== null) {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Membre retiré avec succès'
          });
          this.loadMembers(); // Recharger la liste des membres
        }
      });
  }

  getAccessLevelLabel(accessLevel: number): string {
    const level = this.accessLevels.find(l => l.value === accessLevel);
    return level ? level.label : 'Inconnu';
  }
}