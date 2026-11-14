import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { actionIcon, apiError, formatDateTime, relativeTime } from '../../core/utils';
import { AvatarComponent } from '../../shared/avatar';
import { EmptyStateComponent } from '../../shared/empty-state';
import { PageHeaderComponent } from '../../shared/page-header';

interface AuditRow {
  id: number;
  action: string;
  details: string;
  entityType?: string | null;
  entityId?: number | null;
  createdAt: string;
  userId?: number | null;
  projectId?: number | null;
  userName: string;
  projectTitle?: string | null;
}

interface RawAuditRow {
  id: number;
  action: string;
  details: string;
  entity_type?: string | null;
  entity_id?: number | null;
  created_at: string;
  user_id?: number | null;
  project_id?: number | null;
  first_name?: string | null;
  last_name?: string | null;
  project_title?: string | null;
}

@Component({
  selector: 'app-audit-logs',
  imports: [AvatarComponent, EmptyStateComponent, PageHeaderComponent],
  template: `
    <app-page-header title="Audit Logs" subtitle="A complete trail of account, project, task, file, and review activity.">
      <button type="button" class="btn btn-soft" (click)="load()"><i class="bi bi-arrow-clockwise"></i> Refresh</button>
    </app-page-header>

    <div class="stat-grid">
      <div class="stat-card tone-blue">
        <div class="stat-icon"><i class="bi bi-clock-history"></i></div>
        <div class="stat-label">Log entries</div>
        <div class="stat-value">{{ logs().length }}</div>
        <div class="stat-hint">Most recent 300 events</div>
      </div>
      <div class="stat-card tone-violet">
        <div class="stat-icon"><i class="bi bi-people"></i></div>
        <div class="stat-label">Active users</div>
        <div class="stat-value">{{ uniqueUsers() }}</div>
        <div class="stat-hint">Accounts represented in the log</div>
      </div>
      <div class="stat-card tone-teal">
        <div class="stat-icon"><i class="bi bi-lightning-charge"></i></div>
        <div class="stat-label">Action types</div>
        <div class="stat-value">{{ actionTypes().length }}</div>
        <div class="stat-hint">Distinct tracked events</div>
      </div>
      <div class="stat-card tone-amber">
        <div class="stat-icon"><i class="bi bi-calendar-check"></i></div>
        <div class="stat-label">Today</div>
        <div class="stat-value">{{ todayCount() }}</div>
        <div class="stat-hint">Events recorded today</div>
      </div>
    </div>

    <div class="filter-bar mt-3">
      <div class="search-box">
        <i class="bi bi-search"></i>
        <input
          type="search"
          placeholder="Search user, details, project..."
          [value]="search()"
          (input)="search.set(readValue($event))"
        />
      </div>
      <select class="form-select" style="max-width:240px" [value]="actionFilter()" (change)="actionFilter.set(readValue($event))">
        <option value="All">All actions</option>
        @for (action of actionTypes(); track action) {
          <option [value]="action">{{ label(action) }}</option>
        }
      </select>
      <select class="form-select" style="max-width:160px" [value]="limit()" (change)="changeLimit(readValue($event))">
        <option value="100">Last 100</option>
        <option value="200">Last 200</option>
        <option value="300">Last 300</option>
      </select>
    </div>

    @if (loading()) {
      <div class="spinner-wrap"><div class="spinner-border"></div></div>
    } @else if (!filtered().length) {
      <app-empty-state icon="bi-clock-history" title="No audit entries" message="No activity matches the current filters." />
    } @else {
      <div class="panel table-panel mt-3">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th style="width:180px">When</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
                <th>Project</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              @for (log of filtered(); track log.id) {
                <tr>
                  <td>
                    <div>{{ relative(log.createdAt) }}</div>
                    <div class="cell-sub">{{ fullDate(log.createdAt) }}</div>
                  </td>
                  <td>
                    <div class="hstack-8">
                      <app-avatar [name]="log.userName" [color]="colorFor(log.userId)" size="sm" />
                      <span style="font-size:12px">{{ log.userName }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="audit-action">
                      <i [class]="'bi ' + icon(log.action)"></i> {{ label(log.action) }}
                    </span>
                  </td>
                  <td style="font-size:12px">{{ log.details }}</td>
                  <td>{{ log.projectTitle || '—' }}</td>
                  <td><span class="badge-soft tone-gray">{{ log.entityType || 'system' }}{{ log.entityId ? ' #' + log.entityId : '' }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .audit-action {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 11.5px;
        font-weight: 600;
        color: var(--navy);
        background: #eef2f9;
        border-radius: 999px;
        padding: 3px 9px;
        white-space: nowrap;
      }
    `,
  ],
})
export class AuditLogsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly logs = signal<AuditRow[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly actionFilter = signal('All');
  readonly limit = signal(300);

  readonly uniqueUsers = computed(() => new Set(this.logs().map((log) => log.userId).filter(Boolean)).size);
  readonly actionTypes = computed(() => [...new Set(this.logs().map((log) => log.action))].sort());
  readonly todayCount = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.logs().filter((log) => String(log.createdAt).slice(0, 10) === today).length;
  });

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const action = this.actionFilter();
    return this.logs().filter((log) => {
      const matchesTerm =
        !term ||
        [log.userName, log.details, log.projectTitle, log.entityType, log.action]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesAction = action === 'All' || log.action === action;
      return matchesTerm && matchesAction;
    });
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.get<{ logs: RawAuditRow[] }>('/audit-logs', { limit: this.limit() }).subscribe({
      next: (response) => {
        this.logs.set(
          response.logs.map((row) => ({
            id: row.id,
            action: row.action,
            details: row.details,
            entityType: row.entity_type,
            entityId: row.entity_id,
            createdAt: row.created_at,
            userId: row.user_id,
            projectId: row.project_id,
            userName: [row.first_name, row.last_name].filter(Boolean).join(' ') || 'System',
            projectTitle: row.project_title,
          }))
        );
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(apiError(error));
      },
    });
  }

  changeLimit(value: string): void {
    this.limit.set(Number(value));
    this.load();
  }

  readValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  label(action: string): string {
    return action
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  icon(action: string): string {
    return actionIcon(action);
  }

  colorFor(userId?: number | null): string {
    const palette = ['#274b8f', '#2563eb', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#475569'];
    return palette[Math.abs(Number(userId || 0)) % palette.length];
  }

  relative(value: string): string {
    return relativeTime(value);
  }

  fullDate(value: string): string {
    return formatDateTime(value);
  }
}
