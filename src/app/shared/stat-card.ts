import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  template: `
    <div [class]="'stat-card tone-' + tone()">
      <div class="stat-icon"><i [class]="'bi ' + icon()"></i></div>
      <div class="stat-label">{{ label() }}</div>
      <div class="stat-value">{{ value() }}</div>
      @if (hint()) {
        <div class="stat-hint">{{ hint() }}</div>
      }
    </div>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly icon = input<string>('bi-graph-up');
  readonly tone = input<string>('blue');
  readonly hint = input<string>('');
}
