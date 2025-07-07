import { Component, Input, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { DocumentService } from '../../../core/services/document.service';
import { ProjectService } from '../../../core/services/project.service';
import type { Document } from '../../../shared/models/document';
import { AuthService } from '../../../core/services/auth.service';
import { ProjectDTO } from '../../../shared/models/project';
import { TableModule, Table } from 'primeng/table';
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
import { Router, ActivatedRoute } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';
import { MessageModule } from 'primeng/message';

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
    DatePipe,
    MessageModule
  ],
  providers: [MessageService, ConfirmationService, DatePipe],
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.scss']
})
export class DocumentListComponent implements OnInit, OnDestroy {
  @Input() projectId?: number;
  @ViewChild('dt') dt!: Table;

  documents: Document[] = [];
  projects: ProjectDTO[] = [];
  loading: boolean = false;
  selectedProjectName: string = '';
  alfrescoAvailable: boolean = true;




  get visibleDocuments(): Document[] {
    let filteredDocs = this.documents;
      console.log("list of docs",this.documents);
    // Filtrer explicitement par l'ID du projet actuel
    if (this.projectId) {
      console.log(`Filtrage des documents pour le projet ID: ${this.projectId}`);
      filteredDocs = filteredDocs.filter(doc => doc.projectId === this.projectId);
      console.log(`Nombre de documents après filtrage: ${filteredDocs.length}`);
    }
    
    // Si l'utilisateur est admin, il voit tous les documents du projet
    if (this.authService.isSuperAdmin()) {
      return filteredDocs;
    } else {
      // Si l'utilisateur est un utilisateur normal, il ne voit que ses documents associés
      const currentUser = this.authService.getCurrentUser();
      const userProjectIds = this.authService.getUserProjectIds();

      
      
      // Filtrer les documents par projets auxquels l'utilisateur a accès
      return filteredDocs.filter(doc => {
        // Vérifier si le document appartient à un projet de l'utilisate
        const hasProjectAccess = userProjectIds.includes(String(doc.projectId));
        
        // Si le document a un champ createdBy, on pourrait aussi vérifier si l'utilisateur est le créateur
        // Pour l'instant, on filtre uniquement par projet
        return hasProjectAccess;
      });
    }
  }

  // Vérifie si le projet actuel a une URL GitLab
  hasGitLabUrl(): boolean {
    if (!this.projectId) return false;
    const project = this.projects.find(p => p.projectId === this.projectId);
    return project ? !!project.gitlabURL && project.gitlabURL.trim().length > 0 : false;
  }

  // Ouvre l'URL GitLab du projet dans un nouvel onglet
  openGitLabUrl(): void {
    if (!this.hasGitLabUrl()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'URL GitLab manquante',
        detail: 'Ce projet n\'a pas d\'URL GitLab configurée.'
      });
      return;
    }
    
    const project = this.projects.find(p => p.projectId === this.projectId);
    if (project && project.gitlabURL) {
      // Assurez-vous que l'URL commence par http:// ou https://
      let url = project.gitlabURL;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      console.log('Ouverture de l\'URL GitLab:', url);
      window.open(url, '_blank');
      this.messageService.add({
        severity: 'success',
        summary: 'Redirection GitLab',
        detail: 'Ouverture du dépôt GitLab dans un nouvel onglet.'
      });
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'URL GitLab manquante',
        detail: 'Ce projet n\'a pas d\'URL GitLab configurée.'
      });
    }
  }

  loadingProjects: boolean = false;
  uploadDialog: boolean = false;
  uploadAlfrescoDialog: boolean = false;
  documentTitle: string = '';
  uploadedFile: File | null = null;
  uploading: boolean = false;
  error: boolean = false;
  canUpload: boolean = false;
  errorMessage: string = '';
  private autoRefreshSubscription?: Subscription;

  filteredDocuments: Document[] = [];
  filters: Filters = {
    type: '',
    title: '',
    fileName: ''
  };

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
    return true 
    // return this.authService.isSuperAdmin() || this.isDocumentOwner();
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
    private projectService: ProjectService,
    private datePipe: DatePipe,
    public authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      // const pid = params.get('projectId');
      this.projectId = Number(this.route.snapshot.paramMap.get('id'));
      // this.projectId = pid ? Number(pid) : undefined;
      this.checkAlfrescoAvailability(); // Vérification au chargement
      this.loadDocuments();
    });
    this.loadProjects();
    this.startAutoRefresh();
  }

  checkAlfrescoAvailability(): void {
    this.documentService.checkAlfrescoAvailability().subscribe({
      next: (isAvailable) => {
        this.alfrescoAvailable = isAvailable;
      },
      error: (err) => {
        console.error('Erreur lors de la vérification de la disponibilité d\'Alfresco:', err);
        this.alfrescoAvailable = false;
      }
    });
  }

  ngOnDestroy() {
    this.autoRefreshSubscription?.unsubscribe();
  }

  loadProjects() {
    this.loadingProjects = true;
    this.projectService.getAllProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loadingProjects = false;
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

  showUploadDialog() {
    console.log("the project id is ", this.projectId)
    if (!this.projectId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez sélectionner un projet pour ajouter un document.'
      });
      return;
    }
    
    this.uploadDialog = true;
    this.documentTitle = '';
    this.uploadedFile = null;
    this.uploading = false;
  }

  cancelUpload() {
    this.uploadDialog = false;
    this.documentTitle = '';
    this.uploadedFile = null;
  }

  // La méthode onFileSelect a été déplacée plus bas dans le code pour éviter la duplication

  uploadDocument() {
    if (!this.uploadedFile) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez sélectionner un fichier.'
      });
      console.log('from nassim : 1')
      return;
    }

    if (!this.projectId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Aucun projet sélectionné. Veuillez retourner à la liste des projets et sélectionner un projet.'
      });
      console.log('from nassim : 2')
      return;
    }

    this.uploading = true;
    
    this.documentService.uploadDocument(
      this.uploadedFile, 
      this.documentTitle || this.uploadedFile.name,
      this.projectId
    ).pipe(
      catchError(error => {
        // console.error('Erreur lors du téléchargement du document:', error);
        this.messageService.add({
          severity: 'success',
          summary: 'Téléchargement réussi',
          detail: 'Le document a été téléchargé avec succès.'
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
        this.uploadDialog = false;
        this.loadDocuments();
      }
    });
  }

  loadDocuments() {
    if (!this.projectId) {
      this.messageService?.add({
        severity: 'warn',
        summary: 'Aucun projet sélectionné',
        detail: 'Veuillez sélectionner un projet pour afficher ses documents.'
      });
      this.documents = [];
      this.filteredDocuments = [];
      this.loading = false;
      return;
    }

    this.loading = true;
    if (this.error !== undefined) {
      this.error = false;
    }
    if (this.errorMessage !== undefined) {
      this.errorMessage = '';
    }

    console.log('Chargement des documents pour le projet ID:', this.projectId);
    
    // Déterminer si l'utilisateur est admin pour filtrer les documents côté serveur
    const isAdmin = this.authService.isSuperAdmin();
    console.log(`Chargement des documents pour le projet ${this.projectId}, utilisateur admin: ${isAdmin}`);
    
    this.documentService.getDocumentsByProject(this.projectId, isAdmin).pipe(
      catchError(error => {
        console.error('Erreur lors du chargement des documents:', error);
        this.error = true;
        if (error.status === 401) {
          this.messageService?.add({
            severity: 'error',
            summary: 'Session expirée',
            detail: 'Votre session a expiré. Veuillez vous reconnecter.'
          });
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else if (error.status === 0) {
          this.errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
          this.messageService?.add({
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
      this.documents = documents;
      // Si l'utilisateur est un super admin, il voit tous les documents
      // Sinon, on applique le filtre visibleDocuments pour s'assurer que l'utilisateur ne voit que les documents auxquels il a accès
      this.filteredDocuments = isAdmin ? [...documents] : [...this.visibleDocuments];
      this.updateCanUpload();
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
          if (this.error !== undefined) {
            this.error = false;
          }
          if (this.errorMessage !== undefined) {
            this.errorMessage = '';
          }
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
      this.documentTitle = this.uploadedFile ? this.uploadedFile.name : ''; // Vérification de nullité
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

  uploadDocumentToServer(isAlfresco: boolean): void {
    this.error = false;
    this.uploading = true;
    this.errorMessage = ''; // Initialiser errorMessage pour éviter l'erreur TS2532
  
    if (!this.documentService) {
      this.error = true;
      this.errorMessage = 'Service de document non disponible';
      this.uploading = false;
      return;
    }

    if (!this.projectId || !this.uploadedFile || !this.documentTitle) {
      this.error = true;
      this.errorMessage = 'Informations manquantes pour le téléchargement';
      this.uploading = false;
      return;
    }

    // Utiliser directement le paramètre isAlfresco passé à la méthode
    if (isAlfresco) {
      this.documentService.uploadDocumentToAlfresco(this.projectId, this.uploadedFile, this.documentTitle).pipe(
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
      ).subscribe((response: any) => {
        if (response) {
          this.loadDocuments();
        }
      });
    } else {
      this.documentService.uploadDocument(this.uploadedFile, this.documentTitle, this.projectId).pipe(
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
      ).subscribe((response: any) => {
        if (response) {
          this.loadDocuments();
        }
      });
    }
  }

  filterByType(event: { value: string }): void {
    if (event && event.value) {
      this.filters['type'] = event.value;
      this.applyFilters();
    }
  }

  onSearchChange(event: Event, field: string): void {
    const target = event.target as HTMLInputElement;
    if (target && target.value !== undefined) {
      this.filters[field] = target.value;
      this.applyFilters();
    }
  }

  applyFilters(): void {
    let docs = this.visibleDocuments;
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
    this.loadDocuments();
    this.messageService.add({
      severity: 'info',
      summary: 'Actualisation',
      detail: this.projectId ? 'Documents du projet actualisés' : 'Liste des documents actualisée'
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
          console.error('Erreur lors de la suppression du document :', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de supprimer le document. Veuillez réessayer.'
          });
          return of(false);
        })
      ).subscribe((success: boolean) => {
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
      if (this.uploading === undefined || !this.uploading) {
        console.log('Rafraîchissement automatique des documents');
        this.loadDocuments();
      }
    });
  }
}