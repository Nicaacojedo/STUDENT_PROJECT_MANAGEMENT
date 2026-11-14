import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ContributionMember, ContributionsResponse, Project } from '../../core/models';
import { apiError, formatDate } from '../../core/utils';
import { barConfig, doughnutConfig } from '../../core/chart-helpers';
import { AvatarComponent } from '../../shared/avatar';
import { ChartComponent } from '../../shared/chart';
import { EmptyStateComponent } from '../../shared/empty-state';
import { ModalComponent } from '../../shared/modal';
import { PageHeaderComponent } from '../../shared/page-header';

@Component({
  selector: 'app-contributions',
  imports: [
    RouterLink,
    AvatarComponent,
    ChartComponent,
    EmptyStateComponent,
    ModalComponent,
    PageHeaderComponent,
  ],
  template: `
    <app-page-header title="Contributions" subtitle="Evidence-based contribution tracking with a transparent, configurable formula.">
      @if (auth.isAdmin()) {
        <a routerLink="/settings" class="btn btn-soft"><i class="bi bi-sliders"></i> Configure formula</a>
      }
    </app-page-header>

    <div class="filter-bar">
      <select class="form-select" style="max-width:320px" [value]="projectFilter()" (change)="changeProject(readValue($event))">
        <option value="All">All accessible projects</option>
        @for (project of projects(); track project.id) {
          <option [value]="project.id">{{ project.title }}</option>
        }
      </select>
      <div class="hstack-8 ms-auto wrap">
        <span class="badge-soft tone-green">Task completed +{{ weights().completedTask || 0 }}</span>
        <span class="badge-soft tone-violet">Milestone submitted +{{ weights().milestoneSubmission || 0 }}</span>
        <span class="badge-soft tone-teal">Milestone approved +{{ weights().milestoneApproval || 0 }}</span>
        <span class="badge-soft tone-blue">File upload +{{ weights().fileUpload || 0 }}</span>
        <span class="badge-soft tone-gray">Comment +{{ weights().comment || 0 }}</span>
      </div>
    </div>

    @if (loading()) {
      <div class="spinner-wrap"><div class="spinner-border"></div></div>
    } @else if (!data()?.members?.length) {
      <app-empty-state icon="bi-bar-chart-steps" title="No contribution data yet" message="Contribution points appear automatically as tasks are completed, milestones submitted, files uploaded, and comments posted." />
    } @else {
      <div class="stat-grid mt-3">
        <div class="stat-card tone-blue">
          <div class="stat-icon"><i class="bi bi-award"></i></div>
          <div class="stat-label">Total points</div>
          <div class="stat-value">{{ data()!.totalPoints }}</div>
          <div class="stat-hint">{{ data()!.members.length }} contributing member{{ data()!.members.length === 1 ? '' : 's' }}</div>
        </div>
        <div class="stat-card tone-green">
          <div class="stat-icon"><i class="bi bi-trophy"></i></div>
          <div class="stat-label">Top contributor</div>
          <div class="stat-value" style="font-size:18px">{{ topMember()?.user?.name || '—' }}</div>
          <div class="stat-hint">{{ topMember()?.points || 0 }} points · {{ topMember()?.percentage || 0 }}% of total</div>
        </div>
        <div class="stat-card tone-violet">
          <div class="stat-icon"><i class="bi bi-check2-square"></i></div>
          <div class="stat-label">Tasks completed</div>
          <div class="stat-value">{{ completedTotal() }}</div>
          <div class="stat-hint">Across contributing members</div>
        </div>
        <div class="stat-card tone-teal">
          <div class="stat-icon"><i class="bi bi-people"></i></div>
          <div class="stat-label">Average points</div>
          <div class="stat-value">{{ averagePoints() }}</div>
          <div class="stat-hint">Per contributing member</div>
        </div>
      </div>

      <div class="grid-main-side mt-3">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Contribution ranking</h3>
              <div class="sub">{{ data()?.project?.title || 'Across all accessible projects' }}</div>
            </div>
          </div>
          <div class="panel-body">
            <app-chart [type]="pointsChart().type" [data]="pointsChart().data" [options]="pointsChart().options" height="300px" />
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Points by activity</h3><div class="sub">Where contribution points come from</div></div></div>
          <div class="panel-body">
            <app-chart [type]="breakdownChart().type" [data]="breakdownChart().data" [options]="breakdownChart().options" height="300px" />
          </div>
        </div>
      </div>

      <div class="panel table-panel mt-3">
        <div class="panel-head">
          <div>
            <h3>Member contributions</h3>
            <div class="sub">Ranked by total evidence-based points</div>
          </div>
        </div>
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th style="width:52px">Rank</th>
                <th>Member</th>
                <th>Points</th>
                <th>Share</th>
                <th>Tasks</th>
                <th>Files</th>
                <th>Milestones</th>
                <th style="text-align:right">Breakdown</th>
              </tr>
            </thead>
            <tbody>
              @for (member of ranked(); track member.user.id) {
                <tr>
                  <td>
                    <span [class]="'rank-pill rank-' + (member.rank || 'none')">{{ member.rank || '—' }}</span>
                  </td>
                  <td>
                    <div class="hstack-8">
                      <app-avatar [name]="member.user.name" [color]="member.user.avatarColor || '#274b8f'" />
                      <div>
                        <div class="cell-title">{{ member.user.name }}</div>
                        <div class="cell-sub">
                          {{ member.user.roleInProject || 'Member' }}
                          @if (member.projectCount) { · {{ member.projectCount }} project{{ member.projectCount === 1 ? '' : 's' }} }
                        </div>
                      </div>
                    </div>
                  </td>
                  <td><strong>{{ member.points }}</strong></td>
                  <td style="min-width:150px">
                    <div class="hstack-8">
                      <div class="progress-track grow"><div class="fill" [style.width.%]="member.percentage"></div></div>
                      <span class="text-muted-sm">{{ member.percentage }}%</span>
                    </div>
                  </td>
                  <td>{{ member.completedTasks }}</td>
                  <td>{{ member.filesUploaded }}</td>
                  <td>{{ member.milestonesSubmitted }}</td>
                  <td>
                    <div class="hstack-8 justify-content-end">
                      <button type="button" class="btn btn-soft btn-sm" (click)="openMember(member)">
                        <i class="bi bi-pie-chart"></i> View
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid-main-side mt-3">
        <div class="panel">
          <div class="panel-head"><div><h3>Contribution formula</h3><div class="sub">Every point is backed by a recorded activity</div></div></div>
          <div class="panel-body" style="font-size:12.5px;color:var(--muted)">
            <div class="info-row"><span>Completed task</span><span>+{{ weights().completedTask || 0 }} points</span></div>
            <div class="info-row"><span>Milestone submission</span><span>+{{ weights().milestoneSubmission || 0 }} points</span></div>
            <div class="info-row"><span>Milestone approved</span><span>+{{ weights().milestoneApproval || 0 }} points</span></div>
            <div class="info-row"><span>Project file uploaded</span><span>+{{ weights().fileUpload || 0 }} points</span></div>
            <div class="info-row"><span>Task comment</span><span>+{{ weights().comment || 0 }} points</span></div>
            <p class="mt-2" style="margin-bottom:0">
              Percentages show each member's share of the total points. Points are removed automatically if a completed task is reopened or deleted, keeping the record accurate.
            </p>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Recent activity</h3><div class="sub">Latest evidence entries</div></div></div>
          <div class="panel-body" style="padding-top:8px;max-height:380px;overflow:auto">
            @for (record of data()!.records.slice(0, 12); track $index) {
              <div class="contribution-row">
                <div class="hstack-8">
                  <app-avatar [name]="record.user.name" [color]="record.user.avatarColor || '#274b8f'" size="sm" />
                  <div>
                    <strong>{{ record.user.name }}</strong>
                    <span>{{ record.description }}</span>
                  </div>
                </div>
                <div class="text-end">
                  <span class="badge-soft tone-green">+{{ record.points }}</span>
                  <div class="text-muted-sm mt-1">{{ relative(record.createdAt) }}</div>
                </div>
              </div>
            }
          </div>
        </div>
      </div>
    }

    <app-modal [open]="!!selected()" [title]="selected()?.user?.name || 'Contribution detail'" subtitle="Points earned by activity type." size="lg" [hideFooter]="true" (close)="selected.set(null)">
      @if (selected(); as member) {
        <div class="hstack-8 justify-content-between">
          <div class="hstack-8">
            <app-avatar [name]="member.user.name" [color]="member.user.avatarColor || '#274b8f'" size="lg" />
            <div>
              <div style="font-weight:650;color:var(--navy)">{{ member.user.name }}</div>
              <div class="text-muted-sm">{{ member.user.roleInProject || 'Member' }} · {{ member.points }} points · {{ member.percentage }}% share</div>
            </div>
          </div>
          @if (member.rank) {
            <span class="badge-soft tone-violet">Rank #{{ member.rank }}</span>
          }
        </div>
        <div class="divider"></div>
        <div class="grid-2">
          <div>
            <h4 style="font-size:12px;margin:0 0 6px">Point sources</h4>
            @for (item of breakdownRows(member); track item.key) {
              <div class="info-row"><span>{{ item.label }}</span><span>{{ item.points }} pts</span></div>
            }
            <div class="info-row"><span>Total</span><span>{{ member.points }} pts</span></div>
          </div>
          <div>
            <h4 style="font-size:12px;margin:0 0 6px">Deliverables</h4>
            <div class="info-row"><span>Tasks completed</span><span>{{ member.completedTasks }}</span></div>
            <div class="info-row"><span>Files uploaded</span><span>{{ member.filesUploaded }}</span></div>
            <div class="info-row"><span>Milestones submitted</span><span>{{ member.milestonesSubmitted }}</span></div>
            @if (member.projects?.length) {
              <div class="mt-2">
                <div class="text-muted-sm mb-1">Projects</div>
                <div class="chip-list">
                  @for (project of member.projects; track project) {
                    <span class="badge-soft tone-gray">{{ project }}</span>
                  }
                </div>
              </div>
            }
          </div>
        </div>
      }
    </app-modal>
  `,
  styles: [
    `
      .rank-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        background: #eef2f9;
        color: #64708a;
      }
      .rank-1 { background: #fef3c7; color: #b45309; }
      .rank-2 { background: #e5e7eb; color: #475569; }
      .rank-3 { background: #ffedd5; color: #c2410c; }
      .contribution-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        padding: 9px 0;
        border-bottom: 1px solid #f1f4f9;
      }
      .contribution-row:last-child { border-bottom: 0; }
      .contribution-row div div { display: flex; flex-direction: column; line-height: 1.35; }
      .contribution-row strong { font-size: 12px; color: var(--text); font-weight: 600; }
      .contribution-row span { font-size: 11px; color: var(--muted); }
    `,
  ],
})
export class ContributionsPage implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly projects = signal<Project[]>([]);
  readonly data = signal<ContributionsResponse | null>(null);
  readonly loading = signal(true);
  readonly projectFilter = signal('All');
  readonly selected = signal<ContributionMember | null>(null);

  readonly weights = computed(() => this.data()?.weights || {});
  readonly topMember = computed(() => this.ranked()[0] || null);
  readonly completedTotal = computed(() =>
    (this.data()?.members || []).reduce((sum, member) => sum + member.completedTasks, 0)
  );
  readonly averagePoints = computed(() => {
    const members = this.data()?.members || [];
    if (!members.length) return 0;
    const total = members.reduce((sum, member) => sum + member.points, 0);
    return Math.round((total / members.length) * 10) / 10;
  });

  readonly ranked = computed(() =>
    [...(this.data()?.members || [])]
      .sort((a, b) => b.points - a.points)
      .map((member, index) => ({ ...member, rank: member.points > 0 ? index + 1 : null }))
  );

  readonly pointsChart = computed(() => {
    const top = this.ranked().slice(0, 12);
    return barConfig(
      top.map((member) => member.user.name.split(' ')[0]),
      top.map((member) => member.points),
      'Contribution points',
      '#24498f',
    );
  });

  readonly breakdownChart = computed(() => {
    const totals = this.breakdownTotals();
    return doughnutConfig(
      totals.map((item) => item.label),
      totals.map((item) => item.points),
      ['#16a34a', '#7c3aed', '#0f766e', '#2563eb', '#64748b'],
    );
  });

  readonly breakdownTotals = computed(() => {
    const labels: { key: keyof ContributionMember['breakdown']; label: string }[] = [
      { key: 'taskCompleted', label: 'Tasks completed' },
      { key: 'milestoneSubmission', label: 'Milestones submitted' },
      { key: 'milestoneApproval', label: 'Milestones approved' },
      { key: 'fileUpload', label: 'Files uploaded' },
      { key: 'comments', label: 'Comments' },
    ];
    return labels.map((item) => ({
      key: item.key,
      label: item.label,
      points: (this.data()?.members || []).reduce((sum, member) => sum + (member.breakdown[item.key] || 0), 0),
    }));
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
    this.api.get<ContributionsResponse>('/contributions', { projectId: projectId === 'All' ? undefined : projectId }).subscribe({
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

  breakdownRows(member: ContributionMember): { key: string; label: string; points: number }[] {
    return this.breakdownTotals().map((item) => ({
      key: item.key as string,
      label: item.label,
      points: member.breakdown[item.key] || 0,
    }));
  }

  relative(value: string): string {
    const date = new Date(value).getTime();
    if (Number.isNaN(date)) return '';
    const minutes = Math.round((Date.now() - date) / 60000);
    if (minutes < 60) return `${Math.max(1, minutes)}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return formatDate(value);
  }

  date(value?: string | null): string {
    return formatDate(value);
  }

  openMember(member: ContributionMember): void {
    this.selected.set(member);
  }
}
