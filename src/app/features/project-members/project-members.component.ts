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
import { InputTextModule } from 'primeng/inputtext';
import { HttpClient } from '@angular/common/http';
import { DocumentService } from '../../core/services/document.service';

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
    ConfirmDialogModule,
    InputTextModule
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
        <div class="header-buttons">
          <button *ngIf="authService.isSuperAdmin()" pButton pRipple type="button" icon="pi pi-plus" label="Ajouter un membre" 
                  class="p-button-primary" (click)="openAddMemberDialog()"></button>
          <!-- <button *ngIf="authService.isSuperAdmin()" pButton pRipple type="button" icon="pi pi-github" label="Ajouter un membre GitLab" 
                  class="p-button-secondary ml-2" (click)="openAddGitLabMemberDialog()"></button> -->
        </div>
      </div>
      
      <!-- Indicateur de chargement -->
      <!-- <div *ngIf="loading" class="loading-container">
        <p-progressBar mode="indeterminate"></p-progressBar>
        <div class="loading-text">Chargement des membres...</div>
      </div> -->
      
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
        <!-- <div *ngIf="members.length === 0" class="no-members">
          <div class="empty-message">
            <i class="pi pi-info-circle"></i>
            <span>Aucun membre dans ce projet.</span>
          </div>
        </div> -->
        
        <!-- Table des membres -->
        <!-- <div *ngIf="members.length > 0" class="members-table">
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
      </div> -->
      
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

      <!-- Dialog d'ajout de membre GitLab -->
      <p-dialog [(visible)]="addGitLabMemberDialog" [style]="{width: '500px'}" header="Ajouter un membre GitLab" 
                [modal]="true" [closable]="!savingGitLab" [closeOnEscape]="!savingGitLab"
                [blockScroll]="true" styleClass="p-fluid">
        <div class="member-form">
          <div *ngIf="gitlabMembers.length === 0" class="empty-message">
            <i class="pi pi-info-circle"></i>
            <span>Aucun utilisateur GitLab trouvé pour ce projet.</span>
          </div>
          <div class="form-group">
            <label for="gitlabProjectUrl">URL du projet GitLab <span class="required-field">*</span></label>
            <input id="gitlabProjectUrl" type="text" pInputText [(ngModel)]="gitlabProjectUrl" 
                   placeholder="https://gitlab.com/votre-groupe/votre-projet" [disabled]="savingGitLab"
                   (blur)="onGitlabProjectUrlChange(gitlabProjectUrl)" />
            <small class="field-help">Entrez l'URL du projet GitLab.</small>
          </div>
          <div class="form-group">
            <label for="gitlabUserSelect">Utilisateur GitLab <span class="required-field">*</span></label>
            <p-dropdown id="gitlabUserSelect"
                        [options]="gitlabMembers"
                        [(ngModel)]="selectedGitlabUser"
                        optionLabel="email"
                        optionValue="userId"
                        placeholder="Sélectionner un utilisateur"
                        (onChange)="onGitlabUserChange($event.value)"></p-dropdown>
            <small class="field-help">Sélectionnez l'utilisateur GitLab à ajouter.</small>
          </div>
          <div class="form-group">
            <label for="gitlabAccessLevel">Niveau d'accès <span class="required-field">*</span></label>
            <p-dropdown id="gitlabAccessLevel" [options]="gitlabAccessLevels" 
                       [(ngModel)]="selectedGitLabAccessLevel" 
                       optionLabel="label"
                       optionValue="value"
                       placeholder="Sélectionner un niveau d'accès"
                       [disabled]="savingGitLab"
                       (onChange)="onAccessLevelChange($event.value)"></p-dropdown>
            <small class="field-help">Sélectionnez le niveau d'accès de l'utilisateur dans ce projet GitLab.</small>
          </div>
          <!-- Indicateur de progression -->
          <div *ngIf="savingGitLab" class="progress-container">
            <p-progressBar mode="indeterminate"></p-progressBar>
            <span class="progress-status">Traitement en cours...</span>
          </div>
          <div>projectId = {{ gitlabProjectId }}, userId = {{ gitlabUserId }}, accessLevel = {{ selectedGitLabAccessLevel }}</div>
        </div>
        <ng-template pTemplate="footer">
          <button pButton pRipple type="button" icon="pi pi-times" label="Annuler" 
                  class="p-button-text" (click)="addGitLabMemberDialog = false" [disabled]="savingGitLab"></button>
          <button pButton pRipple type="button" icon="pi pi-plus" label="Ajouter" 
                  class="p-button-primary" (click)="addGitLabMember()" 
                  [disabled]="!gitlabProjectId || !gitlabUserId || !selectedGitLabAccessLevel || savingGitLab">
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

      .header-buttons {
        display: flex;
        gap: 10px;
      }

      .ml-2 {
        margin-left: 0.5rem;
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
  @Input() project: any;
  
  members: ProjectMember[] = [];
  availableUsers: User[] = [];
  roles: Role[] = [];
  loading: boolean = false;
  error: boolean = false;
  errorMessage: string = '';
  
  // Dialog states
  addMemberDialog: boolean = false;
  editRoleDialog: boolean = false;
  addGitLabMemberDialog: boolean = false;
  saving: boolean = false;
  savingGitLab: boolean = false;
  
  // Selected items
  selectedUser: User | null = null;
  selectedRole: Role | null = null;
  selectedMember: ProjectMember | null = null;

  // GitLab member fields
  gitlabProjectUrl: string = '';
  gitlabUserId: string = '';
  selectedGitLabAccessLevel: number | null = null;
  gitlabAccessLevels = [
    { label: 'Guest', value: 10 },
    { label: 'Reporter', value: 20 },
    { label: 'Developer', value: 30 },
    { label: 'Maintainer', value: 40 },
    { label: 'Owner', value: 50 }
  ];

  gitlabMembers: any[] = [];
  selectedGitlabUser: any = null;

  gitlabProjectId: number | null = null;

  selectedFile: File | null = null;
  documentTitle: string = '';
  selectedProjectId: number | null = null;

  constructor(
    private userService: UserService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private http: HttpClient,
    public authService: AuthService,
    private documentService: DocumentService
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
        error: (err: any) => {
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
          // S'assurer que chaque rôle a un accessLevel numérique
          this.roles = roles.map(r => ({
            ...r,
            accessLevel: typeof r.accessLevel === 'number' ? r.accessLevel : this.getAccessLevelForRoleName(r.roleName)
          }));
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

  // Fonction utilitaire pour mapper roleName -> accessLevel
  getAccessLevelForRoleName(roleName: string): number {
    switch (roleName) {
      case 'Guest': return 10;
      case 'Reporter': return 20;
      case 'Developer': return 30;
      case 'Maintainer': return 40;
      case 'Owner': return 50;
      default: return 30; // Par défaut Developer
    }
  }

  // Méthodes publiques pour le template
  public openAddMemberDialog() { this._openAddMemberDialog(); }
  public openAddGitLabMemberDialog() { this._openAddGitLabMemberDialog(); }
  public openEditRoleDialog(member: ProjectMember) { this._openEditRoleDialog(member); }
  public confirmRemoveMember(member: ProjectMember) { this._confirmRemoveMember(member); }
  public addMember() { this._addMember(); }
  public updateMemberRole() { this._updateMemberRole(); }
  public onGitlabProjectUrlChange(url: string) { this._onGitlabProjectUrlChange(url); }
  public onGitlabUserChange(userId: number) { this._onGitlabUserChange(userId); }
  public onAccessLevelChange(level: number) { this._onAccessLevelChange(level); }
  public addGitLabMember() { this._addGitLabMember(); }

  // Implémentations privées (préfixées par _)
  private _openAddMemberDialog() {
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
    // Initialiser automatiquement l'URL GitLab du projet si disponible
    if ((this as any).project && (this as any).project.gitlabURL) {
      this.gitlabProjectUrl = (this as any).project.gitlabURL;
    }
    this.addMemberDialog = true;
    this.loadAvailableUsers();
  }

  private _openAddGitLabMemberDialog() {
    if (!this.authService.isSuperAdmin()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Accès refusé',
        detail: 'Seul le super administrateur peut ajouter des membres à GitLab.'
      });
      return;
    }
    this.gitlabProjectUrl = '';
    this.gitlabUserId = '';
    this.selectedGitLabAccessLevel = null;
    this.selectedGitlabUser = null;
    this.gitlabMembers = [];
    this.addGitLabMemberDialog = true;
    // Appel à l'API /api/users pour remplir la liste
    this.http.get<any[]>('/api/users').subscribe({
      next: (users) => {
        this.gitlabMembers = users;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger la liste des utilisateurs GitLab.'
        });
      }
    });
  }

  private _openEditRoleDialog(member: ProjectMember) {
    this.selectedMember = member;
    this.selectedRole = this.roles.find((r: any) => r.roleName === member.role) || null;
    this.editRoleDialog = true;
  }

  private _confirmRemoveMember(member: ProjectMember) {
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

  private _addMember() {
    if (!this.selectedUser || !this.selectedRole) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez sélectionner un utilisateur et un rôle'
      });
      return;
    }
    
    this.saving = true;
    
    this.http.post('/api/gitlab/add-member-by-url', {
      projectUrl: this.gitlabProjectUrl,
      userId: this.selectedUser.userId,
      accessLevel: this.selectedRole.accessLevel
    })
    .pipe(
      catchError(error => {
        console.error('Erreur lors de l\'ajout du membre :', error);
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
    ).subscribe({
      next: (response) => {
        console.log('Réponse de l\'API add-member-by-url:', response);
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Membre ajouté avec succès'
        });
        this.addMemberDialog = false;
        this.loadMembers();
      },
      error: (error) => {
        console.error('Erreur lors de l\'ajout du membre :', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.error?.message || 'Impossible d\'ajouter le membre. Veuillez réessayer.'
        });
      }
    });
  }

  private _updateMemberRole() {
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
    if (this.selectedMember && this.selectedMember.userId) {
    this.userService.removeUserFromProject(this.projectId, this.selectedMember.userId)
      .pipe(
        catchError(error => {
          console.error('Error removing user before role update:', error);
          return of(null);
        })
      )
      .subscribe(() => {
          this.userService.addUserToProject(this.projectId, this.selectedMember!.userId, this.selectedRole!.accessLevel)
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
              error: (err: any) => {
              console.error('Failed to update role:', err);
              // Le message d'erreur est déjà affiché par le service utilisateur
            }
          });
      });
    }
  }

  private _onGitlabProjectUrlChange(url: string): void {
    this.gitlabProjectId = null;
    if (!url) return;
    this.http.get<{ projectId: number }>(`/api/gitlab/get-project-id?url=${encodeURIComponent(url)}`)
      .subscribe({
        next: (res: any) => {
          this.gitlabProjectId = res.projectId;
        },
        error: () => {
          this.gitlabProjectId = null;
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de récupérer l\'ID du projet GitLab.'
          });
        }
      });
  }

  private _onGitlabUserChange(userId: number) {
    this.documentService.selectedGitlabUser = userId;
  }

  private _onAccessLevelChange(level: number) {
    this.documentService.selectedGitLabAccessLevel = +level;
  }

  private _addGitLabMember() {
    if (!this.gitlabMembers || this.gitlabMembers.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Aucun membre GitLab',
        detail: 'Aucun utilisateur GitLab n\'a été trouvé pour ce projet.'
      });
      this.savingGitLab = false;
      return;
    }
    this.savingGitLab = true;
    this.http.post('/api/gitlab/add-member-by-url', {
      projectUrl: this.gitlabProjectUrl,
      userId: this.gitlabUserId,
      accessLevel: this.selectedGitLabAccessLevel
    })
    .pipe(
      catchError(error => {
        console.error('Erreur lors de l\'ajout du membre GitLab:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.error?.message || 'Impossible d\'ajouter le membre à GitLab. Veuillez réessayer.'
        });
        return of(null);
      }),
      finalize(() => {
        this.savingGitLab = false;
      })
    ).subscribe({
      next: (response) => {
        console.log('Réponse de l\'API add-member-by-url (GitLab):', response);
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Membre ajouté à GitLab avec succès'
        });
        this.addGitLabMemberDialog = false;
      },
      error: (error) => {
        console.error('Erreur lors de l\'ajout du membre GitLab :', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.error?.message || 'Impossible d\'ajouter le membre à GitLab. Veuillez réessayer.'
        });
      }
    });
  }

  removeMember(member: ProjectMember) {
    this.userService.removeUserFromProject(this.projectId, member.userId)
      .subscribe({
        next: () => {
          this.loadMembers();
        },
        error: (err: any) => {
          console.error('Failed to remove member:', err);
        }
      });
  }

  onUpload() {
    if (this.selectedFile && this.documentTitle && this.selectedProjectId) {
      this.documentService.uploadDocument(this.selectedFile, this.documentTitle, this.selectedProjectId)
        .subscribe({
          next: (res) => {
            // succès
          },
          error: (err) => {
            // gestion erreur
          }
        });
    }
  }
}
