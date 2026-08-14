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
import { AuthService, LoginOutcome, PLATFORM_LANDING_URL, TENANT_LANDING_URL } from '@org/auth';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

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
      case 'success':
        void this.router.navigateByUrl(
          this.authService.isPlatformAdmin() ? PLATFORM_LANDING_URL : TENANT_LANDING_URL,
        );
        return;
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
