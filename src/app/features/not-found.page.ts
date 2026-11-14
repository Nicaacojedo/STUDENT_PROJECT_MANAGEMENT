import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="not-found">
      <div class="not-found-card">
        <div class="not-found-badge"><i class="bi bi-compass"></i></div>
        <p class="not-found-code">404</p>
        <h1>Page not found</h1>
        <p class="text-muted-sm">
          The page you are looking for may have been moved, renamed, or never existed.
        </p>
        <div class="not-found-actions">
          <a class="btn btn-primary" [routerLink]="auth.homeRoute()">
            <i class="bi bi-grid-1x2"></i> Back to dashboard
          </a>
          <a class="btn btn-outline-secondary" routerLink="/projects">
            <i class="bi bi-folder2-open"></i> Browse projects
          </a>
        </div>
      </div>
    </div>
  `,
  styles: `
    .not-found {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 32px;
      background: var(--bg);
    }
    .not-found-card {
      width: min(460px, 100%);
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 40px 32px;
      text-align: center;
      box-shadow: var(--shadow-lg);
    }
    .not-found-badge {
      width: 62px;
      height: 62px;
      margin: 0 auto 14px;
      display: grid;
      place-items: center;
      border-radius: 18px;
      background: var(--blue-soft);
      color: var(--blue);
      font-size: 26px;
    }
    .not-found-code {
      margin: 0;
      font-family: var(--font-display);
      font-size: 46px;
      font-weight: 700;
      letter-spacing: -1px;
      color: var(--navy);
      line-height: 1;
    }
    .not-found-card h1 {
      margin: 8px 0 6px;
      font-size: 20px;
      color: var(--navy);
    }
    .not-found-card p {
      margin: 0 0 22px;
    }
    .not-found-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
      flex-wrap: wrap;
    }
  `,
})
export class NotFoundPage {
  readonly auth = inject(AuthService);
}
