import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ApiError } from '@org/api-client';
import { AuthService } from '@org/auth';
import { NotificationsApiService } from '../notifications/notifications-api.service.js';
import { BrandingService } from '../branding/branding.service.js';
import { ShellChrome } from './shell-chrome.js';

describe('ShellChrome user menu', () => {
  function setup(options: { changePassword?: unknown } = {}) {
    const authService = {
      isPlatformAdmin: () => false,
      currentUser: () => ({
        roles: ['Hospital Admin'],
        hospitalId: 'demo',
      }),
      logout: jest.fn().mockReturnValue(of(undefined)),
      changeOwnPassword:
        options.changePassword === undefined
          ? jest.fn().mockReturnValue(of({ success: true }))
          : jest.fn().mockReturnValue(options.changePassword),
    } as unknown as AuthService;
    const notificationsApi = {
      getSummary: jest
        .fn()
        .mockReturnValue(of({ unreadCount: 0, recentNotifications: [] })),
      markAllAsRead: jest.fn(),
    } as unknown as NotificationsApiService;
    // The <p-toast> subscribes to messageObserver/clearObserver on init, so the mock needs both.
    const messageService = {
      add: jest.fn(),
      messageObserver: new Subject(),
      clearObserver: new Subject(),
    } as unknown as MessageService;
    const brandingService = {
      displayName: () => null,
      logoUrl: () => null,
      primaryColor: () => null,
    } as unknown as BrandingService;

    TestBed.configureTestingModule({
      imports: [ShellChrome],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: NotificationsApiService, useValue: notificationsApi },
        { provide: MessageService, useValue: messageService },
        ConfirmationService,
        { provide: BrandingService, useValue: brandingService },
      ],
    });

    const fixture = TestBed.createComponent(ShellChrome);
    fixture.detectChanges();
    return { fixture, authService, messageService };
  }

  function openUserMenu(fixture: ReturnType<typeof setup>['fixture']): void {
    const initials = (fixture.nativeElement as HTMLElement).querySelector(
      'div.accent-bg',
    ) as HTMLElement;
    (initials.closest('button') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('shows the account header, Change Password, and Logout — no dead links', () => {
    const { fixture } = setup();
    openUserMenu(fixture);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hospital Admin');
    expect(text).toContain('Change Password');
    expect(text).toContain('Logout');
    expect(text).not.toContain('My Profile');
    expect(text).not.toContain('Settings');
  });

  it('changes the password via the signed-in endpoint and toasts success', () => {
    const { fixture, authService, messageService } = setup();
    openUserMenu(fixture);

    fixture.componentInstance.openPasswordModal();
    fixture.componentInstance.passwordForm.set({
      currentPassword: 'old-pass',
      newPassword: 'new-pass-123',
      confirmPassword: 'new-pass-123',
    });
    fixture.componentInstance.submitPasswordChange();

    expect(authService.changeOwnPassword).toHaveBeenCalledWith('old-pass', 'new-pass-123');
    expect(fixture.componentInstance.showPasswordModal()).toBe(false);
    expect(messageService.add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', summary: 'Password changed' }),
    );
  });

  it('shows an inline error on a 400 (wrong current password)', () => {
    const { fixture, authService } = setup({
      changePassword: throwError(() => ({
        status: 400,
        message: 'Current password is incorrect',
      } as ApiError)),
    });
    openUserMenu(fixture);

    fixture.componentInstance.openPasswordModal();
    fixture.componentInstance.passwordForm.set({
      currentPassword: 'wrong',
      newPassword: 'new-pass-123',
      confirmPassword: 'new-pass-123',
    });
    fixture.componentInstance.submitPasswordChange();

    expect(fixture.componentInstance.passwordError()).toBe('Current password is incorrect');
    expect(fixture.componentInstance.showPasswordModal()).toBe(true);
    expect(authService.changeOwnPassword).toHaveBeenCalled();
  });

  it('rejects a mismatched confirmation without calling the API', () => {
    const { fixture, authService } = setup();
    openUserMenu(fixture);

    fixture.componentInstance.openPasswordModal();
    fixture.componentInstance.passwordForm.set({
      currentPassword: 'old-pass',
      newPassword: 'new-pass-123',
      confirmPassword: 'different',
    });
    fixture.componentInstance.submitPasswordChange();

    expect(fixture.componentInstance.passwordError()).toBe(
      'New password and confirmation do not match.',
    );
    expect(authService.changeOwnPassword).not.toHaveBeenCalled();
  });
});
