// src/app/core/services/document.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
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
      // Redirection vers la page de login
      this.router.navigate(['/login']);
    }
    return throwError(() => error);
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private getHeadersWithoutContentType(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  getAllDocuments(): Observable<AppDocument[]> {
    console.log('Récupération de tous les documents');
    return this.http.get<any[]>(`${this.apiUrl}/documents`, { 
      headers: this.getHeaders()
    }).pipe(
      map(docs => this.processDocuments(docs))
    );
  }

  /**
   * Récupère les documents de l'utilisateur connecté
   */
  getDocumentsForCurrentUser(): Observable<AppDocument[]> {
    return this.http.get<any[]>(`${this.apiUrl}/documents/user`, {
      headers: this.getHeaders()
    }).pipe(
      map(docs => this.processDocuments(docs))
    );
  }

  getDocumentById(documentId: number): Observable<AppDocument> {
    return this.http.get<AppDocument>(`${this.apiUrl}/documents/${documentId}`, { headers: this.getHeaders() })
      .pipe(
        tap(doc => console.log(`Document récupéré: ${doc.title}`)),
        catchError(error => {
          console.error(`Erreur lors de la récupération du document ${documentId}:`, error);
          throw error;
        })
      );
  }

  getDocumentsByProject(projectId: number): Observable<AppDocument[]> {
    console.log(`Récupération des documents pour le projet ${projectId}`);
    return this.http.get<any[]>(`${this.apiUrl}/documents/project/${projectId}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => this.handleSessionExpired(error)),
      map(docs => this.processDocuments(docs))
    );
  }

  uploadDocument(projectId: number, file: File, title: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    return this.http.post(`${this.alfrescoUrl}/upload/${projectId}`, formData, { responseType: 'text' })
      .pipe(
        tap(() => console.log('Document uploaded to Alfresco')),
        catchError(error => {
          console.error('Error uploading document to Alfresco:', error);
          throw error;
        })
      );
  }

  /**
   * Crée un document qui est un lien vers une ressource externe
   * @param projectId ID du projet
   * @param title Titre du document
   * @param url URL de la ressource externe
   * @returns Document créé
   */
  createExternalDocument(projectId: number, title: string, url: string, fileName: string = 'external-link'): Observable<AppDocument> {
    const documentData = {
      title: title,
      fileName: fileName,
      alfrescoURL: url,
      projectId: projectId,
      isExternal: true,
      creationDate: new Date()
    };
    
    return this.http.post<AppDocument>(`${this.apiUrl}/documents/external`, documentData, { 
      headers: this.getHeaders() 
    }).pipe(
      tap(doc => console.log('Document externe créé avec succès:', doc)),
      catchError(error => {
        console.error('Erreur lors de la création du document externe:', error);
        return this.handleSessionExpired(error);
      })
    );
  }

  /**
   * Met à jour un document
   * @param document Document à mettre à jour
   */
  updateDocument(document: AppDocument): Observable<AppDocument> {
    return this.http.put<AppDocument>(`${this.apiUrl}/documents/${document.documentId}`, document, {
      headers: this.getHeaders()
    }).pipe(
      tap(updated => console.log('Document updated:', updated)),
      catchError(error => {
        console.error('Error updating document:', error);
        return this.handleSessionExpired(error);
      })
    );
  }

  /**
   * Supprime un document
   * @param documentId ID du document à supprimer
   */
  deleteDocument(documentId: number): Observable<boolean> {
    return this.http.delete<void>(`${this.apiUrl}/documents/${documentId}`, { headers: this.getHeaders() }).pipe(
      map(() => true),
      tap(() => console.log(`Document ${documentId} deleted`)),
      catchError(error => {
        console.error(`Error deleting document ${documentId}:`, error);
        return this.handleSessionExpired(error);
      })
    );
  }

  /**
   * Télécharge un document
   * @param documentId ID du document à télécharger
   */
  downloadDocument(documentId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/documents/${documentId}/download`, {
      responseType: 'blob',
      headers: this.getHeaders()
    }).pipe(
      tap(() => console.log(`Document ${documentId} downloaded`)),
      catchError(error => {
        console.error(`Error downloading document ${documentId}:`, error);
        return this.handleSessionExpired(error);
      })
    );
  }

  /**
   * Downloads a document directly from Alfresco using its URL
   * @param alfrescoURL The Alfresco URL of the document
   * @returns Observable containing the file blob
   */
  downloadDocumentFromAlfresco(alfrescoURL: string): Observable<Blob> {
    const headers = new HttpHeaders({
      'Accept': 'application/octet-stream'
    });

    return this.http.get(alfrescoURL, {
      headers: headers,
      responseType: 'blob'
    }).pipe(
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Handles HTTP errors and converts them to an observable error
   * @param error The HTTP error response
   * @returns An observable error
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('An error occurred during HTTP request:', error);
    
    let errorMsg = 'An unknown error occurred';
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMsg = `Error: ${error.error.message}`;
    } else {
      // Server-side error
      errorMsg = `Error Code: ${error.status}, Message: ${error.message}`;
    }
    
    return throwError(() => new Error(errorMsg));
  }

  // Méthode utilitaire pour traiter les documents
  private processDocuments(documents: any[]): AppDocument[] {
    return documents.map(doc => {
      // Si le document contient un objet project, extraire le projectId
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
      
      // Traitement des dates
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

  // Chercher des documents dans Alfresco
  searchDocumentsInAlfresco(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.alfrescoUrl}/search`, {
      params: { query: query },
      headers: this.getHeaders()
    }).pipe(
      tap(results => console.log(`Found ${results.length} documents matching query "${query}"`)),
      catchError(error => {
        console.error(`Error searching documents with query "${query}":`, error);
        return of([]);
      })
    );
  }
}