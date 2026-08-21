import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableLazyLoadEvent, TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { NotificationsApiService, Notification } from './notifications-api.service.js';

function notificationSeverity(type: Notification['type']): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  switch (type) {
    case 'success':
      return 'success';
    case 'warning':
      return 'warn';
    case 'error':
      return 'danger';
    default:
      return 'info';
  }
}

@Component({
  selector: 'hms-notification-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TableModule, ButtonModule, TagModule],
  templateUrl: './notification-list.html',
})
export class NotificationList {
  private readonly notificationsApi = inject(NotificationsApiService);

  readonly notifications = signal<Notification[]>([]);
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly pageSize = signal(10);
  readonly firstRecord = signal(0);

  readonly notificationSeverity = notificationSeverity;

  constructor() {
    this.load(0);
  }

  load(first: number): void {
    this.loading.set(true);
    const page = Math.floor(first / this.pageSize()) + 1;
    this.notificationsApi.getAll({ page, limit: this.pageSize() }).subscribe({
      next: (res) => {
        this.notifications.set(res.data);
        this.totalRecords.set(res.meta.total);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  onLazyLoad(event: TableLazyLoadEvent): void {
    this.firstRecord.set(event.first || 0);
    this.load(event.first || 0);
  }

  markRead(notification: Notification): void {
    if (notification.isRead) {
      return;
    }
    this.notificationsApi.markAsRead(notification.id).subscribe({
      next: () => {
        this.notifications.update((all) =>
          all.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
        );
      },
      error: () => undefined,
    });
  }

  markAllRead(): void {
    this.notificationsApi.markAllAsRead().subscribe({
      next: () => {
        this.notifications.update((all) => all.map((n) => ({ ...n, isRead: true })));
      },
      error: () => undefined,
    });
  }
}
