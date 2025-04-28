// src/app/shared/models/document.ts
export interface Document {
    documentId: number;
    title: string | null;
    fileName: string | null;
    alfrescoURL: string | null;
    projectId: number;
    isExternal?: boolean;
    creationDate?: Date | null;
    lastModifiedDate?: Date | null;
    mimeType?: string | null;
    type?: string | null;
    version?: string | null;
    project?: {
      projectId: number;
      name: string;
      startDate?: string;
      endDate?: string;
    } | null;
  }