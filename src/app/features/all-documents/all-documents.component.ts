import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DocumentService } from '../../core/services/document.service';
import { Document } from '../../shared/models/document';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FormsModule } from '@angular/forms';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import { ProjectService } from '../../core/services/project.service';
import { ProjectDTO } from '../../shared/models/project';
import { AccordionModule } from 'primeng/accordion';
import { AuthService } from '../../core/services/auth.service';
import { FileUploadModule } from 'primeng/fileupload';

@Component({
  selector: 'app-all-documents',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    CardModule,
    ToastModule,
    ProgressBarModule,
    DialogModule,
    InputTextModule,
    ConfirmDialogModule,
    FormsModule,
    TooltipModule,
    DropdownModule,
    DatePipe,
    AccordionModule,
    FileUploadModule
  ],
  providers: [MessageService, ConfirmationService, DatePipe],
  template: `
    <div class="all-documents-container">
      <p-toast></p-toast>
      <p-confirmDialog [style]="{width: '450px'}"></p-confirmDialog>
      
      <div class="section-header">
        <h2>Documents par projet</h2>
        <div class="header-content">
          <div class="user-info">
            <div *ngIf="!isSuperAdmin" class="access-warning">
              <p>Vous ne voyez que les documents des projets auxquels vous avez accès.</p>
            </div>
            <div *ngIf="isSuperAdmin" class="admin-badge">
              <span>Mode Super Administrateur - Tous les documents sont visibles</span>
            </div>
          </div>
        </div>
        <!-- BARRE DE RECHERCHE PROFESSIONNELLE -->
        <div class="search-bar-container">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input pInputText type="text" [(ngModel)]="searchTerm" (input)="onSearchChange()" placeholder="Rechercher un document..." class="search-bar" />
          </span>
        </div>
      </div>

      <p-accordion [multiple]="true">
        <p-accordionTab *ngFor="let project of filteredProjectsWithDocuments" 
                       [header]="project.name + ' (' + project.documents.length + ' documents)'">
          <div class="project-actions">
            <button pButton pRipple type="button" 
                    icon="pi pi-plus" 
                    label="Ajouter un document" 
                    class="p-button-primary mb-3" 
                    (click)="openUploadDialog(project.projectId)"></button>
          </div>
          <p-table [value]="project.documents" 
                  [paginator]="true" 
                  [rows]="10"
                  [showCurrentPageReport]="true"
                  [tableStyle]="{ 'min-width': '50rem' }"
                  [loading]="loading"
                  currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} documents">
            <ng-template pTemplate="header">
              <tr>
                <th>Titre</th>
                <th>Nom du fichier</th>
                <th>Type</th>
                <th>Date de création</th>
                <th>Actions</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-document>
              <tr>
                <td>{{document.title || 'Sans titre'}}</td>
                <td>{{document.fileName || 'Sans nom'}}</td>
                <td>{{document.type || 'Non spécifié'}}</td>
                <td>{{document.creationDate | date:'dd/MM/yyyy HH:mm'}}</td>
                <td>
                  <button pButton pRipple icon="pi pi-download" 
                          class="p-button-rounded p-button-success mr-2"
                          pTooltip="Télécharger"
                          (click)="downloadDocument(document)"></button>
                  <button pButton pRipple icon="pi pi-trash" 
                          class="p-button-rounded p-button-danger"
                          pTooltip="Supprimer"
                          (click)="confirmDelete(document)"></button>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="5" class="text-center">Aucun document trouvé</td>
              </tr>
            </ng-template>
          </p-table>
        </p-accordionTab>
      </p-accordion>

      <div *ngIf="filteredProjectsWithDocuments.length === 0 && !loading" class="no-documents">
        <p>Aucun document trouvé.</p>
      </div>

      <div *ngIf="loading" class="loading-indicator">
        <p-progressBar mode="indeterminate" [style]="{'height': '6px'}"></p-progressBar>
        <p>Chargement des documents...</p>
      </div>

      <!-- Dialog d'upload de document -->
      <p-dialog [(visible)]="uploadDialogVisible" 
                [style]="{width: '450px'}" 
                header="Ajouter un document" 
                [modal]="true" 
                [draggable]="false" 
                [resizable]="false">
        <div class="upload-form">
          <div class="form-group">
            <label for="documentTitle">Titre du document</label>
            <input type="text" pInputText id="documentTitle" [(ngModel)]="documentTitle" class="w-full">
          </div>
          
          <div class="form-group mt-3">
            <label>Fichier</label>
            <p-fileUpload #fileUpload mode="basic" 
                          chooseLabel="Sélectionner un fichier" 
                          [auto]="false"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar,.jpg,.jpeg,.png"
                          [maxFileSize]="10000000"
                          (onSelect)="onFileSelect($event)"
                          [disabled]="uploading"
                          styleClass="w-full"></p-fileUpload>
            <small *ngIf="selectedFileName" class="selected-file">Fichier sélectionné: {{selectedFileName}}</small>
          </div>
          
          <div *ngIf="uploading" class="mt-3">
            <p-progressBar mode="indeterminate" [style]="{'height': '6px'}"></p-progressBar>
            <p class="text-center">Téléchargement en cours...</p>
          </div>
        </div>
        
        <ng-template pTemplate="footer">
          <button pButton pRipple type="button" 
                  label="Annuler" 
                  icon="pi pi-times" 
                  class="p-button-text" 
                  (click)="cancelUpload()"
                  [disabled]="uploading"></button>
          <button pButton pRipple type="button" 
                  label="Télécharger" 
                  icon="pi pi-upload" 
                  class="p-button-primary" 
                  (click)="uploadDocument()"
                  [disabled]="!uploadedFile || uploading"></button>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [`
    .all-documents-container {
      padding: 1rem;
    }
    .section-header {
      margin-bottom: 1rem;
      display: flex;
      flex-direction: column;
    }
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
    }
    .mr-2 {
      margin-right: 0.5rem;
    }
    .mb-3 {
      margin-bottom: 1rem;
    }
    .mt-3 {
      margin-top: 1rem;
    }
    .w-full {
      width: 100%;
    }
    .project-actions {
      margin-bottom: 1rem;
      display: flex;
      justify-content: flex-end;
    }
    :host ::ng-deep .p-accordion .p-accordion-header a {
      font-weight: bold;
    }
    :host ::ng-deep .p-accordion .p-accordion-content {
      padding: 1.5rem;
    }
    .admin-badge {
      background-color: #ff9800;
      color: white;
      padding: 0.5rem;
      border-radius: 4px;
      display: inline-block;
      margin-bottom: 1rem;
    }
    .access-warning {
      color: #666;
      font-style: italic;
      margin-bottom: 1rem;
    }
    .no-documents {
      text-align: center;
      padding: 2rem;
      background-color: #f8f9fa;
      border-radius: 4px;
      margin-top: 1rem;
    }
    .loading-indicator {
      margin-top: 1rem;
      text-align: center;
    }
    .upload-form {
      padding: 1rem 0;
    }
    .form-group {
      margin-bottom: 1rem;
    }
    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    .selected-file {
      display: block;
      margin-top: 0.5rem;
      color: #666;
    }
    .text-center {
      text-align: center;
    }
    .search-bar-container {
      margin: 1rem 0 1.5rem 0;
      display: flex;
      justify-content: flex-end;
    }
    .search-bar {
      border-radius: 2rem;
      box-shadow: 0 1px 4px rgba(25, 118, 210, 0.07);
      border: 1px solid #d1e3fa;
      padding: 0.5rem 1.5rem 0.5rem 2.5rem;
      font-size: 1rem;
      min-width: 320px;
      transition: box-shadow 0.2s, border 0.2s;
    }
    .search-bar:focus {
      outline: none;
      border-color: #1976d2;
      box-shadow: 0 2px 8px rgba(25, 118, 210, 0.15);
    }
    .p-input-icon-left > i {
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      position: absolute;
      color: #1976d2;
      font-size: 1.2rem;
    }
    .p-input-icon-left {
      position: relative;
      display: flex;
      align-items: center;
    }
  `]
})
export class AllDocumentsComponent implements OnInit {
  loading = false;
  projectsWithDocuments: Array<ProjectDTO & { documents: Document[] }> = [];
  
  // Propriétés pour l'upload de documents
  uploadDialogVisible = false;
  selectedProjectId: number | null = null;
  documentTitle = '';
  uploadedFile: File | null = null;
  selectedFileName = '';
  uploading = false;
  
  searchTerm: string = '';
  filteredProjectsWithDocuments: Array<ProjectDTO & { documents: Document[] }> = [];
  
  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  constructor(
    private documentService: DocumentService,
    private projectService: ProjectService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadProjectsWithDocuments();
  }

  loadProjectsWithDocuments() {
    this.loading = true;
    
    // Déterminer si l'utilisateur est admin ou utilisateur normal
    const isAdmin = this.authService.isSuperAdmin();
    
    // Choisir la méthode appropriée pour récupérer les projets
    const projectObservable = isAdmin ? 
      this.projectService.getAllProjects() : 
      this.projectService.getProjectsForCurrentUser();
    
    projectObservable.pipe(
      catchError(error => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les projets'
        });
        this.loading = false;
        return of([]);
      })
    ).subscribe(projects => {
      if (projects.length === 0) {
        this.loading = false;
        return;
      }
      
      // Pour chaque projet, charger ses documents
      // Si l'utilisateur est un super admin, il peut voir tous les documents
      // Sinon, il ne voit que les documents des projets auxquels il a accès
      const isAdmin = this.authService.isSuperAdmin();
      Promise.all(projects.map(project =>
        this.documentService.getDocumentsByProject(project.projectId, isAdmin).pipe(
          catchError(error => {
            console.error(`Erreur lors du chargement des documents pour le projet ${project.projectId}:`, error);
            return of([]);
          })
        ).toPromise()
        .then(documents => ({
          ...project,
          documents: documents || []
        }))
      )).then(projectsWithDocs => {
        // Filtrer pour ne garder que les projets avec des documents
        this.projectsWithDocuments = projectsWithDocs.filter(project => project.documents.length > 0);
        this.loading = false;
        this.applySearchFilter();
      });
    });
  }

  downloadDocument(document: Document) {
    this.loading = true;
    this.documentService.downloadDocument(document.documentId).pipe(
      finalize(() => this.loading = false)
    ).subscribe(blob => {
      // Créer un lien temporaire pour télécharger le fichier
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = document.fileName || 'document';
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(a);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Téléchargement réussi',
        detail: `Le document "${document.title}" a été téléchargé avec succès.`
      });
    }, error => {
      console.error('Erreur lors du téléchargement du document:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur de téléchargement',
        detail: 'Impossible de télécharger le document. Veuillez réessayer.'
      });
    });
  }

  confirmDelete(document: Document) {
    this.confirmationService.confirm({
      message: 'Êtes-vous sûr de vouloir supprimer ce document ?',
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      accept: () => this.deleteDocument(document)
    });
  }

  deleteDocument(document: Document) {
    this.loading = true;
    this.documentService.deleteDocument(document.documentId).pipe(
      catchError(error => {
        console.error('Erreur lors de la suppression du document:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur de suppression',
          detail: 'Impossible de supprimer le document. Veuillez réessayer.'
        });
        return of(null);
      }),
      finalize(() => this.loading = false)
    ).subscribe(result => {
      if (result !== null) {
        // Mettre à jour la liste des documents après suppression
        this.projectsWithDocuments = this.projectsWithDocuments.map(project => {
          if (project.projectId === document.projectId) {
            return {
              ...project,
              documents: project.documents.filter(doc => doc.documentId !== document.documentId)
            };
          }
          return project;
        }).filter(project => project.documents.length > 0);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Document supprimé',
          detail: `Le document "${document.title}" a été supprimé avec succès.`
        });
      }
    });
  }

  // Méthodes pour l'upload de documents
  openUploadDialog(projectId: number) {
    this.selectedProjectId = projectId;
    this.documentTitle = '';
    this.uploadedFile = null;
    this.selectedFileName = '';
    this.uploadDialogVisible = true;
  }

  onFileSelect(event: any) {
    if (event.files && event.files.length > 0) {
      this.uploadedFile = event.files[0];
      this.selectedFileName = this.uploadedFile ? this.uploadedFile.name : '';
    }
  }

  cancelUpload() {
    this.uploadDialogVisible = false;
    this.uploadedFile = null;
    this.selectedFileName = '';
    this.documentTitle = '';
  }

  uploadDocument() {
    if (!this.uploadedFile || !this.selectedProjectId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez sélectionner un fichier et un projet.'
      });
      return;
    }

    this.uploading = true;
    
    const formData = new FormData();
    formData.append('file', this.uploadedFile);
    formData.append('title', this.documentTitle || this.uploadedFile.name);
    formData.append('projectId', this.selectedProjectId.toString());

    this.documentService.uploadDocument(this.uploadedFile, this.documentTitle, this.selectedProjectId).pipe(
      catchError(error => {
        console.error('Erreur lors du téléchargement du document:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur de téléchargement',
          detail: 'Impossible de télécharger le document. Veuillez réessayer.'
        });
        return of(null);
      }),
      finalize(() => {
        this.uploading = false;
      })
    ).subscribe(result => {
      if (result !== null) {
        this.messageService.add({
          severity: 'success',
          summary: 'Téléchargement réussi',
          detail: 'Le document a été téléchargé avec succès.'
        });
        this.uploadDialogVisible = false;
        this.loadProjectsWithDocuments();
      }
    });
  }

  onSearchChange() {
    this.applySearchFilter();
  }

  applySearchFilter() {
    if (!this.searchTerm.trim()) {
      this.filteredProjectsWithDocuments = this.projectsWithDocuments;
      return;
    }
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredProjectsWithDocuments = this.projectsWithDocuments
      .map(project => ({
        ...project,
        documents: project.documents.filter(doc =>
          (doc.title && doc.title.toLowerCase().includes(term)) ||
          (doc.fileName && doc.fileName.toLowerCase().includes(term))
        )
      }))
      .filter(project => project.documents.length > 0);
  }
}