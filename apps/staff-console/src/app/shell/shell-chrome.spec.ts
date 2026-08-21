import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { MessageService } from 'primeng/api';
import { AuthService } from '@org/auth';
import { NotificationsApiService } from '../notifications/notifications-api.service.js';
import { ShellChrome } from './shell-chrome.js';

describe('ShellChrome user menu', () => {
  function setup(isPlatformAdmin: boolean) {
    const authService = {
      isPlatformAdmin: () => isPlatformAdmin,
      currentUser: () => ({
        roles: isPlatformAdmin ? ['Super Admin'] : ['Hospital Admin'],
        hospitalId: isPlatformAdmin ? '__platform' : 'demo',
      }),
      logout: jest.fn().mockReturnValue(of(undefined)),
    } as unknown as AuthService;
    const notificationsApi = {
      getSummary: jest
        .fn()
        .mockReturnValue(of({ unreadCount: 0, recentNotifications: [] })),
      markAllAsRead: jest.fn(),
    } as unknown as NotificationsApiService;

    TestBed.configureTestingModule({
      imports: [ShellChrome],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        { provide: AuthService, useValue: authService },
        { provide: NotificationsApiService, useValue: notificationsApi },
      ],
    });

    const fixture = TestBed.createComponent(ShellChrome);
    fixture.detectChanges();
    return { fixture, authService };
  }

  function openUserMenu(fixture: ReturnType<typeof setup>['fixture']): void {
    // The avatar is the button wrapping the accent-colored initials circle; the bell and quick
    // actions buttons are also rounded-full, so target the initials circle specifically.
    const initials = (fixture.nativeElement as HTMLElement).querySelector(
      'div.accent-bg',
    ) as HTMLElement;
    (initials.closest('button') as HTMLButtonElement).click();
    fixture.detectChanges();
  }

  it('hides My Profile and Settings for a platform (super) admin, keeping Logout', () => {
    const { fixture } = setup(true);
    openUserMenu(fixture);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    // Menu is open (the header shows the operator role) but the tenant-only links are absent.
    expect(text).toContain('Super Admin');
    expect(text).not.toContain('My Profile');
    expect(text).not.toContain('Settings');
  });

  it('shows My Profile and Settings for a hospital tenant user', () => {
    const { fixture } = setup(false);
    openUserMenu(fixture);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hospital Admin');
    expect(text).toContain('My Profile');
    expect(text).toContain('Settings');
  });
});
