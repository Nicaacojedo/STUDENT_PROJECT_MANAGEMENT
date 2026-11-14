import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmService } from '../../core/confirm.service';
import { ToastService } from '../../core/toast.service';
import { Project } from '../../core/models';
import { apiError, formatDate, projectStatusOptions } from '../../core/utils';
import { AvatarComponent } from '../../shared/avatar';
import { EmptyStateComponent } from '../../shared/empty-state';
import { PageHeaderComponent } from '../../shared/page-header';
import { StatusBadgeComponent } from '../../shared/status-badge';

@Component({
  selector: 'app-projects',
  imports: [
    RouterLink,
    AvatarComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-page-header title="Projects" subtitle="Search, filter, and manage every academic project you can access.">
      @if (canCreate()) {
        <a routerLink="/projects/new" class="btn btn-primary"><i class="bi bi-plus-lg"></i> New project</a>
      }
    </app-page-header>

    @if (loading()) {
      <div class="spinner-wrap"><div class="spinner-border"></div></div>
    } @else {
      <div class="summary-strip">
        <div><strong>{{ projects().length }}</strong><span class="text-muted-sm">Total projects</span></div>
        <div><strong>{{ countStatus('In Progress') }}</strong><span class="text-muted-sm">In progress</span></div>
        <div><strong>{{ countStatus('Completed') }}</strong><span class="text-muted-sm">Completed</span></div>
        <div><strong>{{ overdueTotal() }}</strong><span class="text-muted-sm">Overdue tasks</span></div>
        <div><strong>{{ archivedTotal() }}</strong><span class="text-muted-sm">Archived</span></div>
      </div>

      <div class="filter-bar mt-3">
        <div class="search-box">
          <i class="bi bi-search"></i>
          <input
            type="search"
            placeholder="Search title, course, category..."
            [value]="search()"
            (input)="search.set(readValue($event))"
          />
        </div>
        <select class="form-select" [value]="statusFilter()" (change)="statusFilter.set(readValue($event))">
          <option value="All">All statuses</option>
          @for (status of statuses; track status) {
            <option [value]="status">{{ status }}</option>
          }
        </select>
        <select class="form-select" [value]="categoryFilter()" (change)="categoryFilter.set(readValue($event))">
          <option value="All">All categories</option>
          @for (category of categories(); track category) {
            <option [value]="category">{{ category }}</option>
          }
        </select>
        <select class="form-select" style="max-width:170px" [value]="sort()" (change)="sort.set(readValue($event))">
          <option value="updated">Recently updated</option>
          <option value="deadline">Nearest deadline</option>
          <option value="progress">Least progress</option>
          <option value="title">Title A–Z</option>
        </select>
        <div class="view-toggle ms-auto">
          <button type="button" [class.active]="view() === 'grid'" (click)="view.set('grid')" aria-label="Card view">
            <i class="bi bi-grid-3x3-gap"></i>
          </button>
          <button type="button" [class.active]="view() === 'table'" (click)="view.set('table')" aria-label="Table view">
            <i class="bi bi-table"></i>
          </button>
        </div>
      </div>

      @if (!filtered().length) {
        <app-empty-state icon="bi-folder2-open" title="No projects found" message="Try adjusting your filters or create a new project.">
          @if (canCreate()) {
            <a routerLink="/projects/new" class="btn btn-primary btn-sm mt-2">Create project</a>
          }
        </app-empty-state>
      } @else if (view() === 'grid') {
        <div class="project-grid mt-3">
          @for (project of filtered(); track project.id) {
            <article class="project-card">
              <div class="hstack-8 justify-content-between">
                <app-status-badge [label]="project.status" />
                <span class="text-muted-sm">{{ project.category || 'Uncategorized' }}</span>
              </div>
              <h3><a [routerLink]="['/projects', project.id]" style="color:inherit">{{ project.title }}</a></h3>
              <p class="text-truncate-2" style="color:var(--muted);font-size:12.5px;min-height:38px">{{ project.description || 'No description provided.' }}</p>

              <div class="hstack-8 justify-content-between mt-2" style="font-size:11.5px;color:var(--muted)">
                <span><i class="bi bi-journal-bookmark me-1"></i>{{ project.course || project.academicYear || 'Academic project' }}</span>
                <span>{{ project.stats?.progress || 0 }}%</span>
              </div>
              <div class="progress-track mt-1"><div class="fill" [style.width.%]="project.stats?.progress || 0"></div></div>

              <div class="project-meta mt-2">
                <span><i class="bi bi-check2-square"></i>{{ project.stats?.completedTasks }}/{{ project.stats?.totalTasks }} tasks</span>
                <span><i class="bi bi-people"></i>{{ project.stats?.members }} members</span>
                <span><i class="bi bi-calendar3"></i>{{ date(project.endDate) }}</span>
              </div>

              <div class="card-footer-row">
                <div class="hstack-8">
                  <app-avatar [name]="project.leader?.name || 'Unassigned'" [color]="project.leader?.avatarColor || '#94a3b8'" size="sm" />
                  <div>
                    <div style="font-size:12px;font-weight:600;color:var(--navy)">{{ project.leader?.name || 'No leader' }}</div>
                    <div class="text-muted-sm">Team leader</div>
                  </div>
                </div>
                <div class="hstack-8">
                  <a [routerLink]="['/projects', project.id]" class="btn btn-soft btn-sm" title="Open project"><i class="bi bi-arrow-right"></i></a>
                  @if (project.canManage) {
                    <a [routerLink]="['/projects', project.id, 'edit']" class="btn btn-soft btn-sm" title="Edit project"><i class="bi bi-pencil"></i></a>
                    <button type="button" class="btn btn-soft btn-sm" [title]="project.status === 'Archived' ? 'Restore' : 'Archive'" (click)="archive(project)">
                      <i class="bi" [class.bi-archive]="project.status !== 'Archived'" [class.bi-arrow-counterclockwise]="project.status === 'Archived'"></i>
                    </button>
                    <button type="button" class="btn btn-danger-soft btn-sm" title="Delete project" (click)="remove(project)">
                      <i class="bi bi-trash3"></i>
                    </button>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="panel table-panel mt-3">
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Status</th>
                  <th>Leader</th>
                  <th>Members</th>
                  <th>Progress</th>
                  <th>Target date</th>
                  <th style="text-align:right">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (project of filtered(); track project.id) {
                  <tr>
                    <td>
                      <a [routerLink]="['/projects', project.id]" class="cell-title">{{ project.title }}</a>
                      <div class="cell-sub">{{ project.course || project.category || 'Academic project' }}</div>
                    </td>
                    <td><app-status-badge [label]="project.status" /></td>
                    <td>
                      <div class="hstack-8">
                        <app-avatar [name]="project.leader?.name || 'Unassigned'" [color]="project.leader?.avatarColor || '#94a3b8'" size="sm" />
                        <span style="font-size:12px">{{ project.leader?.name || '—' }}</span>
                      </div>
                    </td>
                    <td>{{ project.stats?.members }}</td>
                    <td style="min-width:150px">
                      <div class="hstack-8">
                        <div class="progress-track grow"><div class="fill" [style.width.%]="project.stats?.progress || 0"></div></div>
                        <span class="text-muted-sm">{{ project.stats?.progress || 0 }}%</span>
                      </div>
                    </td>
                    <td>{{ date(project.endDate) }}</td>
                    <td>
                      <div class="hstack-8 justify-content-end">
                        <a [routerLink]="['/projects', project.id]" class="btn btn-soft btn-sm" title="Open"><i class="bi bi-arrow-right"></i></a>
                        @if (project.canManage) {
                          <a [routerLink]="['/projects', project.id, 'edit']" class="btn btn-soft btn-sm" title="Edit"><i class="bi bi-pencil"></i></a>
                          <button type="button" class="btn btn-soft btn-sm" title="Archive" (click)="archive(project)"><i class="bi bi-archive"></i></button>
                          <button type="button" class="btn btn-danger-soft btn-sm" title="Delete" (click)="remove(project)"><i class="bi bi-trash3"></i></button>
                        }
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    }
  `,
})
export class ProjectsPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);

  readonly projects = signal<Project[]>([]);
  readonly loading = signal(true);
  readonly view = signal<'grid' | 'table'>('grid');
  readonly search = signal(this.route.snapshot.queryParamMap.get('q') || '');
  readonly statusFilter = signal('All');
  readonly categoryFilter = signal('All');
  readonly sort = signal('updated');
  readonly statuses = projectStatusOptions();

  readonly canCreate = computed(() => this.auth.isStudent() || this.auth.isAdmin());

  readonly categories = computed(() => {
    const set = new Set(this.projects().map((project) => project.category).filter(Boolean));
    return [...set] as string[];
  });

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    const category = this.categoryFilter();
    const sort = this.sort();
    const list = this.projects().filter((project) => {
      const matchesTerm =
        !term ||
        [project.title, project.description, project.course, project.category, project.academicYear]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesStatus = status === 'All' || project.status === status;
      const matchesCategory = category === 'All' || project.category === category;
      return matchesTerm && matchesStatus && matchesCategory;
    });
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'deadline':
          return (a.endDate || '9999').localeCompare(b.endDate || '9999');
        case 'progress':
          return (a.stats?.progress || 0) - (b.stats?.progress || 0);
        default:
          return (b.updatedAt || '').localeCompare(a.updatedAt || '');
      }
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.get<{ projects: Project[] }>('/projects').subscribe({
      next: (response) => {
        this.projects.set(response.projects);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  countStatus(status: string): number {
    return this.projects().filter((project) => project.status === status).length;
  }

  overdueTotal(): number {
    return this.projects().reduce((sum, project) => sum + (project.stats?.overdueTasks || 0), 0);
  }

  archivedTotal(): number {
    return this.projects().filter((project) => project.status === 'Archived').length;
  }

  readValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  date(value?: string | null): string {
    return formatDate(value);
  }

  async archive(project: Project): Promise<void> {
    const archived = project.status !== 'Archived';
    const confirmed = await this.confirm.open({
      title: archived ? 'Archive project?' : 'Restore project?',
      message: archived
        ? `"${project.title}" will be marked as archived and moved out of active work.`
        : `"${project.title}" will be restored to Planning status.`,
      confirmLabel: archived ? 'Archive' : 'Restore',
    });
    if (!confirmed) return;
    this.api.post(`/projects/${project.id}/archive`, { archived }).subscribe({
      next: () => {
        this.toast.success(archived ? 'Project archived.' : 'Project restored.');
        this.load();
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  async remove(project: Project): Promise<void> {
    const confirmed = await this.confirm.open({
      title: 'Delete project?',
      message: `This permanently deletes "${project.title}", including tasks, files, and contribution records.`,
      confirmLabel: 'Delete project',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.delete(`/projects/${project.id}`).subscribe({
      next: () => {
        this.toast.success('Project deleted.');
        this.load();
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }
}
