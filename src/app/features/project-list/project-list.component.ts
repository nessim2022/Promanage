// src/app/features/project-list/project-list.component.ts
import { Component, OnInit } from '@angular/core';
import { ProjectService } from '../../core/services/project.service';
import { ProjectDTO } from '../../shared/models/project';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';
import { CardModule } from 'primeng/card';
import { DocumentListComponent } from '../document-list/document-list.component';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, RouterLink, CardModule, DocumentListComponent],
  templateUrl: './project-list.component.html',
  styleUrls: ['./project-list.component.scss']
})
export class ProjectListComponent implements OnInit {
  projects: ProjectDTO[] = [];
  selectedProjectId?: number;

  constructor(private projectService: ProjectService) {}

  ngOnInit() {
    this.projectService.getProjectsForCurrentUser().subscribe(data => this.projects = data);
  }

  onSelectProject(projectId: number) {
    this.selectedProjectId = projectId;
  }

  deleteProject(id: number) {
    this.projectService.deleteProject(id).subscribe(() => {
      this.projects = this.projects.filter(p => p.projectId !== id);
    });
  }
}