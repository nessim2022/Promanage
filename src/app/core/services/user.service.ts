import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { MessageService } from 'primeng/api';

// Interface pour les utilisateurs/membres
export interface User {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  roles: Role[];
  projects?: number[];
}

// Interface pour les membres du projet avec infos additionnelles
export interface ProjectMember {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  joinDate?: string;
}

export interface Role {
  roleId: number;
  roleName: string;
  accessLevel: number;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;
  
  constructor(
    private http: HttpClient,
    private messageService: MessageService
  ) {}
  
  // Fonction utilitaire pour s'assurer que les URLs ne se terminent pas par des deux-points
  private ensureValidUrl(url: string): string {
    return url.endsWith(':') ? url.slice(0, -1) : url;
  }
  
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
  
  // Récupérer tous les utilisateurs
  getAllUsers(): Observable<User[]> {
    // Utilisation de ensureValidUrl pour éviter les problèmes d'URL
    const url = this.ensureValidUrl(`${this.apiUrl}/users`);
    
    return this.http.get<User[]>(url, { headers: this.getHeaders() })
      .pipe(
        tap(users => console.log(`Fetched ${users.length} users`)),
        catchError(error => {
          console.error('Error fetching users:', error);
          return of([]);
        })
      );
  }
  
  // Récupérer un utilisateur par ID
  getUserById(id: number): Observable<User> {
    // Utilisation de ensureValidUrl pour éviter les problèmes d'URL
    const url = this.ensureValidUrl(`${this.apiUrl}/users/${id}`);
    
    return this.http.get<User>(url, { headers: this.getHeaders() })
      .pipe(
        tap(user => console.log(`Fetched user with ID ${id}`)),
        catchError(error => {
          console.error(`Error fetching user ${id}:`, error);
          throw error;
        })
      );
  }
  
  // Récupérer les membres d'un projet GitLab
  getProjectMembersByGitlabUrl(gitlabUrl: string): Observable<ProjectMember[]> {
    // 1. Récupérer l'ID GitLab du projet à partir de l'URL
    return this.http.get<number>(`/api/gitlab/get-project-id?url=${gitlabUrl}`)
      .pipe(
        catchError(error => {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de récupérer l\'ID GitLab du projet. Vérifiez l\'URL.'
          });
          return of(null);
        }),
        // 2. Enchaîner la récupération des membres
        switchMap(gitlabProjectId => {
          if (!gitlabProjectId) return of([]);
          const url = `/api/gitlab/project-members?projectId=${gitlabProjectId}`;
          return this.http.get<ProjectMember[]>(url, {
            headers: this.getHeaders(),
            withCredentials: true
          }).pipe(
            tap(members => {
              console.log(`Récupération de ${members.length} membres GitLab pour le projet ${gitlabProjectId}`);
            }),
            catchError(error => {
              this.messageService.add({
                severity: 'error',
                summary: 'Erreur',
                detail: 'Impossible de charger les membres GitLab du projet.'
          });
          return of([]);
            })
          );
        })
      );
  }
  
  // Ajouter un utilisateur à un projet
  addUserToProject(projectId: number, userId: number, accessLevel: number): Observable<any> {
    console.log(`Tentative d'ajout de l'utilisateur ${userId} au projet ${projectId} avec l'accessLevel ${accessLevel}`);
    
    const data = { projectId, userId, accessLevel };
    
    // Utiliser l'endpoint backend correct
    return this.http.post(`/api/gitlab/add-member`, data, { 
      headers: this.getHeaders(),
      withCredentials: true,
      observe: 'response'
    }).pipe(
      map(response => response.body),
      catchError(error => {
        console.error(`Erreur lors de l'ajout de l'utilisateur au projet:`, error);
        if (error.status === 0) {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de connexion',
            detail: 'Impossible de se connecter au serveur. Veuillez vérifier que le serveur backend est en cours d\'exécution et que le port 8082 est accessible.'
          });
        } else if (error.status === 403) {
          this.messageService.add({
            severity: 'error',
            summary: 'Accès refusé',
            detail: 'Vous n\'avez pas les droits nécessaires pour effectuer cette action.'
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: `Erreur lors de l'ajout de l'utilisateur: ${error.message || 'Erreur inconnue'}`
          });
        }
        return throwError(() => error);
      }),
      tap(() => {
        console.log(`Utilisateur ${userId} ajouté au projet ${projectId} avec l'accessLevel ${accessLevel}`);
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Membre ajouté au projet avec succès'
        });
      })
    );
  }
  
  // Retirer un utilisateur d'un projet
  removeUserFromProject(projectId: number, userId: number): Observable<any> {
    console.log(`Tentative de suppression de l'utilisateur ${userId} du projet ${projectId}`);
    console.log(`URL d'API utilisée: ${this.apiUrl}/${projectId}/members/${userId}`);
    
    return this.http.delete(`${this.apiUrl}/${projectId}/members/${userId}`, { 
      headers: this.getHeaders(),
      withCredentials: true,
      observe: 'response'
    })
    .pipe(
      map(response => response.body),
      tap(() => {
        console.log(`Utilisateur ${userId} retiré du projet ${projectId}`);
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Membre retiré du projet avec succès'
        });
      }),
      catchError(error => {
        console.error(`Erreur lors de la suppression de l'utilisateur du projet:`, error);
        if (error.status === 0) {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de connexion',
            detail: 'Impossible de se connecter au serveur. Veuillez vérifier que le serveur backend est en cours d\'exécution et que le port 8082 est accessible.'
          });
        } else if (error.status === 403) {
          this.messageService.add({
            severity: 'error',
            summary: 'Accès refusé',
            detail: 'Vous n\'avez pas les droits nécessaires pour effectuer cette action.'
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: `Erreur lors de la suppression du membre: ${error.message || 'Erreur inconnue'}`
          });
        }
        return throwError(() => error);
      })
    );
  }
  
  // Mettre à jour un utilisateur
  updateUser(id: number, user: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/users/${id}`, user, { headers: this.getHeaders() })
      .pipe(
        tap(updatedUser => console.log(`Updated user ${id}`)),
        catchError(error => {
          console.error(`Error updating user ${id}:`, error);
          throw error;
        })
      );
  }
  
  // Créer un nouvel utilisateur
  createUser(user: Partial<User>): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, user, { headers: this.getHeaders() })
      .pipe(
        tap(newUser => console.log(`Created new user with ID ${newUser.userId}`)),
        catchError(error => {
          console.error('Error creating user:', error);
          throw error;
        })
      );
  }
  
  // Supprimer un utilisateur
  deleteUser(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap(() => console.log(`Deleted user with ID ${id}`)),
        catchError(error => {
          console.error(`Error deleting user ${id}:`, error);
          throw error;
        })
      );
  }

  // Get available roles
  getRoles(): Observable<Role[]> {
    const url = this.ensureValidUrl(`${this.apiUrl}/roles`);
    
    return this.http.get<Role[]>(url, { headers: this.getHeaders() })
      .pipe(
        tap(roles => console.log(`Fetched ${roles.length} roles`)),
        catchError(error => {
          console.error('Error fetching roles:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les rôles disponibles'
          });
          return of([]);
        })
      );
  }

  // Add a role to a user
  addRoleToUser(userId: number, roleId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/roles`, { userId, roleId }, { headers: this.getHeaders() })
      .pipe(
        tap(() => console.log(`Added role ${roleId} to user ${userId}`)),
        catchError(error => {
          console.error(`Error adding role to user:`, error);
          throw error;
        })
      );
  }

  // Récupérer les membres d'un projet
  getProjectMembers(projectId: number): Observable<ProjectMember[]> {
    const url = this.ensureValidUrl(`${this.apiUrl}/projects/${projectId}/members`);
    
    return this.http.get<ProjectMember[]>(url, { headers: this.getHeaders() })
      .pipe(
        tap(members => console.log(`Fetched ${members.length} project members for project ${projectId}`)),
        catchError(error => {
          console.error(`Error fetching project members for project ${projectId}:`, error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les membres du projet'
          });
          return of([]);
        })
      );
  }
}
