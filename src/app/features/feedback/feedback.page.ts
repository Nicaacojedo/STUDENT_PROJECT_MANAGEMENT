import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmService } from '../../core/confirm.service';
import { ToastService } from '../../core/toast.service';
import { Feedback, Milestone, Project, ProjectFile } from '../../core/models';
import { apiError, formatDateTime, toneClass } from '../../core/utils';
import { AvatarComponent } from '../../shared/avatar';
import { EmptyStateComponent } from '../../shared/empty-state';
import { PageHeaderComponent } from '../../shared/page-header';
import { StatusBadgeComponent } from '../../shared/status-badge';

@Component({
  selector: 'app-feedback',
  imports: [ReactiveFormsModule, AvatarComponent, EmptyStateComponent, PageHeaderComponent, StatusBadgeComponent],
  template: `
    <app-page-header title="Adviser Feedback" subtitle="Review adviser comments, approvals, and revision requests across your projects." />

    <div class="filter-bar">
      <select class="form-select" style="max-width:320px" [value]="projectFilter()" (change)="changeProject(readValue($event))">
        <option value="All">All accessible projects</option>
        @for (project of projects(); track project.id) {
          <option [value]="project.id">{{ project.title }}</option>
        }
      </select>
      <select class="form-select" style="max-width:190px" [value]="statusFilter()" (change)="statusFilter.set(readValue($event))">
        <option value="All">All review statuses</option>
        <option value="Comment">Comments</option>
        <option value="Approved">Approved</option>
        <option value="Revision Required">Revision required</option>
      </select>
      <div class="search-box">
        <i class="bi bi-search"></i>
        <input
          type="search"
          placeholder="Search feedback..."
          [value]="search()"
          (input)="search.set(readValue($event))"
        />
      </div>
    </div>

    @if (loading()) {
      <div class="spinner-wrap"><div class="spinner-border"></div></div>
    } @else {
      <div class="summary-strip mt-3">
        <div><strong>{{ feedback().length }}</strong><span class="text-muted-sm">Total feedback</span></div>
        <div><strong>{{ countStatus('Comment') }}</strong><span class="text-muted-sm">Comments</span></div>
        <div><strong>{{ countStatus('Approved') }}</strong><span class="text-muted-sm">Approved</span></div>
        <div><strong>{{ countStatus('Revision Required') }}</strong><span class="text-muted-sm">Revision required</span></div>
      </div>

      <div class="grid-main-side mt-3">
        <div>
          @if (!filtered().length) {
            <app-empty-state icon="bi-chat-square-text" title="No feedback yet" message="Adviser feedback and review decisions will appear here." />
          } @else {
            @for (item of filtered(); track item.id) {
              <article class="feedback-card">
                <div class="hstack-8 justify-content-between flex-wrap">
                  <div class="hstack-8">
                    <app-avatar [name]="item.adviser.name" [color]="item.adviser.avatarColor || '#274b8f'" />
                    <div>
                      <div style="font-size:12.5px;font-weight:650;color:var(--navy)">{{ item.adviser.name }}</div>
                      <div class="text-muted-sm">{{ item.projectTitle }} · {{ fullDate(item.createdAt) }}</div>
                    </div>
                  </div>
                  <div class="hstack-8">
                    <app-status-badge [label]="item.reviewStatus" />
                    @if (item.canDelete) {
                      <button type="button" class="btn btn-danger-soft btn-sm" title="Delete feedback" (click)="remove(item)">
                        <i class="bi bi-trash3"></i>
                      </button>
                    }
                  </div>
                </div>
                <p class="feedback-body">{{ item.content }}</p>
                @if (item.milestoneTitle || item.fileName) {
                  <div class="chip-list">
                    @if (item.milestoneTitle) {
                      <span class="badge-soft tone-violet"><i class="bi bi-flag me-1"></i>{{ item.milestoneTitle }}</span>
                    }
                    @if (item.fileName) {
                      <span class="badge-soft tone-gray"><i class="bi bi-file-earmark me-1"></i>{{ item.fileName }}</span>
                    }
                  </div>
                }
              </article>
            }
          }
        </div>

        <div>
          @if (canGiveFeedback()) {
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>Give feedback</h3>
                  <div class="sub">{{ selectedProjectTitle() }}</div>
                </div>
              </div>
              <div class="panel-body">
                <form [formGroup]="form" (ngSubmit)="submit()">
                  <label class="form-label">Feedback <span class="text-danger">*</span></label>
                  <textarea class="form-control" rows="4" formControlName="content" placeholder="Share observations, approval notes, or required revisions..."></textarea>
                  @if (form.controls.content.touched && form.controls.content.invalid) {
                    <div class="form-error">Feedback content is required.</div>
                  }

                  <label class="form-label mt-2">Review status</label>
                  <select class="form-select" formControlName="reviewStatus">
                    <option value="Comment">Comment</option>
                    <option value="Approved">Approved</option>
                    <option value="Revision Required">Revision required</option>
                  </select>

                  <label class="form-label mt-2">Link to milestone (optional)</label>
                  <select class="form-select" formControlName="milestoneId">
                    <option value="">No milestone</option>
                    @for (milestone of milestones(); track milestone.id) {
                      <option [value]="milestone.id">{{ milestone.title }}</option>
                    }
                  </select>

                  <label class="form-label mt-2">Attach a project file (optional)</label>
                  <select class="form-select" formControlName="fileId">
                    <option value="">No file</option>
                    @for (file of projectFiles(); track file.id) {
                      <option [value]="file.id">{{ file.fileName }}</option>
                    }
                  </select>

                  @if (formError()) {
                    <div class="alert alert-danger py-2 px-3 mt-2" style="font-size:12.5px">{{ formError() }}</div>
                  }

                  <button type="submit" class="btn btn-primary w-100 mt-3" [disabled]="saving()">
                    @if (saving()) {
                      <span class="spinner-border spinner-border-sm me-1"></span> Posting...
                    } @else {
                      <i class="bi bi-send"></i> Post feedback
                    }
                  </button>
                </form>
              </div>
            </div>

            <div class="panel mt-3">
              <div class="panel-head"><div><h3>Review summary</h3><div class="sub">Across the selected project</div></div></div>
              <div class="panel-body" style="padding-top:8px">
                @for (status of statuses; track status) {
                  <div class="info-row">
                    <span>{{ status }}</span>
                    <span [class]="'badge-soft ' + tone(status)">{{ countStatus(status) }}</span>
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="panel">
              <div class="panel-head"><div><h3>About adviser feedback</h3></div></div>
              <div class="panel-body" style="font-size:12.5px;color:var(--muted)">
                <p style="margin-top:0">
                  Advisers review project milestones and documents, leaving structured feedback marked as comments, approvals, or revision requests.
                </p>
                <p style="margin-bottom:0">
                  Every submission, review, and reply keeps the team aligned. Feedback notifications appear in the topbar so nothing is missed.
                </p>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [
    `
      .feedback-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 12px;
        box-shadow: var(--card-shadow);
      }
      .feedback-body {
        margin: 12px 0 10px;
        font-size: 13px;
        line-height: 1.6;
        color: var(--text);
        white-space: pre-line;
      }
    `,
  ],
})
export class FeedbackPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  readonly auth = inject(AuthService);

  readonly projects = signal<Project[]>([]);
  readonly feedback = signal<Feedback[]>([]);
  readonly milestones = signal<Milestone[]>([]);
  readonly projectFiles = signal<ProjectFile[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly formError = signal('');
  readonly search = signal('');
  readonly statusFilter = signal('All');
  readonly projectFilter = signal(this.route.snapshot.queryParamMap.get('project') || 'All');

  readonly statuses = ['Comment', 'Approved', 'Revision Required'];

  readonly form = this.fb.nonNullable.group({
    content: ['', Validators.required],
    reviewStatus: ['Comment'],
    milestoneId: [''],
    fileId: [''],
  });

  readonly canGiveFeedback = computed(
    () => this.projectFilter() !== 'All' && (this.auth.isAdviser() || this.auth.isAdmin())
  );

  readonly selectedProjectTitle = computed(
    () => this.projects().find((project) => project.id === Number(this.projectFilter()))?.title || 'Selected project'
  );

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const status = this.statusFilter();
    return this.feedback().filter((item) => {
      const matchesTerm =
        !term ||
        [item.content, item.projectTitle, item.adviser?.name, item.milestoneTitle]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesStatus = status === 'All' || item.reviewStatus === status;
      return matchesTerm && matchesStatus;
    });
  });

  ngOnInit(): void {
    this.api.get<{ projects: Project[] }>('/projects').subscribe({
      next: (response) => {
        this.projects.set(response.projects);
        this.loadFeedback();
        this.loadContext();
      },
    });
  }

  loadFeedback(): void {
    this.loading.set(true);
    const projectId = this.projectFilter();
    this.api.get<{ feedback: Feedback[] }>('/feedback', { projectId: projectId === 'All' ? undefined : projectId }).subscribe({
      next: (response) => {
        this.feedback.set(response.feedback);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(apiError(error));
      },
    });
  }

  loadContext(): void {
    if (this.projectFilter() === 'All') {
      this.milestones.set([]);
      this.projectFiles.set([]);
      return;
    }
    const projectId = Number(this.projectFilter());
    this.api.get<{ milestones: Milestone[] }>(`/projects/${projectId}/milestones`).subscribe({
      next: (response) => this.milestones.set(response.milestones),
      error: () => this.milestones.set([]),
    });
    this.api.get<{ files: ProjectFile[] }>('/files', { projectId }).subscribe({
      next: (response) => this.projectFiles.set(response.files),
      error: () => this.projectFiles.set([]),
    });
  }

  changeProject(value: string): void {
    this.projectFilter.set(value);
    this.form.reset({ content: '', reviewStatus: 'Comment', milestoneId: '', fileId: '' });
    this.loadFeedback();
    this.loadContext();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.projectFilter() === 'All') {
      this.formError.set('Choose a specific project before posting feedback.');
      return;
    }
    const value = this.form.getRawValue();
    this.saving.set(true);
    this.formError.set('');
    this.api
      .post(`/projects/${this.projectFilter()}/feedback`, {
        content: value.content.trim(),
        reviewStatus: value.reviewStatus,
        milestoneId: value.milestoneId ? Number(value.milestoneId) : null,
        fileId: value.fileId ? Number(value.fileId) : null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.form.reset({ content: '', reviewStatus: 'Comment', milestoneId: '', fileId: '' });
          this.toast.success('Feedback posted.');
          this.loadFeedback();
        },
        error: (error) => {
          this.saving.set(false);
          this.formError.set(apiError(error));
        },
      });
  }

  async remove(item: Feedback): Promise<void> {
    const confirmed = await this.confirm.open({
      title: 'Delete feedback?',
      message: 'This feedback entry will be permanently removed and the team will no longer see it.',
      confirmLabel: 'Delete feedback',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.delete(`/feedback/${item.id}`).subscribe({
      next: () => {
        this.feedback.update((list) => list.filter((entry) => entry.id !== item.id));
        this.toast.success('Feedback deleted.');
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  countStatus(status: string): number {
    return this.feedback().filter((item) => item.reviewStatus === status).length;
  }

  tone(status: string): string {
    return toneClass(status);
  }

  readValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  fullDate(value?: string | null): string {
    return formatDateTime(value);
  }
}
