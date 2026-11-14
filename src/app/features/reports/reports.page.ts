import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Project, ReportResponse } from '../../core/models';
import { addDaysISO, apiError, formatDate, todayISO } from '../../core/utils';
import { barConfig, doughnutConfig, lineConfig } from '../../core/chart-helpers';
import { ChartComponent } from '../../shared/chart';
import { EmptyStateComponent } from '../../shared/empty-state';
import { PageHeaderComponent } from '../../shared/page-header';
import { StatusBadgeComponent } from '../../shared/status-badge';

@Component({
  selector: 'app-reports',
  imports: [ChartComponent, EmptyStateComponent, PageHeaderComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="Reports & Analytics" subtitle="Generate completion, contribution, workload, and review reports for any period.">
      <button type="button" class="btn btn-soft" [disabled]="exporting()" (click)="exportExcel()">
        <i class="bi bi-file-earmark-spreadsheet"></i> Excel
      </button>
      <button type="button" class="btn btn-primary" [disabled]="exporting()" (click)="exportPdf()">
        <i class="bi bi-file-earmark-pdf"></i> PDF report
      </button>
    </app-page-header>

    <div class="filter-bar">
      <select class="form-select" style="max-width:320px" [value]="projectFilter()" (change)="changeProject(readValue($event))">
        <option value="All">All accessible projects</option>
        @for (project of projects(); track project.id) {
          <option [value]="project.id">{{ project.title }}</option>
        }
      </select>
      <div class="hstack-8">
        <label class="form-label mb-0" style="white-space:nowrap">From</label>
        <input type="date" class="form-control" style="width:150px" [value]="from()" (change)="changeRange(readValue($event), from())" />
        <label class="form-label mb-0" style="white-space:nowrap">To</label>
        <input type="date" class="form-control" style="width:150px" [value]="to()" (change)="changeRange(from(), readValue($event))" />
      </div>
      <div class="hstack-8 ms-auto">
        <button type="button" class="btn btn-soft btn-sm" (click)="quickRange(7)">7 days</button>
        <button type="button" class="btn btn-soft btn-sm" (click)="quickRange(30)">30 days</button>
        <button type="button" class="btn btn-soft btn-sm" (click)="quickRange(56)">8 weeks</button>
      </div>
    </div>

    @if (loading()) {
      <div class="spinner-wrap"><div class="spinner-border"></div></div>
    } @else if (!report()) {
      <app-empty-state icon="bi-file-earmark-bar-graph" title="No report data" message="Choose a project or a different date range and try again." />
    } @else {
      @if (report(); as data) {
        <div class="stat-grid mt-3">
          <div class="stat-card tone-blue">
            <div class="stat-icon"><i class="bi bi-folder2-open"></i></div>
            <div class="stat-label">Projects</div>
            <div class="stat-value">{{ data.summary.totalProjects }}</div>
            <div class="stat-hint">In this report scope</div>
          </div>
          <div class="stat-card tone-green">
            <div class="stat-icon"><i class="bi bi-check2-circle"></i></div>
            <div class="stat-label">Completion rate</div>
            <div class="stat-value">{{ data.summary.completionRate }}%</div>
            <div class="stat-hint">{{ data.summary.completedTasks }} of {{ data.summary.totalTasks }} tasks</div>
          </div>
          <div class="stat-card tone-red">
            <div class="stat-icon"><i class="bi bi-exclamation-triangle"></i></div>
            <div class="stat-label">Overdue tasks</div>
            <div class="stat-value">{{ data.summary.overdueTasks }}</div>
            <div class="stat-hint">Still open past deadline</div>
          </div>
          <div class="stat-card tone-violet">
            <div class="stat-icon"><i class="bi bi-award"></i></div>
            <div class="stat-label">Contribution points</div>
            <div class="stat-value">{{ data.summary.contributionPoints }}</div>
            <div class="stat-hint">{{ data.summary.feedbackCount }} feedback · {{ data.summary.pendingReviews }} pending reviews</div>
          </div>
        </div>

        <div class="grid-2 mt-3">
          <div class="panel">
            <div class="panel-head"><div><h3>Tasks by status</h3><div class="sub">Current state of all tasks in scope</div></div></div>
            <div class="panel-body">
              <app-chart [type]="statusChart().type" [data]="statusChart().data" [options]="statusChart().options" height="280px" />
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><div><h3>Tasks by priority</h3><div class="sub">Where effort is concentrated</div></div></div>
            <div class="panel-body">
              <app-chart [type]="priorityChart().type" [data]="priorityChart().data" [options]="priorityChart().options" height="280px" />
            </div>
          </div>
        </div>

        <div class="panel mt-3">
          <div class="panel-head">
            <div>
              <h3>Completion trend</h3>
              <div class="sub">{{ data.range.from }} → {{ data.range.to }} · {{ data.summary.completedInRange }} tasks completed inside this range</div>
            </div>
          </div>
          <div class="panel-body">
            <app-chart [type]="trendChart().type" [data]="trendChart().data" [options]="trendChart().options" height="300px" />
          </div>
        </div>

        <div class="grid-main-side mt-3">
          <div class="panel">
            <div class="panel-head"><div><h3>Contribution ranking</h3><div class="sub">Points earned within the selected range</div></div></div>
            <div class="panel-body">
              @if (data.contributions.length) {
                <app-chart [type]="contributionChart().type" [data]="contributionChart().data" [options]="contributionChart().options" height="300px" />
              } @else {
                <div class="text-muted-sm" style="padding:20px 0">No contribution activity in this range.</div>
              }
            </div>
          </div>
          <div class="panel">
            <div class="panel-head"><div><h3>Workload snapshot</h3><div class="sub">Current active scores</div></div></div>
            <div class="panel-body" style="padding-top:8px">
              @for (member of data.workload?.members || []; track member.user.id) {
                <div class="info-row">
                  <span>{{ member.user.name }}</span>
                  <span>{{ member.score }} · {{ member.workloadStatus }}</span>
                </div>
              } @empty {
                <div class="text-muted-sm">No workload data.</div>
              }
            </div>
          </div>
        </div>

        <div class="panel table-panel mt-3">
          <div class="panel-head">
            <div>
              <h3>Contribution detail</h3>
              <div class="sub">Tasks completed and evidence within the range</div>
            </div>
          </div>
          <div class="table-responsive">
            <table class="table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Points</th>
                  <th>Share</th>
                  <th>Completed tasks</th>
                  <th>Task</th>
                  <th>Milestone</th>
                  <th>Files</th>
                  <th>Comments</th>
                </tr>
              </thead>
              <tbody>
                @for (row of data.contributions; track row.user.id) {
                  <tr>
                    <td>{{ row.user.name }}</td>
                    <td><strong>{{ row.points }}</strong></td>
                    <td>{{ row.percentage }}%</td>
                    <td>{{ row.completedTasks }}</td>
                    <td>{{ row.breakdown['task_completed'] || row.breakdown['taskCompleted'] || 0 }}</td>
                    <td>{{ (row.breakdown['milestone_submission'] || 0) + (row.breakdown['milestone_approval'] || 0) }}</td>
                    <td>{{ row.breakdown['file_upload'] || row.breakdown['fileUpload'] || 0 }}</td>
                    <td>{{ row.breakdown['comment'] || 0 }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="text-muted-sm">No contributions recorded in this range.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="grid-2 mt-3">
          <div class="panel table-panel">
            <div class="panel-head"><div><h3>Overdue tasks</h3><div class="sub">Requires immediate follow-up</div></div></div>
            <div class="table-responsive">
              <table class="table">
                <thead><tr><th>Task</th><th>Priority</th><th>Deadline</th></tr></thead>
                <tbody>
                  @for (task of data.overdueTasks; track task.id) {
                    <tr>
                      <td>
                        <div class="cell-title">{{ task.title }}</div>
                        <div class="cell-sub">{{ task.projectTitle || projectName(task.projectId) }}</div>
                      </td>
                      <td><app-status-badge [label]="task.priority" /></td>
                      <td>{{ date(task.deadline) }}</td>
                    </tr>
                  } @empty {
                    <tr><td colspan="3" class="text-muted-sm">No overdue tasks. Great work!</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head"><div><h3>Adviser feedback</h3><div class="sub">Most recent review decisions</div></div></div>
            <div class="panel-body" style="padding-top:8px;max-height:360px;overflow:auto">
              @for (item of data.feedback.slice(0, 8); track item.id) {
                <div class="report-feedback">
                  <div class="hstack-8 justify-content-between">
                    <strong>{{ item.adviser.name }}</strong>
                    <app-status-badge [label]="item.reviewStatus" />
                  </div>
                  <div class="text-muted-sm">{{ item.projectTitle }} · {{ date(item.createdAt) }}</div>
                  <p>{{ item.content }}</p>
                </div>
              } @empty {
                <div class="text-muted-sm">No feedback recorded.</div>
              }
            </div>
          </div>
        </div>

        <div class="text-muted-sm mt-3">
          Report scope: {{ data.projects.length }} project{{ data.projects.length === 1 ? '' : 's' }} · generated from live task, milestone, contribution, workload, and feedback records.
        </div>
      }
    }
  `,
  styles: [
    `
      .report-feedback { padding: 9px 0; border-bottom: 1px solid #f1f4f9; }
      .report-feedback:last-child { border-bottom: 0; }
      .report-feedback strong { font-size: 12px; color: var(--navy); }
      .report-feedback p { margin: 4px 0 0; font-size: 12px; color: var(--muted); white-space: pre-line; }
    `,
  ],
})
export class ReportsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly projects = signal<Project[]>([]);
  readonly report = signal<ReportResponse | null>(null);
  readonly loading = signal(true);
  readonly exporting = signal(false);
  readonly projectFilter = signal('All');
  readonly from = signal(addDaysISO(-56));
  readonly to = signal(todayISO());

  readonly statusChart = computed(() => {
    const entries = Object.entries(this.report()?.tasksByStatus || {});
    return doughnutConfig(entries.map(([label]) => label), entries.map(([, value]) => value));
  });

  readonly priorityChart = computed(() => {
    const order = ['Low', 'Medium', 'High', 'Urgent'];
    const map = this.report()?.tasksByPriority || {};
    return barConfig(order, order.map((key) => map[key] || 0), 'Tasks', '#3b82f6');
  });

  readonly trendChart = computed(() => {
    const trend = this.report()?.completionTrend || [];
    return lineConfig(trend.map((item) => item.label), trend.map((item) => item.completed), 'Completed tasks');
  });

  readonly contributionChart = computed(() => {
    const rows = [...(this.report()?.contributions || [])].slice(0, 12);
    return barConfig(
      rows.map((row) => row.user.name.split(' ')[0]),
      rows.map((row) => row.points),
      'Contribution points',
      '#24498f',
      true,
    );
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
      .get<ReportResponse>('/reports', {
        projectId: projectId === 'All' ? undefined : projectId,
        from: this.from(),
        to: this.to(),
      })
      .subscribe({
        next: (response) => {
          this.report.set(response);
          this.loading.set(false);
        },
        error: (error) => {
          this.loading.set(false);
          this.report.set(null);
          this.toast.error(apiError(error));
        },
      });
  }

  changeProject(value: string): void {
    this.projectFilter.set(value);
    this.load();
  }

  changeRange(from: string, to: string): void {
    if (!from || !to) return;
    this.from.set(from);
    this.to.set(to);
    this.load();
  }

  quickRange(days: number): void {
    this.from.set(addDaysISO(-days));
    this.to.set(todayISO());
    this.load();
  }

  readValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  date(value?: string | null): string {
    return formatDate(value);
  }

  projectName(id?: number): string {
    return this.projects().find((project) => project.id === id)?.title || 'Project';
  }

  async exportExcel(): Promise<void> {
    const data = this.report();
    if (!data) return;
    this.exporting.set(true);
    try {
      const XLSX = await import('xlsx');
      const summary = [
        { Metric: 'Report from', Value: data.range.from },
        { Metric: 'Report to', Value: data.range.to },
        { Metric: 'Projects', Value: data.summary.totalProjects },
        { Metric: 'Total tasks', Value: data.summary.totalTasks },
        { Metric: 'Completed tasks', Value: data.summary.completedTasks },
        { Metric: 'Completion rate (%)', Value: data.summary.completionRate },
        { Metric: 'Overdue tasks', Value: data.summary.overdueTasks },
        { Metric: 'Contribution points', Value: data.summary.contributionPoints },
        { Metric: 'Pending reviews', Value: data.summary.pendingReviews },
        { Metric: 'Feedback entries', Value: data.summary.feedbackCount },
      ];
      const status = Object.entries(data.tasksByStatus || {}).map(([Status, Tasks]) => ({ Status, Tasks }));
      const priority = Object.entries(data.tasksByPriority || {}).map(([Priority, Tasks]) => ({ Priority, Tasks }));
      const contributions = data.contributions.map((row) => ({
        Member: row.user.name,
        Points: row.points,
        'Share (%)': row.percentage,
        'Completed tasks': row.completedTasks,
        Task: row.breakdown['task_completed'] || row.breakdown['taskCompleted'] || 0,
        Milestone: (row.breakdown['milestone_submission'] || 0) + (row.breakdown['milestone_approval'] || 0),
        Files: row.breakdown['file_upload'] || row.breakdown['fileUpload'] || 0,
        Comments: row.breakdown['comment'] || 0,
      }));
      const overdue = data.overdueTasks.map((task) => ({
        Task: task.title,
        Project: task.projectTitle || this.projectName(task.projectId),
        Priority: task.priority,
        Deadline: task.deadline || '',
        Status: task.status,
      }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summary), 'Summary');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(status), 'By status');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(priority), 'By priority');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(contributions), 'Contributions');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(overdue), 'Overdue tasks');
      XLSX.writeFile(workbook, `spms-report-${data.range.from}-to-${data.range.to}.xlsx`);
      this.toast.success('Excel report downloaded.');
    } catch (error) {
      this.toast.error(apiError(error));
    } finally {
      this.exporting.set(false);
    }
  }

  async exportPdf(): Promise<void> {
    const data = this.report();
    if (!data) return;
    this.exporting.set(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      doc.setFontSize(18);
      doc.setTextColor('#14244a');
      doc.text('SPMS Project Report', 40, 46);
      doc.setFontSize(10);
      doc.setTextColor('#5b6478');
      doc.text(`Period: ${data.range.from} to ${data.range.to}`, 40, 64);
      doc.text(`Scope: ${data.summary.totalProjects} project(s)`, 40, 78);

      autoTable(doc, {
        startY: 96,
        head: [['Metric', 'Value']],
        body: [
          ['Total tasks', data.summary.totalTasks],
          ['Completed tasks', data.summary.completedTasks],
          ['Completion rate', `${data.summary.completionRate}%`],
          ['Completed in range', data.summary.completedInRange],
          ['Overdue tasks', data.summary.overdueTasks],
          ['Contribution points', data.summary.contributionPoints],
          ['Pending reviews', data.summary.pendingReviews],
          ['Feedback entries', data.summary.feedbackCount],
        ],
        theme: 'grid',
        headStyles: { fillColor: [36, 73, 143] },
        styles: { fontSize: 9 },
      });

      autoTable(doc, {
        head: [['Status', 'Tasks']],
        body: Object.entries(data.tasksByStatus || {}),
        theme: 'grid',
        headStyles: { fillColor: [36, 73, 143] },
        styles: { fontSize: 9 },
      });

      autoTable(doc, {
        head: [['Member', 'Points', 'Share', 'Tasks completed']],
        body: data.contributions.map((row) => [row.user.name, row.points, `${row.percentage}%`, row.completedTasks]),
        theme: 'grid',
        headStyles: { fillColor: [36, 73, 143] },
        styles: { fontSize: 9 },
      });

      if (data.overdueTasks.length) {
        autoTable(doc, {
          head: [['Overdue task', 'Project', 'Priority', 'Deadline']],
          body: data.overdueTasks.map((task) => [
            task.title,
            task.projectTitle || this.projectName(task.projectId),
            task.priority,
            task.deadline || '—',
          ]),
          theme: 'grid',
          headStyles: { fillColor: [185, 28, 28] },
          styles: { fontSize: 9 },
        });
      }

      doc.save(`spms-report-${data.range.from}-to-${data.range.to}.pdf`);
      this.toast.success('PDF report downloaded.');
    } catch (error) {
      this.toast.error(apiError(error));
    } finally {
      this.exporting.set(false);
    }
  }
}
