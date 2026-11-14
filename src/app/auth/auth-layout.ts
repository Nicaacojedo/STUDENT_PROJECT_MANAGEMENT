import { Component, input } from '@angular/core';

@Component({
  selector: 'app-auth-layout',
  template: `
    <div class="auth-page">
      <aside class="auth-hero">
        <div class="hero-brand">
          <span class="brand-mark"><i class="bi bi-mortarboard-fill"></i></span>
          <span>SPMS</span>
        </div>

        <div>
          <h1>{{ headline() }}</h1>
          <p class="lead-text">{{ sub() }}</p>
          <div class="hero-features">
            <div class="hero-feature">
              <i class="bi bi-kanban"></i>
              <span>Plan tasks on a Kanban board and keep every deadline visible.</span>
            </div>
            <div class="hero-feature">
              <i class="bi bi-people"></i>
              <span>Balance team workload with priority-weighted monitoring.</span>
            </div>
            <div class="hero-feature">
              <i class="bi bi-patch-check"></i>
              <span>Track contributions, adviser feedback, and milestone reviews.</span>
            </div>
          </div>
        </div>

        <div style="font-size:11.5px;color:#8fa2c7;z-index:1">
          Student Project Management System · Academic Year 2026–2027
        </div>
      </aside>

      <div class="auth-form-side">
        <div class="auth-card"><ng-content /></div>
      </div>
    </div>
  `,
})
export class AuthLayoutComponent {
  readonly headline = input<string>('Manage student projects with clarity.');
  readonly sub = input<string>(
    'One workspace for capstone teams, advisers, and program administrators.',
  );
}
