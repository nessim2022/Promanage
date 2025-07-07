// src/app/core/services/gitlab.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { GitLabProjectWithContributorsDTO } from '../../shared/models/gitlab-project-with-contributors';
import { GitLabMember } from '../../shared/models/gitlab-member';
import { AuthService } from './auth.service';
import { catchError, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class GitlabService {
  // Base API URL for GitLab endpoints
  private apiUrl = '/api/gitlab';
  private authUrl = '/auth';

  constructor(private http: HttpClient, private authService: AuthService) {}
  
  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken() || localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  getMyProjects(): Observable<GitLabProjectWithContributorsDTO[]> {
    // Updated to match the backend controller endpoint
    return this.http.get<GitLabProjectWithContributorsDTO[]>(`${this.apiUrl}/my-projects`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(projects => console.log('Fetched GitLab projects:', projects)),
      catchError(error => {
        console.error('Error fetching GitLab projects:', error);
        return of([]);
      })
    );
  }

  getGitLabProject(projectId: number): Observable<GitLabProjectWithContributorsDTO> {
    // Use the project-details endpoint from the backend with URL parameter
    if (!projectId) {
      console.error('Project ID is required');
      return of(null as any);
    }
    
    // First try to get the project's GitLab URL from the backend
    return this.http.get<any>(`/api/projects/${projectId}`, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(project => console.log('Fetched project details to get GitLab URL:', project)),
      catchError(error => {
        console.error(`Error fetching project ${projectId} details:`, error);
        return of(null);
      }),
      // Then use the GitLab URL to get project details
      // This is a nested observable approach
      catchError(() => {
        // If we can't get the URL from project, try the direct endpoint
        return this.http.get<GitLabProjectWithContributorsDTO>(`${this.apiUrl}/projects/${projectId}`, { 
          headers: this.getHeaders() 
        }).pipe(
          tap(project => console.log('Fetched GitLab project details directly:', project)),
          catchError(error => {
            console.error(`Error fetching GitLab project for projectId ${projectId}:`, error);
            throw error;
          })
        );
      })
    );
  }

  syncGitLabProject(projectId: number): Observable<boolean> {
    return this.http.post<boolean>(`${this.apiUrl}/sync/${projectId}`, {}, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(() => console.log(`Synced GitLab project ${projectId}`)),
      catchError(error => {
        console.error(`Error syncing GitLab project ${projectId}:`, error);
        throw error;
      })
    );
  }

  
 
  addMemberToGitLabProject(projectId: number, userId: number, accessLevel: number): Observable<boolean> {
    return this.http.post<boolean>(`${this.apiUrl}/add-member`, {
      projectId,
      userId,
      accessLevel
    }, { headers: this.getHeaders() }).pipe(
      tap(() => console.log(`Added member ${userId} to GitLab project ${projectId}`)),
      catchError(error => {
        console.error(`Error adding member to GitLab project:`, error);
        throw error;
      })
    );
  }

  getProjectDetails(url: string): Observable<GitLabProjectWithContributorsDTO> {
    // Updated to match the backend controller endpoint
    return this.http.get<GitLabProjectWithContributorsDTO>(`${this.apiUrl}/project-details`, { 
      params: { url: url },
      headers: this.getHeaders() 
    }).pipe(
      tap(project => console.log('Fetched GitLab project details by URL:', project)),
      catchError(error => {
        console.error(`Error fetching GitLab project details for URL ${url}:`, error);
        throw error;
      })
    );
  }

  validateGitlabUrl(url: string): Observable<GitLabMember[]> {
    // Utiliser l'URL complète avec le paramètre de requête
    console.log('Validation de l\'URL GitLab:', url);
    
    // Créer correctement les headers
    const headers = this.getHeaders().set('Accept', 'application/json');
    
    console.log('En-têtes de la requête:', headers);
    
    return this.http.get<GitLabMember[]>(`${this.apiUrl}/validate-gitlab-url`, { 
      params: { url },
      headers,
      withCredentials: true  // Ajouter cette option pour inclure les cookies dans la requête
    }).pipe(
      tap(response => {
        console.log('Réponse brute de validateGitlabUrl:', response);
        if (Array.isArray(response)) {
          console.log('Validated GitLab URL, received members:', response);
        } else {
          console.error('La réponse n\'est pas un tableau:', response);
        }
      }),
      catchError(error => {
        console.error(`Error validating GitLab URL ${url}:`, error);
        console.error('Détails de l\'erreur:', error.status, error.statusText, error.message);
        throw error;
      })
    );
  }
}