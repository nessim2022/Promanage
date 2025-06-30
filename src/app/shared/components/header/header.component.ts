// src/app/shared/components/header/header.component.ts
import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { MenubarModule } from 'primeng/menubar';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, ButtonModule, MenubarModule],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  get currentUser() {
    return this.authService.getCurrentUser();
  }
  menuItems = [
    { label: 'Tableau de bord', routerLink: '/dashboard' },
    { label: 'Projets', routerLink: '/projects' },
    { label: 'GitLab', routerLink: '/gitlab' },
    { label: 'Documents', routerLink: '/documents' },
    { label: 'Notifications', routerLink: '/notifications' }
  ];

  constructor(private authService: AuthService) {}

  logout() {
    this.authService.logout();
  }
}