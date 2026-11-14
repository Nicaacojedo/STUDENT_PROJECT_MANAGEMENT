import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { ToastService } from '../core/toast.service';
import { apiError } from '../core/utils';
import { AuthLayoutComponent } from './auth-layout';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout
      headline="Welcome back to your project command center."
      sub="Sign in to coordinate tasks, monitor contributions, and keep your capstone on track."
    >
      <h2>Sign in</h2>
      <p class="sub">Use your SPMS account to continue.</p>

      @if (route.snapshot.queryParamMap.get('expired')) {
        <div class="alert alert-warning py-2 px-3" style="font-size:12.5px">
          Your session expired. Please sign in again.
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <div class="mb-3">
          <label class="form-label" for="email">School email</label>
          <input
            id="email"
            type="email"
            class="form-control"
            formControlName="email"
            placeholder="you@student.spms.edu"
            autocomplete="email"
            [class.is-invalid]="invalid('email')"
          />
          <div class="invalid-feedback">Enter a valid email address.</div>
        </div>

        <div class="mb-2">
          <label class="form-label" for="password">Password</label>
          <div class="password-wrap">
            <input
              id="password"
              [type]="showPassword() ? 'text' : 'password'"
              class="form-control"
              formControlName="password"
              placeholder="Enter your password"
              autocomplete="current-password"
              [class.is-invalid]="invalid('password')"
            />
            <button
              type="button"
              class="toggle-password"
              (click)="showPassword.set(!showPassword())"
              [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
            >
              <i [class]="showPassword() ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
            </button>
          </div>
          @if (invalid('password')) {
            <div class="invalid-feedback" style="display:block">Password must be at least 8 characters.</div>
          }
        </div>

        <div class="d-flex justify-content-end mb-3">
          <a routerLink="/forgot-password" style="font-size:12px">Forgot password?</a>
        </div>

        @if (error()) {
          <div class="alert alert-danger py-2 px-3" style="font-size:12.5px">{{ error() }}</div>
        }

        <button type="submit" class="btn btn-primary w-100" [disabled]="loading()">
          @if (loading()) {
            <span class="spinner-border spinner-border-sm me-2"></span> Signing in...
          } @else {
            Sign in <i class="bi bi-arrow-right ms-1"></i>
          }
        </button>
      </form>

      <div class="divider"></div>

      <div class="demo-accounts">
        <div class="demo-title">Try a demo account</div>
        <div class="demo-grid">
          @for (account of demoAccounts; track account.email) {
            <button type="button" class="demo-btn" (click)="fillDemo(account)">
              <strong>{{ account.role }}</strong>
              <span>{{ account.email }}</span>
            </button>
          }
        </div>
      </div>

      <div class="auth-footer">
        New to SPMS? <a routerLink="/register">Create a student account</a>
      </div>
    </app-auth-layout>
  `,
})
export class LoginPage {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);
  readonly demoAccounts = [
    { role: 'Admin', email: 'admin@spms.edu', password: 'Admin@123' },
    { role: 'Team Leader', email: 'maria@student.spms.edu', password: 'Student@123' },
    { role: 'Adviser', email: 'prof.cruz@spms.edu', password: 'Adviser@123' },
    { role: 'Student', email: 'juan@student.spms.edu', password: 'Student@123' },
  ];

  invalid(control: string): boolean {
    const field = this.form.get(control);
    return !!field && field.invalid && (field.touched || field.dirty);
  }

  fillDemo(account: { email: string; password: string }): void {
    this.form.setValue({ email: account.email, password: account.password });
    this.error.set('');
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.getRawValue();
    this.auth.login(email || '', password || '').subscribe({
      next: (response) => {
        this.loading.set(false);
        this.toast.success(`Welcome back, ${response.user.firstName}.`);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiError(err));
      },
    });
  }
}
