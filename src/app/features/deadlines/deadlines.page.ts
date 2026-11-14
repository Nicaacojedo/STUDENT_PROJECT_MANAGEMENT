import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { DeadlineItem, DeadlinesResponse, Project } from '../../core/models';
import { apiError, formatDate } from '../../core/utils';
import { EmptyStateComponent } from '../../shared/empty-state';
import { PageHeaderComponent } from '../../shared/page-header';
import { StatusBadgeComponent } from '../../shared/status-badge';

interface DeadlineGroup {
  key: string;
  label: string;
  hint: string;
  icon: string;
  tone: string;
  items: DeadlineItem[];
}

@Component({
  selector: 'app-deadlines',
  imports: [RouterLink, EmptyStateComponent, PageHeaderComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="Deadlines" subtitle="Every task, milestone, and project due date in one prioritised view.">
      <button type="button" class="btn btn-soft" (click)="load()"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
    </app-page-header>

    <div class="filter-bar">
      <select class="form-select" style="max-width:320px" [value]="projectFilter()" (change)="changeProject(readValue($event))">
        <option value="All">All accessible projects</option>
        @for (project of projects(); track project.id) {
          <option [value]="project.id">{{ project.title }}</option>
        }
      </select>
      <div class="view-toggle ms-auto" role="group" aria-label="Deadline range">
        @for (option of ranges; track option) {
          <button type="button" [class.active]="range() === option" (click)="changeRange(option)">{{ option }}d</button>
        }
      </div>
    </div>

    @if (loading()) {
      <div class="spinner-wrap"><div class="spinner-border"></div></div>
    } @else {
      <div class="stat-grid mt-3">
        <div class="stat-card tone-red">
          <div class="stat-icon"><i class="bi bi-exclamation-triangle"></i></div>
          <div class="stat-label">Overdue</div>
          <div class="stat-value">{{ data()?.counts?.overdue || 0 }}</div>
          <div class="stat-hint">Past their due date</div>
        </div>
        <div class="stat-card tone-amber">
          <div class="stat-icon"><i class="bi bi-calendar-event"></i></div>
          <div class="stat-label">Due today</div>
          <div class="stat-value">{{ data()?.counts?.dueToday || 0 }}</div>
          <div class="stat-hint">Act before the day ends</div>
        </div>
        <div class="stat-card tone-blue">
          <div class="stat-icon"><i class="bi bi-calendar2-week"></i></div>
          <div class="stat-label">Next 7 days</div>
          <div class="stat-value">{{ nextSeven() }}</div>
          <div class="stat-hint">Coming up shortly</div>
        </div>
        <div class="stat-card tone-green">
          <div class="stat-icon"><i class="bi bi-check2-circle"></i></div>
          <div class="stat-label">Completed</div>
          <div class="stat-value">{{ data()?.counts?.completed || 0 }}</div>
          <div class="stat-hint">Closed inside this range</div>
        </div>
      </div>

      <div class="text-muted-sm mt-2">
        Showing {{ range() }} days ahead · {{ data()?.range?.from || '' }} to {{ data()?.range?.to || '' }}
      </div>

      @if (!data()?.items?.length) {
        <app-empty-state icon="bi-calendar2-check" title="No deadlines in this range" message="Extend the range or choose another project to see more due dates." />
      } @else {
        <div class="deadline-grid mt-3">
          @for (group of groups(); track group.key) {
            <section class="panel">
              <div class="panel-head">
                <div class="hstack-8">
                  <span [class]="'deadline-group-icon ' + group.tone"><i [class]="'bi ' + group.icon"></i></span>
                  <div>
                    <h3>{{ group.label }}</h3>
                    <div class="sub">{{ group.hint }}</div>
                  </div>
                </div>
                <span class="badge-soft" [class]="'badge-soft ' + group.tone">{{ group.items.length }}</span>
              </div>
              <div class="panel-body" style="padding-top:6px">
                @for (item of group.items; track item.kind + '-' + item.id) {
                  <a
                    class="deadline-row"
                    [routerLink]="item.kind === 'task' ? ['/tasks'] : ['/projects', item.projectId]"
                    [queryParams]="item.kind === 'task' ? { task: item.id } : {}"
                  >
                    <span [class]="'deadline-kind ' + group.tone">
                      <i [class]="'bi ' + kindIcon(item.kind)"></i>
                    </span>
                    <div class="deadline-body">
                      <strong>{{ item.title }}</strong>
                      <span>{{ item.projectTitle }} · {{ kindLabel(item.kind) }}</span>
                    </div>
                    <div class="deadline-meta">
                      <span class="date">{{ date(item.date) }}</span>
                      <app-status-badge [label]="item.deadlineStatus || item.status" />
                    </div>
                  </a>
                } @empty {
                  <div class="text-muted-sm" style="padding:10px 0">Nothing in this group.</div>
                }
              </div>
            </section>
          }
        </div>
      }
    }
  `,
  styles: [
    `
      .deadline-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        align-items: start;
      }
      .deadline-group-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 9px;
        font-size: 15px;
      }
      .deadline-group-icon.tone-red { background: var(--danger-soft); color: var(--danger); }
      .deadline-group-icon.tone-amber { background: var(--warning-soft); color: var(--warning); }
      .deadline-group-icon.tone-blue { background: #e8f1ff; color: #2563eb; }
      .deadline-group-icon.tone-gray { background: #eef2f9; color: #64708a; }
      .deadline-row {
        display: flex;
        align-items: center;
        gap: 11px;
        padding: 10px 4px;
        border-bottom: 1px solid #f1f4f9;
        color: inherit;
      }
      .deadline-row:last-child { border-bottom: 0; }
      .deadline-row:hover .deadline-body strong { color: var(--blue); }
      .deadline-kind {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        font-size: 13px;
        flex: none;
      }
      .deadline-kind.tone-red { background: var(--danger-soft); color: var(--danger); }
      .deadline-kind.tone-amber { background: var(--warning-soft); color: var(--warning); }
      .deadline-kind.tone-blue { background: #e8f1ff; color: #2563eb; }
      .deadline-kind.tone-gray { background: #eef2f9; color: #64708a; }
      .deadline-body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
      .deadline-body strong { font-size: 12.5px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .deadline-body span { font-size: 10.5px; color: var(--muted); }
      .deadline-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 3px; flex: none; }
      .deadline-meta .date { font-size: 11px; color: var(--muted); font-weight: 600; }
      @media (max-width: 992px) {
        .deadline-grid { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class DeadlinesPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly projects = signal<Project[]>([]);
  readonly data = signal<DeadlinesResponse | null>(null);
  readonly loading = signal(true);
  readonly projectFilter = signal('All');
  readonly range = signal(30);
  readonly ranges = [7, 14, 30, 60, 90];

  readonly nextSeven = computed(
    () => (this.data()?.items || []).filter((item) => item.daysLeft >= 0 && item.daysLeft <= 7 && item.deadlineStatus !== 'Completed').length
  );

  readonly groups = computed<DeadlineGroup[]>(() => {
    const items = (this.data()?.items || []).filter((item) => item.deadlineStatus !== 'Completed');
    return [
      {
        key: 'overdue',
        label: 'Overdue',
        hint: 'Needs immediate attention',
        icon: 'bi-exclamation-triangle',
        tone: 'tone-red',
        items: items.filter((item) => item.daysLeft < 0 || item.deadlineStatus === 'Overdue'),
      },
      {
        key: 'today',
        label: 'Due today',
        hint: 'Close these out today',
        icon: 'bi-calendar-event',
        tone: 'tone-amber',
        items: items.filter((item) => item.daysLeft === 0 && item.deadlineStatus !== 'Overdue'),
      },
      {
        key: 'week',
        label: 'Next 7 days',
        hint: 'Plan the coming week',
        icon: 'bi-calendar2-week',
        tone: 'tone-blue',
        items: items.filter((item) => item.daysLeft > 0 && item.daysLeft <= 7),
      },
      {
        key: 'later',
        label: 'Later this period',
        hint: 'Keep an eye on these',
        icon: 'bi-calendar3',
        tone: 'tone-gray',
        items: items.filter((item) => item.daysLeft > 7),
      },
    ];
  });

  ngOnInit(): void {
    this.api.get<{ projects: Project[] }>('/projects').subscribe({
      next: (response) => this.projects.set(response.projects),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const projectId = this.projectFilter();
    this.api
      .get<DeadlinesResponse>('/deadlines', {
        projectId: projectId === 'All' ? undefined : projectId,
        days: this.range(),
      })
      .subscribe({
        next: (response) => {
          this.data.set(response);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.toast.error(apiError(error));
        },
      });
  }

  changeProject(value: string): void {
    this.projectFilter.set(value);
    this.load();
  }

  changeRange(days: number): void {
    this.range.set(days);
    this.load();
  }

  readValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  date(value?: string | null): string {
    return formatDate(value);
  }

  kindIcon(kind: string): string {
    switch (kind) {
      case 'milestone':
        return 'bi-flag';
      case 'project':
        return 'bi-folder2-open';
      default:
        return 'bi-list-check';
    }
  }

  kindLabel(kind: string): string {
    return kind === 'milestone' ? 'Milestone' : kind === 'project' ? 'Project deadline' : 'Task';
  }
}
