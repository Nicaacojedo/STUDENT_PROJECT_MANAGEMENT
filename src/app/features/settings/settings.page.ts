import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmService } from '../../core/confirm.service';
import { ToastService } from '../../core/toast.service';
import { FormulaSettings, Program, Section } from '../../core/models';
import { apiError } from '../../core/utils';
import { AvatarComponent } from '../../shared/avatar';
import { PageHeaderComponent } from '../../shared/page-header';

type TabKey = 'profile' | 'security' | 'formula' | 'academic';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, AvatarComponent, PageHeaderComponent],
  template: `
    <app-page-header title="Settings" subtitle="Manage your profile, account security, contribution formula, and academic reference data." />

    <div class="settings-tabs">
      @for (tab of tabs(); track tab.key) {
        <button type="button" class="tab-btn" [class.active]="activeTab() === tab.key" (click)="activeTab.set(tab.key)">
          <i [class]="'bi ' + tab.icon"></i> {{ tab.label }}
        </button>
      }
    </div>

    @if (activeTab() === 'profile') {
      <div class="grid-main-side">
        <div class="panel">
          <div class="panel-head"><div><h3>Profile information</h3><div class="sub">This is how teammates see you across SPMS.</div></div></div>
          <div class="panel-body">
            <form [formGroup]="profileForm" (ngSubmit)="saveProfile()">
              <div class="grid-2">
                <div>
                  <label class="form-label">First name</label>
                  <input class="form-control" formControlName="firstName" />
                </div>
                <div>
                  <label class="form-label">Last name</label>
                  <input class="form-control" formControlName="lastName" />
                </div>
              </div>

              <label class="form-label mt-2">Phone number</label>
              <input class="form-control" formControlName="phone" placeholder="+63 9XX XXX XXXX" />

              @if (auth.isStudent()) {
                <div class="grid-2 mt-2">
                  <div>
                    <label class="form-label">Student number</label>
                    <input class="form-control" formControlName="studentNumber" />
                  </div>
                  <div>
                    <label class="form-label">Section</label>
                    <input class="form-control" formControlName="section" list="section-options" placeholder="e.g. BSIT 4-A" />
                    <datalist id="section-options">
                      @for (section of sections(); track section.id) {
                        <option [value]="section.name"></option>
                      }
                    </datalist>
                  </div>
                </div>
                <label class="form-label mt-2">Program</label>
                <input class="form-control" formControlName="program" placeholder="e.g. BS Information Technology" />
              }

              <label class="form-label mt-2">Avatar colour</label>
              <div class="swatch-row">
                @for (color of palette; track color) {
                  <button
                    type="button"
                    class="swatch"
                    [class.selected]="profileForm.controls.avatarColor.value === color"
                    [style.background]="color"
                    [attr.aria-label]="'Use ' + color"
                    (click)="profileForm.controls.avatarColor.setValue(color)"
                  ></button>
                }
              </div>

              <div class="hstack-8 justify-content-end mt-3">
                <button type="submit" class="btn btn-primary" [disabled]="savingProfile()">
                  @if (savingProfile()) {
                    <span class="spinner-border spinner-border-sm me-1"></span> Saving...
                  } @else {
                    <i class="bi bi-check2"></i> Save profile
                  }
                </button>
              </div>
            </form>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><div><h3>Account</h3></div></div>
          <div class="panel-body">
            <div class="hstack-12">
              <app-avatar [name]="auth.user()?.name || 'User'" [color]="auth.user()?.avatarColor || '#2563eb'" size="xl" />
              <div>
                <div style="font-weight:650;color:var(--navy)">{{ auth.user()?.name }}</div>
                <div class="text-muted-sm">{{ auth.user()?.email }}</div>
                <span class="badge-soft tone-blue mt-1">{{ auth.role() }}</span>
              </div>
            </div>
            <div class="divider"></div>
            <div class="info-row"><span>Email</span><span>{{ auth.user()?.email }}</span></div>
            <div class="info-row"><span>Role</span><span>{{ auth.role() }}</span></div>
            <div class="info-row"><span>Student number</span><span>{{ auth.user()?.studentNumber || '—' }}</span></div>
            <div class="info-row"><span>Section</span><span>{{ auth.user()?.section || '—' }}</span></div>
            <div class="info-row"><span>Program</span><span>{{ auth.user()?.program || '—' }}</span></div>
          </div>
        </div>
      </div>
    }

    @if (activeTab() === 'security') {
      <div class="grid-main-side">
        <div class="panel">
          <div class="panel-head"><div><h3>Change password</h3><div class="sub">Use at least 8 characters with a mix of letters, numbers, and symbols.</div></div></div>
          <div class="panel-body">
            <form [formGroup]="passwordForm" (ngSubmit)="changePassword()">
              <label class="form-label">Current password</label>
              <input type="password" class="form-control" formControlName="currentPassword" />
              @if (passwordForm.controls.currentPassword.touched && passwordForm.controls.currentPassword.invalid) {
                <div class="form-error">Your current password is required.</div>
              }

              <label class="form-label mt-2">New password</label>
              <input type="password" class="form-control" formControlName="newPassword" />
              @if (passwordForm.controls.newPassword.touched && passwordForm.controls.newPassword.invalid) {
                <div class="form-error">New password must be at least 8 characters.</div>
              }

              <label class="form-label mt-2">Confirm new password</label>
              <input type="password" class="form-control" formControlName="confirmPassword" />
              @if (passwordForm.touched && passwordForm.errors?.['mismatch']) {
                <div class="form-error">The passwords do not match.</div>
              }

              <div class="hstack-8 justify-content-end mt-3">
                <button type="submit" class="btn btn-primary" [disabled]="savingPassword()">
                  @if (savingPassword()) {
                    <span class="spinner-border spinner-border-sm me-1"></span> Updating...
                  } @else {
                    <i class="bi bi-shield-lock"></i> Update password
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Security tips</h3></div></div>
          <div class="panel-body" style="font-size:12.5px;color:var(--muted)">
            <p style="margin-top:0">Your session is protected by a signed JWT that expires automatically. Signing out clears the token from this device.</p>
            <p>Password reset links expire after one hour and can only be used once.</p>
            <p style="margin-bottom:0">Contact an administrator if you believe your account has been accessed without authorization.</p>
          </div>
        </div>
      </div>
    }

    @if (activeTab() === 'formula') {
      <div class="grid-main-side">
        <div class="panel">
          <div class="panel-head">
            <div>
              <h3>Contribution & workload formula</h3>
              <div class="sub">{{ formula()?.canEdit ? 'As an administrator you can tune these values.' : 'Read-only view of the active formula.' }}</div>
            </div>
          </div>
          <div class="panel-body">
            <form [formGroup]="formulaForm" (ngSubmit)="saveFormula()">
              <h4 style="font-size:12px;margin:0 0 4px">Contribution point weights</h4>
              <div class="grid-2">
                <div><label class="form-label">Completed task</label><input type="number" class="form-control" formControlName="completedTask" min="0" max="200" /></div>
                <div><label class="form-label">Milestone submitted</label><input type="number" class="form-control" formControlName="milestoneSubmission" min="0" max="200" /></div>
                <div><label class="form-label">Milestone approved</label><input type="number" class="form-control" formControlName="milestoneApproval" min="0" max="200" /></div>
                <div><label class="form-label">File uploaded</label><input type="number" class="form-control" formControlName="fileUpload" min="0" max="200" /></div>
                <div><label class="form-label">Task comment</label><input type="number" class="form-control" formControlName="comment" min="0" max="200" /></div>
              </div>

              <div class="divider"></div>
              <h4 style="font-size:12px;margin:0 0 4px">Workload thresholds (priority-weighted score)</h4>
              <div class="grid-3">
                <div><label class="form-label">Light up to</label><input type="number" class="form-control" formControlName="light" min="0" max="500" /></div>
                <div><label class="form-label">Balanced up to</label><input type="number" class="form-control" formControlName="balanced" min="0" max="500" /></div>
                <div><label class="form-label">Heavy up to</label><input type="number" class="form-control" formControlName="heavy" min="0" max="500" /></div>
              </div>

              <div class="text-muted-sm mt-1">
                Priority weights: Low 1 · Medium 2 · High 3 · Urgent 4. Scores above the heavy threshold are classified as Overloaded.
              </div>

              @if (formulaError()) {
                <div class="alert alert-danger py-2 px-3 mt-2" style="font-size:12.5px">{{ formulaError() }}</div>
              }

              @if (formula()?.canEdit) {
                <div class="hstack-8 justify-content-end mt-3">
                  <button type="button" class="btn btn-soft" (click)="loadFormula()">Reset to saved</button>
                  <button type="submit" class="btn btn-primary" [disabled]="savingFormula()">
                    @if (savingFormula()) {
                      <span class="spinner-border spinner-border-sm me-1"></span> Saving...
                    } @else {
                      <i class="bi bi-check2"></i> Save formula
                    }
                  </button>
                </div>
              }
            </form>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Formula preview</h3><div class="sub">How the current thresholds classify a member</div></div></div>
          <div class="panel-body">
            <div class="formula-preview">
              <span class="badge-soft tone-teal">Light ≤ {{ formulaForm.controls.light.value }}</span>
              <span class="badge-soft tone-green">Balanced ≤ {{ formulaForm.controls.balanced.value }}</span>
              <span class="badge-soft tone-amber">Heavy ≤ {{ formulaForm.controls.heavy.value }}</span>
              <span class="badge-soft tone-red">Overloaded &gt; {{ formulaForm.controls.heavy.value }}</span>
            </div>
            <div class="divider"></div>
            <div class="text-muted-sm mb-1">Example: three Urgent tasks and two Medium tasks give a score of 3×4 + 2×2 = 16.</div>
            <div class="text-muted-sm">That member would be classified as <strong>{{ exampleClass() }}</strong> with the saved thresholds (Light ≤ {{ formula()?.workloadThresholds?.light }}, Balanced ≤ {{ formula()?.workloadThresholds?.balanced }}, Heavy ≤ {{ formula()?.workloadThresholds?.heavy }}).</div>
            <div class="divider"></div>
            <div class="text-muted-sm">
              Defaults: completed task {{ formula()?.defaults?.completedTask }}, milestone submission {{ formula()?.defaults?.milestoneSubmission }}, milestone approval {{ formula()?.defaults?.milestoneApproval }}, file {{ formula()?.defaults?.fileUpload }}.
            </div>
          </div>
        </div>
      </div>
    }

    @if (activeTab() === 'academic' && auth.isAdmin()) {
      <div class="grid-2">
        <div class="panel">
          <div class="panel-head"><div><h3>Programs</h3><div class="sub">{{ programs().length }} program{{ programs().length === 1 ? '' : 's' }}</div></div></div>
          <div class="panel-body" style="padding-top:8px">
            @for (program of programs(); track program.id) {
              <div class="info-row">
                <span>{{ program.name }} <span class="text-muted-sm">({{ program.code || '—' }})</span></span>
                <button type="button" class="btn btn-danger-soft btn-sm" (click)="removeProgram(program)"><i class="bi bi-trash3"></i></button>
              </div>
            } @empty {
              <div class="text-muted-sm">No programs yet.</div>
            }
            <form [formGroup]="programForm" (ngSubmit)="addProgram()" class="mt-3">
              <div class="grid-2">
                <div><label class="form-label">Program name</label><input class="form-control" formControlName="name" placeholder="BS Information Technology" /></div>
                <div><label class="form-label">Code</label><input class="form-control" formControlName="code" placeholder="BSIT" /></div>
              </div>
              <button type="submit" class="btn btn-soft btn-sm mt-2"><i class="bi bi-plus-lg"></i> Add program</button>
            </form>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head"><div><h3>Sections</h3><div class="sub">{{ sections().length }} section{{ sections().length === 1 ? '' : 's' }}</div></div></div>
          <div class="panel-body" style="padding-top:8px;max-height:460px;overflow:auto">
            @for (section of sections(); track section.id) {
              <div class="info-row">
                <span>
                  {{ section.name }}
                  <span class="text-muted-sm">{{ section.program || '' }}{{ section.academicYear ? ' · ' + section.academicYear : '' }}</span>
                </span>
                <button type="button" class="btn btn-danger-soft btn-sm" (click)="removeSection(section)"><i class="bi bi-trash3"></i></button>
              </div>
            } @empty {
              <div class="text-muted-sm">No sections yet.</div>
            }
            <form [formGroup]="sectionForm" (ngSubmit)="addSection()" class="mt-3">
              <div class="grid-2">
                <div><label class="form-label">Section name</label><input class="form-control" formControlName="name" placeholder="BSIT 4-A" /></div>
                <div>
                  <label class="form-label">Program</label>
                  <select class="form-select" formControlName="programId">
                    <option value="">None</option>
                    @for (program of programs(); track program.id) {
                      <option [value]="program.id">{{ program.name }}</option>
                    }
                  </select>
                </div>
              </div>
              <label class="form-label mt-2">Academic year</label>
              <input class="form-control" formControlName="academicYear" placeholder="2026–2027" />
              <button type="submit" class="btn btn-soft btn-sm mt-2"><i class="bi bi-plus-lg"></i> Add section</button>
            </form>
          </div>
        </div>
      </div>
    }
  `,
  styles: [
    `
      .settings-tabs {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        border-bottom: 1px solid var(--border);
        margin-bottom: 18px;
      }
      .settings-tabs .tab-btn { border-radius: 9px 9px 0 0; border-bottom: 2px solid transparent; }
      .settings-tabs .tab-btn.active { border-bottom-color: var(--blue); }
      .swatch-row { display: flex; gap: 8px; flex-wrap: wrap; }
      .swatch {
        width: 26px;
        height: 26px;
        border-radius: 999px;
        border: 2px solid transparent;
        cursor: pointer;
        box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.12);
      }
      .swatch.selected { border-color: #fff; box-shadow: 0 0 0 2px var(--blue); }
      .formula-preview { display: flex; gap: 8px; flex-wrap: wrap; }
    `,
  ],
})
export class SettingsPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  readonly auth = inject(AuthService);

  readonly activeTab = signal<TabKey>('profile');
  readonly sections = signal<Section[]>([]);
  readonly programs = signal<Program[]>([]);
  readonly formula = signal<FormulaSettings | null>(null);
  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly savingFormula = signal(false);
  readonly formulaError = signal('');

  readonly palette = ['#274b8f', '#2563eb', '#0f766e', '#7c3aed', '#b45309', '#be123c', '#475569'];

  readonly tabs = computed(() => {
    const base = [
      { key: 'profile' as TabKey, label: 'Profile', icon: 'bi-person' },
      { key: 'security' as TabKey, label: 'Security', icon: 'bi-shield-lock' },
      { key: 'formula' as TabKey, label: 'Formula & thresholds', icon: 'bi-sliders2' },
    ];
    return this.auth.isAdmin()
      ? [...base, { key: 'academic' as TabKey, label: 'Academic data', icon: 'bi-building' }]
      : base;
  });

  readonly profileForm = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    phone: [''],
    section: [''],
    program: [''],
    studentNumber: [''],
    avatarColor: ['#274b8f'],
  });

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: (group) => (group.value.newPassword === group.value.confirmPassword ? null : { mismatch: true }) }
  );

  readonly formulaForm = this.fb.nonNullable.group({
    completedTask: [10, [Validators.required, Validators.min(0), Validators.max(200)]],
    milestoneSubmission: [15, [Validators.required, Validators.min(0), Validators.max(200)]],
    milestoneApproval: [25, [Validators.required, Validators.min(0), Validators.max(200)]],
    fileUpload: [2, [Validators.required, Validators.min(0), Validators.max(200)]],
    comment: [0, [Validators.required, Validators.min(0), Validators.max(200)]],
    light: [3, [Validators.required, Validators.min(0), Validators.max(500)]],
    balanced: [8, [Validators.required, Validators.min(0), Validators.max(500)]],
    heavy: [14, [Validators.required, Validators.min(0), Validators.max(500)]],
  });

  readonly programForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    code: [''],
  });

  readonly sectionForm = this.fb.nonNullable.group({
    name: ['', Validators.required],
    programId: [''],
    academicYear: [''],
  });

  ngOnInit(): void {
    this.auth.loadMe().subscribe({
      next: (response) => {
        this.profileForm.patchValue({
          firstName: response.user.firstName || '',
          lastName: response.user.lastName || '',
          phone: response.user.phone || '',
          section: response.user.section || '',
          program: response.user.program || '',
          studentNumber: response.user.studentNumber || '',
          avatarColor: response.user.avatarColor || '#274b8f',
        });
      },
      error: () => undefined,
    });
    this.api.get<{ sections: Section[] }>('/sections').subscribe({
      next: (response) => this.sections.set(response.sections),
    });
    this.loadFormula();
    if (this.auth.isAdmin()) this.loadAcademic();
  }

  saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    this.savingProfile.set(true);
    this.auth.updateProfile(this.profileForm.getRawValue()).subscribe({
      next: (response) => {
        this.savingProfile.set(false);
        this.toast.success('Profile updated.');
        this.profileForm.patchValue({
          firstName: response.user.firstName || '',
          lastName: response.user.lastName || '',
          phone: response.user.phone || '',
          section: response.user.section || '',
          program: response.user.program || '',
          studentNumber: response.user.studentNumber || '',
          avatarColor: response.user.avatarColor || '#274b8f',
        });
      },
      error: (error) => {
        this.savingProfile.set(false);
        this.toast.error(apiError(error));
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const value = this.passwordForm.getRawValue();
    this.savingPassword.set(true);
    this.api.put('/auth/password', { currentPassword: value.currentPassword, newPassword: value.newPassword }).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
        this.toast.success('Password updated successfully.');
      },
      error: (error) => {
        this.savingPassword.set(false);
        this.toast.error(apiError(error));
      },
    });
  }

  loadFormula(): void {
    this.api.get<FormulaSettings>('/settings/formula').subscribe({
      next: (response) => {
        this.formula.set(response);
        this.formulaForm.patchValue({
          completedTask: response.contributionWeights.completedTask ?? 10,
          milestoneSubmission: response.contributionWeights.milestoneSubmission ?? 15,
          milestoneApproval: response.contributionWeights.milestoneApproval ?? 25,
          fileUpload: response.contributionWeights.fileUpload ?? 2,
          comment: response.contributionWeights.comment ?? 0,
          light: response.workloadThresholds.light ?? 3,
          balanced: response.workloadThresholds.balanced ?? 8,
          heavy: response.workloadThresholds.heavy ?? 14,
        });
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  saveFormula(): void {
    if (!this.formula()?.canEdit) return;
    if (this.formulaForm.invalid) {
      this.formulaForm.markAllAsTouched();
      return;
    }
    const value = this.formulaForm.getRawValue();
    if (!(value.light <= value.balanced && value.balanced <= value.heavy)) {
      this.formulaError.set('Thresholds must increase: light ≤ balanced ≤ heavy.');
      return;
    }
    this.savingFormula.set(true);
    this.formulaError.set('');
    this.api
      .put('/settings/formula', {
        contributionWeights: {
          completedTask: value.completedTask,
          milestoneSubmission: value.milestoneSubmission,
          milestoneApproval: value.milestoneApproval,
          fileUpload: value.fileUpload,
          comment: value.comment,
        },
        workloadThresholds: { light: value.light, balanced: value.balanced, heavy: value.heavy },
      })
      .subscribe({
        next: () => {
          this.savingFormula.set(false);
          this.toast.success('Formula and thresholds saved.');
          this.loadFormula();
        },
        error: (error) => {
          this.savingFormula.set(false);
          this.formulaError.set(apiError(error));
        },
      });
  }

  exampleClass(): string {
    const thresholds = this.formula()?.workloadThresholds;
    if (!thresholds) return '—';
    const score = 16;
    if (score <= thresholds.light) return 'Light';
    if (score <= thresholds.balanced) return 'Balanced';
    if (score <= thresholds.heavy) return 'Heavy';
    return 'Overloaded';
  }

  loadAcademic(): void {
    this.api.get<{ sections: Section[]; programs: Program[] }>('/sections/admin').subscribe({
      next: (response) => {
        this.sections.set(response.sections);
        this.programs.set(response.programs);
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  addProgram(): void {
    if (this.programForm.invalid) {
      this.programForm.markAllAsTouched();
      return;
    }
    const value = this.programForm.getRawValue();
    this.api.post('/programs', { name: value.name.trim(), code: value.code.trim() || null }).subscribe({
      next: () => {
        this.programForm.reset({ name: '', code: '' });
        this.toast.success('Program added.');
        this.loadAcademic();
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  async removeProgram(program: Program): Promise<void> {
    const confirmed = await this.confirm.open({
      title: 'Delete program?',
      message: 'Programs can only be deleted when no sections use them.',
      confirmLabel: 'Delete program',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.delete(`/programs/${program.id}`).subscribe({
      next: () => {
        this.toast.success('Program deleted.');
        this.loadAcademic();
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  addSection(): void {
    if (this.sectionForm.invalid) {
      this.sectionForm.markAllAsTouched();
      return;
    }
    const value = this.sectionForm.getRawValue();
    this.api
      .post('/sections', {
        name: value.name.trim(),
        programId: value.programId ? Number(value.programId) : null,
        academicYear: value.academicYear.trim() || null,
      })
      .subscribe({
        next: () => {
          this.sectionForm.reset({ name: '', programId: '', academicYear: '' });
          this.toast.success('Section added.');
          this.loadAcademic();
        },
        error: (error) => this.toast.error(apiError(error)),
      });
  }

  async removeSection(section: Section): Promise<void> {
    const confirmed = await this.confirm.open({
      title: 'Delete section?',
      message: `Students assigned to "${section.name}" keep their record, but the section will no longer be selectable.`,
      confirmLabel: 'Delete section',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.delete(`/sections/${section.id}`).subscribe({
      next: () => {
        this.toast.success('Section deleted.');
        this.loadAcademic();
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }
}
