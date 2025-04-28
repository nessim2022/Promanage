// src/app/core/services/gitlab.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { GitLabProjectWithContributorsDTO } from '../../shared/models/gitlab-project-with-contributors';
import { GitLabMember } from '../../shared/models/gitlab-member';
import { AuthService } from './auth.service';
import { catchError, tap } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class GitlabService {
  // Changed from /api/gitlab to root API since backend endpoints are at root level
  private apiUrl = '';
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
    return this.http.get<GitLabProjectWithContributorsDTO[]>(`/my-projects`, { 
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
    return this.http.get<any>(`/projects/${projectId}`, { 
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
        return this.http.get<GitLabProjectWithContributorsDTO>(`/gitlab/projects/${projectId}`, { 
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
    return this.http.post<boolean>(`/gitlab/sync/${projectId}`, {}, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(() => console.log(`Synced GitLab project ${projectId}`)),
      catchError(error => {
        console.error(`Error syncing GitLab project ${projectId}:`, error);
        throw error;
      })
    );
  }

  addMemberToGitLabProject(projectId: number, email: string): Observable<boolean> {
    return this.http.post<boolean>(`/gitlab/add-user`, {
      projectId,
      email
    }, { headers: this.getHeaders() }).pipe(
      tap(() => console.log(`Added member ${email} to GitLab project ${projectId}`)),
      catchError(error => {
        console.error(`Error adding member to GitLab project:`, error);
        throw error;
      })
    );
  }

  getProjectDetails(url: string): Observable<GitLabProjectWithContributorsDTO> {
    // Updated to match the backend controller endpoint
    return this.http.get<GitLabProjectWithContributorsDTO>(`/project-details`, { 
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
    // Updated to match the backend controller endpoint
    return this.http.get<GitLabMember[]>(`/validate-gitlab-url`, { 
      params: { url: url },
      headers: this.getHeaders() 
    }).pipe(
      tap(members => console.log('Validated GitLab URL, received members:', members)),
      catchError(error => {
        console.error(`Error validating GitLab URL ${url}:`, error);
        throw error;
      })
    );
  }
}