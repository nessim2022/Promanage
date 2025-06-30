import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DocumentService } from '../../core/services/document.service';
import type { Document } from '../../shared/models/document';
import { AuthService } from '../../core/services/auth.service';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FileUploadModule } from 'primeng/fileupload';
import { FormsModule } from '@angular/forms';
import { MessageModule } from 'primeng/message';
import { catchError, finalize } from 'rxjs/operators';
import { of, Subscription, interval } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-document-list',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    CardModule,
    ToastModule,
    DialogModule,
    InputTextModule,
    ConfirmDialogModule,
    FileUploadModule,
    FormsModule,
    TooltipModule,
    MessageModule,
    DatePipe
  ],
  providers: [MessageService, ConfirmationService, DatePipe],
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.scss']
})
export class DocumentListComponent implements OnInit, OnDestroy {
  @Input() projectId?: number;

  documents: Document[] = [];
  loading: boolean = false;
  alfrescoAvailable: boolean = true;
  uploadDialog: boolean = false;
  uploadAlfrescoDialog: boolean = false;
  documentTitle: string = '';
  uploadedFile: File | null = null;
  uploading: boolean = false;
  error: boolean = false;
  errorMessage: string = '';
  canUpload: boolean = false;
  private autoRefreshSubscription?: Subscription;

  get visibleDocuments(): Document[] {
    let filteredDocs = this.documents;
    if (this.projectId) {
      filteredDocs = filteredDocs.filter(doc => doc.projectId === this.projectId);
    }
    if (this.authService.isSuperAdmin()) {
      return filteredDocs;
    } else {
      const userProjectIds = this.authService.getUserProjectIds();
      return filteredDocs.filter(doc => userProjectIds.includes(String(doc.projectId)));
    }
  }

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  isDocumentOwner(document?: Document): boolean {
    const user = this.authService.getCurrentUser();
    if (!user) return false;
    if (!document) return true;
    return false; // À implémenter si vous avez un champ createdBy
  }

  canUploadDocument(): boolean {
    return this.authService.isSuperAdmin() || this.isDocumentOwner();
  }

  isProjectMember(projectId: number): boolean {
    if (this.authService.isSuperAdmin()) return true;
    const user = this.authService.getCurrentUser();
    if (!user || !user.projects) return false;
    return user.projects.includes(projectId);
  }

  canManageDocument(document: Document): boolean {
    return this.isSuperAdmin || (this.isDocumentOwner(document) && this.isProjectMember(document.projectId));
  }

  constructor(
    private documentService: DocumentService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private datePipe: DatePipe,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const pid = params.get('projectId');
      this.projectId = pid ? Number(pid) : undefined;
      this.checkAlfrescoAvailability();
      this.loadDocuments();
    });
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.autoRefreshSubscription?.unsubscribe();
  }

  checkAlfrescoAvailability(): void {
    this.documentService.checkAlfrescoAvailability().subscribe({
      next: (isAvailable) => {
        this.alfrescoAvailable = isAvailable;
      },
      error: (err) => {
        console.error('Erreur lors de la vérification de la disponibilité:', err);
        this.alfrescoAvailable = false;
      }
    });
  }

  loadDocuments() {
    if (!this.projectId) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Aucun projet sélectionné',
        detail: 'Veuillez sélectionner un projet pour afficher ses documents.'
      });
      this.documents = [];
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = false;
    this.errorMessage = '';

    this.documentService.getDocumentsByProject(this.projectId).pipe(
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
        } else if (error.status === 0) {
          this.errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
          this.messageService.add({
            severity: 'warn',
            summary: 'Erreur de connexion',
            detail: 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.'
          });
        } else {
          this.errorMessage = 'Impossible de charger les documents. Veuillez réessayer.';
        }
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe(documents => {
      this.documents = documents;
    });
  }

  openUploadDialog(isAlfresco: boolean = false) {
    if (!this.projectId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Aucun projet sélectionné. Veuillez sélectionner un projet.'
      });
      return;
    }

    if (!this.canUploadDocument()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Accès refusé',
        detail: 'Vous n\'avez pas les permissions nécessaires pour ajouter des documents.'
      });
      return;
    }

    this.loading = true;
    this.documentService.checkAlfrescoAvailability().subscribe({
      next: (isAvailable) => {
        this.loading = false;
        if (isAvailable) {
          if (isAlfresco) {
            this.uploadAlfrescoDialog = true;
          } else {
            this.uploadDialog = true;
          }
          this.documentTitle = '';
          this.uploadedFile = null;
          this.error = false;
          this.errorMessage = '';
          this.updateCanUpload();
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Serveur indisponible',
            detail: 'Le serveur de documents est actuellement indisponible. Veuillez réessayer plus tard.'
          });
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Erreur lors de la vérification du serveur Alfresco:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur de connexion',
          detail: 'Impossible de se connecter au serveur de documents. Veuillez réessayer plus tard.'
        });
      }
    });
  }

  closeUploadDialog(isAlfresco: boolean = false) {
    if (isAlfresco) {
      this.uploadAlfrescoDialog = false;
    } else {
      this.uploadDialog = false;
    }
    this.documentTitle = '';
    this.uploadedFile = null;
    this.canUpload = false;
  }

  onFileSelect(event: any) {
    if (event.files && event.files[0]) {
      this.uploadedFile = event.files[0];
      this.documentTitle = event.files[0].name;
      this.updateCanUpload();
    }
  }

  onDocumentTitleChange() {
    this.updateCanUpload();
  }

  updateCanUpload() {
    if (!this.projectId) {
      this.canUpload = false;
      return;
    }
    this.canUpload = this.canUploadDocument() && this.isProjectMember(this.projectId) && 
                     this.documentTitle.trim() !== '' && this.uploadedFile !== null;
  }

  uploadDocument(isAlfresco: boolean = false) {
    if (!this.projectId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Aucun projet sélectionné. Veuillez sélectionner un projet.'
      });
      return;
    }

    if (!this.documentTitle.trim() || !this.uploadedFile) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez fournir un titre et sélectionner un fichier.'
      });
      return;
    }

    this.uploading = true;
    this.error = false;

    const maxSizeInMB = 10;
    const fileSizeInMB = this.uploadedFile.size / (1024 * 1024);
    if (fileSizeInMB > maxSizeInMB) {
      this.messageService.add({
        severity: 'error',
        summary: 'Fichier trop volumineux',
        detail: `La taille du fichier dépasse la limite de ${maxSizeInMB} Mo.`
      });
      this.uploading = false;
      return;
    }

    const fileName = this.uploadedFile.name;
    const fileExt = fileName.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png'];
    if (fileExt && !allowedExtensions.includes(fileExt)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Format non supporté',
        detail: 'Le format du fichier n\'est pas supporté. Formats acceptés: ' + allowedExtensions.join(', ')
      });
      this.uploading = false;
      return;
    }

    const uploadObservable = isAlfresco
      ? this.documentService.uploadDocumentToAlfresco(this.projectId, this.uploadedFile, this.documentTitle)
      : this.documentService.uploadDocument(this.projectId, this.uploadedFile, this.documentTitle);

    uploadObservable.pipe(
      catchError(error => {
        console.error('Erreur lors du téléchargement:', error);
        this.error = true;
        if (error.status === 500) {
          this.errorMessage = 'Une erreur est survenue sur le serveur. Veuillez contacter l\'administrateur.';
        } else if (error.status === 413) {
          this.errorMessage = 'Le fichier est trop volumineux pour être téléversé.';
        } else if (error.status === 415) {
          this.errorMessage = 'Le format du fichier n\'est pas supporté.';
        } else if (error.status === 0) {
          this.errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
        } else {
          this.errorMessage = 'Impossible de télécharger le document. Veuillez réessayer.';
        }
        return of(null);
      }),
      finalize(() => {
        this.uploading = false;
        if (!this.error) {
          this.closeUploadDialog(isAlfresco);
        }
      })
    ).subscribe(response => {
      if (response) {
        this.loadDocuments();
      }
    });
  }

  downloadDocument(doc: Document) {
    if (doc.documentId !== undefined) {
      this.documentService.downloadDocument(doc.documentId).pipe(
        catchError(error => {
          console.error('Erreur lors du téléchargement du document:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de télécharger le document. Veuillez réessayer.'
          });
          return of(null);
        })
      ).subscribe((response: Blob | null) => {
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
      this.documentService.deleteDocument(doc.documentId).pipe(
        catchError(error => {
          console.error('Erreur lors de la suppression du document:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de supprimer le document. Veuillez réessayer.'
          });
          return of(false);
        })
      ).subscribe(success => {
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
    if (!fileName) return '';
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

  startAutoRefresh(): void {
    this.autoRefreshSubscription?.unsubscribe();
    this.autoRefreshSubscription = interval(30000).subscribe(() => {
      if (!this.uploading) {
        console.log('Rafraîchissement automatique des documents');
        this.loadDocuments();
      }
    });
  }
}