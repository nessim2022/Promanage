// src/app/shared/models/notification.ts
export interface Notification {
    notificationId: number;
    type: string;
    content: string;
    date: string;
    projectId: number;
  }