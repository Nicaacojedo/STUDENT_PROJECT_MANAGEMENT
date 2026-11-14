import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { Project, ProjectFile } from '../../core/models';
import { apiError, fileSize } from '../../core/utils';
import { FilePanelComponent } from '../../shared/file-panel';
import { PageHeaderComponent } from '../../shared/page-header';

@Component({
  selector: 'app-files',
  imports: [FilePanelComponent, PageHeaderComponent],
  template: `
    <app-page-header title="Project Files" subtitle="Upload, preview, download, and organise project documents by project and category.">
      <button type="button" class="btn btn-soft" (click)="load()"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
    </app-page-header>

    <div class="summary-strip">
      <div><strong>{{ files().length }}</strong><span class="text-muted-sm">Files available</span></div>
      <div><strong>{{ categories().length }}</strong><span class="text-muted-sm">Categories</span></div>
      <div><strong>{{ sizeLabel(totalSize()) }}</strong><span class="text-muted-sm">Total size</span></div>
      <div><strong>{{ projectCount() }}</strong><span class="text-muted-sm">Projects with files</span></div>
    </div>

    <div class="filter-bar mt-3">
      <div class="search-box">
        <i class="bi bi-search"></i>
        <input
          type="search"
          placeholder="Search file name or description..."
          [value]="search()"
          (input)="search.set(readValue($event))"
        />
      </div>
      <select class="form-select" style="max-width:260px" [value]="projectFilter()" (change)="projectFilter.set(readValue($event))">
        <option value="All">All projects</option>
        @for (project of projects(); track project.id) {
          <option [value]="project.id">{{ project.title }}</option>
        }
      </select>
      <select class="form-select" style="max-width:180px" [value]="categoryFilter()" (change)="categoryFilter.set(readValue($event))">
        <option value="All">All categories</option>
        @for (category of categories(); track category) {
          <option [value]="category">{{ category }}</option>
        }
      </select>
    </div>

    @if (loading()) {
      <div class="spinner-wrap"><div class="spinner-border"></div></div>
    } @else {
      <div class="mt-3">
        <app-file-panel
          [projectId]="selectedProjectId()"
          [projects]="projects()"
          [files]="filtered()"
          [showProject]="true"
          [allowUpload]="true"
          (changed)="load()"
        />
      </div>
    }
  `,
})
export class FilesPage implements OnInit {
  private readonly api = inject(ApiService);

  readonly projects = signal<Project[]>([]);
  readonly files = signal<ProjectFile[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly projectFilter = signal('All');
  readonly categoryFilter = signal('All');

  readonly selectedProjectId = computed(() =>
    this.projectFilter() === 'All' ? null : Number(this.projectFilter())
  );

  readonly categories = computed(() => {
    const set = new Set(this.files().map((file) => file.category).filter(Boolean) as string[]);
    return [...set].sort();
  });

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const project = this.projectFilter();
    const category = this.categoryFilter();
    return this.files().filter((file) => {
      const matchesTerm =
        !term ||
        [file.fileName, file.description, file.projectTitle]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesProject = project === 'All' || file.projectId === Number(project);
      const matchesCategory = category === 'All' || file.category === category;
      return matchesTerm && matchesProject && matchesCategory;
    });
  });

  readonly totalSize = computed(() => this.files().reduce((sum, file) => sum + Number(file.fileSize || 0), 0));
  readonly projectCount = computed(() => new Set(this.files().map((file) => file.projectId)).size);

  ngOnInit(): void {
    this.api.get<{ projects: Project[] }>('/projects').subscribe({
      next: (response) => this.projects.set(response.projects),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.get<{ files: ProjectFile[] }>('/files').subscribe({
      next: (response) => {
        this.files.set(response.files);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        console.error(apiError(error));
      },
    });
  }

  readValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  sizeLabel(bytes: number): string {
    return fileSize(bytes);
  }
}
