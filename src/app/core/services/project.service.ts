// src/app/core/services/project.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { ProjectDTO } from '../../shared/models/project';
import { AuthService } from './auth.service';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private apiUrl = '/api/projects';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {}

  private handleSessionExpired(error: any): Observable<never> {
    if (error.status === 401 || 
        (error.error && error.error.message === 'Votre session a expiré. Veuillez vous reconnecter.')) {
      // Redirection immédiate vers la page de login
      this.router.navigate(['/login']);
      this.messageService.add({severity:'error', summary: 'Session expirée', detail:'Votre session a expiré. Veuillez vous reconnecter.'});
    }
    return throwError(() => error);
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getAllProjects(): Observable<ProjectDTO[]> {
    const headers = this.getHeaders();
    console.log('Récupération de tous les projets avec token:', headers.get('Authorization'));
    
    return this.http.get<ProjectDTO[]>(this.apiUrl, { headers })
      .pipe(
        tap(projects => console.log('Nombre de projets récupérés:', projects.length)),
        catchError(error => {
          console.error('Erreur lors de la récupération des projets:', error);
          return this.handleSessionExpired(error);
        })
      );
  }

  getProjectById(id: number): Observable<ProjectDTO> {
    return this.http.get<ProjectDTO>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error(`Erreur lors de la récupération du projet ${id}:`, error);
          return this.handleSessionExpired(error);
        })
      );
  }

  getProjectProgress(id: number): Observable<{ state: string; progress: number }> {
    return this.http.get<{ state: string; progress: number }>(`${this.apiUrl}/${id}/progress`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error(`Erreur lors de la récupération du progrès du projet ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  createProject(project: ProjectDTO, email: string): Observable<ProjectDTO> {
    return this.http.post<ProjectDTO>(`${this.apiUrl}/create?email=${email}`, project, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la création du projet:', error);
          return throwError(() => error);
        })
      );
  }

  updateProject(id: number, project: ProjectDTO, email: string): Observable<ProjectDTO> {
    return this.http.put<ProjectDTO>(`${this.apiUrl}/${id}?email=${email}`, project, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error(`Erreur lors de la mise à jour du projet ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error(`Erreur lors de la suppression du projet ${id}:`, error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Récupère les projets du user courant (sécurisé par le backend)
   */
  getProjectsForCurrentUser(): Observable<ProjectDTO[]> {
    return this.http.get<ProjectDTO[]>(`${this.apiUrl}/user`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error('Erreur lors de la récupération des projets du user courant:', error);
          return this.handleSessionExpired(error);
        })
      );
  }

  /**
   * Récupère les documents pour un projet (seulement si le user est autorisé)
   */
  getDocumentsForProject(projectId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${projectId}/documents`, { headers: this.getHeaders() })
      .pipe(
        catchError(error => {
          console.error(`Erreur lors de la récupération des documents pour le projet ${projectId}:`, error);
          return this.handleSessionExpired(error);
        })
      );
  }
}