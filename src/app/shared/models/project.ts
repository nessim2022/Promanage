// src/app/shared/models/project.ts
export interface ProjectDTO {
    projectId: number;
    name: string;
    startDate: string;
    endDate: string;
    creationDate?: string; // Ajouté pour la date de création
    description: string;
    gitlabURL: string;
    progressStateId: number;
    progressPercentage?: number;
    userIds: number[];
    members?: { userId: number; email: string; name?: string }[]; // Ajouté pour les membres
  }