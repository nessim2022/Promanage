import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { TooltipModule } from 'primeng/tooltip';
import { BadgeModule } from 'primeng/badge';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  requiresAuth: boolean;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, TooltipModule, BadgeModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  @Input() collapsed: boolean = false;
  @Output() toggleSidebar = new EventEmitter<void>();
  
  currentRoute: string = '';
  menuItems: MenuItem[] = [
    { label: 'Tableau de bord', icon: 'pi pi-home', route: '/dashboard', requiresAuth: true },
    { label: 'Projets', icon: 'pi pi-folder', route: '/projects', requiresAuth: true, badge: 3 },
    { label: 'Documents', icon: 'pi pi-file', route: '/documents', requiresAuth: true },
    { label: 'Tous les documents', icon: 'pi pi-copy', route: '/all-documents', requiresAuth: true },
    { label: 'GitLab', icon: 'pi pi-code', route: '/gitlab', requiresAuth: true },
    { label: 'Notifications', icon: 'pi pi-bell', route: '/notifications', requiresAuth: true, badge: 5 },
  ];

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    this.currentRoute = this.router.url;
    
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.currentRoute = event.url;
    });
  }

  isRouteActive(route: string): boolean {
    if (route === '/projects' && this.currentRoute.startsWith('/projects/')) {
      return true;
    }
    return this.currentRoute === route;
  }

  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }
  
  toggle(): void {
    this.toggleSidebar.emit();
  }
}
