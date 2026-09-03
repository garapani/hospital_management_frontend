import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MessageService, ConfirmationService } from 'primeng/api';
import { API_BASE_URL, TENANT_ID } from '@org/api-client';
import { AuthService } from '@org/auth';
import { AppShell } from './app-shell.js';

describe('AppShell', () => {
  async function createShell(roles: string[] = [], permissions: string[] = []) {
    const authMock = {
      hasPermission: jest.fn((perm: string) => permissions.includes(perm)),
      hasRole: jest.fn((role: string) => roles.includes(role)),
      currentUser: jest.fn(() => ({ sub: 'u1', roles, permissions })),
      isAuthenticated: () => true,
    };

    await TestBed.configureTestingModule({
      imports: [AppShell],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        MessageService,
        ConfirmationService,
        { provide: API_BASE_URL, useValue: 'https://gateway.example/api' },
        { provide: TENANT_ID, useValue: 'demo' },
        { provide: AuthService, useValue: authMock },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AppShell);
    await fixture.whenStable();
    return { fixture, compiled: fixture.nativeElement as HTMLElement };
  }

  it('renders the sidebar nav and a router outlet', async () => {
    const { compiled } = await createShell();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    expect(compiled.textContent).toContain('Vaidya');
  });

  it('hides Vitals and Encounters from the sidebar for a Doctor', async () => {
    const { compiled } = await createShell(['Doctor'], ['vitals.manage', 'encounter.read']);
    const navText = compiled.querySelector('aside')?.textContent ?? '';
    expect(navText).not.toContain('Vitals');
    expect(navText).not.toContain('Encounters');
  });

  it('shows Vitals and Encounters in the sidebar for a Nurse', async () => {
    const { compiled } = await createShell(['Nurse'], ['vitals.manage', 'encounter.read']);
    const navText = compiled.querySelector('aside')?.textContent ?? '';
    expect(navText).toContain('Vitals');
    expect(navText).toContain('Encounters');
  });

  it('shows Vitals and Encounters for an Admin even if they also hold Doctor role', async () => {
    const { compiled } = await createShell(
      ['Doctor', 'Hospital Admin'],
      ['vitals.manage', 'encounter.read'],
    );
    const navText = compiled.querySelector('aside')?.textContent ?? '';
    expect(navText).toContain('Vitals');
    expect(navText).toContain('Encounters');
  });
});

