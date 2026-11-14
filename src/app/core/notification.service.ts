import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { NotificationItem } from './models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly api = inject(ApiService);
  readonly items = signal<NotificationItem[]>([]);
  readonly unread = signal(0);
  readonly loading = signal(false);

  load(): void {
    if (!localStorage.getItem('spms_token')) return;
    this.loading.set(true);
    this.api.get<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications').subscribe({
      next: (response) => {
        this.items.set(response.notifications);
        this.unread.set(response.unreadCount);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  markRead(item: NotificationItem): void {
    if (item.isRead) return;
    this.api.patch(`/notifications/${item.id}/read`).subscribe({
      next: () => {
        this.items.update((list) => list.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)));
        this.unread.update((count) => Math.max(0, count - 1));
      },
    });
  }

  markAllRead(): void {
    if (!this.unread()) return;
    this.api.post<{ message: string }>('/notifications/read-all').subscribe({
      next: () => {
        this.items.update((list) => list.map((n) => ({ ...n, isRead: true })));
        this.unread.set(0);
      },
    });
  }

  remove(item: NotificationItem): void {
    this.api.delete(`/notifications/${item.id}`).subscribe({
      next: () => {
        this.items.update((list) => list.filter((n) => n.id !== item.id));
        if (!item.isRead) this.unread.update((count) => Math.max(0, count - 1));
      },
    });
  }
}
