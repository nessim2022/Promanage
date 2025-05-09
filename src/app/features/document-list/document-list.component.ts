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
  selectedProjectName: string = '';

  /**
   * Returns the list of documents the user is allowed to see.
   * Super admin: all documents. User: only documents in their projects.
   * If projectId is provided, only show documents for that project.
   */
  get visibleDocuments(): Document[] {
    let filteredDocs = this.documents;
    
    // Si un projectId est spécifié, filtrer par ce projet
    if (this.projectId) {
      filteredDocs = filteredDocs.filter(doc => doc.projectId === this.projectId);
    }
    
    // Ensuite, appliquer les filtres de permission
    if (this.authService.isSuperAdmin()) {
      return filteredDocs;
    } else {
      const userProjectIds = this.authService.getUserProjectIds();
      return filteredDocs.filter(doc => userProjectIds.includes(String(doc.projectId)));
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
  ) {}


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
    this.startAutoRefresh();
  }


  ngOnDestroy() {
    this.checkProjectIdSubscription?.unsubscribe();
    this.autoRefreshSubscription?.unsubscribe();
  }


  /**
   * Vérifie si un ID de projet est présent dans l'URL
   */
  private checkProjectIdFromRoute() {
    this.checkProjectIdSubscription = interval(500).subscribe(() => {
      if (this.attempts >= this.maxAttempts) {
        this.checkProjectIdSubscription?.unsubscribe();
        return;
      }
      
      this.attempts++;
      const projectIdParam = this.route.snapshot.paramMap.get('projectId');
      if (projectIdParam) {
        const projectId = parseInt(projectIdParam, 10);
        if (!isNaN(projectId) && projectId > 0) {
          this.projectId = projectId;
          this.loadDocuments();
          this.checkProjectIdSubscription?.unsubscribe();
        }
      }
    });
  }


  loadProjects() {
    this.loadingProjects = true;
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loadingProjects = false;
        
        // Si un projectId est défini, récupérer le nom du projet
        if (this.projectId) {
          const selectedProject = this.projects.find(p => p.projectId === this.projectId);
          if (selectedProject) {
            this.selectedProjectName = selectedProject.name;
          }
        }
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
    this.errorMessage = '';
    this.documents = [];

    // Déterminer quelle méthode appeler en fonction du projectId et du rôle de l'utilisateur
    let observable;
    const isAdmin = this.authService.isSuperAdmin();
    const userId = this.authService.getCurrentUser()?.id;
    
    if (this.projectId) {
      // Si un projectId est fourni, charger les documents de ce projet spécifique
      observable = this.documentService.getDocumentsByProject(this.projectId, isAdmin);
    } else {
      // Sinon, charger tous les documents selon le rôle
      observable = isAdmin ? 
        this.documentService.getAllDocuments() : 
        this.documentService.getDocumentsForCurrentUser();
    }

    observable.pipe(
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
        } else if (error.status === 500 && error.error?.message?.includes('Unsupported field: HourOfDay')) {
            this.errorMessage = 'Problème de format de date détecté. L\'administrateur a été informé.';
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur de format',
              detail: 'Un problème de format de date a été détecté. Veuillez contacter l\'administrateur.'
            });
        } else if (error.status === 0) {
            // Erreur de connexion réseau
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
        this.updateCanUpload();
      })
    ).subscribe(documents => {
      // Filtrer les documents selon les permissions de l'utilisateur
      if (!isAdmin && !this.projectId) {
        // Pour un utilisateur normal sans projectId spécifié, filtrer par ses projets
        const userProjectIds = this.authService.getUserProjectIds();
        this.documents = documents.filter(doc => userProjectIds.includes(String(doc.projectId)));
      } else {
        this.documents = documents;
      }
      
      this.filteredDocuments = [...this.documents];
      this.updateCanUpload();
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
    
    // Vérifier d'abord si le serveur Alfresco est disponible
    this.loading = true;
    this.documentService.checkAlfrescoAvailability().subscribe({
      next: (isAvailable) => {
        this.loading = false;
        if (isAvailable) {
          this.uploadDialog = true;
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

  // Mettre à jour canUpload lorsque le titre du document change
  onDocumentTitleChange() {
    this.updateCanUpload();
  }


  updateCanUpload() {
    // Vérifier si l'utilisateur peut télécharger des documents
    // Si un projectId est spécifié, vérifier également si l'utilisateur est membre du projet
    if (this.projectId) {
      this.canUpload = this.canUploadDocument() && this.isProjectMember(this.projectId) && 
                      this.documentTitle.trim() !== '' && this.uploadedFile !== null;
      this.canAddLink = this.canAddExternalLink() && this.isProjectMember(this.projectId) && 
                       this.externalLinkTitle.trim() !== '' && this.externalUrl.trim() !== '';
    } else {
      this.canUpload = this.canUploadDocument() && this.documentTitle.trim() !== '' && this.uploadedFile !== null;
      this.canAddLink = this.canAddExternalLink() && this.externalLinkTitle.trim() !== '' && this.externalUrl.trim() !== '';
    }
    
    // Vérifier la disponibilité d'Alfresco en arrière-plan sans bloquer l'interface
    this.documentService.checkAlfrescoAvailability().pipe(
      catchError(error => {
        console.log('Erreur lors de la vérification d\'Alfresco:', error);
        return of(false);
      })
    ).subscribe(isAvailable => {
      if (!isAvailable) {
        console.log('Service Alfresco indisponible - fonctionnalités limitées');
      }
    });
  }


  uploadDocument() {
    if (!this.documentTitle.trim() || !this.uploadedFile) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez fournir un titre et sélectionner un fichier'
      });
      return;
    }

    this.uploading = true;
    this.error = false;

    // Vérifier si un projectId est spécifié
    const projectId = this.projectId || 0;

    // Vérifier la taille du fichier (limite à 10 Mo par exemple)
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

    // Vérifier l'extension du fichier
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

    this.documentService.uploadDocument(projectId, this.uploadedFile, this.documentTitle)
      .pipe(
        catchError(error => {
          console.error('Erreur lors du téléchargement:', error);
          this.error = true;
          
          // Gestion spécifique des erreurs
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
            this.uploadDialog = false;
            this.documentTitle = '';
            this.uploadedFile = null;
          }
        })
      )
      .subscribe(response => {
        if (response) {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Document téléchargé avec succès'
          });
          this.loadDocuments();
        }
      });
  }


  openExternalLinkDialog() {
    if (!this.canAddExternalLink()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Accès refusé',
        detail: 'Vous n\'avez pas les permissions nécessaires pour ajouter des liens externes.'
      });
      return;
    }
    
    // Vérifier d'abord si le serveur est disponible
    this.loading = true;
    this.documentService.checkAlfrescoAvailability().subscribe({
      next: (isAvailable) => {
        this.loading = false;
        if (isAvailable) {
          this.externalLinkDialog = true;
          this.externalLinkTitle = '';
          this.externalUrl = '';
          this.error = false;
          this.errorMessage = '';
          this.updateCanAddLink();
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Serveur indisponible',
            detail: 'Le serveur de documents est actuellement indisponible. Veuillez réessayer plus tard.'
          });
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Erreur lors de la vérification du serveur:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur de connexion',
          detail: 'Impossible de se connecter au serveur. Veuillez réessayer plus tard.'
        });
      }
    });
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
    if (!this.externalLinkTitle.trim() || !this.externalUrl.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez fournir un titre et une URL valide'
      });
      return;
    }

    // Valider le format de l'URL
    try {
      new URL(this.externalUrl);
    } catch (e) {
      this.messageService.add({
        severity: 'error',
        summary: 'URL invalide',
        detail: 'Veuillez fournir une URL valide (ex: https://example.com)'
      });
      return;
    }

    this.uploading = true;
    this.error = false;

    // Déterminer le projectId à utiliser (0 par défaut si non spécifié)
    const projectId = this.projectId || 0;
    const fileName = 'external-link'; // Nom de fichier par défaut pour les liens externes

    // Utiliser createExternalDocument avec les paramètres appropriés
    this.documentService.createExternalDocument(projectId, this.externalLinkTitle, this.externalUrl, fileName)
      .pipe(
        catchError(error => {
          console.error('Erreur lors de l\'ajout du lien externe:', error);
          this.error = true;
          
          // Gestion spécifique des erreurs
          if (error.status === 500) {
            this.errorMessage = 'Une erreur est survenue sur le serveur. Veuillez contacter l\'administrateur.';
          } else if (error.status === 400) {
            this.errorMessage = 'Données invalides. Veuillez vérifier l\'URL fournie.';
          } else if (error.status === 0) {
            this.errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
          } else {
            this.errorMessage = 'Impossible d\'ajouter le lien externe. Veuillez réessayer.';
          }
          
          return of(null);
        }),
        finalize(() => {
          this.uploading = false;
          if (!this.error) {
            this.externalLinkDialog = false;
            this.externalLinkTitle = '';
            this.externalUrl = '';
          }
        })
      )
      .subscribe(response => {
        if (response) {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Lien externe ajouté avec succès'
          });
          this.loadDocuments();
        }
      });
  }
  

  /**
   * Filtre les documents par type
   * @param event Événement contenant la valeur du filtre
   */
  filterByType(event: { value: string }): void {
    this.filters['type'] = event.value;
    this.applyFilters();
  }

  /**
   * Gère les changements dans les champs de recherche
   * @param event Événement de changement
   * @param field Champ à filtrer
   */
  onSearchChange(event: any, field: string): void {
    this.filters[field] = event.target.value;
    this.applyFilters();
  }

  /**
   * Applique tous les filtres actifs aux documents
   */
  applyFilters(): void {
    // Commencer avec les documents visibles (déjà filtrés par projet et permissions)
    let docs = this.visibleDocuments;
    
    // Appliquer les filtres supplémentaires
    this.filteredDocuments = docs.filter(doc => {
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
    // Recharger les documents en tenant compte du projectId actuel
    this.loadDocuments();
    // Afficher un message de confirmation
    this.messageService.add({
      severity: 'info',
      summary: 'Actualisation',
      detail: this.projectId ? 'Documents du projet actualisés' : 'Liste des documents actualisée'
    });
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

  /**
   * Configure le rafraîchissement automatique des documents
   * à intervalles réguliers (toutes les 30 secondes)
   */
  startAutoRefresh(): void {
    // Annuler tout abonnement existant
    this.autoRefreshSubscription?.unsubscribe();
    
    // Créer un nouvel abonnement pour rafraîchir les documents toutes les 30 secondes
    this.autoRefreshSubscription = interval(30000).subscribe(() => {
      if (!this.uploading) { // Ne pas rafraîchir pendant un téléchargement
        console.log('Rafraîchissement automatique des documents');
        this.loadDocuments();
      }
    });
  }
}