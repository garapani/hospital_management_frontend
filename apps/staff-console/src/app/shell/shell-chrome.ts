import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@org/auth';
import { ApiError } from '@org/api-client';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { NotificationsApiService, Notification } from '../notifications/notifications-api.service.js';
import { BrandingService } from '../branding/branding.service.js';
import { Subscription } from 'rxjs';

/**
 * Chrome shared by both consoles: sidebar frame, header, menus, and the router outlet.
 * Nav links are projected in by the wrapping shell (AppShell / PlatformShell) via [shellNav].
 */
@Component({
  imports: [
    RouterModule,
    FormsModule,
    TooltipModule,
    ToastModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    DatePipe,
  ],
  selector: 'hms-shell-chrome',
  templateUrl: './shell-chrome.html',
})
export class ShellChrome implements OnInit, OnDestroy {
  readonly auth = inject(AuthService);
  readonly branding = inject(BrandingService);
  private readonly notificationsApi = inject(NotificationsApiService);
  private readonly messageService = inject(MessageService);

  readonly userMenuOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly quickActionsOpen = signal(false);

  readonly unreadCount = signal(0);
  readonly recentNotifications = signal<Notification[]>([]);
  private notificationSubscription?: Subscription;

  // Self-service password rotation (signed-in user).
  readonly showPasswordModal = signal(false);
  readonly passwordForm = signal({ currentPassword: '', newPassword: '', confirmPassword: '' });
  readonly passwordSaving = signal(false);
  readonly passwordError = signal<string | null>(null);

  readonly userInitials = computed(() => {
    const user = this.currentUser();
    const label = user?.roles[0];
    if (!label) return 'AU';
    return label.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  });

  logout(): void {
    this.auth.logout().subscribe();
  }

  openPasswordModal(): void {
    this.passwordForm.set({ currentPassword: '', newPassword: '', confirmPassword: '' });
    this.passwordError.set(null);
    this.userMenuOpen.set(false);
    this.showPasswordModal.set(true);
  }

  closePasswordModal(): void {
    this.showPasswordModal.set(false);
    this.passwordError.set(null);
  }

  submitPasswordChange(): void {
    const form = this.passwordForm();
    if (!form.currentPassword || !form.newPassword) {
      return;
    }
    if (form.newPassword.length < 8) {
      this.passwordError.set('New password must be at least 8 characters.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      this.passwordError.set('New password and confirmation do not match.');
      return;
    }
    this.passwordError.set(null);
    this.passwordSaving.set(true);
    this.auth.changeOwnPassword(form.currentPassword, form.newPassword).subscribe({
      next: () => {
        this.passwordSaving.set(false);
        this.showPasswordModal.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Password changed',
          detail: 'Your password has been updated.',
        });
      },
      error: (error: ApiError) => {
        this.passwordSaving.set(false);
        if (error.status === 400) {
          this.passwordError.set(error.message || 'Could not change the password.');
          return;
        }
        this.passwordError.set('Could not change the password. Please try again.');
      },
    });
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
