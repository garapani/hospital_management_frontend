import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '@org/auth';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { NotificationsApiService, Notification } from '../notifications/notifications-api.service.js';
import { Subscription } from 'rxjs';

/**
 * Chrome shared by both consoles: sidebar frame, header, menus, and the router outlet.
 * Nav links are projected in by the wrapping shell (AppShell / PlatformShell) via [shellNav].
 */
@Component({
  imports: [RouterModule, TooltipModule, ToastModule, DatePipe],
  selector: 'hms-shell-chrome',
  templateUrl: './shell-chrome.html',
})
export class ShellChrome implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  private readonly notificationsApi = inject(NotificationsApiService);

  readonly userMenuOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly quickActionsOpen = signal(false);

  readonly unreadCount = signal(0);
  readonly recentNotifications = signal<Notification[]>([]);
  private notificationSubscription?: Subscription;

  readonly userInitials = computed(() => {
    const user = this.currentUser();
    const label = user?.roles[0];
    if (!label) return 'AU';
    return label.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  });

  logout(): void {
    this.auth.logout().subscribe();
  }

  toggleUserMenu(): void {
    this.userMenuOpen.update((open) => !open);
    this.notificationsOpen.set(false);
    this.quickActionsOpen.set(false);
  }

  toggleQuickActions(): void {
    this.quickActionsOpen.update((open) => !open);
    this.userMenuOpen.set(false);
    this.notificationsOpen.set(false);
  }

  currentUser() {
    return this.auth.currentUser();
  }

  ngOnInit(): void {
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.notificationSubscription?.unsubscribe();
  }

  loadNotifications(): void {
    this.notificationSubscription = this.notificationsApi.getSummary().subscribe({
      next: (summary) => {
        this.unreadCount.set(summary.unreadCount);
        this.recentNotifications.set(summary.recentNotifications);
      },
      error: () => {
        // Silently fail - notifications are not critical
        this.unreadCount.set(0);
        this.recentNotifications.set([]);
      },
    });
  }

  markAllAsRead(): void {
    this.notificationsApi.markAllAsRead().subscribe({
      next: () => {
        this.unreadCount.set(0);
        this.recentNotifications.update(notifications => 
          notifications.map(n => ({ ...n, isRead: true }))
        );
      },
      error: () => {
        // Silently fail
      },
    });
  }

  toggleNotifications(): void {
    this.notificationsOpen.update((open) => !open);
    this.userMenuOpen.set(false);
    this.quickActionsOpen.set(false);
    if (!this.notificationsOpen()) {
      this.loadNotifications();
    }
  }
}
