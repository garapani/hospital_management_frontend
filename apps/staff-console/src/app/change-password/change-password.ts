import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AuthService } from '@org/auth';
import { ApiError } from '@org/api-client';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { BrandingService } from '../branding/branding.service.js';

/**
 * Onboarding screen for accounts the backend flagged must-change-password: login with an
 * initial/generated password returns 403 (no tokens), and this screen lets the user replace it
 * with one of their own. The backend authenticates the call with username + current password,
 * so this route needs no session and deliberately sits outside both shells.
 */
@Component({
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    ToastModule,
  ],
  selector: 'hms-change-password',
  templateUrl: './change-password.html',
})
export class ChangePassword {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  readonly branding = inject(BrandingService);

  /** Username carried over from the login screen's 403 mustChangePassword navigation state. */
  readonly usernameFromState = (history.state as { username?: string } | undefined)?.username ?? '';

  readonly form = new FormGroup({
    username: new FormControl(this.usernameFromState, {
      nonNullable: true,
      validators: Validators.required,
    }),
    currentPassword: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: Validators.required,
    }),
  });

  get usernameControl() {
    return this.form.controls.username;
  }

  get currentPasswordControl() {
    return this.form.controls.currentPassword;
  }

  get newPasswordControl() {
    return this.form.controls.newPassword;
  }

  get confirmPasswordControl() {
    return this.form.controls.confirmPassword;
  }

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  backToLogin(): void {
    void this.router.navigateByUrl('/login');
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }
    if (this.newPasswordControl.value !== this.confirmPasswordControl.value) {
      this.errorMessage.set('New password and confirmation do not match.');
      return;
    }
    this.errorMessage.set(null);
    this.submitting.set(true);
    this.authService
      .changeInitialPassword(
        this.usernameControl.value,
        this.currentPasswordControl.value,
        this.newPasswordControl.value,
      )
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Password updated',
            detail: 'Please sign in with your new password.',
          });
          void this.router.navigateByUrl('/login');
        },
        error: (error: ApiError) => {
          this.submitting.set(false);
          if (error.status === 401) {
            this.errorMessage.set('Current password is incorrect.');
            return;
          }
          this.errorMessage.set(
            error.message || 'Could not change the password. Please try again.',
          );
        },
      });
  }
}
