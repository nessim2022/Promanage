// src/app/features/dashboard/dashboard.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../../core/services/project.service';
import { ProjectDTO } from '../../shared/models/project';
import { TableModule } from 'primeng/table';
import { ProgressBarModule } from 'primeng/progressbar';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { RouterModule, Router } from '@angular/router';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    TableModule, 
    ProgressBarModule, 
    CardModule, 
    ButtonModule,
    RouterModule,
    ToastModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  projects: ProjectDTO[] = [];
  progressData: { [key: number]: { state: string; progress: number } } = {};
  loading = true;
  error = false;
  errorMessage = '';
  currentDate = new Date();

  isSuperAdmin = false;
  isSimpleUser = false;

  selectedProject: ProjectDTO | null = null;
  selectedProjectDocuments: any[] = [];
  loadingDocuments = false;
  documentsError = false;
  documentsErrorMessage = '';

  constructor(private projectService: ProjectService, private router: Router) {
    console.log('Dashboard component initialized');
  }

  ngOnInit() {
    // Extract user role from localStorage (auth_user)
    const userString = localStorage.getItem('auth_user');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        // Adjust according to your user model
        if (user && ((user.email === 'admin@example.com' && user.id === 1103) ||
          (user.roles && user.roles.some((role: { authority: string }) => role.authority === 'SUPER_ADMIN')))) {
          this.isSuperAdmin = true;
        } else {
          this.isSimpleUser = true;
        }
      } catch (e) {
        this.isSimpleUser = true;
      }
    } else {
      this.isSimpleUser = true;
    }
    console.log('isSuperAdmin:', this.isSuperAdmin, 'isSimpleUser:', this.isSimpleUser);
    this.loadProjects();
  }

  /**
   * Récupère l'état d'un projet à partir de son ID
   * @param projectId ID du projet
   * @returns État du projet ou valeur par défaut
   */
  getProjectState(projectId: number): string {
    if (this.progressData[projectId] && this.progressData[projectId].state) {
      return this.progressData[projectId].state;
    }
    return 'En attente';
  }

  /**
   * Récupère le pourcentage de progression d'un projet à partir de son ID
   * @param projectId ID du projet
   * @returns Pourcentage de progression ou 0
   */
  getProjectProgress(projectId: number): number {
    if (this.progressData[projectId] && this.progressData[projectId].progress !== undefined) {
      return this.progressData[projectId].progress;
    }
    return 0;
  }

  loadProjects() {
    console.log('Dashboard - Chargement des projets');
    this.loading = true;
    this.error = false;
    this.errorMessage = '';
    this.projects = [];
    this.progressData = {};
    const user = localStorage.getItem('auth_user');
const userRole = user?JSON.parse(user):null;
console.log('userRole:pccqxqXQSQxqskx',userRole.roles?.[0].authority)

   if(userRole.roles?.[0].authority === 'superAdmin') {
    this.projectService.getAllProjects()
      .pipe(
        catchError(error => {
          console.error('Erreur lors du chargement des projets:', error);
          this.error = true;
          
          if (error.status === 403 || error.status === 401 || 
              (error.error && error.error.message === 'Votre session a expiré. Veuillez vous reconnecter.')) {
            // Redirection immédiate vers la page de login
            this.router.navigate(['/login']);
          } else {
            this.errorMessage = 'Impossible de charger les projets. Veuillez réessayer plus tard.';
          }
          
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
          console.log('Chargement des projets terminé');
        })
      )
      .subscribe(projects => {
        console.log('Projets reçus:', projects);
        this.projects = projects;
        
        if (projects.length === 0 && !this.error) {
          console.log('Aucun projet trouvé');
        }
        
        projects.forEach(project => {
          console.log('Chargement des détails du projet:', project.projectId);
          this.projectService.getProjectProgress(project.projectId)
            .pipe(
              catchError(error => {
                console.error(`Erreur lors du chargement du progrès du projet ${project.projectId}:`, error);
                return of({ state: 'error', progress: 0 });
              })
            )
            .subscribe(progress => {
              console.log(`Progrès reçu pour le projet ${project.projectId}:`, progress);
              this.progressData[project.projectId] = progress;
            });
        });
      });
    }
    else if (userRole.roles?.[0].authority === 'USER'||userRole.roles?.[0].authority === 'stagier'){
      this.projectService.getProjectsForCurrentUser().pipe(
        catchError(error => {
          console.error('Erreur lors du chargement des projets:', error);
          this.error = true;
          if (error.status === 403 || error.status === 401 || 
              (error.error && error.error.message === 'Votre session a expiré. Veuillez vous reconnecter.')) {
            this.router.navigate(['/login']);
          } else {
            this.errorMessage = 'Impossible de charger vos projets. Veuillez réessayer plus tard.';
          }
          return of([]);
        }),
        finalize(() => {
          this.loading = false;
          console.log('Chargement des projets terminé');
        })
      )
      .subscribe(projects => {
        console.log('Projets reçus:', projects);
        this.projects = projects;
        if (projects.length === 0 && !this.error) {
          this.errorMessage = 'Aucun projet trouvé.';
        }
        projects.forEach(project => {
          console.log('Chargement des détails du projet:', project.projectId);
          this.projectService.getProjectProgress(project.projectId)
            .pipe(
              catchError(error => {
                console.error(`Erreur lors du chargement du progrès du projet ${project.projectId}:`, error);
                return of({ state: 'error', progress: 0 });
              })
            )
            .subscribe(progress => {
              console.log(`Progrès reçu pour le projet ${project.projectId}:`, progress);
              this.progressData[project.projectId] = progress;
            });
        });
      });
    }
  }

  getCompletedProjectsCount(): number {
    if (!this.projects || this.projects.length === 0) return 0;
    
    return this.projects.filter(project => {
      const progress = this.progressData[project.projectId];
      return progress && progress.progress === 100;
    }).length;
  }

  getInProgressProjectsCount(): number {
    if (!this.projects || this.projects.length === 0) return 0;
    
    return this.projects.filter(project => {
      const progress = this.progressData[project.projectId];
      return progress && progress.progress > 0 && progress.progress < 100;
    }).length;
  }

  getTeamMembersCount(): number {
    // Simuler un nombre d'équipes - dans une application réelle, 
    // cette méthode récupérerait le nombre réel de membres d'équipe
    return this.projects && this.projects.length > 0 ? this.projects.length * 2 : 0;
  }

  getStateClass(projectId: number): string {
    const progress = this.progressData[projectId];
    if (!progress) return 'status-pending';
    
    if (progress.state === 'error') return 'status-error';
    if (progress.progress === 100) return 'status-completed';
    if (progress.progress > 0) return 'status-in-progress';
    
    return 'status-pending';
  }

  /**
   * Affiche les documents pour un projet sélectionné
   */
  viewDocuments(projectId: number) {
    this.selectedProject = this.projects.find(p => p.projectId === projectId) || null;
    this.selectedProjectDocuments = [];
    this.loadingDocuments = true;
    this.documentsError = false;
    this.documentsErrorMessage = '';
    this.projectService.getDocumentsForProject(projectId).pipe(
      catchError(error => {
        this.documentsError = true;
        if (error.status === 403) {
          this.documentsErrorMessage = 'Vous n\'êtes pas autorisé à voir les documents de ce projet.';
        } else {
          this.documentsErrorMessage = 'Erreur lors du chargement des documents. Veuillez réessayer.';
        }
        return of([]);
      }),
      finalize(() => {
        this.loadingDocuments = false;
      })
    ).subscribe(docs => {
      this.selectedProjectDocuments = docs;
      if (docs.length === 0 && !this.documentsError) {
        this.documentsErrorMessage = 'Aucun document trouvé pour ce projet.';
      }
    });
  }
}