import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, map, switchMap, timeout } from 'rxjs/operators';
import { Document as AppDocument } from '../../shared/models/document';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private apiUrl = environment.apiUrl;
  private alfrescoUrl = environment.alfrescoUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {}

  private handleSessionExpired(error: any): Observable<never> {
    if (error.status === 401 || 
        (error.error && error.error.message === 'Votre session a expiré. Veuillez vous reconnecter.')) {
      this.messageService.add({
        severity: 'error',
        summary: 'Session expirée',
        detail: 'Votre session a expiré. Veuillez vous reconnecter.'
      });
      this.router.navigate(['/login']);
    }
    return throwError(() => error);
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token'); // Aligné avec AuthService
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getAllDocuments(): Observable<AppDocument[]> {
    console.log('Récupération de tous les documents');
    return this.http.get<any[]>(`${this.apiUrl}/documents`, { 
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      map(docs => this.processDocuments(docs)),
      catchError(error => this.handleSessionExpired(error))
    );
  }

  getDocumentById(documentId: number): Observable<AppDocument> {
    return this.http.get<AppDocument>(`${this.apiUrl}/documents/${documentId}`, { 
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(doc => console.log(`Document récupéré: ${doc.title}`)),
      catchError(error => {
        console.error(`Erreur lors de la récupération du document ${documentId}:`, error);
        return this.handleSessionExpired(error);
      })
    );
  }

  getDocumentsByProject(projectId: number, isAdmin: boolean = false): Observable<AppDocument[]> {
    console.log(`Récupération des documents pour le projet ${projectId}, utilisateur admin: ${isAdmin}`);
    
    // S'assurer que l'URL de l'API est correcte
    const apiUrl = this.apiUrl.endsWith('/') ? this.apiUrl.slice(0, -1) : this.apiUrl;
    
    // Utiliser le bon endpoint pour récupérer les documents d'un projet
    return this.http.get<any[]>(`${apiUrl}/projects/${projectId}/documents`, {
      headers: this.getHeaders(),
      params: { isAdmin: isAdmin.toString() },
      withCredentials: true
    }).pipe(
      catchError(error => {
        if (error.status === 404) {
          console.error(`Projet ${projectId} non trouvé:`, error);
          this.messageService.add({
            severity: 'warn',
            summary: 'Projet non trouvé',
            detail: 'Aucun document trouvé pour ce projet.'
          });
          return of([]);
        } else if (error.status === 403) {
          console.error(`Accès refusé aux documents du projet ${projectId}:`, error);
          this.messageService.add({
            severity: 'error',
            summary: 'Accès refusé',
            detail: 'Vous n\'avez pas les permissions nécessaires pour accéder aux documents de ce projet.'
          });
          return of([]);
        }
        return this.handleSessionExpired(error);
      }),
      map(docs => this.processDocuments(docs))
    );
  }

  checkAlfrescoAvailability(): Observable<boolean> {
    // Utilisation de l'URL correcte pour vérifier la disponibilité d'Alfresco
    // S'assurer que l'URL ne se termine pas par ':'
    const alfrescoUrl = environment.alfrescoUrl.endsWith(':') 
      ? environment.alfrescoUrl.slice(0, -1) 
      : environment.alfrescoUrl;
    
    const statusUrl = `${alfrescoUrl}/status`;
    console.log('Vérification de la disponibilité du service Alfresco sur:', statusUrl);
    
    return this.http.get<any>(statusUrl, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      map(() => true),
      catchError(error => {
        console.error('Erreur lors de la vérification de la disponibilité du service Alfresco:', error);
        return of(false);
      })
    );
  }

  uploadDocument(projectId: number, file: File, title: string): Observable<any> {
    if (projectId <= 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Aucun projet sélectionné. Veuillez spécifier un projet.'
      });
      return throwError(() => new Error('Aucun projet sélectionné'));
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('projectId', projectId.toString());

    const uploadUrl = `${this.apiUrl}/documents/upload`;
    console.log(`Tentative de téléversement vers: ${uploadUrl}`);

    return this.http.post(uploadUrl, formData, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      timeout(30000),
      tap(response => {
        console.log('Document téléversé avec succès:', response);
        this.messageService.add({
          severity: 'success',
          summary: 'Téléversement réussi',
          detail: 'Le document a été téléversé avec succès.'
        });
      }),
      catchError(error => {
        console.error('Erreur lors du téléversement:', error);
        return this.handleSessionExpired(error);
      })
    );
  }

  uploadDocumentToAlfresco(projectId: number, file: File, title: string): Observable<any> {
    if (projectId <= 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Aucun projet sélectionné. Veuillez spécifier un projet.'
      });
      return throwError(() => new Error('Aucun projet sélectionné'));
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    
    // Utiliser l'URL d'API pour l'upload via Alfresco
    const uploadUrl = `${this.apiUrl}/documents/alfresco/upload/${projectId}`;
    console.log(`Tentative de téléversement vers Alfresco via API: ${uploadUrl}`);
    
    return this.checkAlfrescoAvailability().pipe(
      switchMap(isAvailable => {
        if (!isAvailable) {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de connexion',
            detail: 'Le serveur Alfresco est actuellement indisponible. Veuillez réessayer plus tard.'
          });
          return throwError(() => new Error('Le serveur Alfresco est indisponible'));
        }
        
        return this.http.post(uploadUrl, formData, { 
          headers: this.getHeaders(),
          withCredentials: true
        }).pipe(
          timeout(30000),
          tap(response => {
            console.log('Document téléversé avec succès vers Alfresco:', response);
            this.messageService.add({
              severity: 'success',
              summary: 'Téléversement réussi',
              detail: 'Le document a été téléversé avec succès vers Alfresco.'
            });
          }),
          catchError(error => {
            console.error('Erreur lors du téléversement vers Alfresco:', error);
            return this.handleSessionExpired(error);
          })
        );
      })
    );
  }

  deleteDocument(documentId: number): Observable<boolean> {
    return this.http.delete<void>(`${this.apiUrl}/documents/${documentId}`, { 
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      map(() => true),
      tap(() => console.log(`Document ${documentId} supprimé`)),
      catchError(error => {
        console.error(`Erreur lors de la suppression du document ${documentId}:`, error);
        return this.handleSessionExpired(error);
      })
    );
  }

  downloadDocument(documentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documents/download/${documentId}`, {
      responseType: 'blob',
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(() => console.log(`Document ${documentId} téléchargé`)),
      catchError(error => {
        console.error(`Erreur lors du téléchargement du document ${documentId}:`, error);
        return this.handleSessionExpired(error);
      })
    );
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Une erreur est survenue pendant la requête HTTP:', error);
    
    let errorMsg = 'Une erreur inconnue est survenue';
    if (error.error instanceof ErrorEvent) {
      errorMsg = `Erreur: ${error.error.message}`;
    } else {
      errorMsg = `Code d'erreur: ${error.status}, Message: ${error.message}`;
    }
    
    this.messageService.add({
      severity: 'error',
      summary: 'Erreur',
      detail: errorMsg
    });
    
    return throwError(() => new Error(errorMsg));
  }

  private processDocuments(documents: any[]): AppDocument[] {
    return documents.map(doc => {
      const processedDoc: AppDocument = {
        documentId: doc.documentId,
        title: doc.title || 'Sans titre',
        fileName: doc.fileName || 'fichier sans nom',
        alfrescoURL: doc.alfrescoURL || '',
        projectId: doc.projectId || (doc.project?.projectId) || 0,
        isExternal: doc.isExternal || false,
        mimeType: doc.mimeType || null,
        type: doc.type || null,
        version: doc.version || null
      };
      
      if (doc.creationDate) {
        processedDoc.creationDate = new Date(doc.creationDate);
      } else {
        processedDoc.creationDate = new Date();
      }
      
      if (doc.lastModifiedDate) {
        processedDoc.lastModifiedDate = new Date(doc.lastModifiedDate);
      }
      
      return processedDoc;
    });
  }

  updateDocument(document: AppDocument): Observable<AppDocument> {
    return this.http.put<AppDocument>(`${this.apiUrl}/documents/${document.documentId}`, document, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(updatedDoc => console.log(`Document ${updatedDoc.documentId} mis à jour`)),
      catchError(error => {
        console.error(`Erreur lors de la mise à jour du document ${document.documentId}:`, error);
        return this.handleSessionExpired(error);
      })
    );
  }

  getDocumentsForCurrentUser(): Observable<AppDocument[]> {
    return this.http.get<any[]>(`${this.apiUrl}/documents/user`, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      map(docs => this.processDocuments(docs)),
      catchError(error => {
        console.error('Erreur lors de la récupération des documents de l\'utilisateur:', error);
        return this.handleSessionExpired(error);
      })
    );
  }

  createExternalDocument(projectId: number, externalDocData: any): Observable<AppDocument> {
    return this.http.post<AppDocument>(`${this.apiUrl}/documents/external/${projectId}`, externalDocData, {
      headers: this.getHeaders(),
      withCredentials: true
    }).pipe(
      tap(doc => {
        console.log('Document externe créé avec succès:', doc);
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Le document externe a été ajouté avec succès.'
        });
      }),
      catchError(error => {
        console.error('Erreur lors de la création du document externe:', error);
        return this.handleSessionExpired(error);
      })
    );
  }
}