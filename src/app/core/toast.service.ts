import { Injectable, signal } from '@angular/core';
import { ToastMessage } from './models';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private counter = 0;
  readonly messages = signal<ToastMessage[]>([]);

  success(text: string): void {
    this.push('success', text);
  }

  error(text: string): void {
    this.push('error', text);
  }

  info(text: string): void {
    this.push('info', text);
  }

  dismiss(id: number): void {
    this.messages.update((list) => list.filter((item) => item.id !== id));
  }

  private push(type: ToastMessage['type'], text: string): void {
    const id = ++this.counter;
    this.messages.update((list) => [...list, { id, type, text }]);
    setTimeout(() => this.dismiss(id), 4500);
  }
}
