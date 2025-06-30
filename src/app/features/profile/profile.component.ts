import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { UserService, User } from '../../core/services/user.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  isSuperAdmin = false;
  editMode = false;
  loading = false;
  error = '';

  constructor(private authService: AuthService, private userService: UserService) {}

  ngOnInit(): void {
    this.user = this.authService.getCurrentUser();
    this.isSuperAdmin = this.authService.isSuperAdmin();
  }

  enableEdit() {
    this.editMode = true;
  }

  saveProfile() {
    if (!this.user) return;
    this.loading = true;
    this.userService.updateUser(this.user.userId, { ...this.user }).subscribe({
      next: (updated) => {
        this.user = updated;
        this.editMode = false;
        this.loading = false;
      },
      error: () => {
        this.error = 'Erreur lors de la mise à jour du profil';
        this.loading = false;
      }
    });
  }
}
