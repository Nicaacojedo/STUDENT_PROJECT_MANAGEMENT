import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Project, StudentLookup, UserSummary } from '../../core/models';
import { apiError, dateInputValue, projectStatusOptions } from '../../core/utils';
import { PageHeaderComponent } from '../../shared/page-header';
import { StatusBadgeComponent } from '../../shared/status-badge';

@Component({
  selector: 'app-project-form',
  imports: [ReactiveFormsModule, RouterLink, PageHeaderComponent, StatusBadgeComponent],
  template: `
    <app-page-header
      [title]="isEdit() ? 'Edit project' : 'Create a new project'"
      [subtitle]="isEdit() ? 'Update project details, status, and timeline.' : 'Set up the academic project, timeline, and team leadership.'"
    >
      <a [routerLink]="isEdit() ? ['/projects', projectId] : ['/projects']" class="btn btn-outline-secondary">
        <i class="bi bi-arrow-left"></i> Cancel
      </a>
    </app-page-header>

    @if (loading()) {
      <div class="spinner-wrap"><div class="spinner-border"></div></div>
    } @else {
      @if (loadError()) {
        <div class="alert alert-danger" style="font-size:13px">{{ loadError() }}</div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="grid-main-side">
            <div>
              <div class="panel">
                <div class="panel-head"><div><h3>Project information</h3><div class="sub">What is this project about?</div></div></div>
                <div class="panel-body">
                  <div class="mb-3">
                    <label class="form-label">Project title *</label>
                    <input class="form-control" formControlName="title" placeholder="e.g. Campus Lost & Found Web Platform" [class.is-invalid]="invalid('title')" />
                    @if (invalid('title')) {
                      <div class="invalid-feedback" style="display:block">Project title is required.</div>
                    }
                  </div>

                  <div class="mb-3">
                    <label class="form-label">Description</label>
                    <textarea class="form-control" rows="4" formControlName="description" placeholder="Describe the problem, scope, and expected outcome."></textarea>
                  </div>

                  <div class="grid-2">
                    <div class="mb-3">
                      <label class="form-label">Academic year</label>
                      <input class="form-control" formControlName="academicYear" placeholder="2026-2027" />
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Semester</label>
                      <select class="form-select" formControlName="semester">
                        <option value="">Select semester</option>
                        <option>1st Semester</option>
                        <option>2nd Semester</option>
                        <option>Summer</option>
                      </select>
                    </div>
                  </div>

                  <div class="grid-2">
                    <div class="mb-3">
                      <label class="form-label">Course / subject</label>
                      <input class="form-control" formControlName="course" placeholder="IT313 - Integrative Programming" />
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Category</label>
                      <select class="form-select" formControlName="category">
                        <option value="">Select category</option>
                        <option>Web Application</option>
                        <option>Mobile Application</option>
                        <option>Research Project</option>
                        <option>Capstone Project</option>
                        <option>Data Science</option>
                        <option>Information System</option>
                        <option>Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div class="panel mt-3">
                <div class="panel-head"><div><h3>Timeline</h3><div class="sub">Dates are used for deadline monitoring.</div></div></div>
                <div class="panel-body">
                  <div class="grid-2">
                    <div class="mb-3">
                      <label class="form-label">Start date</label>
                      <input type="date" class="form-control" formControlName="startDate" />
                    </div>
                    <div class="mb-3">
                      <label class="form-label">Target completion</label>
                      <input type="date" class="form-control" formControlName="endDate" [class.is-invalid]="form.hasError('dateRange')" />
                      @if (form.hasError('dateRange')) {
                        <div class="invalid-feedback" style="display:block">Target date must be after the start date.</div>
                      }
                    </div>
                  </div>
                  <div class="recommendation">
                    <i class="bi bi-info-circle"></i>
                    <span>Tasks and milestones also carry their own deadlines. Project dates are shown on the deadline monitor and reports.</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div class="panel">
                <div class="panel-head"><div><h3>Status</h3><div class="sub">Where is the project now?</div></div></div>
                <div class="panel-body">
                  <select class="form-select" formControlName="status">
                    @for (status of statuses; track status) {
                      <option [value]="status">{{ status }}</option>
                    }
                  </select>
                  <div class="hstack-8 mt-2">
                    <app-status-badge [label]="form.get('status')?.value || 'Planning'" />
                    <span class="text-muted-sm">Visible to the team and adviser</span>
                  </div>
                </div>
              </div>

              @if (auth.isAdmin()) {
                <div class="panel mt-3">
                  <div class="panel-head"><div><h3>People</h3><div class="sub">Administrator assignment</div></div></div>
                  <div class="panel-body">
                    @if (!isEdit()) {
                      <div class="mb-3">
                        <label class="form-label">Team leader</label>
                        <select class="form-select" formControlName="leaderId">
                          <option value="">No leader yet</option>
                          @for (student of students(); track student.id) {
                            <option [value]="student.id">{{ student.name }} — {{ student.section || student.program }}</option>
                          }
                        </select>
                        <div class="form-hint">The selected student is promoted to Team Leader and added as a member.</div>
                      </div>
                    } @else {
                      <div class="info-row"><span>Team leader</span><span>{{ leaderName() }}</span></div>
                      <div class="form-hint mt-1">Change the leader from the project Team tab.</div>
                    }
                    <div class="mt-3">
                      <label class="form-label">Adviser</label>
                      <select class="form-select" formControlName="adviserId">
                        <option value="">Unassigned</option>
                        @for (adviser of advisers(); track adviser.id) {
                          <option [value]="adviser.id">{{ adviser.name }} — {{ adviser.email }}</option>
                        }
                      </select>
                    </div>
                  </div>
                </div>
              } @else {
                <div class="panel mt-3">
                  <div class="panel-head"><div><h3>People</h3><div class="sub">Your role</div></div></div>
                  <div class="panel-body">
                    <div class="info-row"><span>Team leader</span><span>{{ leaderName() }}</span></div>
                    <div class="info-row"><span>Adviser</span><span>{{ adviserName() }}</span></div>
                    @if (!isEdit()) {
                      <div class="form-hint mt-2">You will be added as the team leader. Add teammates from the project Team tab after creating it.</div>
                    }
                  </div>
                </div>
              }

              <div class="panel mt-3">
                <div class="panel-body">
                  @if (error()) {
                    <div class="alert alert-danger py-2 px-3" style="font-size:12.5px">{{ error() }}</div>
                  }
                  <button type="submit" class="btn btn-primary w-100" [disabled]="saving()">
                    @if (saving()) {
                      <span class="spinner-border spinner-border-sm me-2"></span> Saving...
                    } @else {
                      <i class="bi bi-check2"></i> {{ isEdit() ? 'Save changes' : 'Create project' }}
                    }
                  </button>
                  <a [routerLink]="isEdit() ? ['/projects', projectId] : ['/projects']" class="btn btn-soft w-100 mt-2">Cancel</a>
                </div>
              </div>
            </div>
          </div>
        </form>
      }
    }
  `,
})
export class ProjectFormPage implements OnInit {
  readonly auth = inject(AuthService);
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly projectId = Number(this.route.snapshot.paramMap.get('id') || 0);
  readonly isEdit = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly error = signal('');
  readonly project = signal<Project | null>(null);
  readonly students = signal<StudentLookup[]>([]);
  readonly advisers = signal<UserSummary[]>([]);
  readonly statuses = projectStatusOptions();

  readonly form = this.fb.group(
    {
      title: ['', Validators.required],
      description: [''],
      academicYear: ['2026-2027'],
      semester: ['1st Semester'],
      course: [''],
      category: [''],
      status: ['Planning'],
      startDate: [''],
      endDate: [''],
      leaderId: [''],
      adviserId: [''],
    },
    { validators: this.dateRangeValidator },
  );

  readonly leaderName = computed(() => {
    if (!this.isEdit()) return this.auth.user()?.name || 'You';
    return this.project()?.leader?.name || 'Unassigned';
  });
  readonly adviserName = computed(() => this.project()?.adviser?.name || 'Unassigned');

  ngOnInit(): void {
    this.isEdit.set(!!this.projectId);
    this.loading.set(true);
    if (this.auth.isAdmin()) {
      this.api.get<{ students: StudentLookup[] }>('/students').subscribe({
        next: (response) => this.students.set(response.students),
      });
      this.api.get<{ advisers: UserSummary[] }>('/advisers').subscribe({
        next: (response) => this.advisers.set(response.advisers),
      });
    }

    if (this.isEdit()) {
      this.api.get<{ project: Project }>(`/projects/${this.projectId}`).subscribe({
        next: (response) => {
          if (!response.project.canManage) {
            this.loadError.set('You do not have permission to edit this project.');
            this.loading.set(false);
            return;
          }
          this.project.set(response.project);
          this.form.patchValue({
            title: response.project.title,
            description: response.project.description || '',
            academicYear: response.project.academicYear || '',
            semester: response.project.semester || '',
            course: response.project.course || '',
            category: response.project.category || '',
            status: response.project.status,
            startDate: dateInputValue(response.project.startDate),
            endDate: dateInputValue(response.project.endDate),
            leaderId: response.project.leader ? String(response.project.leader.id) : '',
            adviserId: response.project.adviser ? String(response.project.adviser.id) : '',
          });
          this.loading.set(false);
        },
        error: (err) => {
          this.loadError.set(apiError(err));
          this.loading.set(false);
        },
      });
    } else {
      this.loading.set(false);
    }
  }

  dateRangeValidator(group: import('@angular/forms').AbstractControl): { dateRange: boolean } | null {
    const start = group.get('startDate')?.value;
    const end = group.get('endDate')?.value;
    return start && end && start > end ? { dateRange: true } : null;
  }

  invalid(control: string): boolean {
    const field = this.form.get(control);
    return !!field && field.invalid && (field.touched || field.dirty);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      title: value.title,
      description: value.description,
      academicYear: value.academicYear,
      semester: value.semester,
      course: value.course,
      category: value.category,
      status: value.status,
      startDate: value.startDate || null,
      endDate: value.endDate || null,
    };
    if (this.auth.isAdmin()) {
      payload['adviserId'] = value.adviserId ? Number(value.adviserId) : null;
      if (!this.isEdit()) {
        payload['leaderId'] = value.leaderId ? Number(value.leaderId) : null;
      }
    }

    const request = this.isEdit()
      ? this.api.put<{ project: Project }>(`/projects/${this.projectId}`, payload)
      : this.api.post<{ project: Project }>('/projects', payload);

    request.subscribe({
      next: (response) => {
        this.saving.set(false);
        this.toast.success(this.isEdit() ? 'Project updated.' : 'Project created.');
        this.router.navigate(['/projects', response.project.id]);
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(apiError(err));
      },
    });
  }
}
