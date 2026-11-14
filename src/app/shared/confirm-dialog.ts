import { Component, inject } from '@angular/core';
import { ConfirmService } from '../core/confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    @if (confirmService.state(); as state) {
      <div class="modal-backdrop-custom" (click)="confirmService.cancel()">
        <div class="modal-card confirm-card" (click)="$event.stopPropagation()">
          <div class="modal-content-body">
            <div class="confirm-icon" [class.danger]="state.tone === 'danger'">
              <i class="bi" [class.bi-exclamation-triangle]="state.tone === 'danger'" [class.bi-question-circle]="state.tone !== 'danger'"></i>
            </div>
            <h2 style="margin: 4px 0 8px; font-size: 18px">{{ state.title }}</h2>
            <p style="margin: 0; color: var(--muted); font-size: 13px">{{ state.message }}</p>
          </div>
          <div class="modal-foot">
            <button type="button" class="btn btn-outline-secondary" (click)="confirmService.cancel()">
              {{ state.cancelLabel || 'Cancel' }}
            </button>
            <button
              type="button"
              class="btn"
              [class.btn-danger-soft]="state.tone === 'danger'"
              [class.btn-primary]="state.tone !== 'danger'"
              (click)="confirmService.confirm()"
            >
              {{ state.confirmLabel || 'Confirm' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialogComponent {
  readonly confirmService = inject(ConfirmService);
}
