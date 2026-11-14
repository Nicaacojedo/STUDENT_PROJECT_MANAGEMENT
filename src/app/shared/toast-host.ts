import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast-host',
  template: `
    <div class="toast-stack">
      @for (message of toast.messages(); track message.id) {
        <div [class]="'toast-item ' + message.type">
          <i class="bi" [class.bi-check-circle-fill]="message.type === 'success'" [class.bi-exclamation-circle-fill]="message.type === 'error'" [class.bi-info-circle-fill]="message.type === 'info'"></i>
          <div class="toast-text">{{ message.text }}</div>
          <button type="button" class="toast-close" (click)="toast.dismiss(message.id)" aria-label="Dismiss">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHostComponent {
  readonly toast = inject(ToastService);
}
