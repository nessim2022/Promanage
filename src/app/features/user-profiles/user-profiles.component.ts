import { Component, OnInit } from '@angular/core';
import { UserService, User } from '../../core/services/user.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-user-profiles',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-profiles.component.html',
  styleUrl: './user-profiles.component.scss'
})
export class UserProfilesComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error = '';

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        console.log('Utilisateurs reçus du service:', users);
        this.users = users;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des utilisateurs';
        this.loading = false;
      }
    });
  }
}
