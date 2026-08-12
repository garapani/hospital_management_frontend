import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '@org/auth';

@Component({
  imports: [RouterModule],
  selector: 'hms-app-shell',
  templateUrl: './app-shell.html',
})
export class AppShell {
  readonly auth = inject(AuthService);
}
