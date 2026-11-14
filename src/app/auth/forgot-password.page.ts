import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { ToastService } from '../core/toast.service';
import { apiError } from '../core/utils';
import { AuthLayoutComponent } from './auth-layout';

@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  template: `
    <app-auth-layout
      headline="Locked out? Reset your password securely."
      sub="Enter the email address on your SPMS account and we will generate a one-hour reset link."
    >
      <h2>Forgot password</h2>
      <p class="sub">We will help you get back into your workspace.</p>

      @if (!sent()) {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <div class="mb-3">
            <label class="form-label">School email</label>
            <input type="email" class="form-control" formControlName="email" placeholder="you@student.spms.edu" [class.is-invalid]="form.get('email')?.invalid && form.get('email')?.touched" />
            <div class="invalid-feedback">Enter a valid email address.</div>
          </div>

          @if (error()) {
            <div class="alert alert-danger py-2 px-3" style="font-size:12.5px">{{ error() }}</div>
          }

          <button type="submit" class="btn btn-primary w-100" [disabled]="loading()">
            @if (loading()) {
              <span class="spinner-border spinner-border-sm me-2"></span> Generating link...
            } @else {
              Generate reset link
            }
          </button>
        </form>
      } @else {
        <div class="alert alert-info py-2 px-3" style="font-size:12.5px">{{ message() }}</div>

        @if (resetUrl()) {
          <div class="formula-box">
            <div class="text-muted-sm mb-1">Development reset link</div>
            <a [href]="resetUrl()" style="font-size:12px;word-break:break-all">{{ resetUrl() }}</a>
            <div class="hstack-8 mt-2">
              <a class="btn btn-primary btn-sm" [href]="resetUrl()">Open reset page</a>
              <button type="button" class="btn btn-outline-secondary btn-sm" (click)="copy()">
                <i class="bi bi-clipboard"></i> Copy link
              </button>
            </div>
          </div>
          <p class="form-hint">{{ note() }}</p>
        }

        <button type="button" class="btn btn-soft w-100 mt-2" (click)="sent.set(false)">
          Use a different email
        </button>
      }

      <div class="auth-footer">
        Remembered it? <a routerLink="/login">Back to sign in</a>
      </div>
    </app-auth-layout>
  `,
})
export class ForgotPasswordPage {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });
  readonly loading = signal(false);
  readonly sent = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  readonly resetUrl = signal('');
  readonly note = signal('');

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set('');
    this.api
      .post<{
        message: string;
        devResetToken?: string;
        resetUrl?: string;
        expiresAt?: string;
        note?: string;
      }>('/auth/forgot-password', this.form.getRawValue())
      .subscribe({
        next: (response) => {
          this.loading.set(false);
          this.sent.set(true);
          this.message.set(response.message);
          this.resetUrl.set(response.resetUrl || '');
          this.note.set(response.note || '');
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(apiError(err));
        },
      });
  }

  copy(): void {
    if (!this.resetUrl()) return;
    navigator.clipboard?.writeText(this.resetUrl());
    this.toast.success('Reset link copied to clipboard.');
  }
}
