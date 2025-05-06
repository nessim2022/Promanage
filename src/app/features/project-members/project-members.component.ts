import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { ProgressBarModule } from 'primeng/progressbar';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { UserService, User, ProjectMember, Role } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-project-members',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    DropdownModule,
    ProgressBarModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="project-members-container">
      <!-- Toast pour les notifications -->
      <p-toast></p-toast>
      <p-confirmDialog [style]="{width: '450px'}"></p-confirmDialog>
      
      <!-- En-tête de section -->
      <div class="section-header">
        <h2>Membres du projet</h2>
        <button *ngIf="authService.isSuperAdmin()" pButton pRipple type="button" icon="pi pi-plus" label="Ajouter un membre" 
                class="p-button-primary" (click)="openAddMemberDialog()"></button>
      </div>
      
      <!-- Indicateur de chargement -->
      <div *ngIf="loading" class="loading-container">
        <p-progressBar mode="indeterminate"></p-progressBar>
        <div class="loading-text">Chargement des membres...</div>
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
            <span>Aucun membre dans ce projet.</span>
          </div>
        </div>
        
        <!-- Table des membres -->
        <div *ngIf="members.length > 0" class="members-table">
          <p-table [value]="members" [paginator]="true" [rows]="5"
                  styleClass="p-datatable-striped" responsiveLayout="scroll">
            <ng-template pTemplate="header">
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Date d'ajout</th>
                <th>Actions</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-member>
              <tr>
                <td>{{ member.firstName }} {{ member.lastName }}</td>
                <td>{{ member.email }}</td>
                <td>{{ member.role }}</td>
                <td>{{ member.joinDate | date:'dd/MM/yyyy' }}</td>
                <td>
                  <div class="action-buttons" *ngIf="authService.isSuperAdmin()">
                    <button pButton type="button" icon="pi pi-pencil" class="p-button-rounded p-button-success p-button-sm"
                            pTooltip="Modifier le rôle" tooltipPosition="top"
                            (click)="openEditRoleDialog(member)"></button>
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
      <p-dialog [(visible)]="addMemberDialog" [style]="{width: '500px'}" header="Ajouter un membre" 
                [modal]="true" [closable]="!saving" [closeOnEscape]="!saving"
                [blockScroll]="true" styleClass="p-fluid">
        <div class="member-form">
          <div class="form-group">
            <label for="userSelect">Utilisateur <span class="required-field">*</span></label>
            <p-dropdown id="userSelect" [options]="availableUsers" 
                       [(ngModel)]="selectedUser" 
                       optionLabel="email" 
                       placeholder="Sélectionner un utilisateur"
                       [disabled]="saving"></p-dropdown>
            <small class="field-help">Sélectionnez l'utilisateur à ajouter au projet.</small>
          </div>
          
          <div class="form-group">
            <label for="roleSelect">Rôle dans le projet <span class="required-field">*</span></label>
            <p-dropdown id="roleSelect" [options]="roles" 
                       [(ngModel)]="selectedRole" 
                       optionLabel="roleName"
                       placeholder="Sélectionner un rôle"
                       [disabled]="saving"></p-dropdown>
            <small class="field-help">Sélectionnez le rôle de l'utilisateur dans ce projet.</small>
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
                  [disabled]="!selectedUser || !selectedRole || saving">
          </button>
        </ng-template>
      </p-dialog>
      
      <!-- Dialog de modification de rôle -->
      <p-dialog [(visible)]="editRoleDialog" [style]="{width: '500px'}" header="Modifier le rôle" 
                [modal]="true" [closable]="!saving" [closeOnEscape]="!saving"
                [blockScroll]="true" styleClass="p-fluid">
        <div class="role-form">
          <div class="member-info" *ngIf="selectedMember">
            <p><strong>Membre :</strong> {{ selectedMember.firstName }} {{ selectedMember.lastName }}</p>
            <p><strong>Email :</strong> {{ selectedMember.email }}</p>
            <p><strong>Rôle actuel :</strong> {{ selectedMember.role }}</p>
          </div>
          
          <div class="form-group">
            <label for="newRoleSelect">Nouveau rôle <span class="required-field">*</span></label>
            <p-dropdown id="newRoleSelect" [options]="roles" 
                       [(ngModel)]="selectedRole" 
                       optionLabel="roleName"
                       placeholder="Sélectionner un rôle"
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
                  class="p-button-text" (click)="editRoleDialog = false" [disabled]="saving"></button>
          <button pButton pRipple type="button" icon="pi pi-check" label="Enregistrer" 
                  class="p-button-primary" (click)="updateMemberRole()" 
                  [disabled]="!selectedRole || saving">
          </button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .project-members-container {
      margin-bottom: 30px;
    }
    
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      
      h2 {
        margin: 0;
        font-size: 1.5rem;
        color: #333;
      }
    }
    
    .loading-container {
      margin: 30px 0;
      
      .loading-text {
        margin-top: 10px;
        text-align: center;
        color: #666;
      }
    }
    
    .error-container {
      margin: 20px 0;
      padding: 20px;
      border: 1px solid #f8d7da;
      border-radius: 4px;
      background-color: #fff3f3;
      
      .error-message {
        display: flex;
        align-items: center;
        color: #e74c3c;
        
        i {
          margin-right: 10px;
          font-size: 1.5rem;
        }
      }
      
      .retry-button {
        margin-top: 15px;
        text-align: center;
      }
    }
    
    .no-members {
      margin: 20px 0;
      padding: 40px 20px;
      text-align: center;
      background: #f9f9f9;
      border-radius: 8px;
      
      .empty-message {
        display: flex;
        justify-content: center;
        align-items: center;
        color: #666;
        
        i {
          margin-right: 10px;
          font-size: 1.5rem;
          color: #3498db;
        }
      }
    }
    
    .member-actions {
      display: flex;
      gap: 8px;
    }
    
    .progress-container {
      margin: 20px 0;
      
      .progress-status {
        display: block;
        text-align: center;
        margin-top: 8px;
        font-size: 0.9rem;
        color: #666;
      }
    }
    
    .member-info {
      margin-bottom: 20px;
      padding: 15px;
      background: #f9f9f9;
      border-radius: 4px;
      
      p {
        margin: 5px 0;
      }
    }
    
    .required-field {
      color: #e74c3c;
      margin-left: 3px;
    }
    
    .field-help {
      display: block;
      margin-top: 6px;
      color: #666;
      font-size: 0.85rem;
    }
  `]
})
export class ProjectMembersComponent implements OnInit {
  @Input() projectId!: number;
  
  members: ProjectMember[] = [];
  availableUsers: User[] = [];
  roles: Role[] = [];
  loading: boolean = false;
  error: boolean = false;
  errorMessage: string = '';
  
  // Dialog states
  addMemberDialog: boolean = false;
  editRoleDialog: boolean = false;
  saving: boolean = false;
  
  // Selected items
  selectedUser: User | null = null;
  selectedRole: Role | null = null;
  selectedMember: ProjectMember | null = null;

  constructor(
    private userService: UserService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    public authService: AuthService
  ) {}

  ngOnInit() {
    this.loadMembers();
    this.loadRoles();
  }

  loadMembers() {
    if (!this.projectId) {
      console.error('ProjectID is required');
      this.error = true;
      this.errorMessage = 'ID du projet manquant';
      return;
    }
    
    this.loading = true;
    this.error = false;
    
    // Assurez-vous que projectId est un nombre valide
    const projectId = Number(this.projectId);
    if (isNaN(projectId)) {
      console.error('ID de projet invalide:', this.projectId);
      this.error = true;
      return;
    }
    this.userService.getProjectMembers(projectId)
      .pipe(
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (data) => {
          this.members = data;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des membres du projet:', err);
          this.error = true;
          
          if (err.status === 404 && err.error?.message?.includes('No static resource')) {
            this.errorMessage = 'Problème d\'accès à la liste des membres. L\'URL de l\'API a été mise à jour, veuillez actualiser la page.';
          } else {
            this.errorMessage = 'Impossible de charger les membres du projet. Veuillez réessayer.';
          }
        }
      });
  }

  loadAvailableUsers() {
    this.userService.getAllUsers()
      .subscribe({
        next: (users) => {
          // Filter out users already in the project
          const memberIds = this.members.map(m => m.userId);
          this.availableUsers = users.filter(user => !memberIds.includes(user.userId));
        },
        error: (err) => {
          console.error('Failed to load available users:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger la liste des utilisateurs'
          });
        }
      });
  }

  loadRoles() {
    this.userService.getRoles()
      .subscribe({
        next: (roles) => {
          this.roles = roles;
        },
        error: (err) => {
          console.error('Failed to load roles:', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les rôles disponibles'
          });
        }
      });
  }

  openAddMemberDialog() {
    if (!this.authService.isSuperAdmin()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Accès refusé',
        detail: 'Seul le super administrateur peut ajouter des membres au projet.'
      });
      return;
    }
    this.selectedUser = null;
    this.selectedRole = null;
    this.addMemberDialog = true;
    this.loadAvailableUsers();
  }

  openEditRoleDialog(member: ProjectMember) {
    this.selectedMember = member;
    // Find the role object that matches the member's role
    this.selectedRole = this.roles.find(r => r.roleName === member.role) || null;
    this.editRoleDialog = true;
  }

  addMember() {
    if (!this.selectedUser || !this.selectedRole) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez sélectionner un utilisateur et un rôle'
      });
      return;
    }
    
    this.saving = true;
    
    this.userService.addUserToProject(this.projectId, this.selectedUser.userId, this.selectedRole.roleName)
      .pipe(
        finalize(() => {
          this.saving = false;
        })
      )
      .subscribe({
        next: () => {
          // Le message de succès est déjà affiché par le service utilisateur
          this.addMemberDialog = false;
          this.loadMembers();
        },
        error: (err) => {
          console.error('Failed to add member:', err);
          // Le message d'erreur est déjà affiché par le service utilisateur
        }
      });
  }

  updateMemberRole() {
    if (!this.authService.isSuperAdmin()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Accès refusé',
        detail: 'Seul le super administrateur peut modifier les rôles des membres.'
      });
      return;
    }
    if (!this.selectedMember || !this.selectedRole) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez sélectionner un rôle'
      });
      return;
    }
    
    this.saving = true;
    
    // First remove the user then add them again with the new role
    this.userService.removeUserFromProject(this.projectId, this.selectedMember.userId)
      .pipe(
        catchError(error => {
          console.error('Error removing user before role update:', error);
          return of(null);
        })
      )
      .subscribe(() => {
        this.userService.addUserToProject(this.projectId, this.selectedMember!.userId, this.selectedRole!.roleName)
          .pipe(
            finalize(() => {
              this.saving = false;
            })
          )
          .subscribe({
            next: () => {
              // Le message de succès est déjà affiché par le service utilisateur
              this.editRoleDialog = false;
              this.loadMembers();
            },
            error: (err) => {
              console.error('Failed to update role:', err);
              // Le message d'erreur est déjà affiché par le service utilisateur
            }
          });
      });
  }

  confirmRemoveMember(member: ProjectMember) {
    if (!this.authService.isSuperAdmin()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Accès refusé',
        detail: 'Seul le super administrateur peut supprimer des membres du projet.'
      });
      return;
    }
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir retirer ${member.firstName} ${member.lastName} du projet ?`,
      header: 'Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.removeMember(member);
      }
    });
  }

  removeMember(member: ProjectMember) {
    this.userService.removeUserFromProject(this.projectId, member.userId)
      .subscribe({
        next: () => {
          // Le message de succès est déjà affiché par le service utilisateur
          this.loadMembers();
        },
        error: (err) => {
          console.error('Failed to remove member:', err);
          // Le message d'erreur est déjà affiché par le service utilisateur
        }
      });
  }
}
