import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div class="empty-state">
      <i [class]="'bi ' + icon()"></i>
      <strong>{{ title() }}</strong>
      <p>{{ message() }}</p>
      <ng-content />
    </div>
  `,
})
export class EmptyStateComponent {
  readonly icon = input<string>('bi-inbox');
  readonly title = input.required<string>();
  readonly message = input<string>('');
}
