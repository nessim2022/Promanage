import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';
import { MessageService } from 'primeng/api';
import { ProjectDTO } from '../../shared/models/project';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    InputTextarea,
    CalendarModule,
    ButtonModule,
    ToastModule,
    ProgressSpinnerModule,
    RouterLink
  ],
  providers: [MessageService],
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss']
})
export class ProjectFormComponent implements OnInit {
  projectForm!: FormGroup;
  loading = false;
  submitted = false;
  today = new Date();

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.initForm();
  }

  initForm() {
    this.projectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', Validators.required],
      gitlabURL: ['', [Validators.required, Validators.pattern('https://gitlab\\.com/.*')]],
      startDate: [new Date(), Validators.required],
      endDate: [new Date(new Date().setMonth(new Date().getMonth() + 3)), Validators.required],
      progressStateId: [1], // État par défaut (à définir selon votre logique métier)
      userIds: [[]] // Liste vide par défaut
    });
  }

  onSubmit() {
    this.submitted = true;

    if (this.projectForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Formulaire invalide',
        detail: 'Veuillez corriger les erreurs dans le formulaire.'
      });
      return;
    }

    this.loading = true;

    // Formatage des dates pour l'API
    const formValue = this.projectForm.value;
    const projectData: ProjectDTO = {
      ...formValue,
      projectId: 0, // Sera généré par le backend
      startDate: this.formatDate(formValue.startDate),
      endDate: this.formatDate(formValue.endDate),
      userIds: formValue.userIds || []
    };

    const userEmail = this.authService.getUserEmail() || '';

    this.projectService.createProject(projectData, userEmail).pipe(
      catchError(error => {
        console.error('Erreur lors de la création du projet:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: error.error || 'Impossible de créer le projet. Veuillez réessayer.'
        });
        return of(null);
      }),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe(result => {
      if (result) {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Projet créé avec succès!'
        });
        this.router.navigate(['/projects']);
      }
    });
  }

  // Formater la date au format YYYY-MM-DD
  private formatDate(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();

    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;

    return [year, month, day].join('-');
  }

  // Validation personnalisée pour s'assurer que la date de fin est après la date de début
  validateDates() {
    const startDate = this.projectForm.get('startDate')?.value;
    const endDate = this.projectForm.get('endDate')?.value;

    if (startDate && endDate && new Date(endDate) <= new Date(startDate)) {
      this.projectForm.get('endDate')?.setErrors({ invalidEndDate: true });
    }
  }
}