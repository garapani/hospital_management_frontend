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
  function setup() {
    const authService = {
      isPlatformAdmin: () => false,
      currentUser: () => ({
        roles: ['Hospital Admin'],
        hospitalId: 'demo',
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

  it('shows only the account header and Logout — no My Profile or Settings for any user', () => {
    const { fixture } = setup();
    openUserMenu(fixture);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hospital Admin');
    expect(text).toContain('Logout');
    expect(text).not.toContain('My Profile');
    expect(text).not.toContain('Settings');
  });
});
