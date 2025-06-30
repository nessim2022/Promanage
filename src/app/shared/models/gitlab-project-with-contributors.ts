// src/app/shared/models/gitlab-project-with-contributors.ts
export interface GitLabProjectWithContributorsDTO {
    id: number;
    name: string;
    webUrl: string;
    contributors: GitLabContributor[];
  }
  
  export interface GitLabContributor {
    name: string;
    email: string;
    commits: number;
  }