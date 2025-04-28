export interface Document {
  // Champs du modèle core
  id?: number; // rendu optionnel pour compatibilité
  title: string | null;
  type?: string | null;
  url?: string;
  filePath?: string;
  createdAt?: Date;
  createdBy?: string;
  projectId: number;
  size?: number;
  lastModified?: Date;

  // Champs du modèle shared
  documentId?: number;
  fileName?: string | null;
  alfrescoURL?: string | null;
  isExternal?: boolean;
  creationDate?: Date | null;
  lastModifiedDate?: Date | null;
  mimeType?: string | null;
  version?: string | null;
  project?: {
    projectId: number;
    name: string;
    startDate?: string;
    endDate?: string;
  } | null;
}
