import { Routes } from '@angular/router';
import { LoginComponent } from './features/login/login.component';
import { RegisterComponent } from './features/register/register.component';
import { authGuard } from './core/guards/auth.guard';
import { DashboardComponent } from './features/dashboard/dashboard.component';
import { ProjectListComponent } from './features/project-list/project-list.component';
import { ProjectDetailComponent } from './features/project-detail/project-detail.component';
import { DocumentListComponent } from './features/documents/document-list/document-list.component';
import { GitlabIntegrationComponent } from './features/gitlab-integration/gitlab-integration.component';
import { NotificationListComponent } from './features/notification-list/notification-list.component';
import { AllDocumentsComponent } from './features/all-documents/all-documents.component';
import { ProjectFormComponent } from './features/project-form/project-form.component';
import { EditProjectFormComponent } from './features/edit-project-form/edit-project-form.component';

export const routes: Routes = [
    { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'projects', component: ProjectListComponent, canActivate: [authGuard] },
  { path: 'projects/new', component: ProjectFormComponent, canActivate: [authGuard] },
  { path: 'projects/edit/:id', component: EditProjectFormComponent, canActivate: [authGuard] },
  { path: 'projects/:id', component: ProjectDetailComponent, canActivate: [authGuard] },
  { path: 'gitlab', component: GitlabIntegrationComponent, canActivate: [authGuard] },
  { path: 'documents', component: DocumentListComponent },
  { path: 'documents/:projectId', component: DocumentListComponent, canActivate: [authGuard] },
  { path: 'notifications', component: NotificationListComponent, canActivate: [authGuard] },
  {
    path: 'all-documents',
    component: AllDocumentsComponent,
    canActivate: [authGuard]
  }
];
