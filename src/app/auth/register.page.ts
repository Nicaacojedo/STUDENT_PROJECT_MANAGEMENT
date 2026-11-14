import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { Program, Section } from '../core/models';
import { apiError } from '../core/utils';
import { AuthLayoutComponent } from './auth-layout';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout
      headline="Create your student account and start building."
      sub="Register with your academic details. You can create projects, invite teammates, and track everything in SPMS."
    >
      <h2>Create account</h2>
      <p class="sub">Student registration. Advisers are created by an administrator.</p>

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="grid-2">
          <div class="mb-3">
            <label class="form-label">First name</label>
            <input class="form-control" formControlName="firstName" [class.is-invalid]="invalid('firstName')" />
            <div class="invalid-feedback">First name is required.</div>
          </div>
          <div class="mb-3">
            <label class="form-label">Last name</label>
            <input class="form-control" formControlName="lastName" [class.is-invalid]="invalid('lastName')" />
            <div class="invalid-feedback">Last name is required.</div>
          </div>
        </div>

        <div class="mb-3">
          <label class="form-label">School email</label>
          <input type="email" class="form-control" formControlName="email" placeholder="you@student.spms.edu" [class.is-invalid]="invalid('email')" />
          <div class="invalid-feedback">Enter a valid email address.</div>
        </div>

        <div class="grid-2">
          <div class="mb-3">
            <label class="form-label">Student number</label>
            <input class="form-control" formControlName="studentNumber" placeholder="2026-00123" />
          </div>
          <div class="mb-3">
            <label class="form-label">Program</label>
            <select class="form-select" formControlName="program">
              <option value="">Select program</option>
              @for (program of programs(); track program.id) {
                <option [value]="program.name">{{ program.name }}</option>
              }
            </select>
          </div>
        </div>

        <div class="grid-2">
          <div class="mb-3">
            <label class="form-label">Section</label>
            <select class="form-select" formControlName="section" (change)="onSectionChange($event)">
              <option value="">Select section</option>
              @for (section of sections(); track section.id) {
                <option [value]="section.name">{{ section.name }}</option>
              }
            </select>
          </div>
          <div class="mb-3">
            <label class="form-label">Phone</label>
            <input class="form-control" formControlName="phone" placeholder="0917 000 0000" />
          </div>
        </div>

        <div class="grid-2">
          <div class="mb-2">
            <label class="form-label">Password</label>
            <div class="password-wrap">
              <input
                [type]="showPassword() ? 'text' : 'password'"
                class="form-control"
                formControlName="password"
                autocomplete="new-password"
                [class.is-invalid]="invalid('password')"
              />
              <button type="button" class="toggle-password" (click)="showPassword.set(!showPassword())">
                <i [class]="showPassword() ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
            @if (invalid('password')) {
              <div class="invalid-feedback" style="display:block">Use at least 8 characters.</div>
            }
          </div>
          <div class="mb-2">
            <label class="form-label">Confirm password</label>
            <input
              [type]="showPassword() ? 'text' : 'password'"
              class="form-control"
              formControlName="confirmPassword"
              autocomplete="new-password"
              [class.is-invalid]="form.hasError('mismatch') && form.get('confirmPassword')?.touched"
            />
            @if (form.hasError('mismatch') && form.get('confirmPassword')?.touched) {
              <div class="invalid-feedback" style="display:block">Passwords do not match.</div>
            }
          </div>
        </div>

        @if (error()) {
          <div class="alert alert-danger py-2 px-3 mt-2" style="font-size:12.5px">{{ error() }}</div>
        }

        <button type="submit" class="btn btn-primary w-100 mt-3" [disabled]="loading()">
          @if (loading()) {
            <span class="spinner-border spinner-border-sm me-2"></span> Creating account...
          } @else {
            Create student account
          }
        </button>
      </form>

      <div class="auth-footer">
        Already have an account? <a routerLink="/login">Sign in</a>
      </div>
    </app-auth-layout>
  `,
})
export class RegisterPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  readonly form = this.fb.group(
    {
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      studentNumber: [''],
      program: [''],
      section: [''],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );
  readonly sections = signal<Section[]>([]);
  readonly programs = signal<Program[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  ngOnInit(): void {
    this.api.get<{ sections: Section[]; programs: Program[] }>('/sections').subscribe({
      next: (response) => {
        this.sections.set(response.sections);
        this.programs.set(response.programs);
      },
    });
  }

  invalid(control: string): boolean {
    const field = this.form.get(control);
    return !!field && field.invalid && (field.touched || field.dirty);
  }

  onSectionChange(event: Event): void {
    const name = (event.target as HTMLSelectElement).value;
    const section = this.sections().find((item) => item.name === name);
    if (section?.program) this.form.patchValue({ program: section.program });
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    this.auth
      .register({
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
        studentNumber: value.studentNumber,
        program: value.program,
        section: value.section,
        phone: value.phone,
        password: value.password,
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.toast.success(`Account created. Welcome, ${response.user.firstName}.`);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(apiError(err));
        },
      });
  }
}
