// src/app/core/services/document.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, of, throwError, timer } from 'rxjs';
import { catchError, tap, map, switchMap, retry, retryWhen, delayWhen, take, timeout } from 'rxjs/operators';
import { Document as AppDocument } from '../../shared/models/document';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private apiUrl = environment.apiUrl;
  // Utilisation de l'URL Alfresco définie dans l'environnement
  private alfrescoUrl = environment.alfrescoUrl;
  // URL de fallback en cas d'échec
  private fallbackAlfrescoUrl = environment.backendUrl + '/alfresco2';

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

  getDocumentsByProject(projectId: number, isAdmin: boolean = false): Observable<AppDocument[]> {
    console.log(`Récupération des documents pour le projet ${projectId}`);
    const endpoint = isAdmin 
      ? `${this.apiUrl}/documents/project/${projectId}/admin`
      : `${this.apiUrl}/documents/project/${projectId}`;
      
    return this.http.get<any[]>(endpoint, {
      headers: this.getHeaders()
    }).pipe(
      catchError(error => {
        // Gestion spécifique de l'erreur "Unsupported field: HourOfDay"
        if (error.status === 500 && error.error?.message?.includes('Unsupported field: HourOfDay')) {
          console.error('Erreur de format de date détectée:', error);
          console.log('Détails de l\'erreur de format de date:', {
            message: error.error?.message,
            trace: error.error?.trace,
            timestamp: error.error?.timestamp,
            projectId: projectId
          });
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de format',
            detail: 'Un problème de format de date a été détecté. Veuillez contacter l\'administrateur.'
          });
          
          // Retry with simplified date format
          return this.http.get<any[]>(`${this.apiUrl}/documents/project/${projectId}/simple`, {
            headers: this.getHeaders()
          }).pipe(
            map(docs => this.processDocuments(docs))
          );
        }
        
        // Gestion des erreurs 404
        if (error.status === 404) {
          console.error(`Endpoint non trouvé pour le projet ${projectId}:`, error);
          this.messageService.add({
            severity: 'warn',
            summary: 'Endpoint non trouvé',
            detail: 'Le endpoint demandé n\'existe pas. Veuillez vérifier l\'URL.'
          });
          return of([]);
        }
        
        return this.handleSessionExpired(error);
      }),
      map(docs => this.processDocuments(docs))
    );
  }

  /**
   * Vérifie si le serveur Alfresco est disponible
   * @returns Observable<boolean> true si le serveur est disponible
   */
  checkAlfrescoAvailability(): Observable<boolean> {
    console.log('Vérification de la disponibilité du service documentaire à:', this.alfrescoUrl);
    
    // Essayer d'abord un simple ping sur l'endpoint principal
    return this.http.get(`${this.alfrescoUrl}`, { 
      observe: 'response', 
      responseType: 'text',
      headers: this.getHeaders()
    })
    .pipe(
      timeout(5000), // Utilisation de l'opérateur RxJS timeout au lieu du paramètre non supporté
      map(response => {
        console.log('Service documentaire disponible, statut:', response.status);
        return true;
      }),
      catchError(error => {
        console.error('Erreur lors de la vérification du service documentaire:', error);
        
        // Si l'erreur est 404 ou status 0 (erreur réseau), essayer avec l'URL de fallback
        if (error.status === 404 || error.status === 0) {
          console.log('Tentative avec l\'URL de fallback:', this.fallbackAlfrescoUrl);
          return this.http.get(`${this.fallbackAlfrescoUrl}`, { 
            observe: 'response', 
            responseType: 'text',
            headers: this.getHeaders()
          })
          .pipe(
            timeout(5000), // Utilisation de l'opérateur RxJS timeout
            map(response => {
              console.log('Service documentaire disponible via URL de fallback, statut:', response.status);
              // Si le fallback fonctionne, mettre à jour l'URL principale pour les futures requêtes
              this.alfrescoUrl = this.fallbackAlfrescoUrl;
              return true;
            }),
            catchError(fallbackError => {
              // Si le fallback échoue également, essayer l'endpoint de vérification de l'API
              console.log('Tentative avec un endpoint alternatif');
              return this.http.get(`${environment.apiUrl}/documents/check`, { 
                observe: 'response', 
                responseType: 'text',
                headers: this.getHeaders()
              })
              .pipe(
                timeout(5000), // Utilisation de l'opérateur RxJS timeout
                map(response => {
                  console.log('Service documentaire disponible via API, statut:', response.status);
                  return true;
                }),
                catchError(innerError => {
                  console.error('Erreur lors de la vérification alternative:', innerError);
                  
                  // Si on reçoit une erreur 403 ou 401, cela signifie que le service existe mais nécessite une authentification
                  if (innerError.status === 403 || innerError.status === 401) {
                    console.log('Service documentaire détecté mais nécessite une authentification');
                    return of(true);
                  }
                  
                  this.messageService.add({
                    severity: 'warn',
                    summary: 'Service de documents indisponible',
                    detail: 'Le service de gestion documentaire est temporairement indisponible.'
                  });
                  return of(false);
                })
              );
            })
          );
        }
        
        // Si on reçoit une erreur 403 ou 401, cela signifie que le service existe mais nécessite une authentification
        if (error.status === 403 || error.status === 401) {
          console.log('Service documentaire détecté mais nécessite une authentification');
          return of(true);
        }
        
        this.messageService.add({
          severity: 'warn',
          summary: 'Service de documents indisponible',
          detail: 'Le service de gestion documentaire est temporairement indisponible.'
        });
        return of(false);
      })
    );
  }
  /**
   * Gère les erreurs spécifiques d'Alfresco et affiche des messages appropriés
   * @param error L'erreur HTTP à traiter
   * @returns Observable d'erreur avec le message approprié
   */
  private handleAlfrescoError(error: any): Observable<never> {
    console.error('Erreur Alfresco détectée:', error);
    
    // Gestion spécifique des erreurs
    if (error.status === 500) {
      // Vérifier si l'erreur contient des informations spécifiques
      const errorBody = error.error;
      if (typeof errorBody === 'string' && errorBody.includes('Method \'GET\' is not supported')) {
        console.log('Erreur de méthode HTTP détectée, tentative avec POST');
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur de configuration',
          detail: 'Le serveur n\'accepte pas cette méthode. Veuillez contacter l\'administrateur.'
        });
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur serveur',
          detail: 'Une erreur est survenue sur le serveur de documents. Veuillez contacter l\'administrateur.'
        });
      }
    } else if (error.status === 413) {
      this.messageService.add({
        severity: 'error',
        summary: 'Fichier trop volumineux',
        detail: 'Le fichier est trop volumineux pour être téléversé.'
      });
    } else if (error.status === 415) {
      this.messageService.add({
        severity: 'error',
        summary: 'Format non supporté',
        detail: 'Le format du fichier n\'est pas supporté.'
      });
    } else if (error.status === 0) {
      // Erreur de connexion réseau - tenter de basculer vers l'URL de fallback
      console.log('Erreur de connexion réseau, tentative avec URL de fallback');
      console.log('URL Alfresco actuelle:', this.alfrescoUrl);
      
      // Si nous utilisons déjà l'URL principale, basculer vers l'URL de fallback
      if (this.alfrescoUrl === environment.alfrescoUrl) {
        this.alfrescoUrl = this.fallbackAlfrescoUrl;
        console.log('Basculement vers URL de fallback:', this.alfrescoUrl);
      }
      
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur de connexion',
        detail: 'Impossible de se connecter au serveur de documents. Fonctionnalités documentaires limitées.'
      });
    } else if (error.status === 404) {
      // Erreur 404 - tenter de basculer vers l'URL de fallback si ce n'est pas déjà fait
      console.log('Ressource non trouvée, tentative avec URL alternative');
      
      // Si nous utilisons déjà l'URL principale, basculer vers l'URL de fallback
      if (this.alfrescoUrl === environment.alfrescoUrl) {
        this.alfrescoUrl = this.fallbackAlfrescoUrl;
        console.log('Basculement vers URL de fallback:', this.alfrescoUrl);
      }
      
      this.messageService.add({
        severity: 'error',
        summary: 'Ressource non trouvée',
        detail: 'Le service de documents est inaccessible ou mal configuré. Fonctionnalités documentaires limitées.'
      });
    }
    
    return throwError(() => error);
  }

  uploadDocument(projectId: number, file: File, title: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    
    console.log(`Tentative de téléversement vers: ${this.alfrescoUrl}/upload/${projectId}`);
    
    // Vérifier d'abord si le serveur Alfresco est disponible
    return this.checkAlfrescoAvailability().pipe(
      switchMap(isAvailable => {
        if (!isAvailable) {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de connexion',
            detail: 'Le serveur de documents est actuellement indisponible. Veuillez réessayer plus tard.'
          });
          return throwError(() => new Error('Le serveur Alfresco est indisponible'));
        }
        
        // Utilisation du bon endpoint pour le téléversement
        return this.http.post(`${this.alfrescoUrl}/upload/${projectId}`, formData, { 
          responseType: 'text',
          headers: this.getHeadersWithoutContentType() // Important pour les requêtes multipart/form-data
        })
        .pipe(
          timeout(30000), // Timeout de 30 secondes pour les téléversements volumineux
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
            
            // Si erreur de connexion ou 404, essayer avec l'URL de fallback
            if ((error.status === 0 || error.status === 404) && this.alfrescoUrl !== this.fallbackAlfrescoUrl) {
              console.log('Tentative de téléversement avec URL de fallback');
              this.alfrescoUrl = this.fallbackAlfrescoUrl;
              
              return this.http.post(`${this.alfrescoUrl}/upload/${projectId}`, formData, { 
                responseType: 'text',
                headers: this.getHeadersWithoutContentType()
              })
              .pipe(
                timeout(30000), // Timeout de 30 secondes
                tap(response => {
                  console.log('Document téléversé avec succès via URL de fallback:', response);
                  this.messageService.add({
                    severity: 'success',
                    summary: 'Téléversement réussi',
                    detail: 'Le document a été téléversé avec succès.'
                  });
                }),
                catchError(fallbackError => {
                  console.error('Erreur lors du téléversement avec URL de fallback:', fallbackError);
                  return this.handleAlfrescoError(fallbackError);
                })
              );
            }
            
            return this.handleAlfrescoError(error);
          })
        );
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
    console.log(`Tentative de création d'un document externe pour le projet ${projectId}`);
    
    // Vérifier d'abord si le service documentaire est disponible
    return this.checkAlfrescoAvailability().pipe(
      switchMap(isAvailable => {
        if (!isAvailable) {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de connexion',
            detail: 'Le service documentaire est actuellement indisponible. Veuillez réessayer plus tard.'
          });
          return throwError(() => new Error('Le service documentaire est indisponible'));
        }
        
        const documentData = {
          title: title,
          fileName: fileName,
          alfrescoURL: url,
          projectId: projectId,
          isExternal: true,
          creationDate: new Date()
        };
        
        console.log('Données du document externe:', documentData);
        
        return this.http.post<AppDocument>(`${this.apiUrl}/documents/external`, documentData, { 
          headers: this.getHeaders()
        })
        .pipe(
          timeout(10000), // Timeout de 10 secondes
          tap(doc => {
            console.log('Document externe créé avec succès:', doc);
            this.messageService.add({
              severity: 'success',
              summary: 'Document créé',
              detail: 'Le lien externe a été ajouté avec succès.'
            });
          }),
          catchError(error => {
            console.error('Erreur lors de la création du document externe:', error);
            
            // Gestion des erreurs CORS (status 0) ou erreurs réseau
            if (error.status === 0) {
              console.log('Erreur CORS ou réseau détectée lors de la création du document externe');
              this.messageService.add({
                severity: 'error',
                summary: 'Erreur de connexion',
                detail: 'Impossible de se connecter au service de documents. Vérifiez votre connexion réseau.'
              });
              
              // Si nous utilisons l'URL principale, essayer avec l'URL de fallback
              if (this.alfrescoUrl === environment.alfrescoUrl) {
                console.log('Basculement vers URL de fallback pour les futures opérations');
                this.alfrescoUrl = this.fallbackAlfrescoUrl;
              }
            }
            // Gestion spécifique des erreurs pour les liens externes
            else if (error.status === 400) {
              this.messageService.add({
                severity: 'error',
                summary: 'Données invalides',
                detail: 'Veuillez vérifier l\'URL fournie.'
              });
            } else if (error.status === 404) {
              this.messageService.add({
                severity: 'error',
                summary: 'Endpoint non trouvé',
                detail: 'Le service de création de documents externes n\'est pas disponible.'
              });
              
              // Si nous utilisons l'URL principale, essayer avec l'URL de fallback
              if (this.alfrescoUrl === environment.alfrescoUrl) {
                console.log('Basculement vers URL de fallback pour les futures opérations');
                this.alfrescoUrl = this.fallbackAlfrescoUrl;
              }
            }
            return this.handleSessionExpired(error);
          })
        );
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
      observe: 'body',
      headers: this.getHeaders()
    }).pipe(
      map(response => {
        // Si la réponse est un ArrayBuffer, la convertir en Blob
        if (response instanceof ArrayBuffer) {
          console.log('Conversion d\'ArrayBuffer en Blob');
          return new Blob([response]);
        }
        return response as Blob;
      }),
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
      responseType: 'blob',
      observe: 'body'
    })
    .pipe(
      timeout(30000), // 30 secondes de timeout
      // Retry up to 2 times with a 1s delay between attempts
      retryWhen(errors => 
        errors.pipe(
          delayWhen(() => timer(1000)),
          take(2),
          tap(() => console.log('Tentative de téléchargement après erreur...')),
          tap(error => {
            if (error.status === 0) {
              console.log('Erreur réseau lors du téléchargement, nouvelle tentative...');
              // Si nous utilisons l'URL principale, essayer avec l'URL de fallback
              if (this.alfrescoUrl === environment.alfrescoUrl) {
                console.log('Basculement vers URL de fallback pour les futures opérations');
                this.alfrescoUrl = this.fallbackAlfrescoUrl;
              }
            }
          })
        )
      ),
      catchError(error => this.handleError(error))
    );
  }

  /**
   * Handles HTTP errors and converts them to an observable error
   * @param error The HTTP error response
   * @returns An observable error
   */
  /**
   * Gère les erreurs HTTP génériques et les convertit en observable d'erreur
   * @param error La réponse d'erreur HTTP
   * @returns Un observable d'erreur
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Une erreur est survenue pendant la requête HTTP:', error);
    
    // Gestion des erreurs CORS et réseau
    if (error.status === 0) {
      console.log('Erreur réseau ou CORS détectée, tentative de basculement vers URL de fallback');
      // Si nous utilisons l'URL principale, basculer vers l'URL de fallback
      if (this.alfrescoUrl === environment.alfrescoUrl) {
        this.alfrescoUrl = this.fallbackAlfrescoUrl;
        console.log('Basculement vers URL de fallback pour les futures opérations:', this.alfrescoUrl);
      }
    }
    
    let errorMsg = 'Une erreur inconnue est survenue';
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMsg = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMsg = `Code d'erreur: ${error.status}, Message: ${error.message}`;
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
    console.log(`Recherche de documents avec la requête "${query}" à l'URL: ${this.alfrescoUrl}/search`);
    
    return this.http.get<any[]>(`${this.alfrescoUrl}/search`, {
      params: { query: query },
      headers: this.getHeaders(),
      observe: 'body'
    })
    .pipe(
      timeout(10000), // 10 secondes de timeout
      map(results => {
        // Vérifier si results est un ArrayBuffer et le convertir en tableau vide si c'est le cas
        if (results instanceof ArrayBuffer) {
          console.warn('Résultat inattendu (ArrayBuffer) reçu de la recherche, conversion en tableau vide');
          return [];
        }
        return results;
      }),
      tap(results => {
        console.log(`${results.length} documents trouvés correspondant à la requête "${query}"`);
        if (results.length === 0) {
          this.messageService.add({
            severity: 'info',
            summary: 'Aucun résultat',
            detail: 'Aucun document ne correspond à votre recherche.'
          });
        }
      }),
      catchError(error => {
        console.error(`Erreur lors de la recherche de documents avec la requête "${query}":`, error);
        
        if (error.status === 0) {
          console.log('Erreur CORS ou réseau détectée lors de la recherche');
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de connexion',
            detail: 'Impossible de se connecter au service de recherche. Vérifiez votre connexion réseau.'
          });
          
          // Si nous utilisons l'URL principale, essayer avec l'URL de fallback
          if (this.alfrescoUrl === environment.alfrescoUrl) {
            console.log('Basculement vers URL de fallback pour les futures opérations');
            this.alfrescoUrl = this.fallbackAlfrescoUrl;
            
            // Tenter une nouvelle recherche avec l'URL de fallback
            return this.http.get<any[]>(`${this.alfrescoUrl}/search`, {
              params: { query: query },
              headers: this.getHeaders(),
              observe: 'body'
            })
            .pipe(
              timeout(10000), // 10 secondes de timeout
              map(results => {
                // Vérifier si results est un ArrayBuffer et le convertir en tableau vide si c'est le cas
                if (results instanceof ArrayBuffer) {
                  console.warn('Résultat inattendu (ArrayBuffer) reçu de la recherche, conversion en tableau vide');
                  return [];
                }
                return results;
              }),
              tap(results => {
                console.log(`${results.length} documents trouvés avec l'URL de fallback`);
              }),
              catchError(fallbackError => {
                console.error('Erreur lors de la recherche avec URL de fallback:', fallbackError);
                this.messageService.add({
                  severity: 'error',
                  summary: 'Service de recherche indisponible',
                  detail: 'La fonctionnalité de recherche de documents n\'est pas disponible actuellement.'
                });
                return of([]);
              })
            );
          }
        } else if (error.status === 404) {
          this.messageService.add({
            severity: 'error',
            summary: 'Service de recherche indisponible',
            detail: 'La fonctionnalité de recherche de documents n\'est pas disponible actuellement.'
          });
          
          // Si nous utilisons l'URL principale, essayer avec l'URL de fallback
          if (this.alfrescoUrl === environment.alfrescoUrl) {
            console.log('Basculement vers URL de fallback pour les futures opérations');
            this.alfrescoUrl = this.fallbackAlfrescoUrl;
          }
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur de recherche',
            detail: 'Une erreur est survenue lors de la recherche de documents.'
          });
        }
        
        return of([]);
      })
    );
  }
}