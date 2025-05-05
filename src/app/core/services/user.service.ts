import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
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
  
  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
  
  // Récupérer tous les utilisateurs
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`, { headers: this.getHeaders() })
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
    return this.http.get<User>(`${this.apiUrl}/users/${id}`, { headers: this.getHeaders() })
      .pipe(
        tap(user => console.log(`Fetched user with ID ${id}`)),
        catchError(error => {
          console.error(`Error fetching user ${id}:`, error);
          throw error;
        })
      );
  }
  
  // Récupérer les membres d'un projet spécifique
  getProjectMembers(projectId: number): Observable<ProjectMember[]> {
    // Utiliser le bon chemin d'API avec l'ID du projet
    const url = `${this.apiUrl}/projects/${projectId}/users`;
    console.log(`Récupération des membres pour le projet ${projectId} depuis ${url}`);
    
    return this.http.get<ProjectMember[]>(url, { 
      headers: this.getHeaders() 
    })
      .pipe(
        tap(members => {
          console.log(`Récupération de ${members.length} membres pour le projet ${projectId}`);
          // Informer l'utilisateur que les données sont chargées correctement
          // Nous n'affichons ce message que lors du premier chargement réussi après correction
          if (members.length > 0) {
            this.messageService.add({
              severity: 'success',
              summary: 'Succès',
              detail: 'Les membres du projet ont été chargés avec succès.'
            });
          }
        }),
        catchError(error => {
          console.error(`Erreur lors de la récupération des membres pour le projet ${projectId}:`, error);
          
          // Gestion spécifique des erreurs 404
          if (error.status === 404) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Endpoint non trouvé',
              detail: 'Le endpoint pour les membres du projet est introuvable. Veuillez vérifier l\'URL.'
            });
            return of([]);
          }
          
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de charger les membres du projet. Veuillez réessayer.'
          });
          return of([]);
        })
      );
  }
  
  // Ajouter un utilisateur à un projet
  addUserToProject(projectId: number, userId: number, role: string): Observable<any> {
    // Format de données selon votre API
    const data = { 
      userId: userId,
      role: role
    };
    
    console.log(`Tentative d'ajout de l'utilisateur ${userId} au projet ${projectId} avec le rôle ${role}`);
    
    // Endpoint: /api/projects/{projectId}/users
    return this.http.post(`${this.apiUrl}/projects/${projectId}/users`, data, { 
      headers: this.getHeaders() 
    }).pipe(
      catchError(error => {
        console.error(`Erreur lors de l'ajout de l'utilisateur au projet:`, error);
        if (error.status === 0) {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de connexion',
            detail: 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion.'
          });
        }
        throw error;
      }),
      tap(() => console.log(`Utilisateur ${userId} ajouté au projet ${projectId} avec le rôle ${role}`)),
      catchError(error => {
        console.error(`Erreur lors de l'ajout de l'utilisateur au projet:`, error);
        throw error;
      })
    );
  }
  
  // Retirer un utilisateur d'un projet
  removeUserFromProject(projectId: number, userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/projects/${projectId}/users/${userId}`, { headers: this.getHeaders() })
      .pipe(
        tap(() => console.log(`Removed user ${userId} from project ${projectId}`)),
        catchError(error => {
          console.error(`Error removing user from project:`, error);
          if (error.status === 0) {
            this.messageService.add({
              severity: 'error',
              summary: 'Erreur de connexion',
              detail: 'Impossible de se connecter au serveur. Veuillez vérifier votre connexion.'
            });
          }
          throw error;
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
    return this.http.get<Role[]>(`${this.apiUrl}/roles`, { headers: this.getHeaders() })
      .pipe(
        tap(roles => console.log(`Fetched ${roles.length} roles`)),
        catchError(error => {
          console.error('Error fetching roles:', error);
          // Return some default roles in case of error
          return of([
            { roleId: 1, roleName: 'Project Manager' },
            { roleId: 2, roleName: 'Developer' },
            { roleId: 3, roleName: 'Designer' },
            { roleId: 4, roleName: 'Tester' }
          ]);
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
}
