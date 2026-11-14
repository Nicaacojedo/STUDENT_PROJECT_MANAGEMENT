import { Component, computed, input } from '@angular/core';
import { initials } from '../core/utils';

@Component({
  selector: 'app-avatar',
  template: `<span [class]="'avatar ' + sizeClass()" [style.background]="color()" [title]="name()">{{ label() }}</span>`,
})
export class AvatarComponent {
  readonly name = input<string>('');
  readonly color = input<string>('#2563eb');
  readonly size = input<'sm' | 'md' | 'lg' | 'xl'>('md');
  readonly label = computed(() => initials(this.name()));
  readonly sizeClass = computed(() => (this.size() === 'md' ? '' : this.size()));
}
