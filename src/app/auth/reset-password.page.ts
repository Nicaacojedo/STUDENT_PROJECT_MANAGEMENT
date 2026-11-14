import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { apiError } from '../core/utils';
import { AuthLayoutComponent } from './auth-layout';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout
      headline="Choose a new password and get back to work."
      sub="Your reset link is valid for one hour and can only be used once."
    >
      <h2>Reset password</h2>
      <p class="sub">Enter a new password for your account.</p>

      @if (!token()) {
        <div class="alert alert-warning py-2 px-3" style="font-size:12.5px">
          This reset link is missing its token. Request a new link to continue.
        </div>
        <a routerLink="/forgot-password" class="btn btn-primary w-100">Request a new link</a>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="mb-3">
            <label class="form-label">New password</label>
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

          <div class="mb-3">
            <label class="form-label">Confirm new password</label>
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

          @if (error()) {
            <div class="alert alert-danger py-2 px-3" style="font-size:12.5px">{{ error() }}</div>
          }

          <button type="submit" class="btn btn-primary w-100" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner-border spinner-border-sm me-2"></span> Saving...
            } @else {
              Reset password
            }
          </button>
        </form>
      }

      <div class="auth-footer">
        <a routerLink="/login">Back to sign in</a>
      </div>
    </app-auth-layout>
  `,
})
export class ResetPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly token = signal(this.route.snapshot.queryParamMap.get('token') || '');
  readonly form = this.fb.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPassword = signal(false);

  invalid(control: string): boolean {
    const field = this.form.get(control);
    return !!field && field.invalid && (field.touched || field.dirty);
  }

  submit(): void {
    if (!this.token()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.api
      .post<{ message: string }>('/auth/reset-password', {
        token: this.token(),
        password: this.form.getRawValue().password,
      })
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.toast.success(response.message);
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(apiError(err));
        },
      });
  }
}
