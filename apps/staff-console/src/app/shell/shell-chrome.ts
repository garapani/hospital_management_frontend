import { Component, ElementRef, HostListener, ViewChild, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '@org/auth';
import { ApiError } from '@org/api-client';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
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
    ConfirmDialogModule,
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
  readonly sidebarOpen = signal(false);

  @ViewChild('userMenuContainer') private readonly userMenuContainer?: ElementRef<HTMLElement>;
  @ViewChild('notificationsMenu') private readonly notificationsMenu?: ElementRef<HTMLElement>;

  // Neither dropdown previously closed on an outside click or Escape — only their own toggle
  // button did (review-comments.md "Shell chrome ships mock placeholder identity, a hardcoded
  // page title, and inaccessible dropdowns").
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as Node;
    if (this.userMenuOpen() && !this.userMenuContainer?.nativeElement.contains(target)) {
      this.userMenuOpen.set(false);
    }
    if (this.notificationsOpen() && !this.notificationsMenu?.nativeElement.contains(target)) {
      this.notificationsOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.userMenuOpen.set(false);
    this.notificationsOpen.set(false);
  }

  readonly unreadCount = signal(0);
  readonly recentNotifications = signal<Notification[]>([]);
  private notificationSubscription?: Subscription;

  // Self-service password rotation (signed-in user).
  readonly showPasswordModal = signal(false);
  readonly passwordForm = signal({ currentPassword: '', newPassword: '', confirmPassword: '' });
  readonly passwordSaving = signal(false);
  readonly passwordError = signal<string | null>(null);

  // Falls back to the role name when displayName is absent — a still-live token issued before
  // this field existed (a long-running session that hasn't refreshed yet) shouldn't show a blank
  // avatar/header in the meantime.
  readonly displayName = computed(() => {
    const user = this.currentUser();
    return user?.displayName || user?.roles[0] || null;
  });

  readonly userInitials = computed(() => {
    const label = this.displayName();
    if (!label) return 'AU'; // "Anonymous User" — no roles/displayName at all (unauthenticated edge case).
    // [...label] rather than label[i] so a 2-word name outside the BMP (astral-plane characters —
    // rare, but a surrogate pair split mid-character otherwise produces a mangled avatar glyph)
    // doesn't corrupt the first letter.
    return label.split(' ').map((n) => [...n][0]).join('').toUpperCase().slice(0, 2);
  });

  logout(): void {
    this.auth.logout().subscribe();
  }

  toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
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
    if (this.notificationsOpen()) {
      // Refetch on open, not close — the shell persists across in-app navigation for the whole
      // session (in-memory access token, no reload), so ngOnInit's initial load would otherwise
      // be the only fetch a user signed in for a shift ever sees.
      this.loadNotifications();
    }
  }

  notificationIconClass(type: Notification['type']): string {
    switch (type) {
      case 'info':
        return 'pi-info-circle text-blue-500';
      case 'warning':
        return 'pi-exclamation-triangle text-yellow-500';
      case 'error':
        return 'pi-times-circle text-red-500';
      case 'success':
        return 'pi-check-circle text-green-500';
      default:
        return 'pi-bell text-slate-500';
    }
  }
}
