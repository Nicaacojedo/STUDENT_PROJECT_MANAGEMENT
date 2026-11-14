import { Component, computed, input } from '@angular/core';
import { toneClass } from '../core/utils';

@Component({
  selector: 'app-status-badge',
  template: `<span [class]="'badge-soft ' + resolvedTone()">{{ label() }}</span>`,
})
export class StatusBadgeComponent {
  readonly label = input.required<string>();
  readonly tone = input<string>('');
  readonly resolvedTone = computed(() => this.tone() || toneClass(this.label()));
}
