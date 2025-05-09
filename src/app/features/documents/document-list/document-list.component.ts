import { Component, OnInit, Input } from '@angular/core';
import { Document } from '../../../shared/models/document';
import { DocumentService } from '../../../core/services/document.service';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ActivatedRoute } from '@angular/router';
import { timer } from 'rxjs';

@Component({
  selector: 'app-document-list',
  templateUrl: './document-list.component.html',
  styleUrls: ['./document-list.component.scss']
})
export class DocumentListComponent implements OnInit {
  @Input() projectId: number | null = null;
  @Input() isAdmin: boolean = false;

  documents: Document[] = [];
  loading: boolean = true;
  selectedDocument: Document | null = null;
  
  constructor(
    private documentService: DocumentService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private route: ActivatedRoute
  ) {}

  // Indicateur de disponibilité du service Alfresco
  alfrescoAvailable: boolean = true;
  
  ngOnInit(): void {
    // Vérifier d'abord la disponibilité du service Alfresco
    this.updateCanUpload();
    
    // Si projectId est fourni en tant que paramètre d'entrée, l'utiliser
    // Sinon, essayer de le récupérer depuis les paramètres de route
    if (!this.projectId) {
      this.route.params.subscribe(params => {
        const id = params['id'];
        if (id) {
          this.projectId = +id;
          this.loadDocuments();
        } else {
          // Si aucun projectId n'est fourni, charger tous les documents de l'utilisateur
          this.loadUserDocuments();
        }
      });
    } else {
      this.loadDocuments();
    }
    
    // Vérifier périodiquement la disponibilité du service Alfresco (toutes les 30 secondes)
    timer(30000, 30000).subscribe(() => {
      this.updateCanUpload();
    });
  }

  loadDocuments(): void {
    this.loading = true;
    if (this.projectId) {
      this.documentService.getDocumentsByProject(this.projectId, this.isAdmin).subscribe({
        next: (documents) => {
          this.documents = documents;
          this.loading = false;
          console.log('Documents chargés:', documents);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des documents:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les documents. Veuillez réessayer.'
          });
          this.loading = false;
        }
      });
    }
  }

  loadUserDocuments(): void {
    this.loading = true;
    this.documentService.getDocumentsForCurrentUser().subscribe({
      next: (documents) => {
        this.documents = documents;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des documents:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les documents. Veuillez réessayer.'
        });
        this.loading = false;
      }
    });
  }

  downloadDocument(document: Document): void {
    if (document.documentId) {
      this.documentService.downloadDocument(document.documentId).subscribe({
        next: (blob) => {
          // Créer un lien temporaire pour télécharger le fichier
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = document.fileName || 'document';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
        },
        error: (error) => {
          console.error('Erreur lors du téléchargement du document:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de télécharger le document. Veuillez réessayer.'
          });
        }
      });
    }
  }

  deleteDocument(document: Document): void {
    this.confirmationService.confirm({
      message: `Êtes-vous sûr de vouloir supprimer le document "${document.title}" ?`,
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        if (document.documentId) {
          this.documentService.deleteDocument(document.documentId).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Succès',
                detail: 'Document supprimé avec succès'
              });
              // Recharger la liste des documents
              this.loadDocuments();
            },
            error: (error) => {
              console.error('Erreur lors de la suppression du document:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Erreur',
                detail: 'Impossible de supprimer le document. Veuillez réessayer.'
              });
            }
          });
        }
      }
    });
  }
  
  /**
   * Vérifie si le service Alfresco est disponible et met à jour l'interface en conséquence
   */
  updateCanUpload(): void {
    this.documentService.checkAlfrescoAvailability().subscribe({
      next: (isAvailable) => {
        this.alfrescoAvailable = isAvailable;
        console.log('Service Alfresco disponible:', isAvailable);
        if (!isAvailable) {
          console.log('Service Alfresco indisponible - fonctionnalités limitées');
          this.messageService.add({
            severity: 'warn',
            summary: 'Service documentaire limité',
            detail: 'Le service de gestion documentaire est partiellement disponible. Certaines fonctionnalités peuvent être limitées.',
            life: 5000
          });
        }
      },
      error: (error) => {
        console.error('Erreur lors de la vérification de la disponibilité du service Alfresco:', error);
        this.alfrescoAvailable = false;
      }
    });
  }
}