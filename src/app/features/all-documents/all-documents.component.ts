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
    AccordionModule
  ],
  providers: [MessageService, ConfirmationService, DatePipe],
  template: `
    <div class="all-documents-container">
      <p-toast></p-toast>
      <p-confirmDialog [style]="{width: '450px'}"></p-confirmDialog>
      
      <div class="section-header">
        <h2>Documents par projet</h2>
      </div>

      <p-accordion [multiple]="true">
        <p-accordionTab *ngFor="let project of projectsWithDocuments" 
                       [header]="project.name + ' (' + project.documents.length + ' documents)'">
          <p-table [value]="project.documents" 
                  [paginator]="true" 
                  [rows]="10"
                  [showCurrentPageReport]="true"
                  [tableStyle]="{ 'min-width': '50rem' }"
                  [loading]="loading"
                  currentPageReportTemplate="Affichage de {first} à {last} sur {totalRecords} documents">
            <ng-template pTemplate="header">
              <tr>
                <th>Nom</th>
                <th>Type</th>
                <th>Date de création</th>
                <th>Actions</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-document>
              <tr>
                <td>{{document.name}}</td>
                <td>{{document.type}}</td>
                <td>{{document.createdAt | date:'dd/MM/yyyy HH:mm'}}</td>
                <td>
                  <button pButton pRipple icon="pi pi-eye" 
                          class="p-button-rounded p-button-info mr-2"
                          pTooltip="Voir le document"
                          (click)="viewDocument(document)"></button>
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
                <td colspan="4" class="text-center">Aucun document trouvé</td>
              </tr>
            </ng-template>
          </p-table>
        </p-accordionTab>
      </p-accordion>
    </div>
  `,
  styles: [`
    .all-documents-container {
      padding: 1rem;
    }
    .section-header {
      margin-bottom: 1rem;
    }
    .mr-2 {
      margin-right: 0.5rem;
    }
    :host ::ng-deep .p-accordion .p-accordion-header a {
      font-weight: bold;
    }
    :host ::ng-deep .p-accordion .p-accordion-content {
      padding: 1.5rem;
    }
  `]
})
export class AllDocumentsComponent implements OnInit {
  loading = false;
  projectsWithDocuments: Array<ProjectDTO & { documents: Document[] }> = [];

  constructor(
    private documentService: DocumentService,
    private projectService: ProjectService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit() {
    this.loadProjectsWithDocuments();
  }

  loadProjectsWithDocuments() {
    this.loading = true;
    this.projectService.getAllProjects().pipe(
      catchError(error => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les projets'
        });
        return of([]);
      })
    ).subscribe(projects => {
      // Pour chaque projet, charger ses documents
      Promise.all(projects.map(project =>
        this.documentService.getDocumentsByProject(project.projectId).pipe(
          catchError(error => of([]))
        ).toPromise()
        .then(documents => ({
          ...project,
          documents: documents || []
        }))
      )).then(projectsWithDocs => {
        this.projectsWithDocuments = projectsWithDocs;
        this.loading = false;
      });
    });
  }

  viewDocument(document: Document) {
    // Implement document viewing logic
  }

  downloadDocument(document: Document) {
    // Implement document download logic
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
    this.documentService.deleteDocument(document.documentId).pipe(
      catchError(error => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de supprimer le document'
        });
        return of(null);
      })
    ).subscribe(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Succès',
        detail: 'Document supprimé avec succès'
      });
      this.loadProjectsWithDocuments();
    });
  }
}