import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { ConfirmService } from '../../core/confirm.service';
import { ToastService } from '../../core/toast.service';
import { Section, User } from '../../core/models';
import { apiError, formatDate, relativeTime } from '../../core/utils';
import { AvatarComponent } from '../../shared/avatar';
import { EmptyStateComponent } from '../../shared/empty-state';
import { ModalComponent } from '../../shared/modal';
import { PageHeaderComponent } from '../../shared/page-header';
import { StatusBadgeComponent } from '../../shared/status-badge';

interface RoleOption {
  id: number;
  name: string;
  description?: string;
}

@Component({
  selector: 'app-admin-users',
  imports: [
    ReactiveFormsModule,
    AvatarComponent,
    EmptyStateComponent,
    ModalComponent,
    PageHeaderComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-page-header title="User Management" subtitle="Create accounts, assign roles, and control access across the institution.">
      <button type="button" class="btn btn-primary" (click)="openCreate()"><i class="bi bi-person-plus"></i> New user</button>
    </app-page-header>

    <div class="stat-grid">
      <div class="stat-card tone-blue">
        <div class="stat-icon"><i class="bi bi-people"></i></div>
        <div class="stat-label">Total accounts</div>
        <div class="stat-value">{{ users().length }}</div>
        <div class="stat-hint">{{ activeCount() }} active</div>
      </div>
      <div class="stat-card tone-violet">
        <div class="stat-icon"><i class="bi bi-mortarboard"></i></div>
        <div class="stat-label">Students</div>
        <div class="stat-value">{{ countRole('Student') + countRole('Team Leader') }}</div>
        <div class="stat-hint">{{ countRole('Team Leader') }} team leaders</div>
      </div>
      <div class="stat-card tone-teal">
        <div class="stat-icon"><i class="bi bi-person-check"></i></div>
        <div class="stat-label">Advisers</div>
        <div class="stat-value">{{ countRole('Adviser') }}</div>
        <div class="stat-hint">Faculty reviewers</div>
      </div>
      <div class="stat-card tone-amber">
        <div class="stat-icon"><i class="bi bi-shield-lock"></i></div>
        <div class="stat-label">Administrators</div>
        <div class="stat-value">{{ countRole('Admin') }}</div>
        <div class="stat-hint">Full system access</div>
      </div>
    </div>

    <div class="filter-bar mt-3">
      <div class="search-box">
        <i class="bi bi-search"></i>
        <input
          type="search"
          placeholder="Search name, email, student number..."
          [value]="search()"
          (input)="search.set(readValue($event))"
        />
      </div>
      <select class="form-select" style="max-width:180px" [value]="roleFilter()" (change)="roleFilter.set(readValue($event))">
        <option value="All">All roles</option>
        @for (role of roles(); track role.id) {
          <option [value]="role.name">{{ role.name }}</option>
        }
      </select>
      <select class="form-select" style="max-width:160px" [value]="statusFilter()" (change)="statusFilter.set(readValue($event))">
        <option value="All">All statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>

    @if (loading()) {
      <div class="spinner-wrap"><div class="spinner-border"></div></div>
    } @else if (!filtered().length) {
      <app-empty-state icon="bi-person-badge" title="No accounts found" message="Adjust the filters or create a new account." />
    } @else {
      <div class="panel table-panel mt-3">
        <div class="table-responsive">
          <table class="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Section / Program</th>
                <th>Status</th>
                <th>Last login</th>
                <th style="text-align:right">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (user of filtered(); track user.id) {
                <tr>
                  <td>
                    <div class="hstack-8">
                      <app-avatar [name]="user.name" [color]="user.avatarColor || '#274b8f'" />
                      <div>
                        <div class="cell-title">{{ user.name }}</div>
                        <div class="cell-sub">{{ user.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td><app-status-badge [label]="user.role" [tone]="roleTone(user.role)" /></td>
                  <td>
                    <div>{{ user.section || '—' }}</div>
                    <div class="cell-sub">{{ user.program || 'No program' }}</div>
                  </td>
                  <td>
                    <span class="badge-soft" [class]="'badge-soft ' + (user.isActive === false ? 'tone-red' : 'tone-green')">
                      {{ user.isActive === false ? 'Inactive' : 'Active' }}
                    </span>
                  </td>
                  <td>
                    <div>{{ user.lastLoginAt ? relative(user.lastLoginAt) : 'Never' }}</div>
                    <div class="cell-sub">{{ user.createdAt ? 'Created ' + date(user.createdAt) : '' }}</div>
                  </td>
                  <td>
                    <div class="hstack-8 justify-content-end">
                      <button type="button" class="btn btn-soft btn-sm" title="Edit account" (click)="openEdit(user)">
                        <i class="bi bi-pencil"></i>
                      </button>
                      @if (user.id !== auth.user()?.id) {
                        <button
                          type="button"
                          class="btn btn-sm"
                          [class.btn-soft]="user.isActive === false"
                          [class.btn-danger-soft]="user.isActive !== false"
                          [title]="user.isActive === false ? 'Activate' : 'Deactivate'"
                          (click)="toggleStatus(user)"
                        >
                          <i class="bi" [class.bi-toggle-on]="user.isActive !== false" [class.bi-toggle-off]="user.isActive === false"></i>
                        </button>
                        <button type="button" class="btn btn-danger-soft btn-sm" title="Delete account" (click)="remove(user)">
                          <i class="bi bi-trash3"></i>
                        </button>
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

    <app-modal [open]="formOpen()" [title]="editingId() ? 'Edit account' : 'New account'" subtitle="Roles control exactly which features this account can access." size="lg" (close)="closeForm()">
      <form [formGroup]="form" (ngSubmit)="save()">
        <div class="grid-2">
          <div>
            <label class="form-label">First name <span class="text-danger">*</span></label>
            <input class="form-control" formControlName="firstName" />
          </div>
          <div>
            <label class="form-label">Last name <span class="text-danger">*</span></label>
            <input class="form-control" formControlName="lastName" />
          </div>
        </div>

        <div class="grid-2 mt-2">
          <div>
            <label class="form-label">Email <span class="text-danger">*</span></label>
            <input type="email" class="form-control" formControlName="email" />
            @if (form.controls.email.touched && form.controls.email.invalid) {
              <div class="form-error">A valid email address is required.</div>
            }
          </div>
          <div>
            <label class="form-label">Role <span class="text-danger">*</span></label>
            <select class="form-select" formControlName="role" [disabled]="editingId() === auth.user()?.id">
              @for (role of roles(); track role.id) {
                <option [value]="role.name">{{ role.name }}</option>
              }
            </select>
            @if (editingId() === auth.user()?.id) {
              <div class="text-muted-sm mt-1">You cannot change your own role.</div>
            }
          </div>
        </div>

        <div class="mt-2">
          <label class="form-label">
            {{ editingId() ? 'Reset password (optional)' : 'Password' }}
            @if (!editingId()) { <span class="text-danger">*</span> }
          </label>
          <input type="password" class="form-control" formControlName="password" [placeholder]="editingId() ? 'Leave blank to keep the current password' : 'At least 8 characters'" />
          @if (form.controls.password.touched && form.controls.password.invalid) {
            <div class="form-error">Password must be at least 8 characters.</div>
          }
        </div>

        <div class="grid-3 mt-2">
          <div>
            <label class="form-label">Student number</label>
            <input class="form-control" formControlName="studentNumber" [placeholder]="editingId() ? '' : 'Students only'" />
          </div>
          <div>
            <label class="form-label">Section</label>
            <input class="form-control" formControlName="section" list="admin-section-options" />
            <datalist id="admin-section-options">
              @for (section of sections(); track section.id) {
                <option [value]="section.name"></option>
              }
            </datalist>
          </div>
          <div>
            <label class="form-label">Program</label>
            <input class="form-control" formControlName="program" />
          </div>
        </div>

        <label class="form-label mt-2">Phone</label>
        <input class="form-control" formControlName="phone" />

        <label class="form-check mt-3">
          <input class="form-check-input" type="checkbox" formControlName="isActive" />
          <span class="form-check-label">Account is active and can sign in</span>
        </label>

        @if (formError()) {
          <div class="alert alert-danger py-2 px-3 mt-2" style="font-size:12.5px">{{ formError() }}</div>
        }
      </form>

      <div modalFooter class="hstack-8 justify-content-end w-100">
        <button type="button" class="btn btn-soft" (click)="closeForm()">Cancel</button>
        <button type="button" class="btn btn-primary" [disabled]="saving()" (click)="save()">
          @if (saving()) {
            <span class="spinner-border spinner-border-sm me-1"></span> Saving...
          } @else {
            <i class="bi bi-check2"></i> {{ editingId() ? 'Save changes' : 'Create account' }}
          }
        </button>
      </div>
    </app-modal>
  `,
})
export class AdminUsersPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly users = signal<User[]>([]);
  readonly roles = signal<RoleOption[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly loading = signal(true);
  readonly search = signal('');
  readonly roleFilter = signal('All');
  readonly statusFilter = signal('All');
  readonly formOpen = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly saving = signal(false);
  readonly formError = signal('');

  readonly activeCount = computed(() => this.users().filter((user) => user.isActive !== false).length);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: [''],
    role: ['Student', Validators.required],
    studentNumber: [''],
    section: [''],
    program: [''],
    phone: [''],
    isActive: [true],
  });

  readonly filtered = computed(() => {
    const term = this.search().trim().toLowerCase();
    const role = this.roleFilter();
    const status = this.statusFilter();
    return this.users().filter((user) => {
      const matchesTerm =
        !term ||
        [user.name, user.email, user.studentNumber, user.section, user.program]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      const matchesRole = role === 'All' || user.role === role;
      const matchesStatus =
        status === 'All' || (status === 'active' ? user.isActive !== false : user.isActive === false);
      return matchesTerm && matchesRole && matchesStatus;
    });
  });

  ngOnInit(): void {
    this.load();
    this.api.get<{ sections: Section[] }>('/sections').subscribe({
      next: (response) => this.sections.set(response.sections),
    });
  }

  load(): void {
    this.loading.set(true);
    this.api.get<{ users: User[]; roles: RoleOption[] }>('/users').subscribe({
      next: (response) => {
        this.users.set(response.users);
        this.roles.set(response.roles);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toast.error(apiError(error));
      },
    });
  }

  countRole(role: string): number {
    return this.users().filter((user) => user.role === role).length;
  }

  roleTone(role: string): string {
    switch (role) {
      case 'Admin':
        return 'tone-red';
      case 'Adviser':
        return 'tone-teal';
      case 'Team Leader':
        return 'tone-violet';
      default:
        return 'tone-blue';
    }
  }

  readValue(event: Event): string {
    return (event.target as HTMLInputElement | HTMLSelectElement).value;
  }

  date(value?: string | null): string {
    return formatDate(value);
  }

  relative(value?: string | null): string {
    return relativeTime(value);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.formError.set('');
    this.form.reset({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'Student',
      studentNumber: '',
      section: '',
      program: '',
      phone: '',
      isActive: true,
    });
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
    this.form.controls.role.enable();
    this.formOpen.set(true);
  }

  openEdit(user: User): void {
    this.editingId.set(user.id);
    this.formError.set('');
    this.form.reset({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email,
      password: '',
      role: user.role,
      studentNumber: user.studentNumber || '',
      section: user.section || '',
      program: user.program || '',
      phone: user.phone || '',
      isActive: user.isActive !== false,
    });
    this.form.controls.password.setValidators([Validators.minLength(8)]);
    this.form.controls.password.updateValueAndValidity();
    if (user.id === this.auth.user()?.id) this.form.controls.role.disable();
    else this.form.controls.role.enable();
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.saving.set(false);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError.set('Please fix the highlighted fields.');
      return;
    }
    const value = this.form.getRawValue();
    const payload: Record<string, unknown> = {
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      email: value.email.trim(),
      role: value.role,
      studentNumber: value.studentNumber.trim() || null,
      section: value.section.trim() || null,
      program: value.program.trim() || null,
      phone: value.phone.trim() || null,
      isActive: value.isActive,
    };
    if (value.password) payload['password'] = value.password;
    const editing = this.editingId();
    if (!editing && !value.password) {
      this.formError.set('A password is required for new accounts.');
      return;
    }
    this.saving.set(true);
    this.formError.set('');
    const request = editing
      ? this.api.put(`/users/${editing}`, payload)
      : this.api.post('/users', payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.toast.success(editing ? 'Account updated.' : 'Account created.');
        this.load();
      },
      error: (error) => {
        this.saving.set(false);
        this.formError.set(apiError(error));
      },
    });
  }

  async toggleStatus(user: User): Promise<void> {
    const nextActive = user.isActive === false;
    const confirmed = await this.confirm.open({
      title: nextActive ? 'Activate account?' : 'Deactivate account?',
      message: nextActive
        ? `${user.name} will be able to sign in again.`
        : `${user.name} will be signed out and blocked from signing in until reactivated.`,
      confirmLabel: nextActive ? 'Activate' : 'Deactivate',
      tone: nextActive ? 'primary' : 'danger',
    });
    if (!confirmed) return;
    this.api.patch(`/users/${user.id}/status`, { isActive: nextActive }).subscribe({
      next: () => {
        this.toast.success(nextActive ? 'Account activated.' : 'Account deactivated.');
        this.load();
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }

  async remove(user: User): Promise<void> {
    const confirmed = await this.confirm.open({
      title: 'Delete account?',
      message: `Deleting ${user.name} permanently removes their profile, memberships, and contribution history. Consider deactivating instead.`,
      confirmLabel: 'Delete account',
      tone: 'danger',
    });
    if (!confirmed) return;
    this.api.delete(`/users/${user.id}`).subscribe({
      next: () => {
        this.toast.success('Account deleted.');
        this.load();
      },
      error: (error) => this.toast.error(apiError(error)),
    });
  }
}
