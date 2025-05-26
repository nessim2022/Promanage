import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AvatarModule } from 'primeng/avatar';
import { DividerModule } from 'primeng/divider';
import { LanguageSelectorComponent } from '../language-selector/language-selector.component';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { DocumentService } from '../../../core/services/document.service';
import { BadgeModule } from 'primeng/badge';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    ButtonModule, 
    MenuModule, 
    AvatarModule, 
    DividerModule,
    LanguageSelectorComponent,
    OverlayPanelModule,
    BadgeModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  userMenuItems: MenuItem[] = [];
  userName: string = '';
  userInitials: string = '';
  alfrescoAvailable: boolean = false;
  connectorName: string = '';
  isSuperAdmin: boolean = false;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private documentService: DocumentService
  ) { }

  ngOnInit(): void {
    this.setupUserMenu();
    this.loadUserInfo();
    this.checkAlfrescoAvailability();
  }

  checkAlfrescoAvailability(): void {
    if (this.isLoggedIn()) {
      this.documentService.checkAlfrescoAvailability().subscribe({
        next: (isAvailable) => {
          this.alfrescoAvailable = isAvailable;
          this.connectorName = isAvailable ? 'Alfresco' : 'Local';
        },
        error: () => {
          this.alfrescoAvailable = false;
          this.connectorName = 'Local';
        }
      });
    }
  }

  private setupUserMenu(): void {
    this.userMenuItems = [
      {
        label: 'Mon Profil',
        icon: 'pi pi-user',
        command: () => {
          // Navigation vers le profil
          // this.router.navigate(['/profile']);
        }
      },
      {
        label: 'Paramètres',
        icon: 'pi pi-cog',
        command: () => {
          // Navigation vers les paramètres
          // this.router.navigate(['/settings']);
        }
      },
      {
        separator: true
      },
      {
        label: 'Déconnexion',
        icon: 'pi pi-sign-out',
        command: () => {
          this.logout();
        }
      }
    ];
  }

  private loadUserInfo(): void {
    const user = this.authService.getCurrentUser();
    if (user) {
      this.userName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
      const firstInitial = user.firstName ? user.firstName.charAt(0) : '';
      const lastInitial = user.lastName ? user.lastName.charAt(0) : '';
      this.userInitials = (firstInitial + lastInitial).toUpperCase();
      this.isSuperAdmin = this.authService.isSuperAdmin();
    }
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
