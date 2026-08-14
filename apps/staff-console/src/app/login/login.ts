import { Component, computed, inject, signal } from '@angular/core';
import { TENANT_ID } from '@org/api-client';
import { PLATFORM_TENANT_ID } from '@org/auth';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, LoginOutcome, PLATFORM_LANDING_URL } from '@org/auth';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

/**
 * Exact match to seed-rbac-catalog.ts role names — each role's daily-entry-point screen, not just
 * the first permission-gated route it happens to pass. Only roles with a built frontend screen are
 * listed here; anything else (a role rename, or a role like Lab Technician with no screen yet)
 * falls through to the permission-priority fallback below, then to the "no screens" message.
 */
const ROLE_LANDING_ROUTES: Record<string, string> = {
  'Hospital Admin': '/admin/users',
  'Receptionist / Front Desk': '/clinical/appointments',
  Doctor: '/clinical/patients',
  Nurse: '/clinical/triage',
  'Billing/Accounts Staff': '/billing/invoices',
  'Auditor/Compliance': '/admin/audit',
};

/**
 * Ordered to match the nav links in app-shell.html. Safety net for a role not in
 * ROLE_LANDING_ROUTES: still lands on the first screen its permissions allow rather than bouncing
 * straight back to /login via permissionGuard's reject-to-login behavior.
 */
const TENANT_LANDING_CANDIDATES: Array<{ permission: string; route: string }> = [
  { permission: 'billing.manage', route: '/billing/invoices' },
  { permission: 'patients.read', route: '/clinical/patients' },
  { permission: 'appointment.read', route: '/clinical/appointments' },
  { permission: 'triage.read', route: '/clinical/triage' },
  { permission: 'identity.accounts.manage', route: '/admin/users' },
  { permission: 'master-data.manage', route: '/admin/master-data' },
  { permission: 'reporting.read', route: '/admin/audit' },
];

export function resolveTenantLandingUrl(authService: AuthService): string | null {
  const roleMatch = authService.currentUser()?.roles.find((role) => role in ROLE_LANDING_ROUTES);
  if (roleMatch) {
    return ROLE_LANDING_ROUTES[roleMatch];
  }
  const permissionMatch = TENANT_LANDING_CANDIDATES.find((candidate) => authService.hasPermission(candidate.permission));
  return permissionMatch?.route ?? null;
}

@Component({
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    IconFieldModule,
    InputIconModule,
  ],
  selector: 'hms-login',
  templateUrl: './login.html',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly tenantId = inject(TENANT_ID);

  /**
   * Which console this host serves. The two audiences share one login screen, so without this a
   * platform operator and a hospital user see an identical form and only discover they are at the
   * wrong host by failing to authenticate.
   */
  readonly isPlatformConsole = this.tenantId === PLATFORM_TENANT_ID;
  readonly consoleLabel = this.isPlatformConsole ? 'Platform console' : 'Staff console';
  readonly consoleScope = computed(() =>
    this.isPlatformConsole ? 'All hospitals' : this.tenantId,
  );
  readonly currentYear = new Date().getFullYear();

  readonly form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

  get usernameControl() {
    return this.form.controls.username;
  }

  get passwordControl() {
    return this.form.controls.password;
  }

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);
    this.authService
      .login(this.usernameControl.value, this.passwordControl.value)
      .subscribe({
        next: (outcome) => {
          this.submitting.set(false);
          this.handleOutcome(outcome);
        },
        error: () => {
          this.submitting.set(false);
          this.errorMessage.set('Something went wrong. Please try again.');
        },
      });
  }

  private handleOutcome(outcome: LoginOutcome): void {
    switch (outcome.kind) {
      case 'success': {
        if (this.authService.isPlatformAdmin()) {
          void this.router.navigateByUrl(PLATFORM_LANDING_URL);
          return;
        }
        const landingUrl = resolveTenantLandingUrl(this.authService);
        if (!landingUrl) {
          this.errorMessage.set('Your account has no accessible screens yet. Contact your administrator.');
          return;
        }
        void this.router.navigateByUrl(landingUrl);
        return;
      }
      case 'invalidCredentials':
        this.errorMessage.set('Invalid username or password');
        return;
      case 'locked':
        this.errorMessage.set(
          `Account locked. Try again in ${outcome.retryAfterSeconds} seconds.`,
        );
        return;
      case 'serverError':
        this.errorMessage.set(outcome.message);
        return;
    }
  }
}
