import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '@org/auth';
import { ShellChrome } from './shell-chrome.js';

/** Tenant console shell: hospital staff navigation over the shared chrome. */
@Component({
  imports: [RouterModule, ShellChrome],
  selector: 'hms-app-shell',
  templateUrl: './app-shell.html',
})
export class AppShell {
  readonly auth = inject(AuthService);

  readonly isDoctor = computed(
    () =>
      this.auth.hasRole('Doctor') &&
      !this.auth.hasRole('Hospital Admin') &&
      !this.auth.hasRole('Super Admin'),
  );
}
