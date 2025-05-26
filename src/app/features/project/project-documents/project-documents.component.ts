import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DocumentService } from '../../../core/services/document.service';
import { Document } from '../../../shared/models/document';
import { MessageService } from 'primeng/api';
import { DocumentListComponent } from "../../documents/document-list/document-list.component";

@Component({
  selector: 'app-project-documents',
  templateUrl: './project-documents.component.html',
  imports: [DocumentListComponent],

})
export class ProjectDocumentsComponent implements OnInit {
showAddDocumentDialog() {
throw new Error('Method not implemented.');
}
showAddExternalLinkDialog() {
throw new Error('Method not implemented.');
}
  projectId: number | null = null;
  documents: Document[] = [];
  loading: boolean = true;
  isAdmin: boolean = false; // À déterminer selon les droits de l'utilisateur

  constructor(
    private route: ActivatedRoute,
    private documentService: DocumentService,
    private messageService: MessageService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.projectId = +params['id'];
        this.loadDocuments();
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'ID du projet non spécifié'
        });
      }
    });
  }

  loadDocuments(): void {
    if (!this.projectId) return;
    
    this.loading = true;
    this.documentService.getDocumentsByProject(this.projectId, this.isAdmin).subscribe({
      next: (documents) => {
        this.documents = documents;
        this.loading = false;
        console.log(`${documents.length} documents chargés pour le projet ${this.projectId}`);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des documents:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les documents du projet. Veuillez réessayer.'
        });
        this.loading = false;
      }
    });
  }
}