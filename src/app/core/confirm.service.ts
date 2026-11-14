import { Injectable, signal } from '@angular/core';
import { ConfirmOptions, ConfirmState } from './models';

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private resolver: ((value: boolean) => void) | null = null;
  private counter = 0;
  readonly state = signal<ConfirmState | null>(null);

  open(options: ConfirmOptions): Promise<boolean> {
    this.resolve(false);
    this.state.set({ ...options, id: ++this.counter });
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  confirm(): void {
    this.resolve(true);
  }

  cancel(): void {
    this.resolve(false);
  }

  private resolve(value: boolean): void {
    if (this.resolver) {
      this.resolver(value);
      this.resolver = null;
    }
    this.state.set(null);
  }
}
