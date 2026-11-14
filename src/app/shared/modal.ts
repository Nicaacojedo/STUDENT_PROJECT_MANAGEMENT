import { Component, HostListener, input, output } from '@angular/core';

@Component({
  selector: 'app-modal',
  template: `
    @if (open()) {
      <div class="modal-backdrop-custom" (click)="onBackdrop($event)">
        <div
          [class]="'modal-card ' + size()"
          role="dialog"
          aria-modal="true"
          (click)="$event.stopPropagation()"
        >
          <div class="modal-head">
            <div>
              <h2>{{ title() }}</h2>
              @if (subtitle()) {
                <p>{{ subtitle() }}</p>
              }
            </div>
            <button type="button" class="icon-btn" aria-label="Close" (click)="close.emit()">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-content-body"><ng-content /></div>
          @if (!hideFooter()) {
            <div class="modal-foot"><ng-content select="[modalFooter]" /></div>
          }
        </div>
      </div>
    }
  `,
})
export class ModalComponent {
  readonly open = input(false);
  readonly title = input<string>('');
  readonly subtitle = input<string>('');
  readonly size = input<'sm' | 'lg' | 'xl' | ''>('');
  readonly hideFooter = input(false);
  readonly close = output<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.open()) this.close.emit();
  }

  onBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close.emit();
  }
}
