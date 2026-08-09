import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  imports: [RouterModule, ButtonModule],
  selector: 'hms-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'staff-console';
}
