import { Component } from '@angular/core';
import { catchError, finalize, of } from 'rxjs';
import { ProjectDTO } from '../../shared/models/project';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProjectService } from '../../core/services/project.service';
import { AuthService } from '../../core/services/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { CalendarModule } from 'primeng/calendar';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DocumentService } from '../../core/services/document.service';
import type { Document } from '../../shared/models/document';

@Component({
  standalone: true,
  selector: 'app-edit-project-form',
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
  templateUrl: './edit-project-form.component.html',
  styleUrl: './edit-project-form.component.scss'
})
export class EditProjectFormComponent {
  projectForm!: FormGroup;
  loading = false;
  submitted = false;
  today = new Date();
  errorMessage: string = '';
  project: ProjectDTO = {
    projectId: 0,
    name: '',
    startDate: '',
    endDate: '',
    description: '',
    gitlabURL: '',
    progressStateId: 1,
    userIds: []
  };

  startDateValue: Date | null = this.project.startDate ? new Date(this.project.startDate) : null ;
  endDateValue: Date | null = this.project.endDate ? new Date(this.project.endDate) : null;

  documents: Document[] = [];
  loadingDocuments = false;
  errorDocuments = false;
  saving: boolean = false;
  projectProgress: { state: string; progress: number } = {
    state: 'En cours',
    progress: 0
  };

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private authService: AuthService,
    private router: Router,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private documentService: DocumentService
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadProject();
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

  loadProject() {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage = 'ID de projet manquant.';
      return;
    }

    this.loading = true;
    this.projectService.getProjectById(+id)
      .pipe(
        catchError(error => {
          console.error('Erreur lors du chargement du projet:', error);
          this.errorMessage = 'Impossible de charger le projet. Veuillez réessayer plus tard.';
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe(project => {
        if (project) {
          this.project = project;
          this.startDateValue = project.startDate ? new Date(project.startDate) : null;
          this.endDateValue = project.endDate ? new Date(project.endDate) : null;
          this.loadProjectProgress();
          this.loadDocuments(); // Charger les documents dès que le projet est chargé
        }
      });
  }

  loadProjectProgress() {
    if (!this.project.projectId) return;

    this.projectService.getProjectProgress(this.project.projectId)
      .pipe(
        catchError(error => {
          console.error('Erreur lors du chargement du progrès:', error);
          return of({ state: 'Inconnu', progress: 0 });
        })
      )
      .subscribe(progress => {
        this.projectProgress = progress;
      });
  }

  loadDocuments() {
    if (!this.project.projectId) return;
    this.loadingDocuments = true;
    this.errorDocuments = false;
    
    // Vérifier si l'utilisateur est un super admin
    const isSuperAdmin = this.authService.isSuperAdmin();
    console.log('Chargement des documents en tant que super admin:', isSuperAdmin);
    
    this.documentService.getDocumentsByProject(this.project.projectId, isSuperAdmin)
      .subscribe({
        next: (docs: Document[]) => {
          this.documents = docs;
          this.loadingDocuments = false;
        },
        error: (err: any) => {
          this.errorDocuments = true;
          this.loadingDocuments = false;
        }
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
