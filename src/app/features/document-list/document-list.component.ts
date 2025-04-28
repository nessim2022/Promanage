// src/app/features/document-list/document-list.component.ts

import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DocumentService } from '../../core/services/document.service';
import { ProjectService } from '../../core/services/project.service';
import type { Document } from '../../shared/models/document';
import { AuthService } from '../../core/services/auth.service';
import { ProjectDTO } from '../../shared/models/project';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FileUploadModule } from 'primeng/fileupload';
import { FormsModule } from '@angular/forms';
import { catchError, finalize } from 'rxjs/operators';
import { of, Subscription, interval } from 'rxjs';
import { Router, ActivatedRoute, ParamMap } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';

interface Filters {
  [key: string]: string;
}

@Component({
  selector: 'app-document-list',
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
    FileUploadModule,
    FormsModule,
    TooltipModule,
    DropdownModule,
    DatePipe
  ],
  providers: [MessageService, ConfirmationService, DatePipe],
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.scss']
})
export class DocumentListComponent implements OnInit, OnDestroy {

  @Input() projectId?: number; // projectId devient optionnel

  documents: Document[] = [];
  projects: ProjectDTO[] = [];
  loading: boolean = false;

  /**
   * Returns the list of documents the user is allowed to see.
   * Super admin: all documents. User: only documents in their projects.
   */
  get visibleDocuments(): Document[] {
    if (this.authService.isSuperAdmin()) {
      return this.documents;
    } else {
      const userProjectIds = this.authService.getUserProjectIds();
      return this.documents.filter(doc => userProjectIds.includes(String(doc.projectId)));

    }
  }
  loadingProjects: boolean = false;
  uploadDialog: boolean = false;
  externalLinkDialog: boolean = false;
  documentTitle: string = '';
  externalLinkTitle: string = '';
  externalUrl: string = '';
  uploadedFile: File | null = null;
  uploading: boolean = false;
  error: boolean = false;
  canUpload: boolean = false;
  canAddLink: boolean = false;
  errorMessage: string = '';
  private checkProjectIdSubscription?: Subscription;
  private maxAttempts = 10;
  private attempts = 0;
  private autoRefreshSubscription?: Subscription;

  filteredDocuments: Document[] = [];
  filters: Filters = {
    type: '',
    title: '',
    fileName: ''
  };

  /**
   * Centralized privilege and permission logic for document actions.
   * Always grants full permissions to superadmin (admin@example.com, id 1103).
   * Extendable for future roles.
   */
  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  /**
   * Checks if the current user is the owner of the document.
   * If no document is passed, returns true for creation actions.
   * This is the ONLY implementation. Do not duplicate.
   */
  isDocumentOwner(document?: Document): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    if (!document) return true; // For creating new documents
    // 'createdBy' does not exist on Document; fallback to false or implement custom logic if needed
    return false;
  }

  /**
   * Determines if the user can upload a document.
   * Superadmin always allowed.
   */
  canUploadDocument(): boolean {
    return this.authService.isSuperAdmin() || this.isDocumentOwner();
  }

  /**
   * Determines if the user can add an external link.
   * Superadmin always allowed.
   */
  canAddExternalLink(): boolean {
    return this.authService.isSuperAdmin() || this.isDocumentOwner();
  }

  /**
   * Détermine si l'utilisateur courant est membre du projet donné
   */
  isProjectMember(projectId: number): boolean {
    // À adapter selon la structure réelle de l'utilisateur
    if (this.authService.isSuperAdmin()) return true;
    const user = this.authService.getCurrentUser();
    if (!user || !user.projects) return false;
    return user.projects.includes(projectId);
  }

  /**
   * Détermine si l'utilisateur peut gérer (éditer/supprimer) un document.
   * Superadmin : tout gérer, user : seulement ses propres docs dans ses projets.
   */
  canManageDocument(document: Document): boolean {
    return this.isSuperAdmin || (this.isDocumentOwner(document) && this.isProjectMember(document.projectId));
  }

  // --- EDIT DOCUMENT DIALOG LOGIC ---
  editDialogVisible: boolean = false;
  editingDocument: Document | null = null;
  editDocumentTitle: string = '';

  // Helper to ensure we always have a valid documentId
  private getEditingDocumentWithId(): Document | null {
    if (!this.editingDocument) return null;
    // Use documentId if available, else fallback to id
    const documentId = this.editingDocument.documentId;
    if (typeof documentId !== 'number') return null;
    return {
      ...this.editingDocument,
      documentId: documentId as number,
      title: this.editDocumentTitle // always string
    };
  }

  editDocument(document: Document): void {
    this.editingDocument = { ...document };
    this.editDocumentTitle = document.title || '';
    this.editDialogVisible = true;
  }

  saveEditDocument(): void {
    const updatedDoc = this.getEditingDocumentWithId();
    if (!updatedDoc || !this.editDocumentTitle.trim()) {
      return;
    }
    this.documentService.updateDocument(updatedDoc)
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la modification du document:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de modifier le document. Veuillez réessayer.'
          });
          return of(null);
        }),
        finalize(() => {
          this.editDialogVisible = false;
        })
      )
      .subscribe(response => {
        if (response) {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Le document a été modifié avec succès'
          });
          this.loadDocuments();
        }
      });
  }

  closeEditDialog(): void {
    this.editDialogVisible = false;
    this.editingDocument = null;
    this.editDocumentTitle = '';
  }
  // --- END EDIT DOCUMENT DIALOG ---

  constructor(
    private documentService: DocumentService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private projectService: ProjectService,
    private datePipe: DatePipe,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
  }

  ngOnInit() {
    // Get projectId from route if present
    this.route.paramMap.subscribe(params => {
      const pid = params.get('projectId');
      if (pid) {
        this.projectId = pid ? Number(pid) : undefined;
      }
      this.loadDocuments();
    });
    this.loadProjects();
    this.checkProjectIdSubscription = interval(2000).subscribe(() => {
      this.updateCanUpload();
    });
  }

  ngOnDestroy() {
    this.checkProjectIdSubscription?.unsubscribe();
    this.autoRefreshSubscription?.unsubscribe();
  }

  loadProjects() {
    this.loadingProjects = true;
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loadingProjects = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des projets:', error);
        this.loadingProjects = false;
      }
    });
  }

  /**
   * Charge les documents selon le contexte :
   * - Si projectId fourni : documents du projet
   * - Sinon : documents de l'utilisateur connecté
   */
  loadDocuments() {
    this.loading = true;
    this.error = false;

    let docObs;
    if (this.projectId) {
      docObs = this.documentService.getDocumentsByProject(this.projectId);
    } else {
      docObs = this.documentService.getDocumentsForCurrentUser();
    }

    docObs
      .pipe(
        catchError(error => {
          console.error('Erreur lors du chargement des documents:', error);
          this.error = true;
          if (error.status === 401) {
            this.messageService.add({
              severity: 'error',
              summary: 'Session expirée',
              detail: 'Votre session a expiré. Veuillez vous reconnecter.'
            });
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2000);
          } else {
            this.errorMessage = 'Impossible de charger les documents. Veuillez réessayer.';
          }
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe((documents: Document[]) => {
        this.documents = documents;
        this.applyFilters();
      });
  }

  openUploadDialog() {
    if (!this.canUploadDocument()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Accès refusé',
        detail: 'Vous n\'avez pas les permissions nécessaires pour ajouter des documents.'
      });
      return;
    }
    this.uploadDialog = true;
    this.documentTitle = '';
    this.uploadedFile = null;
    this.canUpload = false;
  }

  closeUploadDialog() {
    this.uploadDialog = false;
    this.documentTitle = '';
    this.uploadedFile = null;
    this.canUpload = false;
  }

  onFileSelect(event: any) {
    if (event.files && event.files[0]) {
      this.uploadedFile = event.files[0];
      this.updateCanUpload();
    }
  }

  updateCanUpload() {
    this.canUpload = !!(this.documentTitle.trim() && this.uploadedFile);
  }

  uploadDocument() {
    if (!this.uploadedFile || !this.documentTitle.trim() || !this.projectId) {
      return;
    }

    this.uploading = true;
    this.canUpload = false;

    this.documentService.uploadDocument(this.projectId, this.uploadedFile, this.documentTitle)
      .pipe(
        catchError(error => {
          console.error('Erreur lors du téléchargement:', error);
          if (
            error.status === 500 &&
            error.error &&
            ((typeof error.error === 'string' && error.error.includes('already exists')) ||
             (error.error.briefSummary && error.error.briefSummary.includes('already exists')))
          ) {
            this.messageService.add({
              severity: 'error',
              summary: 'Conflit',
              detail: 'Un fichier avec ce nom existe déjà. Veuillez choisir un autre nom ou supprimer l\'ancien fichier.'
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Impossible de télécharger le document. Veuillez réessayer.'
            });
          }
          return of(null);
        }),
        finalize(() => {
          this.uploading = false;
        })
      )
      .subscribe(response => {
        if (response) {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Document téléchargé avec succès'
          });
          this.closeUploadDialog();
          this.loadDocuments();
        }
      });
  }

  openExternalLinkDialog() {
    this.externalLinkDialog = true;
    this.externalLinkTitle = '';
    this.externalUrl = '';
    this.canAddLink = false;
  }

  closeExternalLinkDialog() {
    this.externalLinkDialog = false;
    this.externalLinkTitle = '';
    this.externalUrl = '';
    this.canAddLink = false;
  }

  updateCanAddLink() {
    this.canAddLink = !!(this.externalLinkTitle.trim() && this.externalUrl.trim());
  }

  addExternalLink() {
    if (!this.externalLinkTitle.trim() || !this.externalUrl.trim() || !this.projectId) {
      return;
    }

    this.uploading = true;
    this.canAddLink = false;

    this.documentService.createExternalDocument(this.projectId, this.externalLinkTitle, this.externalUrl)
      .pipe(
        catchError(error => {
          console.error('Erreur lors de l\'ajout du lien externe:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible d\'ajouter le lien externe. Veuillez réessayer.'
          });
          return of(null);
        }),
        finalize(() => {
          this.uploading = false;
        })
      )
      .subscribe((response: Document | null) => {
        if (response) {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Lien externe ajouté avec succès'
          });
          this.closeExternalLinkDialog();
          this.loadDocuments();
        }
      });
  }

  filterByType(event: { value: string }): void {
    this.filters['type'] = event.value;
    this.applyFilters();
  }

  onSearchChange(event: any, field: string): void {
    this.filters[field] = event.target.value;
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredDocuments = this.documents.filter(doc => {
      const matchType = !this.filters['type'] || doc.type === this.filters['type'];
      const matchTitle = !this.filters['title'] || (doc.title && doc.title.toLowerCase().includes(this.filters['title'].toLowerCase()));
      const matchFileName = !this.filters['fileName'] || (doc.fileName && doc.fileName.toLowerCase().includes(this.filters['fileName'].toLowerCase()));
      return matchType && matchTitle && matchFileName;
    });
  }

  resetFilters(): void {
    this.filters = {
      type: '',
      title: '',
      fileName: ''
    };
    this.applyFilters();
  }

  refreshDocuments(): void {
    this.loadDocuments();
  }

  downloadDocument(doc: Document) {
    if (doc.isExternal && doc.alfrescoURL) {
      window.open(doc.alfrescoURL, '_blank');
    } else {
      if (doc.documentId !== undefined) {
        this.documentService.downloadDocument(doc.documentId)
          .pipe(
            catchError(error => {
              console.error('Erreur lors du téléchargement du document:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Erreur',
                detail: 'Impossible de télécharger le document. Veuillez réessayer.'
              });
              return of(null);
            })
          )
          .subscribe((response: Blob | null) => {
            if (response) {
              const blob = new Blob([response], { type: 'application/octet-stream' });
              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = doc.fileName || doc.title || 'document';
              link.click();
              window.URL.revokeObjectURL(url);
            }
          });
      }
    }
  }



  confirmDeleteDocument(document: Document) {
    if (!this.canManageDocument(document)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Accès refusé',
        detail: 'Vous n\'avez pas les permissions nécessaires pour supprimer ce document.'
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer le document "${document.title}" ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteDocument(document);
      }
    });
  }

  deleteDocument(doc: Document) {
    if (doc.documentId !== undefined) {
      this.documentService.deleteDocument(doc.documentId)
        .pipe(
          catchError(error => {
            console.error('Erreur lors de la suppression du document:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur',
              detail: 'Impossible de supprimer le document. Veuillez réessayer.'
            });
            return of(false);
          })
        )
        .subscribe(success => {
          if (success) {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Le document a été supprimé avec succès'
            });
            this.loadDocuments();
          }
        });
    }
  }

  getFileExtension(fileName: string): string {
    return fileName.split('.').pop()?.toLowerCase() || '';
  }

  getFileIconClass(fileNameOrDoc: string | Document): string {
    let extension: string;
    
    if (typeof fileNameOrDoc === 'string') {
      extension = this.getFileExtension(fileNameOrDoc);
    } else {
      if (fileNameOrDoc.isExternal) {
        return 'pi pi-link';
      }
      extension = this.getFileExtension(fileNameOrDoc.fileName || '');
    }

    switch (extension) {
      case 'pdf':
        return 'pi pi-file-pdf';
      case 'doc':
      case 'docx':
        return 'pi pi-file-word';
      case 'xls':
      case 'xlsx':
        return 'pi pi-file-excel';
      case 'ppt':
      case 'pptx':
        return 'pi pi-file-powerpoint';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'pi pi-image';
      default:
        return 'pi pi-file';
    }
  }
}