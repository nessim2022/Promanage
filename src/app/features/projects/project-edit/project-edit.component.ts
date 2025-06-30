import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ProjectService } from '../../../core/services/project.service';
import { ProjectDTO } from '../../../shared/models/project';

@Component({
  selector: 'app-project-edit',
  templateUrl: './project-edit.component.html',
  styleUrls: ['./project-edit.component.scss']
})
export class ProjectEditComponent implements OnInit {
  projectForm: FormGroup;
  projectId: number;
  loading = false;
  submitted = false;
  currentUserEmail: string;

  constructor(
    private formBuilder: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private projectService: ProjectService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Récupérer l'ID du projet depuis l'URL
    this.projectId = +this.route.snapshot.paramMap.get('id');
    
    // Récupérer l'email de l'utilisateur connecté depuis localStorage
    const user = JSON.parse(localStorage.getItem('currentUser'));
    this.currentUserEmail = user?.email;
    
    // Vérifier si l'utilisateur est un superadmin
    const isSuperAdmin = user?.roles?.includes('ROLE_ADMIN') || 
                         user?.email === 'admin@example.com';
    
    if (!isSuperAdmin) {
      this.messageService.add({
        severity: 'error',
        summary: 'Accès refusé',
        detail: 'Vous n\'avez pas les droits pour modifier ce projet.'
      });
      this.router.navigate(['/dashboard']);
      return;
    }
    
    // Initialiser le formulaire
    this.projectForm = this.formBuilder.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      gitlabURL: [''],
      progressStateId: [1] // Valeur par défaut
    });
    
    // Charger les données du projet
    this.loadProject();
  }
  
  loadProject(): void {
    this.loading = true;
    this.projectService.getProjectById(this.projectId).subscribe({
      next: (project) => {
        // Formater les dates pour le formulaire
        const startDate = project.startDate ? new Date(project.startDate) : null;
        const endDate = project.endDate ? new Date(project.endDate) : null;
        
        // Remplir le formulaire avec les données du projet
        this.projectForm.patchValue({
          name: project.name,
          description: project.description,
          startDate: startDate,
          endDate: endDate,
          gitlabURL: project.gitlabURL,
          progressStateId: project.progressStateId
        });
        this.loading = false;
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Impossible de charger les données du projet.'
        });
        this.loading = false;
        console.error('Erreur lors du chargement du projet:', error);
      }
    });
  }
  
  onSubmit(): void {
    this.submitted = true;
    
    // Arrêter si le formulaire est invalide
    if (this.projectForm.invalid) {
      return;
    }
    
    this.loading = true;
    
    // Préparer l'objet projet à envoyer
    const projectToUpdate: ProjectDTO = {
      ...this.projectForm.value,
      projectId: this.projectId,
      userIds: [] // Conserver les utilisateurs existants
    };
    
    // Appeler le service pour mettre à jour le projet
    this.projectService.updateProject(this.projectId, projectToUpdate, this.currentUserEmail).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Succès',
          detail: 'Le projet a été mis à jour avec succès.'
        });
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Erreur',
          detail: 'Erreur lors de la mise à jour du projet.'
        });
        this.loading = false;
        console.error('Erreur lors de la mise à jour du projet:', error);
      }
    });
  }
}