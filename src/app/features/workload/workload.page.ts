import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { Project, WorkloadMember, WorkloadResponse } from '../../core/models';
import { apiError, daysLabel, formatDate, toneClass } from '../../core/utils';
import { barConfig, doughnutConfig } from '../../core/chart-helpers';
import { AvatarComponent } from '../../shared/avatar';
import { ChartComponent } from '../../shared/chart';
import { EmptyStateComponent } from '../../shared/empty-state';
import { ModalComponent } from '../../shared/modal';
import { PageHeaderComponent } from '../../shared/page-header';
import { StatusBadgeComponent } from '../../shared/status-badge';

@Component({
  selector: 'app-workload',
  imports: [
    RouterLink,
    AvatarComponent,
    ChartComponent,
    EmptyStateComponent,
    ModalComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-page-header title="Smart Workload" subtitle="Priority-weighted workload monitoring with transparent thresholds and recommendations.">
      <button type="button" class="btn btn-soft" (click)="load()"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
    </app-page-header>

    <div class="filter-bar">
      <select class="form-select" style="max-width:320px" [value]="projectFilter()" (change)="changeProject(readValue($event))">
        <option value="All">All accessible projects</option>
        @for (project of projects(); track project.id) {
          <option [value]="project.id">{{ project.title }}</option>
        }
      </select>
      @if (data()?.summary?.thresholds; as thresholds) {
        <div class="hstack-8 ms-auto wrap">
          <span class="badge-soft tone-teal">Light &lt; {{ thresholds.light }}</span>
          <span class="badge-soft tone-green">Balanced {{ thresholds.light }}–{{ thresholds.balanced }}</span>
          <span class="badge-soft tone-amber">Heavy {{ thresholds.balanced }}–{{ thresholds.heavy }}</span>
          <span class="badge-soft tone-red">Overloaded &gt; {{ thresholds.heavy }}</span>
        </div>
      }
    </div>

    @if (loading()) {
      <div class="spinner-wrap"><div class="spinner-border"></div></div>
    } @else if (!data()?.members?.length) {
      <app-empty-state icon="bi-speedometer2" title="No workload data" message="Join or manage a project with assigned tasks to see workload analysis." />
    } @else {
      <div class="stat-grid mt-3">
        <div class="stat-card tone-blue">
          <div class="stat-icon"><i class="bi bi-people"></i></div>
          <div class="stat-label">Team members</div>
          <div class="stat-value">{{ summary().memberCount }}</div>
          <div class="stat-hint">{{ summary().totalScore }} total workload points</div>
        </div>
        <div class="stat-card tone-teal">
          <div class="stat-icon"><i class="bi bi-speedometer2"></i></div>
          <div class="stat-label">Average score</div>
          <div class="stat-value">{{ summary().averageScore }}</div>
          <div class="stat-hint">Priority-weighted active work</div>
        </div>
        <div class="stat-card tone-red">
          <div class="stat-icon"><i class="bi bi-exclamation-octagon"></i></div>
          <div class="stat-label">Heavy / overloaded</div>
          <div class="stat-value">{{ summary().heavy + summary().overloaded }}</div>
          <div class="stat-hint">{{ summary().overloaded }} overloaded</div>
        </div>
        <div class="stat-card tone-amber">
          <div class="stat-icon"><i class="bi bi-inbox"></i></div>
          <div class="stat-label">Unassigned tasks</div>
          <div class="stat-value">{{ summary().unassignedTasks }}</div>
          <div class="stat-hint">Active tasks without an owner</div>
        </div>
      </div>

      <div class="grid-main-side mt-3">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Workload score by member</h3>
              <div class="sub">Low = 1 · Medium = 2 · High = 3 · Urgent = 4</div>
            </div>
          </div>
          <div class="panel-body">
            <app-chart [type]="barChart().type" [data]="barChart().data" [options]="barChart().options" height="300px" />
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Balance distribution</h3><div class="sub">How work is spread across the team</div></div></div>
          <div class="panel-body">
            <app-chart [type]="statusChart().type" [data]="statusChart().data" [options]="statusChart().options" height="300px" />
          </div>
        </div>
      </div>

      @if (summary().recommendations.length) {
        <div class="panel mt-3">
          <div class="panel-head">
            <div>
              <h3>Smart recommendations</h3>
              <div class="sub">Suggested balancing actions based on current assignments</div>
            </div>
          </div>
          <div class="panel-body" style="padding-top:8px">
            @for (recommendation of summary().recommendations; track $index) {
              <div class="recommendation-row">
                <i class="bi bi-lightbulb"></i>
                <span>{{ recommendation }}</span>
              </div>
            }
          </div>
        </div>
      }

      <div class="panel table-panel mt-3">
        <div class="panel-head">
          <div>
            <h3>Member workload detail</h3>
            <div class="sub">{{ data()?.project?.title || 'Across all accessible projects' }}</div>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Assigned</th>
                <th>Completed</th>
                <th>Active score</th>
                <th>Workload</th>
                <th>Completion</th>
                <th style="text-align:right">Tasks</th>
              </tr>
            </thead>
            <tbody>
              @for (member of data()!.members; track member.user.id) {
                <tr>
                  <td>
                    <div class="hstack-8">
                      <app-avatar [name]="member.user.name" [color]="member.user.avatarColor || '#274b8f'" />
                      <div>
                        <div class="cell-title">{{ member.user.name }}</div>
                        <div class="cell-sub">{{ member.user.email || member.user.roleInProject || 'Team member' }}</div>
                      </div>
                    </div>
                  </td>
                  <td>{{ member.assigned }}</td>
                  <td>{{ member.completed }}</td>
                  <td><strong>{{ member.score }}</strong></td>
                  <td><app-status-badge [label]="member.workloadStatus" /></td>
                  <td style="min-width:140px">
                    <div class="hstack-8">
                      <div class="progress-track grow"><div class="fill" [style.width.%]="member.completionRate"></div></div>
                      <span class="text-muted-sm">{{ member.completionRate }}%</span>
                    </div>
                  </td>
                  <td>
                    <div class="hstack-8 justify-content-end">
                      <button type="button" class="btn btn-soft btn-sm" (click)="openMember(member)">
                        <i class="bi bi-list-task"></i> {{ member.pending }} active
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid-2 mt-3">
        <div class="panel">
          <div class="panel-head"><div><h3>How the score is calculated</h3></div></div>
          <div class="panel-body" style="font-size:12.5px;color:var(--muted)">
            <p style="margin-top:0">Each active (incomplete) task contributes its priority weight:</p>
            <div class="chip-list">
              <span class="badge-soft tone-slate">Low = {{ weights().Low || 1 }}</span>
              <span class="badge-soft tone-blue">Medium = {{ weights().Medium || 2 }}</span>
              <span class="badge-soft tone-amber">High = {{ weights().High || 3 }}</span>
              <span class="badge-soft tone-red">Urgent = {{ weights().Urgent || 4 }}</span>
            </div>
            <p class="mt-2" style="margin-bottom:0">
              The score is compared against configurable thresholds (Light, Balanced, Heavy, Overloaded) to classify each member's workload. Completed tasks do not count toward the active score.
            </p>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Active task preview</h3><div class="sub">Tasks driving the heaviest workloads</div></div></div>
          <div class="panel-body" style="padding-top:8px">
            @for (member of topMembers(); track member.user.id) {
              <div class="info-row">
                <span>{{ member.user.name }} · {{ member.activeTasks?.length || 0 }} active</span>
                <span [class]="'badge-soft ' + tone(member.workloadStatus)">{{ member.workloadStatus }}</span>
              </div>
            } @empty {
              <div class="text-muted-sm">No active tasks across the team.</div>
            }
          </div>
        </div>
      </div>
    }

    <app-modal [open]="!!selected()" [title]="selected()?.user?.name || 'Member'" subtitle="Active tasks driving this workload score." size="lg" [hideFooter]="true" (close)="selected.set(null)">
      @if (selected(); as member) {
        <div class="hstack-8 justify-content-between">
          <div class="hstack-8">
            <app-avatar [name]="member.user.name" [color]="member.user.avatarColor || '#274b8f'" size="lg" />
            <div>
              <div style="font-weight:650;color:var(--navy)">{{ member.user.name }}</div>
              <div class="text-muted-sm">Score {{ member.score }} · {{ member.pending }} active · {{ member.overdue }} overdue</div>
            </div>
          </div>
          <app-status-badge [label]="member.workloadStatus" />
        </div>

        <div class="divider"></div>
        @for (task of member.activeTasks || []; track task.id) {
          <a class="active-task-row" [routerLink]="['/tasks']" [queryParams]="{ task: task.id }" (click)="selected.set(null)">
            <div>
              <strong>{{ task.title }}</strong>
              <span>{{ daysLabelOf(task) }} · {{ task.status }}</span>
            </div>
            <span [class]="'badge-soft ' + tone(task.priority)">{{ task.priority }}</span>
          </a>
        } @empty {
          <div class="text-muted-sm">No active tasks. This member has capacity for more work.</div>
        }

        @if (member.recommendation) {
          <div class="alert alert-info py-2 px-3 mt-3" style="font-size:12.5px">{{ member.recommendation }}</div>
        }
      }
    </app-modal>
  `,
  styles: [
    `
      .recommendation-row {
        display: flex;
        gap: 10px;
        padding: 8px 0;
        border-bottom: 1px solid #f1f4f9;
        font-size: 12.5px;
        color: var(--muted);
      }
      .recommendation-row:last-child { border-bottom: 0; }
      .recommendation-row i { color: #d97706; margin-top: 2px; }
      .active-task-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 9px 0;
        border-bottom: 1px solid #f1f4f9;
        color: inherit;
      }
      .active-task-row:hover strong { color: var(--blue); }
      .active-task-row div { display: flex; flex-direction: column; }
      .active-task-row strong { font-size: 12.5px; color: var(--text); font-weight: 600; }
      .active-task-row span { font-size: 11px; color: var(--muted); }
    `,
  ],
})
export class WorkloadPage implements OnInit {
  private readonly api = inject(ApiService);

  readonly projects = signal<Project[]>([]);
  readonly data = signal<WorkloadResponse | null>(null);
  readonly loading = signal(true);
  readonly projectFilter = signal('All');
  readonly selected = signal<WorkloadMember | null>(null);

  readonly summary = computed(() => {
    const summary = this.data()?.summary;
    return {
      memberCount: summary?.memberCount || 0,
      averageScore: summary?.averageScore || 0,
      totalScore: summary?.totalScore || 0,
      overloaded: summary?.overloaded || 0,
      heavy: summary?.heavy || 0,
      balanced: summary?.balanced || 0,
      light: summary?.light || 0,
      unassignedTasks: summary?.unassignedTasks || 0,
      recommendations: summary?.recommendations || [],
      thresholds: summary?.thresholds || { light: 4, balanced: 10, heavy: 18 },
      priorityWeights: summary?.priorityWeights || { Low: 1, Medium: 2, High: 3, Urgent: 4 },
    };
  });

  readonly weights = computed(() => this.summary().priorityWeights);

  readonly barChart = computed(() =>
    barConfig(
      this.data()?.members?.map((member) => member.user.name.split(' ')[0]) || [],
      this.data()?.members?.map((member) => member.score) || [],
      'Workload score',
      '#24498f',
    )
  );

  readonly statusChart = computed(() =>
    doughnutConfig(
      ['Balanced', 'Light', 'Heavy', 'Overloaded'],
      [
        this.data()?.members?.filter((m) => m.workloadStatus === 'Balanced').length || 0,
        this.data()?.members?.filter((m) => m.workloadStatus === 'Light').length || 0,
        this.data()?.members?.filter((m) => m.workloadStatus === 'Heavy').length || 0,
        this.data()?.members?.filter((m) => m.workloadStatus === 'Overloaded').length || 0,
      ],
      ['#16a34a', '#0f766e', '#d97706', '#dc2626'],
    )
  );

  readonly topMembers = computed(() =>
    [...(this.data()?.members || [])]
      .filter((member) => (member.activeTasks?.length || 0) > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
  );

  ngOnInit(): void {
    this.api.get<{ projects: Project[] }>('/projects').subscribe({
      next: (response) => this.projects.set(response.projects),
    });
    this.load();
  }

  load(): void {
    this.loading.set(true);
    const projectId = this.projectFilter();
    this.api.get<WorkloadResponse>('/workload', { projectId: projectId === 'All' ? undefined : projectId }).subscribe({
      next: (response) => {
        this.data.set(response);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.data.set(null);
        console.error(apiError(error));
      },
    });
  }

  changeProject(value: string): void {
    this.projectFilter.set(value);
    this.load();
  }

  readValue(event: Event): string {
    return (event.target as HTMLSelectElement).value;
  }

  tone(value?: string): string {
    return toneClass(value);
  }

  daysLabelOf(task: { deadline?: string; status: string }): string {
    if (!task.deadline) return 'No deadline';
    const diff = Math.ceil((new Date(task.deadline).getTime() - Date.now()) / 86_400_000);
    return daysLabel(diff, task.status);
  }

  date(value?: string | null): string {
    return formatDate(value);
  }

  openMember(member: WorkloadMember): void {
    this.selected.set(member);
  }
}
