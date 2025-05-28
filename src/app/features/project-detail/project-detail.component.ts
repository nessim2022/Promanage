// src/app/features/project-detail/project-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../core/services/project.service';
import { ProjectDTO } from '../../shared/models/project';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TabViewModule } from 'primeng/tabview';
import { InputTextarea } from 'primeng/inputtextarea';
import { ProgressBarModule } from 'primeng/progressbar';
import { CalendarModule } from 'primeng/calendar';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { DocumentListComponent } from '../documents/document-list/document-list.component';
import { GitlabIntegrationComponent } from '../gitlab-integration/gitlab-integration.component';
import { ProjectMembersComponent } from '../project-members/project-members.component';
import { GitlabMembersComponent } from '../gitlab-members/gitlab-members.component';
import { DocumentService } from '../../core/services/document.service';
import type { Document } from '../../shared/models/document';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    CardModule,
    TabViewModule,
    InputTextarea,
    ProgressBarModule,
    CalendarModule,
    ToastModule,
    ConfirmDialogModule,
    DocumentListComponent,
    GitlabIntegrationComponent,
    ProjectMembersComponent,
    GitlabMembersComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {
  project: ProjectDTO = {
    projectId: 0,
    name: '',
    startDate: '',
    endDate: '',
    description: '',
    gitlabURL: '',
    progressStateId: 1,
    userIds: []
  };
  startDateValue: Date | null = null;
  endDateValue: Date | null = null;
  loading: boolean = false;

  // Ajout pour gestion des documents du projet
  documents: Document[] = [];
  loadingDocuments = false;
  errorDocuments = false;
  saving: boolean = false;
  errorMessage: string = '';
  activeTabIndex: number = 0;
  projectProgress: { state: string; progress: number } = {
    state: 'En cours',
    progress: 0
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private documentService: DocumentService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadProject();
  }

  // Nouvelle méthode pour charger les documents du projet
  loadDocuments() {
    if (!this.project.projectId) return;
    this.loadingDocuments = true;
    this.errorDocuments = false;
    
    // Vérifier si l'utilisateur est un super admin
    const isSuperAdmin = this.authService.isSuperAdmin();
    console.log('Chargement des documents en tant que super admin:', isSuperAdmin);
    
    this.documentService.getDocumentsByProject(this.project.projectId, isSuperAdmin)
      .subscribe({
        next: (docs: Document[]) => {
          this.documents = docs;
          this.loadingDocuments = false;
        },
        error: (err: any) => {
          this.errorDocuments = true;
          this.loadingDocuments = false;
        }
      });
  }

  loadProject() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'ID de projet manquant.';
      return;
    }

    this.loading = true;
    this.projectService.getProjectById(+id)
      .pipe(
        catchError(error => {
          console.error('Erreur lors du chargement du projet:', error);
          this.errorMessage = 'Impossible de charger le projet. Veuillez réessayer plus tard.';
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe(project => {
        if (project) {
          this.project = project;
          this.startDateValue = project.startDate ? new Date(project.startDate) : null;
          this.endDateValue = project.endDate ? new Date(project.endDate) : null;
          this.loadProjectProgress();
          this.loadDocuments(); // Charger les documents dès que le projet est chargé
        }
      });
  }

  loadProjectProgress() {
    if (!this.project.projectId) return;

    this.projectService.getProjectProgress(this.project.projectId)
      .pipe(
        catchError(error => {
          console.error('Erreur lors du chargement du progrès:', error);
          return of({ state: 'Inconnu', progress: 0 });
        })
      )
      .subscribe(progress => {
        this.projectProgress = progress;
      });
  }

  updateProject() {
    if (this.saving) return;

    this.saving = true;
    this.project.startDate = this.startDateValue ? this.formatDate(this.startDateValue) : '';
    this.project.endDate = this.endDateValue ? this.formatDate(this.endDateValue) : '';

    this.projectService.updateProject(this.project.projectId, this.project, 'admin@example.com')
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la mise à jour du projet:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de mettre à jour le projet. Veuillez réessayer.'
          });
          return of(null);
        }),
        finalize(() => {
          this.saving = false;
        })
      )
      .subscribe(project => {
        if (project) {
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Projet mis à jour avec succès'
          });
          this.project = project;
          this.loadProjectProgress();
        }
      });
  }

  confirmDelete() {
    this.confirmationService.confirm({
      message: 'Êtes-vous sûr de vouloir supprimer ce projet et toutes ses données associées ?',
      header: 'Confirmation de suppression',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.deleteProject();
      }
    });
  }

  deleteProject() {
    if (this.saving) return;

    this.saving = true;
    this.projectService.deleteProject(this.project.projectId)
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la suppression du projet:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de supprimer le projet. Veuillez réessayer.'
          });
          return of(null);
        }),
        finalize(() => {
          this.saving = false;
        })
      )
      .subscribe(() => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Projet supprimé avec succès'
        });
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1000);
      });
  }

  getProgressColorClass(): string {
    const progress = this.projectProgress.progress;
    if (progress < 30) return 'p-progressbar-danger';
    if (progress < 70) return 'p-progressbar-warning';
    return 'p-progressbar-success';
  }

  getStateClass(): string {
    const state = this.projectProgress.state.toLowerCase();
    if (state.includes('termin')) return 'status-completed';
    if (state.includes('test')) return 'status-testing';
    if (state.includes('develop') || state.includes('progress')) return 'status-development';
    if (state.includes('étude') || state.includes('study')) return 'status-planning';
    return 'status-default';
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  openGitLabUrl() {
    if (this.project && this.project.gitlabURL && this.project.gitlabURL.trim().length > 0) {
      // Assurez-vous que l'URL commence par http:// ou https://
      let url = this.project.gitlabURL;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      window.open(url, '_blank');
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'URL GitLab manquante',
        detail: 'Ce projet n\'a pas d\'URL GitLab configurée.'
      });
    }
  }

  getFormattedGitLabUrl(): string {
    if (!this.project || !this.project.gitlabURL) {
      return '';
    }

    try {
      const url = new URL(this.project.gitlabURL);
      const path = url.pathname.replace(/^\/+|\/+$/g, '');
      return path || url.hostname;
    } catch (e) {
      // Si ce n'est pas une URL valide, retourner la valeur telle quelle
      return this.project.gitlabURL;
    }
  }
}