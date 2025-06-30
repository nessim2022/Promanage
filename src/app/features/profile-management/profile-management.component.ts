import { Component, OnInit } from '@angular/core';
import { UserService, User } from '../../core/services/user.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-management.component.html',
  styleUrl: './profile-management.component.scss'
})
export class ProfileManagementComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error = '';

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors du chargement des utilisateurs';
        this.loading = false;
      }
    });
  }
}
