import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { GitLabMember } from '../../shared/models/gitlab-member';


@Injectable({
  providedIn: 'root'
})
export class GitlabApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Récupère les membres d'un projet GitLab spécifique
   * Utilise l'endpoint du backend qui communique avec l'API GitLab
   */
  getProjectMembers(projectId: number): Observable<GitLabMember[]> {
    if (!projectId || projectId <= 0) {
      console.error('ID du projet invalide');
      return of([]);
    }

    const url = `${this.apiUrl}/projects/${projectId}/members`;
    console.log(`Récupération des membres GitLab pour le projet ${projectId} depuis ${url}`);

    return this.http.get<GitLabMember[]>(url, { headers: this.getHeaders() }).pipe(
      tap(members => console.log(`Récupération de ${members.length} membres GitLab pour le projet ${projectId}`)),
      catchError((error: HttpErrorResponse) => {
        console.error(`Erreur lors de la récupération des membres GitLab pour le projet ${projectId}:`, error);
        if (error.status === 404) {
          console.warn('Endpoint /projects/{projectId}/members non trouvé');
        } else if (error.status === 401) {
          console.warn('Non autorisé : veuillez vérifier le jeton');
        }
        return of([]);
      })
    );
  }
}