import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { DashboardData, DeadlineItem } from '../../core/models';
import {
  STATUS_COLORS,
  barConfig,
  doughnutConfig,
  lineConfig,
} from '../../core/chart-helpers';
import { actionIcon, daysLabel, formatDate, relativeTime, toneClass } from '../../core/utils';
import { AvatarComponent } from '../../shared/avatar';
import { ChartComponent } from '../../shared/chart';
import { EmptyStateComponent } from '../../shared/empty-state';
import { PageHeaderComponent } from '../../shared/page-header';
import { StatCardComponent } from '../../shared/stat-card';
import { StatusBadgeComponent } from '../../shared/status-badge';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    AvatarComponent,
    ChartComponent,
    EmptyStateComponent,
    PageHeaderComponent,
    StatCardComponent,
    StatusBadgeComponent,
  ],
  template: `
    @if (loading()) {
      <div class="spinner-wrap"><div class="spinner-border"></div></div>
    } @else if (data(); as dashboard) {
      <app-page-header
        [title]="greeting() + ', ' + (auth.user()?.firstName || 'there') + '!'"
        [subtitle]="subtitle()"
      >
        @if (auth.isStudent() || auth.isAdmin()) {
          <a routerLink="/projects/new" class="btn btn-primary"><i class="bi bi-plus-lg"></i> New project</a>
        }
        <a routerLink="/reports" class="btn btn-outline-secondary"><i class="bi bi-bar-chart"></i> Reports</a>
      </app-page-header>

      @if (role() === 'Admin') {
        <div class="stat-grid">
          <app-stat-card label="Total Users" [value]="dashboard.stats.totalUsers" icon="bi-people" tone="blue" hint="All registered accounts" />
          <app-stat-card label="Students" [value]="dashboard.stats.totalStudents" icon="bi-mortarboard" tone="teal" hint="Student & team leader accounts" />
          <app-stat-card label="Advisers" [value]="dashboard.stats.totalAdvisers" icon="bi-person-workspace" tone="violet" hint="Faculty advisers" />
          <app-stat-card label="Projects" [value]="dashboard.stats.totalProjects" icon="bi-folder2-open" tone="amber" hint="Across all programs" />
          <app-stat-card label="Active Projects" [value]="dashboard.stats.activeProjects" icon="bi-lightning-charge" tone="green" hint="Currently in progress" />
          <app-stat-card label="Overdue Tasks" [value]="dashboard.stats.overdueTasks" icon="bi-exclamation-triangle" tone="red" hint="Needs intervention" />
        </div>

        <div class="grid-main-side mt-3">
          <div class="panel">
            <div class="panel-head">
              <div>
                <h3>Project status distribution</h3>
                <div class="sub">How projects are progressing this term</div>
              </div>
              <span class="badge-soft tone-blue">{{ dashboard.stats.totalProjects }} projects</span>
            </div>
            <div class="panel-body">
              <div class="grid-2">
                <app-chart [type]="adminProjectChart().type" [data]="adminProjectChart().data" [options]="adminProjectChart().options" height="270px" />
                <app-chart [type]="adminTaskChart().type" [data]="adminTaskChart().data" [options]="adminTaskChart().options" height="270px" />
              </div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div>
                <h3>System activity</h3>
                <div class="sub">Audit events over the last 14 days</div>
              </div>
            </div>
            <div class="panel-body">
              @if ((dashboard.activityTrend || []).length) {
                <app-chart [type]="adminTrendChart().type" [data]="adminTrendChart().data" [options]="adminTrendChart().options" height="210px" />
              } @else {
                <app-empty-state icon="bi-activity" title="No recent activity" message="Activity appears here as users work in the system." />
              }
              <div class="summary-strip mt-2">
                <div><strong>{{ dashboard.stats.activeUsers }}</strong><span class="text-muted-sm">Active users</span></div>
                <div><strong>{{ dashboard.stats.completedProjects }}</strong><span class="text-muted-sm">Completed projects</span></div>
                <div><strong>{{ dashboard.stats.archivedProjects }}</strong><span class="text-muted-sm">Archived</span></div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid-main-side mt-3">
          <div class="panel">
            <div class="panel-head">
              <div>
                <h3>Project statistics</h3>
                <div class="sub">By category and current state</div>
              </div>
              <a routerLink="/projects" class="btn btn-soft btn-sm">View all</a>
            </div>
            <div class="table-responsive">
              <table class="table">
                <thead><tr><th>Status</th><th>Projects</th><th>Share</th></tr></thead>
                <tbody>
                  @for (entry of projectStatusEntries(); track entry.label) {
                    <tr>
                      <td><app-status-badge [label]="entry.label" /></td>
                      <td class="fw-650">{{ entry.value }}</td>
                      <td style="min-width:160px">
                        <div class="progress-track"><div class="fill" [style.width.%]="entry.share"></div></div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div><h3>Recent accounts</h3><div class="sub">Newest registered users</div></div>
              <a routerLink="/admin/users" class="btn btn-soft btn-sm">Manage</a>
            </div>
            <div class="panel-body">
              @for (user of dashboard.recentUsers || []; track user.id) {
                <div class="activity-item">
                  <app-avatar [name]="user.name" [color]="user.avatarColor || '#2563eb'" size="sm" />
                  <div class="activity-body">
                    <strong>{{ user.name }}</strong>
                    <div class="text-muted-sm">{{ user.role }} · {{ user.email }}</div>
                  </div>
                  <span class="activity-time">{{ relative(user.createdAt) }}</span>
                </div>
              } @empty {
                <app-empty-state icon="bi-person-plus" title="No users yet" message="Registered accounts will appear here." />
              }
            </div>
          </div>
        </div>

        <div class="panel mt-3">
          <div class="panel-head"><div><h3>Recent system activity</h3><div class="sub">Most recent audit entries</div></div></div>
          <div class="panel-body">
            <div class="activity-list">
              @for (activity of dashboard.recentActivities || []; track activity.id) {
                <div class="activity-item">
                  <span class="activity-icon"><i [class]="'bi ' + icon(activity.action)"></i></span>
                  <div class="activity-body">
                    <strong>{{ activity.user?.name }}</strong>
                    <div>{{ activity.details }}</div>
                    @if (activity.projectTitle) {
                      <div class="text-muted-sm">{{ activity.projectTitle }}</div>
                    }
                  </div>
                  <span class="activity-time">{{ relative(activity.createdAt) }}</span>
                </div>
              }
            </div>
          </div>
        </div>
      }

      @if (role() !== 'Admin') {
        @if (role() === 'Adviser') {
          <div class="stat-grid">
            <app-stat-card label="Assigned Projects" [value]="dashboard.stats.assignedProjects" icon="bi-folder2-open" tone="blue" hint="Projects you advise" />
            <app-stat-card label="In Progress" [value]="dashboard.stats.inProgress" icon="bi-lightning-charge" tone="teal" hint="Active this term" />
            <app-stat-card label="Awaiting Review" [value]="dashboard.stats.awaitingReview" icon="bi-inbox" tone="violet" hint="Submissions to review" />
            <app-stat-card label="Needs Attention" [value]="dashboard.stats.needsAttention" icon="bi-exclamation-circle" tone="amber" hint="Overdue or revisions" />
            <app-stat-card label="Overdue Tasks" [value]="dashboard.stats.overdueTasks" icon="bi-clock-history" tone="red" hint="Across assigned projects" />
            <app-stat-card label="Students" [value]="dashboard.stats.students" icon="bi-mortarboard" tone="blue" hint="Unique team members" />
          </div>
        } @else {
          <div class="stat-grid">
            <app-stat-card label="Total Projects" [value]="dashboard.stats.totalProjects" icon="bi-folder2-open" tone="blue" hint="Projects you belong to" />
            <app-stat-card label="Active Projects" [value]="dashboard.stats.activeProjects" icon="bi-lightning-charge" tone="teal" hint="Currently underway" />
            <app-stat-card label="Pending Tasks" [value]="dashboard.stats.pendingTasks" icon="bi-list-task" tone="amber" hint="Open assignments" />
            <app-stat-card label="Completed Tasks" [value]="dashboard.stats.completedTasks" icon="bi-check2-circle" tone="green" hint="Your completed work" />
            <app-stat-card label="Overdue Tasks" [value]="dashboard.stats.overdueTasks" icon="bi-exclamation-triangle" tone="red" hint="Past their deadline" />
            <app-stat-card label="Contribution" [value]="(dashboard.stats.contributionPercent || 0) + '%'" icon="bi-bar-chart-steps" tone="violet" hint="Share of team points" />
          </div>
        }

        <div class="grid-main-side mt-3">
          <div class="panel">
            <div class="panel-head">
              <div>
                <h3>{{ role() === 'Adviser' ? 'Student performance' : 'Task status overview' }}</h3>
                <div class="sub">{{ role() === 'Adviser' ? 'Completion rate and contribution points' : 'Every task across your projects' }}</div>
              </div>
              <a routerLink="/reports" class="btn btn-soft btn-sm">Analytics</a>
            </div>
            <div class="panel-body">
              @if (role() === 'Adviser') {
                <app-chart [type]="adviserChart().type" [data]="adviserChart().data" [options]="adviserChart().options" height="300px" />
              } @else {
                <div class="grid-2">
                  <app-chart [type]="taskChart().type" [data]="taskChart().data" [options]="taskChart().options" height="250px" />
                  <div>
                    <div class="text-muted-sm mb-2">Personal contribution breakdown</div>
                    @if (dashboard.contribution) {
                      <div class="d-flex align-items-baseline gap-2 mb-2">
                        <span style="font-family:Sora;font-size:32px;font-weight:650;color:var(--navy)">{{ dashboard.contribution.percentage }}%</span>
                        <span class="text-muted-sm">of team points</span>
                      </div>
                      <div class="progress-track mb-3"><div class="fill" [style.width.%]="dashboard.contribution.percentage"></div></div>
                      @for (entry of contributionEntries(); track entry.label) {
                        <div class="legend-item">
                          <span class="swatch" [style.background]="entry.color"></span>
                          <span class="grow">{{ entry.label }}</span>
                          <strong>{{ entry.value }} pts</strong>
                        </div>
                      }
                    } @else {
                      <p class="text-muted-sm">No contribution points recorded yet.</p>
                    }
                  </div>
                </div>
              }
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <div><h3>Upcoming deadlines</h3><div class="sub">Next items due across projects</div></div>
              <a routerLink="/deadlines" class="btn btn-soft btn-sm">All deadlines</a>
            </div>
            <div class="panel-body" style="padding-top:6px">
              @for (item of (dashboard.upcomingDeadlines || []).slice(0, 6); track item.kind + '-' + item.id) {
                <a class="deadline-item" [routerLink]="item.kind === 'project' ? ['/projects', item.projectId] : ['/deadlines']">
                  <div class="deadline-date">
                    <span class="d">{{ dayOf(item.date) }}</span>
                    <span class="m">{{ monthOf(item.date) }}</span>
                  </div>
                  <div class="deadline-body">
                    <strong>{{ item.title }}</strong>
                    <span>{{ item.projectTitle }}</span>
                  </div>
                  <app-status-badge [label]="item.deadlineStatus" />
                </a>
              } @empty {
                <app-empty-state icon="bi-calendar-check" title="No upcoming deadlines" message="You have no deadlines in the next few weeks." />
              }
            </div>
          </div>
        </div>

        <div class="grid-main-side mt-3">
          <div class="panel">
            <div class="panel-head">
              <div><h3>{{ role() === 'Adviser' ? 'Attention required' : 'My projects' }}</h3><div class="sub">{{ role() === 'Adviser' ? 'Projects with overdue work or revisions' : 'Projects you are part of' }}</div></div>
              <a routerLink="/projects" class="btn btn-soft btn-sm">View all</a>
            </div>
            <div class="panel-body">
              @for (project of (role() === 'Adviser' ? dashboard.attentionProjects || [] : dashboard.projects || []).slice(0, 4); track project.id) {
                <a class="activity-item" [routerLink]="['/projects', project.id]" style="color:inherit">
                  <span class="activity-icon"><i class="bi bi-folder2"></i></span>
                  <div class="activity-body">
                    <strong>{{ project.title }}</strong>
                    <div class="hstack-8 mt-1">
                      <app-status-badge [label]="project.status" />
                      <span class="text-muted-sm">{{ project.stats?.members }} members</span>
                      <span class="text-muted-sm">{{ project.stats?.completedTasks }}/{{ project.stats?.totalTasks }} tasks</span>
                    </div>
                    <div class="progress-track mt-2"><div class="fill" [style.width.%]="project.stats?.progress || 0"></div></div>
                  </div>
                  <span class="activity-time">{{ project.stats?.progress || 0 }}%</span>
                </a>
              } @empty {
                <app-empty-state icon="bi-folder-plus" title="No projects yet" message="Create your first academic project to get started.">
                  <a routerLink="/projects/new" class="btn btn-primary btn-sm mt-2">Create project</a>
                </app-empty-state>
              }
            </div>
          </div>

          <div class="panel">
            <div class="panel-head"><div><h3>Recent activity</h3><div class="sub">Latest updates from your teams</div></div></div>
            <div class="panel-body">
              <div class="activity-list">
                @for (activity of (dashboard.recentActivities || []).slice(0, 5); track activity.id) {
                  <div class="activity-item">
                    <span class="activity-icon"><i [class]="'bi ' + icon(activity.action)"></i></span>
                    <div class="activity-body">
                      <strong>{{ activity.user?.name }}</strong>
                      <div>{{ activity.details }}</div>
                      @if (activity.project?.title) {
                        <div class="text-muted-sm">{{ activity.project?.title }}</div>
                      }
                    </div>
                    <span class="activity-time">{{ relative(activity.createdAt) }}</span>
                  </div>
                } @empty {
                  <p class="text-muted-sm">No recent activity.</p>
                }
              </div>
            </div>
          </div>
        </div>

        @if (dashboard.workload; as workload) {
          <div class="panel mt-3">
            <div class="panel-head">
              <div>
                <h3>{{ role() === 'Adviser' ? 'Workload across advised projects' : 'Team workload summary' }}</h3>
                <div class="sub">Priority-weighted active tasks · thresholds {{ workload.summary.thresholds.light }} / {{ workload.summary.thresholds.balanced }} / {{ workload.summary.thresholds.heavy }}</div>
              </div>
              <a routerLink="/workload" class="btn btn-soft btn-sm">Full monitoring</a>
            </div>
            <div class="panel-body">
              <div class="grid-main-side">
                <div class="table-responsive">
                  <table class="table">
                    <thead>
                      <tr><th>Member</th><th>Assigned</th><th>Completed</th><th>Overdue</th><th>Score</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      @for (member of workload.members.slice(0, 6); track member.user.id) {
                        <tr>
                          <td>
                            <div class="hstack-8">
                              <app-avatar [name]="member.user.name" [color]="member.user.avatarColor || '#2563eb'" size="sm" />
                              <div><div class="fw-650">{{ member.user.name }}</div><div class="cell-sub">{{ member.user.roleInProject || 'Member' }}</div></div>
                            </div>
                          </td>
                          <td>{{ member.assigned }}</td>
                          <td>{{ member.completed }}</td>
                          <td>{{ member.overdue }}</td>
                          <td class="fw-650">{{ member.score }}</td>
                          <td><app-status-badge [label]="member.workloadStatus" /></td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
                <app-chart [type]="workloadChart().type" [data]="workloadChart().data" [options]="workloadChart().options" height="230px" />
              </div>
              @if (workload.summary.recommendations.length) {
                <div class="mt-2">
                  @for (recommendation of workload.summary.recommendations.slice(0, 3); track recommendation) {
                    <div class="recommendation"><i class="bi bi-lightbulb"></i><span>{{ recommendation }}</span></div>
                  }
                </div>
              }
            </div>
          </div>
        }
      }
    }
  `,
})
export class DashboardPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);

  readonly data = signal<DashboardData | null>(null);
  readonly loading = signal(true);

  readonly role = computed(() => this.data()?.role || this.auth.role());
  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  });
  readonly subtitle = computed(() => {
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    return `${this.role()} workspace · ${today}`;
  });

  readonly taskChart = computed(() => {
    const tasks = this.data()?.tasks || [];
    const order = ['To Do', 'In Progress', 'For Review', 'Completed', 'Overdue'];
    const labels = order.filter((status) => tasks.some((task) => task.status === status));
    const values = labels.map((status) => tasks.filter((task) => task.status === status).length);
    return doughnutConfig(labels, values, labels.map((label) => STATUS_COLORS[label]));
  });

  readonly adviserChart = computed(() => {
    const students = this.data()?.studentPerformance || [];
    const sorted = [...students].sort((a, b) => b.completionRate - a.completionRate).slice(0, 8);
    return barConfig(
      sorted.map((student) => this.shortName(student.user.name)),
      sorted.map((student) => student.completionRate),
      'Completion rate (%)',
      '#3b82f6',
      true,
    );
  });

  readonly adminProjectChart = computed(() => {
    const counts = this.data()?.projectStats?.byStatus || {};
    const labels = Object.keys(counts);
    return doughnutConfig(labels, Object.values(counts), labels.map((label) => STATUS_COLORS[label] || '#94a3b8'));
  });

  readonly adminTaskChart = computed(() => {
    const counts = this.data()?.taskStats?.byStatus || {};
    const labels = Object.keys(counts);
    return doughnutConfig(labels, Object.values(counts), labels.map((label) => STATUS_COLORS[label] || '#94a3b8'));
  });

  readonly adminTrendChart = computed(() => {
    const trend = this.data()?.activityTrend || [];
    return lineConfig(trend.map((item) => item.label), trend.map((item) => item.count), 'Audit events');
  });

  readonly workloadChart = computed(() => {
    const members = this.data()?.workload?.members || [];
    const sorted = [...members].sort((a, b) => b.score - a.score).slice(0, 8);
    return barConfig(
      sorted.map((member) => this.shortName(member.user.name)),
      sorted.map((member) => member.score),
      'Workload score',
      '#24498f',
    );
  });

  readonly contributionEntries = computed(() => {
    const breakdown = this.data()?.contribution?.breakdown || {};
    const labels: Record<string, string> = {
      task_completed: 'Completed tasks',
      milestone_submission: 'Milestone submissions',
      milestone_approval: 'Milestone approvals',
      file_upload: 'File uploads',
      comment: 'Comments',
    };
    const colors: Record<string, string> = {
      task_completed: '#24498f',
      milestone_submission: '#3b82f6',
      milestone_approval: '#16a34a',
      file_upload: '#d97706',
      comment: '#7c3aed',
    };
    return Object.entries(breakdown)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({
        label: labels[key] || key,
        value,
        color: colors[key] || '#94a3b8',
      }));
  });

  readonly projectStatusEntries = computed(() => {
    const counts = this.data()?.projectStats?.byStatus || {};
    const total = Object.values(counts).reduce((sum, value) => sum + value, 0) || 1;
    return Object.entries(counts).map(([label, value]) => ({
      label,
      value,
      share: Math.round((value / total) * 100),
    }));
  });

  ngOnInit(): void {
    this.api.get<DashboardData>('/dashboard').subscribe({
      next: (response) => {
        this.data.set(response);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  icon(action: string): string {
    return actionIcon(action);
  }

  relative(value?: string | null): string {
    return relativeTime(value);
  }

  dayOf(date?: string | null): string {
    if (!date) return '--';
    return new Date(date).getDate().toString().padStart(2, '0');
  }

  monthOf(date?: string | null): string {
    if (!date) return '---';
    return new Date(date).toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  }

  shortName(name: string): string {
    const parts = name.split(' ');
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : name;
  }

  daysLabel(item: DeadlineItem): string {
    return daysLabel(item.daysLeft, item.status);
  }
}
