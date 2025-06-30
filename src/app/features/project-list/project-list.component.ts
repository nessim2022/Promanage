// src/app/features/project-list/project-list.component.ts
import { Component, OnInit } from '@angular/core';
import { ProjectService } from '../../core/services/project.service';
import { ProjectDTO } from '../../shared/models/project';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { DocumentListComponent } from '../documents/document-list/document-list.component';
import { AuthService } from '../../core/services/auth.service';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, RouterLink, CardModule, DocumentListComponent, ToastModule, TooltipModule],
  providers: [MessageService],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent implements OnInit {
  projects: ProjectDTO[] = [];
  selectedProjectId?: number;
  loading: boolean = false;
  isAdmin: boolean = false;

  constructor(
    private projectService: ProjectService,
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.isAdmin = this.authService.isSuperAdmin();
    this.loadProjects();
  }
  
  loadProjects() {
    this.loading = true;
    
    // Si l'utilisateur est admin, récupérer tous les projets
    // Sinon, récupérer uniquement les projets de l'utilisateur courant
    const projectObservable = this.isAdmin ? 
      this.projectService.getAllProjects() : 
      this.projectService.getProjectsForCurrentUser();
    
    projectObservable.pipe(
      catchError(error => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les projets'
        });
        return of([]);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe(data => {
      this.projects = data;
    });
  }

  onSelectProject(projectId: number) {
    this.selectedProjectId = projectId;
  }

  deleteProject(id: number) {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce projet ?')) {
      this.loading = true;
      this.projectService.deleteProject(id).pipe(
        catchError(error => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de supprimer le projet'
          });
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
        })
      ).subscribe(result => {
        if (result !== null) {
          this.projects = this.projects.filter(p => p.projectId !== id);
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Projet supprimé avec succès'
          });
        }
      });
    }
  }
}