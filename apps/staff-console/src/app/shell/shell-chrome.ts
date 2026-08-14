import { Component, inject, signal, computed } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '@org/auth';
import { TooltipModule } from 'primeng/tooltip';

interface Breadcrumb {
  label: string;
  link: string;
}

/**
 * Chrome shared by both consoles: sidebar frame, header, menus, and the router outlet.
 * Nav links are projected in by the wrapping shell (AppShell / PlatformShell) via [shellNav].
 */
@Component({
  imports: [RouterModule, TooltipModule],
  selector: 'hms-shell-chrome',
  templateUrl: './shell-chrome.html',
})
export class ShellChrome {
  readonly auth = inject(AuthService);

  readonly userMenuOpen = signal(false);
  readonly notificationsOpen = signal(false);
  readonly quickActionsOpen = signal(false);
  readonly searchFocused = signal(false);

  readonly unreadCount = signal(3);
  readonly breadcrumbs = signal<Breadcrumb[]>([]);

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

  toggleNotifications(): void {
    this.notificationsOpen.update((open) => !open);
    this.userMenuOpen.set(false);
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

  closeMenus(): void {
    this.userMenuOpen.set(false);
    this.notificationsOpen.set(false);
    this.quickActionsOpen.set(false);
  }
}
