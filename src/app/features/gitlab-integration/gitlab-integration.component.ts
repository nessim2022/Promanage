import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { GitlabService } from '../../core/services/gitlab.service';
import { GitLabProjectWithContributorsDTO, GitLabContributor } from '../../shared/models/gitlab-project-with-contributors';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-gitlab-integration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    CardModule,
    ChartModule,
    InputTextModule,
    ProgressBarModule,
    ToastModule,
    DialogModule
  ],
  providers: [MessageService],
  templateUrl: './gitlab-integration.component.html',
  styleUrls: ['./gitlab-integration.component.scss']
})
export class GitlabIntegrationComponent implements OnInit {
  @Input() projectId: number = 0;
  @Input() gitlabUrl: string = '';
  
  gitlabProject: GitLabProjectWithContributorsDTO | null = null;
  loading: boolean = false;
  syncInProgress: boolean = false;
  error: boolean = false;
  errorMessage: string = '';
  contributionChartData: any;
  contributionChartOptions: any;
  addMemberDialog: boolean = false;
  newMemberEmail: string = '';

  constructor(
    private gitlabService: GitlabService,
    private messageService: MessageService
  ) {
    this.initChartOptions();
  }

  ngOnInit(): void {
    if (this.projectId && this.projectId > 0) {
      console.log(`GitLab integration: Loading project with ID ${this.projectId}`);
      this.loadGitLabProject();
    } else {
      console.error(`GitLab integration: Invalid project ID provided: ${this.projectId}`);
      this.error = true;
      this.errorMessage = 'ID du projet invalide ou non fourni';
    }
  }

  initChartOptions() {
    this.contributionChartOptions = {
      plugins: {
        legend: {
          position: 'bottom'
        }
      },
      responsive: true,
      maintainAspectRatio: false
    };
  }

  loadGitLabProject() {
    if (!this.projectId || this.projectId <= 0) {
      console.error(`Cannot load GitLab project: Invalid project ID: ${this.projectId}`);
      this.error = true;
      this.errorMessage = 'ID du projet invalide ou non fourni';
      return;
    }

    this.loading = true;
    this.error = false;
    this.errorMessage = '';
    
    console.log(`Loading GitLab project for project ID ${this.projectId}`);
    
    // First, try to load using the direct API
    this.gitlabService.getGitLabProject(this.projectId)
      .pipe(
        catchError(error => {
          console.error('Error loading GitLab project through direct API:', error);
          
          // If direct API fails and we have a GitLab URL, try loading through project details
          if (this.gitlabUrl && this.gitlabUrl.trim().length > 0) {
            console.log(`Trying to load GitLab project using URL: ${this.gitlabUrl}`);
            return this.gitlabService.getProjectDetails(this.gitlabUrl).pipe(
              catchError(urlError => {
                console.error('Error loading GitLab project using URL:', urlError);
                this.error = true;
                
                if (urlError.status === 404) {
                  this.errorMessage = 'Le projet GitLab spécifié est introuvable. Vérifiez l\'URL et vos permissions.';
                } else if (urlError.status === 401 || urlError.status === 403) {
                  this.errorMessage = 'Vous n\'êtes pas autorisé à accéder à ce projet GitLab.';
                } else {
                  this.errorMessage = 'Impossible de charger les informations GitLab. Veuillez réessayer plus tard.';
                }
                
                return of(null);
              })
            );
          }
          
          // If no URL is available, return error
          this.error = true;
          
          if (error.status === 404) {
            this.errorMessage = 'Aucun projet GitLab n\'est associé à ce projet.';
          } else if (error.status === 401 || error.status === 403) {
            this.errorMessage = 'Vous n\'êtes pas autorisé à accéder à ce projet GitLab.';
          } else {
            this.errorMessage = 'Impossible de charger les informations GitLab. Veuillez réessayer plus tard.';
          }
          
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe((project: GitLabProjectWithContributorsDTO | null) => {
        if (project) {
          console.log('GitLab project loaded successfully:', project);
          this.gitlabProject = project;
          this.updateContributionChart();
        } else {
          console.log('No GitLab project data returned');
        }
      });
  }

  syncGitLabProject() {
    if (!this.projectId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'ID du projet non disponible.'
      });
      return;
    }

    if (!this.gitlabUrl || this.gitlabUrl.trim().length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Aucune URL GitLab n\'est configurée pour ce projet.'
      });
      return;
    }

    this.syncInProgress = true;
    console.log(`Attempting to sync GitLab project for project ID ${this.projectId}`);
    
    // First try to validate the GitLab URL
    this.gitlabService.validateGitlabUrl(this.gitlabUrl)
      .pipe(
        catchError(error => {
          console.error('Error validating GitLab URL:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'L\'URL GitLab est invalide ou inaccessible. Vérifiez l\'URL et vos permissions.'
          });
          return of(null);
        }),
        finalize(() => {
          if (!this.gitlabProject) {
            this.syncInProgress = false;
          }
        })
      )
      .subscribe(members => {
        if (members) {
          console.log('GitLab URL validated successfully, proceeding with sync');
          this.proceedWithSync();
        }
      });
  }

  private proceedWithSync() {
    this.gitlabService.syncGitLabProject(this.projectId)
      .pipe(
        catchError(error => {
          console.error('Error syncing GitLab project:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: 'Impossible de synchroniser avec GitLab. Veuillez réessayer.'
          });
          return of(null);
        }),
        finalize(() => {
          this.syncInProgress = false;
        })
      )
      .subscribe((result: boolean | null) => {
        if (result) {
          console.log('GitLab project synchronized successfully');
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: 'Synchronisation avec GitLab effectuée avec succès'
          });
          this.loadGitLabProject();
        }
      });
  }

  openAddMemberDialog() {
    this.addMemberDialog = true;
    this.newMemberEmail = '';
  }

  addMember() {
    if (!this.newMemberEmail.trim()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'Veuillez saisir une adresse e-mail valide'
      });
      return;
    }

    if (!this.projectId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erreur',
        detail: 'ID du projet non disponible.'
      });
      return;
    }

    console.log(`Attempting to add member ${this.newMemberEmail} to GitLab project ${this.projectId}`);
    
    this.gitlabService.addMemberToGitLabProject(this.projectId, this.newMemberEmail)
      .pipe(
        catchError(error => {
          console.error('Error adding member to GitLab project:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Erreur',
            detail: error.error?.message || 'Impossible d\'ajouter le membre au projet GitLab. Veuillez réessayer.'
          });
          return of(false);
        })
      )
      .subscribe((success: boolean) => {
        if (success) {
          console.log(`Member ${this.newMemberEmail} added successfully to GitLab project`);
          this.addMemberDialog = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Succès',
            detail: `${this.newMemberEmail} a été ajouté au projet GitLab`
          });
          this.loadGitLabProject();
        }
      });
  }

  updateContributionChart() {
    if (!this.gitlabProject || !this.gitlabProject.contributors || this.gitlabProject.contributors.length === 0) {
      console.log('No contributors to display in chart');
      return;
    }

    // Sort contributors by number of commits in descending order
    const sortedContributors = [...this.gitlabProject.contributors]
      .sort((a, b) => b.commits - a.commits);

    // Get top 5 contributors (or less if there are fewer)
    const contributors = sortedContributors.slice(0, 5);

    // Create labels and data for the chart
    const labels = contributors.map((contributor) => contributor.name || contributor.email);
    const data = contributors.map((contributor) => contributor.commits);
    const colors = this.generateColors(contributors.length);

    this.contributionChartData = {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          hoverBackgroundColor: colors.map(color => color.replace('0.7', '0.9'))
        }
      ]
    };
  }

  generateColors(count: number): string[] {
    const baseColors = [
      'rgba(75, 192, 192, 0.7)',
      'rgba(54, 162, 235, 0.7)',
      'rgba(153, 102, 255, 0.7)',
      'rgba(255, 159, 64, 0.7)',
      'rgba(255, 99, 132, 0.7)',
      'rgba(255, 206, 86, 0.7)',
      'rgba(231, 233, 237, 0.7)'
    ];

    return baseColors.slice(0, count);
  }

  getTopContributors(): GitLabContributor[] {
    if (!this.gitlabProject || !this.gitlabProject.contributors) {
      return [];
    }
    
    return [...this.gitlabProject.contributors]
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 3);
  }

  getTotalCommits(): number {
    if (!this.gitlabProject || !this.gitlabProject.contributors) {
      return 0;
    }
    
    return this.gitlabProject.contributors.reduce((sum: number, contributor: GitLabContributor) => sum + contributor.commits, 0);
  }

  getContributorPercentage(contributor: GitLabContributor): number {
    const total = this.getTotalCommits();
    if (total === 0) return 0;
    
    return Math.round((contributor.commits / total) * 100);
  }

  openGitLabUrl() {
    if (this.gitlabUrl) {
      window.open(this.gitlabUrl, '_blank');
    }
  }
}
