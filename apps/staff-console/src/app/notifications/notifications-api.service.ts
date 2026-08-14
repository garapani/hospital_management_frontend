import { Injectable, inject } from '@angular/core';
import { ApiClientService } from '@org/api-client';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  isRead: boolean;
  createdAt: string;
  link?: string;
}

export interface NotificationSummary {
  unreadCount: number;
  recentNotifications: Notification[];
}

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private apiClient = inject(ApiClientService);

  getSummary() {
    return this.apiClient.get<NotificationSummary>('/notifications/summary');
  }

  markAsRead(notificationId: string) {
    return this.apiClient.patch<void>(`/notifications/${notificationId}/read`, {});
  }

  markAllAsRead() {
    return this.apiClient.post<void>('/notifications/mark-all-read', {});
  }

  getAll(params: { page: number; limit: number }) {
    return this.apiClient.get<{ data: Notification[]; meta: { total: number } }>('/notifications', { params });
  }
}
